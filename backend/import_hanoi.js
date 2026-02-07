const fs = require('fs');
const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const HANOI_DISTRICTS_FILE = path.join(__dirname, '../data/Hà Nội (phường xã) - 34.geojson');

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'webgis',
  port: parseInt(process.env.DB_PORT || '5432')
});

async function main() {
  await client.connect();
  console.log('Connected to DB');

  try {
    // 0. Clean old data
    // await client.query('DROP TABLE IF EXISTS hanoi_districts'); // Optional: reset schema
    
    // 1. Ensure table
    await client.query(`
      CREATE TABLE IF NOT EXISTS hanoi_districts (
        id SERIAL PRIMARY KEY,
        ten_xa VARCHAR(255),
        loai VARCHAR(100),
        dan_so INTEGER,
        dtich_km2 FLOAT,
        geom GEOMETRY(MultiPolygon, 4326)
      );
      CREATE INDEX IF NOT EXISTS hanoi_districts_geom_idx ON hanoi_districts USING GIST (geom);
    `);
    
    // Clear data
    await client.query('DELETE FROM hanoi_districts');
    console.log('Table cleared.');

    // 2. Read GeoJSON
    const rawData = fs.readFileSync(HANOI_DISTRICTS_FILE, 'utf8');
    const geojson = JSON.parse(rawData);

    if (!geojson.features || geojson.features.length === 0) {
      console.log('No features found');
      return;
    }

    console.log(`Found ${geojson.features.length} features.`);
    if (geojson.features.length > 0) {
        console.log('Sample properties:', geojson.features[0].properties);
    }

    // 3. Insert features
    let inserted = 0;
    for (const feature of geojson.features) {
      const p = feature.properties || {};
      const ten_xa = p.Name || p.ten_xa || p.NAME || p.Ten_Huyen || p.Ten_Tinh || '';
      const loai = p.type || p.loai || 'Unknown';
      const dan_so = parseInt(p.population || p.dan_so || p.Dan_So || 0);
      const dtich_km2 = parseFloat(p.area || p.dtich_km2 || p.Dien_Tich || 0);

      // Cast to MultiPolygon just in case
      const query = `
        INSERT INTO hanoi_districts (ten_xa, loai, dan_so, dtich_km2, geom)
        VALUES ($1, $2, $3, $4, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($5), 4326)))
      `;

      const geomStr = JSON.stringify(feature.geometry);

      try {
          await client.query(query, [ten_xa, loai, dan_so, dtich_km2, geomStr]);
          inserted++;
      } catch (err) {
          console.error(`Failed to insert ${ten_xa}:`, err.message);
      }
      
      if (inserted % 10 === 0) process.stdout.write('.');
    }

    console.log(`\nSuccessfully inserted ${inserted} records.`);

  } catch (err) {
    console.error('Fatal Error:', err);
  } finally {
    await client.end();
  }
}

main();
