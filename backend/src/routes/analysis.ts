import { Router, Request, Response } from 'express';
import db from '../config/db';

const router = Router();

router.get('/buffer', async (req: Request, res: Response) => {
  try {
    const { lat, lon, radius } = req.query;

    if (!lat || !lon || !radius) {
      return res.status(400).json({ error: 'Missing lat, lon, or radius parameters' });
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lon as string);
    const rad = parseFloat(radius as string);

    // 1. Create the buffer geometry (in 3857 for meters, then transform to 4326 for output)
    // We use ST_Buffer on the projected point (3857) to get a circle in meters.
    const bufferQuery = `
      SELECT 
        ST_AsGeoJSON(
          ST_Transform(
            ST_Buffer(
              ST_Transform(
                ST_SetSRID(ST_MakePoint($1, $2), 4326), 
                3857
              ), 
              $3
            ), 
            4326
          )
        ) as geometry
    `;
    
    const bufferResult = await db.query(bufferQuery, [longitude, latitude, rad]);
    const bufferGeoJSON = JSON.parse(bufferResult.rows[0].geometry);

    // 2. Find features inside the buffer
    // We check if the feature's 'way' (which is in 3857) intersects with our buffer (calculated in 3857)
    const featuresQuery = `
      WITH buffer_geom AS (
        SELECT ST_Buffer(
          ST_Transform(
            ST_SetSRID(ST_MakePoint($1, $2), 4326), 
            3857
          ), 
          $3
        ) as geom
      )
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(json_agg(
          json_build_object(
            'type', 'Feature',
            'geometry', json_build_object(
              'type', 'Point',
              'coordinates', json_build_array(ST_X(ST_Transform(way, 4326)), ST_Y(ST_Transform(way, 4326)))
            ),
            'properties', json_build_object(
              'name', name,
              'amenity', amenity,
              'type', 'point'
            )
          )
        ), '[]'::json)
      ) as geojson
      FROM planet_osm_point, buffer_geom
      WHERE ST_Intersects(way, buffer_geom.geom)
      AND amenity IS NOT NULL
      LIMIT 200;
    `;

    const featuresResult = await db.query(featuresQuery, [longitude, latitude, rad]);
    const featuresGeoJSON = featuresResult.rows[0].geojson;

    res.json({
      buffer: {
        type: 'Feature',
        geometry: bufferGeoJSON,
        properties: { type: 'buffer', radius: rad }
      },
      features: featuresGeoJSON
    });

  } catch (error: any) {
    console.error('Error in buffer analysis:', error);
    res.status(500).json({ error: error.message });
  }
});

