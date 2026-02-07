const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'webgis',
    user: process.env.DB_user || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

async function run() {
    try {
        await client.connect();
        const res = await client.query('SELECT DISTINCT category FROM charge_stations');
        console.log('Categories:', res.rows.map(r => r.category));
        const fs = require('fs');
        fs.writeFileSync('categories.log', JSON.stringify(res.rows.map(r => r.category), null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

run();