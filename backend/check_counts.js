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
  try {
    const resDistricts = await client.query('SELECT COUNT(*) FROM hanoi_districts');
    console.log('Districts count:', resDistricts.rows[0].count);

    const resStations = await client.query('SELECT COUNT(*) FROM charging_stations');
    console.log('Stations count:', resStations.rows[0].count);
    
    // Check if spatial join returns anything
    const resJoin = await client.query(`
        SELECT COUNT(*) 
        FROM hanoi_districts d 
        JOIN charging_stations s ON ST_Contains(d.geom, s.geom)
    `);
    console.log('Stations inside Districts (Join count):', resJoin.rows[0].count);

  } catch (err) {
    console.error('DB Error:', err);
  } finally {
    await client.end();
  }
}
main();
