
import 'dotenv/config';
import db from './config/db';

async function check() {
    try {
        console.log("Checking categories in DB...");
        const res = await db.query(`SELECT DISTINCT category, name FROM charge_stations LIMIT 50`);
        console.log("Categories found:", res.rows);
    } catch (e) {
        console.error(e);
    }
}

check();
