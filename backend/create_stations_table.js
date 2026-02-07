const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

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
    await client.query(`
      CREATE TABLE IF NOT EXISTS charging_stations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        address TEXT,
        category VARCHAR(100),
        status VARCHAR(50),
        hotline VARCHAR(50),
        open_time VARCHAR(50),
        close_time VARCHAR(50),
        lat FLOAT,
        lon FLOAT,
        geom GEOMETRY(Point, 4326),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS charging_stations_geom_idx ON charging_stations USING GIST (geom);
    `);
    console.log('Successfully created table charging_stations');
  } catch (err) {
    console.error('Error creating table:', err);
  } finally {
    await client.end();
  }
}

main();
