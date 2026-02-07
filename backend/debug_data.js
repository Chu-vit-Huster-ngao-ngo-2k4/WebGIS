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
        
        console.log("--- DISTINCT CATEGORIES ---");
        const resCat = await client.query('SELECT DISTINCT category FROM charge_stations');
        console.log(JSON.stringify(resCat.rows, null, 2));

        console.log("\n--- SAMPLE ROWS ---");
        const resRows = await client.query('SELECT name, category, status FROM charge_stations LIMIT 5');
        console.log(JSON.stringify(resRows.rows, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

run();