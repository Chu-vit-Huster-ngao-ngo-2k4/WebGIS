-- Tạo bảng trạm sạc nếu chưa tồn tại
CREATE TABLE IF NOT EXISTS charge_stations (
    id SERIAL PRIMARY KEY,
    external_id VARCHAR(50) UNIQUE, -- ID từ hệ thống VinFast để check trùng
    name VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    category VARCHAR(50), -- 1: Showroom, 2: Service, 3: Station...
    lat FLOAT,
    lon FLOAT,
    geom GEOMETRY(Point, 3857), -- Tọa độ chuẩn Web Mercator cho bản đồ
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tạo chỉ mục không gian để truy vấn nhanh
CREATE INDEX IF NOT EXISTS idx_charge_stations_geom ON charge_stations USING GIST(geom);
