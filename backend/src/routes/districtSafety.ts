import { Router, Request, Response } from 'express';
import db from '../config/db';

const router = Router();

// GET /district-safety
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        d.id,
        d.ten_xa,
        d.dan_so,
        ST_AsGeoJSON(d.geom) AS geom_geojson,
        -- Sử dụng DISTINCT geom để tránh đếm trùng các trạm có cùng tọa độ (do lỗi import hoặc dữ liệu rác)
        COUNT(DISTINCT s.geom) AS total_stations,
        
        -- Phân loại: Tủ pin vs Trạm sạc (Dùng cú pháp so sánh trực tiếp)
        -- Một trạm có thể vừa có sạc vừa có pin (thống kê độc lập)
        COUNT(DISTINCT CASE WHEN LOWER(s.category) LIKE '%pin%' OR LOWER(s.name) LIKE '%pin%' THEN s.geom END) AS battery_stations,
        COUNT(DISTINCT CASE WHEN LOWER(s.category) NOT LIKE '%pin%' AND LOWER(s.name) NOT LIKE '%pin%' THEN s.geom END) AS charging_stations,

        COUNT(DISTINCT CASE WHEN s.status = 'Open' OR s.status = 'Hoạt động' OR s.status = 'Đang hoạt động' OR s.status = '1' THEN s.geom END) AS open_stations,
        COUNT(DISTINCT CASE WHEN s.status = 'Maintenance' OR s.status = 'Bảo trì' THEN s.geom END) AS maintenance_stations
      FROM hanoi_districts d
      LEFT JOIN charge_stations s
        ON ST_Intersects(d.geom, ST_Transform(s.geom, ST_SRID(d.geom)))
      GROUP BY d.id, d.ten_xa, d.dan_so, d.geom;
    `;
    const result = await db.query(query);
    
    // DEBUG: Log first row to see if counts are working
    if (result.rows.length > 0) {
        const first = result.rows.find(r => r.total_stations > 0);
        if (first) {
            console.log("DEBUG SAFETY STATS (Sample District):", {
                 name: first.ten_xa,
                 total: first.total_stations,
                 charging: first.charging_stations,
                 battery: first.battery_stations
            });
        }
    }

    const districts = result.rows.map(row => {
      // Safety Score: số trạm Open trên 10.000 dân
      const safetyScore = row.dan_so && row.dan_so > 0 ? (row.open_stations / row.dan_so) * 10000 : 0;
      return {
        id: row.id,
        ten_xa: row.ten_xa,
        dan_so: row.dan_so,
        geom: JSON.parse(row.geom_geojson),
        total_stations: row.total_stations,
        open_stations: row.open_stations,
        maintenance_stations: row.maintenance_stations,
        charging_stations: row.charging_stations,
        battery_stations: row.battery_stations,
        safety_score: Math.round(safetyScore * 100) / 100 // làm tròn 2 số
      };
    });
    res.json(districts);
  } catch (error: any) {
    console.error('Error in /district-safety:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
