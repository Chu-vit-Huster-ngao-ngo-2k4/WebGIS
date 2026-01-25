import { Router, Request, Response } from 'express';
import db from '../config/db';
import https from 'https';
import fs from 'fs';
import { chromium } from 'playwright';

const router = Router();

// Hàm lấy dữ liệu:
// 1. Kiểm tra nếu dữ liệu trong DB mới update < 24h thì dùng luôn.
// 2. Nếu cũ, dùng Playwright để bypass 403.
// 3. Nếu Playwright lỗi, dùng file local backup.
const fetchVinFastData = async (forceUpdate: boolean = false): Promise<any[]> => {
    const localPath = '/data/vinfast_stations.json';

    // Bước 1: Kiểm tra độ tươi của dữ liệu (trừ khi force update)
    if (!forceUpdate) {
        try {
            const checkQuery = `SELECT MAX(last_updated) as latest FROM charge_stations`;
            const checkResult = await db.query(checkQuery);
            const latest = checkResult.rows[0]?.latest;
            
            if (latest) {
                const diffTime = Math.abs(new Date().getTime() - new Date(latest).getTime());
                const diffHours = diffTime / (1000 * 60 * 60);
                
                if (diffHours < 24) {
                    console.log(`Dữ liệu còn mới (${diffHours.toFixed(1)}h), bỏ qua sync.`);
                    return []; // Trả về mảng rỗng để báo hiệu không cần update
                }
            }
        } catch (dbErr) {
            console.warn("Không thể kiểm tra thời gian cập nhật, tiến hành sync mới.", dbErr);
        }
    }

    // Bước 2: Dùng Playwright để fetch dữ liệu online
    try {
        console.log('Khởi động Playwright để fetch dữ liệu từ VinFast...');
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        
        // Cấu hình timeout và header để giống thật hơn
        await page.setExtraHTTPHeaders({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7'
        });

        await page.goto('https://vinfastauto.com/vn_vi/get-locators', { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        // Đôi khi trang trả về JSON direct, đôi khi là HTML wrapped. 
        // Vì đây là endpoint API, ta lấy text nội dung body.
        const content = await page.textContent('body');
        
        await browser.close();

        if (content) {
            console.log('Fetch thành công từ Playwright, đang parse JSON...');
            try {
                const data = JSON.parse(content);
                return Array.isArray(data) ? data : (data.data || []);
            } catch (jsonErr) {
                // Có thể là HTML error page
                console.warn('Nội dung nhận được không phải JSON hợp lệ:', content.substring(0, 100));
            }
        }
    } catch (playwrightErr) {
        console.error('Playwright fetch gặp lỗi:', playwrightErr);
    }
    
    // Bước 3: Fallback về file local
    console.log('Playwright thất bại, chuyển sang đọc file Local...');
    if (fs.existsSync(localPath)) {
        return new Promise((resolve, reject) => {
            fs.readFile(localPath, 'utf8', (err, data) => {
                if (err) return reject(err);
                try {
                    const parsed = JSON.parse(data);
                    resolve(Array.isArray(parsed) ? parsed : parsed.data || []);
                } catch (e) {
                    reject(e);
                }
            });
        });
    }

    return [];
};

// Hàm Sync dùng chung
export const syncChargingStations = async (force: boolean = false) => {
    try {
        console.log('Bắt đầu đồng bộ dữ liệu trạm sạc...');
        
        // Gọi hàm fetch thông minh
        const data = await fetchVinFastData(force);
        
        if (!data || data.length === 0) {
            console.log("Không có dữ liệu mới hoặc dữ liệu đã được cập nhật gần đây.");
            return;
        }

        console.log(`Tìm thấy ${data.length} địa điểm, bắt đầu cập nhật vào DB...`);
        let newCount = 0;
        let updateCount = 0;

        // Xử lý theo lô (Batch) để tránh treo DB nếu quá nhiều
        // (Ở đây demo loop cho đơn giản, production nên dùng batch insert)
        for (let i = 0; i < data.length; i++) {
            const item = data[i];
            
            if (i % 100 === 0) console.log(`Processing item ${i + 1}/${data.length}...`);

             // Kiểm tra dữ liệu hợp lệ (phải có tọa độ)
            if (!item.lat || !item.lng) continue;

            const lat = parseFloat(item.lat);
            const lon = parseFloat(item.lng);
            if (isNaN(lat) || isNaN(lon)) continue;

            const externalId = item.store_id || item.entity_id || (item.id ? item.id.toString() : null);
            const name = item.name || item.title || 'Trạm sạc VinFast';
            const address = item.address || '';
            const category = item.category_name || (Array.isArray(item.category) ? item.category.join(',') : (item.category || ''));
            const hotline = item.hotline || item.hotline_xdv || '';
            const status = item.status || '';
            const openTime = item.open_time_service || '';
            const closeTime = item.close_time_service || '';

            // Câu lệnh SQL "UPSERT" (Update nếu trùng ID, Insert nếu mới)
            const query = `
                INSERT INTO charge_stations (external_id, name, address, category, hotline, status, open_time, close_time, lat, lon, geom, last_updated)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, ST_Transform(ST_SetSRID(ST_MakePoint($11, $12), 4326), 3857), NOW())
                ON CONFLICT (external_id) 
                DO UPDATE SET 
                    name = EXCLUDED.name,
                    address = EXCLUDED.address,
                    category = EXCLUDED.category,
                    hotline = EXCLUDED.hotline,
                    status = EXCLUDED.status,
                    open_time = EXCLUDED.open_time,
                    close_time = EXCLUDED.close_time,
                    lat = EXCLUDED.lat,
                    lon = EXCLUDED.lon,
                    geom = EXCLUDED.geom,
                    last_updated = NOW()
                RETURNING (xmax = 0) AS is_insert;
            `;

            const result = await db.query(query, [externalId, name, address, category, hotline, status, openTime, closeTime, lat, lon, lon, lat]);
            
            if (result.rows[0].is_insert) {
                newCount++;
            } else {
                updateCount++;
            }
        }
        
        console.log(`Đồng bộ hoàn tất. Mới: ${newCount}, Cập nhật: ${updateCount}`);
        return { total: data.length, new: newCount, updated: updateCount };

    } catch (error: any) {
        console.error('Lỗi đồng bộ trạm sạc:', error);
        throw error;
    }
};

// 1. API: Đồng bộ dữ liệu từ VinFast về Database
router.post('/sync', async (req: Request, res: Response) => {
    try {
        const stats = await syncChargingStations(true); // Force update khi gọi bằng tay
        res.json({
            success: true,
            message: 'Đồng bộ hoàn tất',
            stats: stats
        });
    } catch (error: any) {
         res.status(500).json({ error: error.message });
    }
});

// 2. API: Lấy danh sách trạm sạc để hiển thị lên bản đồ (GeoJSON)
router.get('/geojson', async (req: Request, res: Response) => {
    try {
        // Filter for Vietnam Bounding Box (approx)
        // Lon: 102 - 110, Lat: 8 - 24
        const query = `
            SELECT 
                id, external_id, name, address, category, hotline, status, open_time, close_time, lat, lon,
                ST_AsGeoJSON(ST_Transform(geom, 4326)) as geometry
            FROM charge_stations
            WHERE 
                lon BETWEEN 102 AND 115 
                AND lat BETWEEN 8 AND 24
        `;
        
        const result = await db.query(query);
        
        const features = result.rows.map((row: any) => ({
            type: 'Feature',
            properties: {
                id: row.id,
                name: row.name,
                address: row.address,
                category: row.category,
                hotline: row.hotline,
                status: row.status,
                open_time: row.open_time,
                close_time: row.close_time,
                type: 'charging_station' // Marker type cho frontend
            },
            geometry: JSON.parse(row.geometry)
        }));

        res.json({
            type: 'FeatureCollection',
            features: features
        });

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
