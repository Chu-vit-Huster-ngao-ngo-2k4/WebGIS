const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'webgis',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

async function run() {
    try {
        await client.connect();
        const res = await client.query('SELECT DISTINCT category FROM charge_stations');
        console.log('--- CATEGORIES IN DB ---');
        console.log(JSON.stringify(res.rows, null, 2));
        console.log('------------------------');
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

run();