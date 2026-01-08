const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get all layers
router.get('/layers', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\' AND table_type = \'BASE TABLE\''
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching layers:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get features from a layer
router.get('/layers/:layerName/features', async (req, res) => {
  try {
    const { layerName } = req.params;
    const { bbox } = req.query;

    let query = `SELECT *, ST_AsGeoJSON(geom) as geometry FROM ${layerName}`;
    
    if (bbox) {
      const [minX, minY, maxX, maxY] = bbox.split(',').map(Number);
      query += ` WHERE ST_Intersects(geom, ST_MakeEnvelope(${minX}, ${minY}, ${maxX}, ${maxY}, 4326))`;
    }
    
    query += ' LIMIT 1000';

    const result = await db.query(query);
    
    const features = result.rows.map(row => ({
      type: 'Feature',
      properties: { ...row, geometry: undefined },
      geometry: JSON.parse(row.geometry)
    }));

    res.json({
      type: 'FeatureCollection',
      features
    });
  } catch (error) {
    console.error('Error fetching features:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
