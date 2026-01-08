const express = require('express');
const router = express.Router();
const mapnik = require('mapnik');
const path = require('path');
const fs = require('fs');
const SphericalMercator = require('@mapbox/sphericalmercator');

const mercator = new SphericalMercator({ size: 256 });

// Register Mapnik plugins
if (mapnik.register_default_input_plugins) {
  mapnik.register_default_input_plugins();
}

// Raster tile endpoint: /tiles/raster/:z/:x/:y.png
router.get('/raster/:z/:x/:y.png', async (req, res) => {
  try {
    const { z, x, y } = req.params;
    const zoom = parseInt(z);
    const col = parseInt(x);
    const row = parseInt(y);

    // Get bounding box for tile
    const bbox = mercator.bbox(col, row, zoom, false, '900913');

    // Load Mapnik XML style
    const stylePath = path.join(__dirname, '../styles/raster-style.xml');
    const map = new mapnik.Map(256, 256);
    
    map.load(stylePath, (err, map) => {
      if (err) throw err;

      map.zoomToBox(bbox);
      
      const im = new mapnik.Image(256, 256);
      map.render(im, (err, im) => {
        if (err) throw err;
        
        res.type('png');
        res.send(im.encodeSync('png'));
      });
    });
  } catch (error) {
    console.error('Raster tile error:', error);
    res.status(500).json({ error: error.message });
  }
});


// Vector tile endpoint: /tiles/vector/:z/:x/:y.mvt
router.get('/vector/:z/:x/:y.mvt', async (req, res) => {
  try {
    const { z, x, y } = req.params;
    const zoom = parseInt(z);
    const col = parseInt(x);
    const row = parseInt(y);

    // Get bounding box for tile
    const bbox = mercator.bbox(col, row, zoom, false, '900913');

    // Load Mapnik XML style for vector tiles
    const stylePath = path.join(__dirname, '../styles/vector-style.xml');
    const map = new mapnik.Map(256, 256);
    
    map.load(stylePath, (err, map) => {
      if (err) throw err;

      map.zoomToBox(bbox);
      
      // Render as vector tile
      const vtile = new mapnik.VectorTile(zoom, col, row);
      map.render(vtile, {}, (err, vtile) => {
        if (err) throw err;
        
        res.type('application/x-protobuf');
        res.send(vtile.getData());
      });
    });
  } catch (error) {
    console.error('Vector tile error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
