import { Router, Request, Response } from 'express';
import db from '../config/db';

const router = Router();

router.get('/layers', async (_req: Request, res: Response) => {
  try {
    const result = await db.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching layers:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/layers/:layerName/features', async (req: Request, res: Response) => {
  try {
    const { layerName } = req.params as { layerName: string };
    const { bbox } = req.query as { bbox?: string };

    let query = `SELECT *, ST_AsGeoJSON(geom) as geometry FROM ${layerName}`;

    if (bbox) {
      const [minX, minY, maxX, maxY] = bbox.split(',').map(Number);
      query += ` WHERE ST_Intersects(geom, ST_MakeEnvelope(${minX}, ${minY}, ${maxX}, ${maxY}, 4326))`;
    }

    query += ' LIMIT 1000';

    const result = await db.query(query);

    const features = result.rows.map((row: any) => ({
      type: 'Feature',
      properties: { ...row, geometry: undefined },
      geometry: JSON.parse(row.geometry)
    }));

    res.json({ type: 'FeatureCollection', features });
  } catch (error: any) {
    console.error('Error fetching features:', error);
    res.status(500).json({ error: error.message });
  }
});

// Identify feature at a point (lat, lon)
router.get('/identify', async (req: Request, res: Response) => {
  try {
    const { lat, lon } = req.query as { lat: string; lon: string };
    
    if (!lat || !lon) {
      return res.status(400).json({ error: 'Missing lat or lon parameter' });
    }

    // Query to find features at the clicked location
    // We check polygons first, then lines, then points
    // Using ST_DWithin for lines/points to have a small buffer (click tolerance)
    // Data is in 3857 (Web Mercator), input is 4326 (Lat/Lon)
    
    const query = `
      WITH search_point AS (
        SELECT ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 4326), 3857) as geom
      )
      SELECT * FROM (
        -- Points: Highest priority
        SELECT 1 as priority, 0::float as area, 'point' as type, name, NULL as "natural", NULL as building, amenity, place
        FROM planet_osm_point, search_point
        WHERE ST_DWithin(way, search_point.geom, 20)
        AND (name IS NOT NULL OR amenity IS NOT NULL)
        
        UNION ALL
        
        -- Lines: Medium priority
        SELECT 2 as priority, 0::float as area, 'line' as type, name, NULL as "natural", NULL as building, NULL as amenity, NULL as place
        FROM planet_osm_line, search_point
        WHERE ST_DWithin(way, search_point.geom, 10)
        AND name IS NOT NULL
        
        UNION ALL
        
        -- Polygons: Lowest priority, sorted by area
        SELECT 3 as priority, ST_Area(way) as area, 'polygon' as type, name, "natural", building, amenity, place
        FROM planet_osm_polygon, search_point
        WHERE ST_Intersects(way, search_point.geom)
        AND (name IS NOT NULL OR building IS NOT NULL OR "natural" IS NOT NULL)
      ) as features
      ORDER BY priority ASC, area ASC
      LIMIT 1;
    `;

    const result = await db.query(query, [parseFloat(lon), parseFloat(lat)]);
    res.json(result.rows);

  } catch (error: any) {
    console.error('Error identifying features:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search for features by name
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q } = req.query as { q: string };
    
    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const searchTerm = `%${q}%`;
    
    // Search in points and polygons
    const query = `
      SELECT name, 'point' as type, ST_X(ST_Transform(way, 4326)) as lon, ST_Y(ST_Transform(way, 4326)) as lat 
      FROM planet_osm_point 
      WHERE name ILIKE $1 
      
      UNION
      
      SELECT name, 'polygon' as type, ST_X(ST_Centroid(ST_Transform(way, 4326))) as lon, ST_Y(ST_Centroid(ST_Transform(way, 4326))) as lat 
      FROM planet_osm_polygon 
      WHERE name ILIKE $1 
      
      LIMIT 10;
    `;

    const result = await db.query(query, [searchTerm]);
    res.json(result.rows);

  } catch (error: any) {
    console.error('Error searching features:', error);
    res.status(500).json({ error: error.message });
  }
});

// Filter features by type (amenity) within a bounding box
router.get('/filter', async (req: Request, res: Response) => {
  try {
    const { type, bbox } = req.query as { type: string; bbox: string };
    
    if (!type || !bbox) {
      return res.status(400).json({ error: 'Missing type or bbox parameter' });
    }

    // Split, trim, and lowercase types
    const types = type.split(',').map(t => t.trim().toLowerCase());
    const [minX, minY, maxX, maxY] = bbox.split(',').map(Number);
    
    console.log(`Filtering for types: ${JSON.stringify(types)} in bbox: ${bbox}`);

    // Query points matching the amenity type within the view
    const query = `
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', json_agg(
          json_build_object(
            'type', 'Feature',
            'geometry', json_build_object(
              'type', 'Point',
              'coordinates', json_build_array(ST_X(ST_Transform(way, 4326)), ST_Y(ST_Transform(way, 4326)))
            ),
            'properties', json_build_object(
              'name', name,
              'amenity', amenity
            )
          )
        )
      ) as geojson
      FROM planet_osm_point
      WHERE amenity = ANY($1)
      AND ST_Intersects(way, ST_Transform(ST_MakeEnvelope($2, $3, $4, $5, 4326), 3857))
      LIMIT 500;
    `;

    const result = await db.query(query, [types, minX, minY, maxX, maxY]);
    
    // If no results, return empty feature collection
    if (!result.rows[0].geojson) {
      return res.json({ type: 'FeatureCollection', features: [] });
    }
    
    res.json(result.rows[0].geojson);

  } catch (error: any) {
    console.error('Error filtering features:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