// Calculate location score based on amenities within 1km
router.get('/score', async (req: Request, res: Response) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ error: 'Missing lat or lon parameters' });
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lon as string);
    const radius = 1000; // Fixed 1km radius for scoring

    // 1. Check if point is on water (Solution 1)
    // Note: 'natural' is a reserved keyword in some contexts, so we quote it if needed, but here it's a column name.
    // We need to be careful with the query syntax.
    const waterQuery = `
      SELECT 1 
      FROM planet_osm_polygon
      WHERE ("natural" IN ('water', 'wetland', 'bay') OR waterway IS NOT NULL OR landuse IN ('reservoir', 'basin'))
      AND ST_Intersects(way, ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 4326), 3857))
      LIMIT 1;
    `;
    
    const waterCheck = await db.query(waterQuery, [longitude, latitude]);
    if (waterCheck.rows.length > 0) {
      return res.json({
        score: 0,
        classification: 'Uninhabitable',
        details: {
          message: 'Location is on water body (River/Lake)',
          schools: 0, hospitals: 0, banks: 0, food: 0, markets: 0, parking: 0, fuel: 0
        },
        breakdown: { education: 0, health: 0, services: 0, leisure: 0 }
      });
    }

    // 2. Count amenities for Diversity Score (Solution 2)
    const query = `
      SELECT
        COUNT(*) FILTER (WHERE amenity = 'school') as schools,
        COUNT(*) FILTER (WHERE amenity IN ('university', 'college')) as universities,
        COUNT(*) FILTER (WHERE amenity = 'kindergarten') as kindergartens,
        COUNT(*) FILTER (WHERE amenity IN ('hospital', 'clinic', 'doctors', 'pharmacy')) as health,
        COUNT(*) FILTER (WHERE amenity IN ('bank', 'atm', 'post_office', 'police', 'fire_station')) as services,
        COUNT(*) FILTER (WHERE amenity IN ('marketplace', 'supermarket', 'convenience')) as shopping,
        COUNT(*) FILTER (WHERE amenity IN ('cafe', 'restaurant', 'fast_food', 'bar', 'pub', 'cinema', 'park')) as leisure,
        COUNT(*) FILTER (WHERE amenity = 'parking') as parking,
        COUNT(*) FILTER (WHERE amenity = 'fuel') as fuel
      FROM planet_osm_point
      WHERE ST_DWithin(
        way,
        ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 4326), 3857),
        $3
      )
    `;

    const result = await db.query(query, [longitude, latitude, radius]);
    const counts = result.rows[0];

    // Get user weights (default to 1 if not provided)
    const w_edu = req.query.w_edu ? parseFloat(req.query.w_edu as string) : 1;
    const w_health = req.query.w_health ? parseFloat(req.query.w_health as string) : 1;
    const w_service = req.query.w_service ? parseFloat(req.query.w_service as string) : 1;
    const w_leisure = req.query.w_leisure ? parseFloat(req.query.w_leisure as string) : 1;

    // Calculate Category Scores (Capped)
    // Education (Max 25): School (15pts), University (5pts), Kindergarten (5pts)
    const eduScore = Math.min(25, (parseInt(counts.schools) * 15) + (parseInt(counts.universities) * 5) + (parseInt(counts.kindergartens) * 5));
    
    // Health (Max 25): Need ~1 hospital or 3 clinics/pharmacies
    const healthScore = Math.min(25, parseInt(counts.health) * 10);
    
    // Services & Shopping (Max 30): Banks, Markets, etc.
    const serviceScore = Math.min(30, (parseInt(counts.services) * 5) + (parseInt(counts.shopping) * 5) + (parseInt(counts.fuel) * 5));
    
    // Leisure (Max 20): Food, Parks (Easy to find, so lower weight/cap)
    const leisureScore = Math.min(20, parseInt(counts.leisure) * 2);

    // Calculate Weighted Score
    // Max possible score based on user weights
    const maxPossible = (25 * w_edu) + (25 * w_health) + (30 * w_service) + (20 * w_leisure);
    
    let score = 0;
    if (maxPossible > 0) {
      const weightedSum = (eduScore * w_edu) + (healthScore * w_health) + (serviceScore * w_service) + (leisureScore * w_leisure);
      score = (weightedSum / maxPossible) * 100;
    }

    // Determine classification
    let classification = 'Average';
    if (score >= 80) classification = 'Excellent';
    else if (score >= 60) classification = 'Good';
    else if (score >= 40) classification = 'Fair';
    else classification = 'Poor';

    res.json({
      score: Math.round(score),
      classification,
      details: {
        schools: parseInt(counts.schools),
        universities: parseInt(counts.universities),
        kindergartens: parseInt(counts.kindergartens),
        hospitals: parseInt(counts.health),
        banks: parseInt(counts.services),
        food: parseInt(counts.leisure),
        markets: parseInt(counts.shopping),
        parking: parseInt(counts.parking),
        fuel: parseInt(counts.fuel)
      },
      breakdown: {
        education: eduScore,
        health: healthScore,
        services: serviceScore,
        leisure: leisureScore
      }
    });

  } catch (error: any) {
    console.error('Error calculating score:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
