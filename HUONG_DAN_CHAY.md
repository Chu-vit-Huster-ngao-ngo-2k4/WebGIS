# Hướng Dẫn Chạy Project WebGIS

## Yêu Cầu Hệ Thống

- **Docker** và **Docker Compose** (khuyên dùng)
- Hoặc cài đặt local: Node.js 18+, PostgreSQL 15+ với PostGIS

## Cách 1: Chạy với Docker (Khuyên dùng - Dễ nhất)

### Bước 1: Kiểm tra Docker đã cài đặt

```bash
docker --version
docker-compose --version
```

Nếu chưa có Docker, tải tại: https://www.docker.com/products/docker-desktop

### Bước 2: Di chuyển vào thư mục project

```bash
cd D:\KITS\DA1\webgis-main
```

### Bước 3: Khởi động tất cả services

```bash
docker-compose up -d
```

Lệnh này sẽ:
- Tải và build các Docker images cần thiết
- Khởi động PostgreSQL với PostGIS
- Khởi động Backend API (Node.js/Express)
- Khởi động Frontend (Nginx)

**Lưu ý:** Lần đầu chạy có thể mất vài phút để download images và build.

### Bước 4: Kiểm tra services đã chạy

```bash
docker-compose ps
```

Bạn sẽ thấy 3 containers:
- `webgis-postgres` - Database
- `webgis-backend` - Backend API
- `webgis-frontend` - Frontend

### Bước 5: Xem logs (nếu cần)

```bash
# Xem logs của tất cả services
docker-compose logs

# Xem logs của backend
docker-compose logs backend

# Xem logs real-time
docker-compose logs -f backend
```

### Bước 6: Truy cập ứng dụng

- **Frontend:** http://localhost:8081
- **Backend API:** http://localhost:3000
- **Health Check:** http://localhost:3000/health
- **PostgreSQL:** localhost:5432

### Bước 7: Dừng services

```bash
docker-compose down
```

Để xóa cả volumes (dữ liệu database):
```bash
docker-compose down -v
```

---

## Cách 2: Chạy Local (Không dùng Docker)

### Bước 1: Cài đặt PostgreSQL với PostGIS

1. Cài PostgreSQL 15+ từ: https://www.postgresql.org/download/
2. Cài PostGIS extension
3. Tạo database:
```sql
CREATE DATABASE webgis;
\c webgis
CREATE EXTENSION postgis;
```

### Bước 2: Chạy Backend

```bash
cd D:\KITS\DA1\webgis-main\backend
npm install
npm run build
npm start
```

Hoặc chạy development mode:
```bash
npm run dev
```

### Bước 3: Chạy Frontend

Mở terminal mới:
```bash
cd D:\KITS\DA1\webgis-main\frontend
npm install
npm run build
npm run dev
```

Frontend sẽ chạy tại: http://localhost:8080

---

## Import Dữ Liệu OSM (Tùy chọn)

Nếu muốn import dữ liệu OpenStreetMap thật vào database:

### Xem hướng dẫn chi tiết:
```bash
cat D:\KITS\DA1\webgis-main\data\README_IMPORT.md
```

### Cách nhanh nhất:

1. **Download dữ liệu London:**
```bash
cd D:\KITS\DA1\webgis-main\data
python download_london_osm.py
```

2. **Import vào database:**
```bash
bash import_osm_docker.sh greater-london-latest.osm.pbf
```

3. **Restart backend:**
```bash
cd D:\KITS\DA1\webgis-main
docker-compose restart backend
```

---

## Kiểm Tra Database

### Xem dữ liệu trong database:

```bash
# Vào container PostgreSQL
docker exec -it webgis-postgres psql -U postgres -d webgis

# Hoặc chạy query từ bên ngoài
docker exec -i webgis-postgres psql -U postgres -d webgis -c "SELECT COUNT(*) FROM buildings;"
```

### Các bảng có sẵn:
- `buildings` - Tòa nhà
- `roads` - Đường phố
- `points` - Điểm quan tâm
- `water_polygons` - Vùng nước

---

## API Endpoints

### Tiles
- **Raster tiles:** `GET /tiles/raster/:z/:x/:y.png`
  - Ví dụ: http://localhost:3000/tiles/raster/10/511/340.png
- **Vector tiles:** `GET /tiles/vector/:z/:x/:y.mvt`
  - Ví dụ: http://localhost:3000/tiles/vector/10/511/340.mvt

### Data
- **Get layers:** `GET /api/data/layers`
- **Get features:** `GET /api/data/layers/:layerName/features?bbox=minX,minY,maxX,maxY`

### Health Check
- **Health:** `GET /health`

---

## Troubleshooting

### Lỗi: Port đã được sử dụng

Nếu port 3000, 5432, hoặc 8081 đã được sử dụng:

1. Sửa file `docker-compose.yml` để đổi port
2. Hoặc dừng service đang dùng port đó

### Lỗi: Backend không kết nối được database

```bash
# Kiểm tra PostgreSQL đã chạy chưa
docker-compose ps

# Xem logs của PostgreSQL
docker-compose logs postgres

# Kiểm tra network
docker network ls
```

### Lỗi: Mapnik không hoạt động

Mapnik cần nhiều dependencies. Nếu chạy local trên Windows, nên dùng Docker.

### Lỗi: Frontend không load được tiles

1. Kiểm tra backend đã chạy: http://localhost:3000/health
2. Mở Developer Tools (F12) xem console errors
3. Kiểm tra CORS settings trong backend

### Reset toàn bộ (xóa dữ liệu)

```bash
docker-compose down -v
docker-compose up -d
```

---

## Cấu Trúc Project

```
webgis-main/
├── backend/          # Backend API (Node.js/Express/TypeScript)
├── frontend/         # Frontend (OpenLayers/TypeScript)
├── data/            # Scripts import dữ liệu OSM
├── docker/          # Dockerfile cho backend
└── docker-compose.yml
```

---

## Liên Kết Hữu Ích

- Frontend: http://localhost:8081
- Backend API: http://localhost:3000
- Health Check: http://localhost:3000/health
- [OpenLayers Documentation](https://openlayers.org/doc/)
- [Mapnik Documentation](https://mapnik.org/documentation/)
- [PostGIS Documentation](https://postgis.net/documentation/)

---

## Ghi Chú

- Lần đầu chạy Docker có thể mất 5-10 phút để download images
- Database sẽ tự động khởi tạo với sample data khi container chạy lần đầu
- Nếu muốn dữ liệu thật, cần import OSM data theo hướng dẫn ở trên



