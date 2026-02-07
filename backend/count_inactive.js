const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'webgis',
  user: 'postgres',
  password: 'postgres',
});

async function run() {
  try {
    const totalRes = await pool.query('SELECT count(*) FROM charge_stations');
    // Logic: Active if status is '1' OR 'Đang hoạt động' OR 'Hoạt động'
    // So Inactive is NOT those.
    const inactiveRes = await pool.query(`
        SELECT count(*), status 
        FROM charge_stations 
        WHERE status NOT IN ('1', 'Đang hoạt động', 'Hoạt động')
        GROUP BY status
    `);
    
    console.log('Total stations:', totalRes.rows[0].count);
    console.log('Inactive/Maintenance stations details:', inactiveRes.rows);
    
    const inactiveCount = inactiveRes.rows.reduce((acc, row) => acc + parseInt(row.count), 0);
    console.log('Total Inactive count:', inactiveCount);

  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

run();
