# Tóm Tắt Dự Án WebGIS

## 🎯 Dự án này là gì?

**WebGIS** là một ứng dụng web hiển thị bản đồ GIS (Geographic Information System) đầy đủ tính năng, cho phép:
- Hiển thị bản đồ tương tác trên trình duyệt
- Render tiles (raster và vector) từ dữ liệu không gian trong database
- Truy vấn và hiển thị các đối tượng địa lý (buildings, roads, points, water)
- Quản lý và tương tác với dữ liệu không gian

## 🏗️ Kiến trúc hệ thống

```
┌─────────────┐
│  Frontend   │  OpenLayers + TypeScript
│  (Port 8081)│  Hiển thị bản đồ tương tác
└──────┬──────┘
       │ HTTP Requests
┌──────▼──────┐
│   Backend   │  Node.js + Express + TypeScript
│  (Port 3000)│  API + Tile Rendering (Mapnik)
└──────┬──────┘
       │ SQL Queries
┌──────▼──────┐
│  PostgreSQL │  Database với PostGIS extension
│  (Port 5432)│  Lưu trữ dữ liệu không gian
└─────────────┘
```

## ✅ Những gì đã có trong dự án

### 1. **Backend API Server** (Node.js + Express + TypeScript)

#### 🗺️ Tile Rendering Service
- ✅ **Raster Tiles (PNG)**: `/tiles/raster/:z/:x/:y.png`
  - Render bản đồ thành ảnh PNG 256x256 từ dữ liệu PostGIS
  - Sử dụng Mapnik để render
  - Style được định nghĩa trong `backend/styles/raster-style.xml`
  - Ví dụ: http://localhost:3000/tiles/raster/14/5115/3406.png

- ✅ **Vector Tiles (MVT)**: `/tiles/vector/:z/:x/:y.mvt`
  - Render bản đồ thành vector tiles (Mapbox Vector Tiles format)
  - Cho phép style động ở client-side
  - Style được định nghĩa trong `backend/styles/vector-style.xml`
  - Ví dụ: http://localhost:3000/tiles/vector/14/5115/3406.mvt

#### 📊 Data API
- ✅ **GET /api/data/layers**: Lấy danh sách tất cả các layers (tables) trong database
  - Trả về danh sách các bảng có dữ liệu không gian
  - Ví dụ: http://localhost:3000/api/data/layers

- ✅ **GET /api/data/layers/:layerName/features?bbox=minX,minY,maxX,maxY**
  - Lấy features từ một layer cụ thể (buildings, roads, points, water_polygons)
  - Có thể filter theo bounding box (vùng nhìn hiện tại)
  - Trả về GeoJSON format
  - Giới hạn 1000 features mỗi request
  - Ví dụ: http://localhost:3000/api/data/layers/buildings/features?bbox=-0.13,51.50,-0.11,51.51

- ✅ **GET /health**: Health check endpoint
  - Kiểm tra trạng thái server
  - Ví dụ: http://localhost:3000/health

### 2. **Database** (PostgreSQL + PostGIS)

#### 📦 Dữ liệu không gian đã có:
- ✅ **buildings** (Tòa nhà) - Polygon geometry
  - 16 records mẫu ở khu vực London
  - Các tòa nhà như County Hall, Trafalgar Building, City Hall

- ✅ **roads** (Đường phố) - LineString geometry
  - 15 records mẫu
  - Các con đường như Westminster Bridge Rd, Strand, Tooley Street

- ✅ **points** (Điểm quan tâm) - Point geometry
  - 19 records mẫu
  - Các điểm như London Eye, Big Ben, Trafalgar Square, Tower Bridge

- ✅ **water_polygons** (Vùng nước) - Polygon geometry
  - 7 records mẫu
  - Các vùng nước như Thames Section

**Tổng cộng: 57 features** trong database

#### 🔍 Spatial Indexes
- ✅ Đã tạo GIST indexes cho tất cả geometry columns
- ✅ Tối ưu hóa truy vấn không gian

### 3. **Frontend** (OpenLayers + TypeScript)

#### 🗺️ Interactive Map
- ✅ Bản đồ tương tác với OpenLayers 8.x
- ✅ Zoom in/out, pan, drag
- ✅ Hiển thị thông tin zoom level và center coordinates
- ✅ Center mặc định: London (Longitude: -0.12, Latitude: 51.505)
- ✅ Zoom mặc định: 14

#### 🎛️ Layer Controls
- ✅ **OpenStreetMap (Base)**: Lớp nền từ OSM (mặc định bật)
- ✅ **Raster Tiles (Mapnik)**: Bật/tắt lớp raster từ backend
- ✅ **Vector Tiles (MVT)**: Bật/tắt lớp vector từ backend

#### 📍 Feature Loading & Interaction
- ✅ Nút "Load Features": Tải features (buildings) trong vùng nhìn hiện tại
- ✅ Hiển thị số lượng features đã load
- ✅ Features được vẽ lên bản đồ với style màu đỏ
- ✅ Click vào feature để xem thông tin (hiển thị trong console)
- ✅ Features có thể được highlight khi hover

### 4. **Infrastructure**

#### 🐳 Docker Compose Setup
- ✅ **PostgreSQL + PostGIS container** (postgis/postgis:15-3.3)
  - Tự động khởi tạo database với PostGIS extension
  - Tự động chạy init.sql khi container khởi động lần đầu

- ✅ **Backend Node.js container**
  - Build từ Dockerfile.backend
  - Tự động compile TypeScript
  - Cài đặt Mapnik và dependencies

- ✅ **Frontend Nginx container**
  - Serve static files từ thư mục frontend
  - Port 8081

- ✅ **Network**: Tất cả containers trong cùng network `webgis-network`

#### 📝 Data Management Scripts
- ✅ `data/init.sql`: Khởi tạo database và tạo các bảng
- ✅ `data/sample_data.sql`: Dữ liệu mẫu cho London area
- ✅ `data/extended_london_data.sql`: Dữ liệu mở rộng với nhiều features hơn
- ✅ `data/import_osm_data.py`: Script Python để import dữ liệu OSM thật
- ✅ `data/download_london_osm.py`: Script download dữ liệu London từ Geofabrik
- ✅ `data/import_osm_docker.sh`: Script bash để import OSM bằng Docker

## 🛠️ Công nghệ sử dụng

### Frontend
- **OpenLayers 8.x** - Thư viện bản đồ tương tác
- **TypeScript** - Type-safe development
- **HTML5, CSS3** - UI/UX

### Backend
- **Node.js 18+** - Runtime
- **Express** - Web framework
- **TypeScript** - Type-safe backend
- **Mapnik** - Map rendering engine (raster & vector tiles)
- **PostgreSQL** - Database
- **PostGIS** - Spatial database extension
- **pg** - PostgreSQL client

### Deployment
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **Nginx** - Web server cho frontend

## 📊 Dữ liệu mẫu

Dự án có sẵn **57 features** mẫu ở khu vực London:
- **Buildings**: 16 tòa nhà (County Hall, Trafalgar Building, City Hall...)
- **Roads**: 15 con đường (Westminster Bridge Rd, Strand, Tooley Street...)
- **Points**: 19 điểm quan tâm (London Eye, Big Ben, Trafalgar Square, Tower Bridge...)
- **Water**: 7 vùng nước (Thames Section...)

Khu vực dữ liệu: Longitude -0.13 đến -0.08, Latitude 51.50 đến 51.51

## 🚀 Tính năng chính

1. ✅ **Raster Tile Rendering**: Render bản đồ thành ảnh PNG từ PostGIS
2. ✅ **Vector Tile Rendering**: Render bản đồ thành MVT từ PostGIS
3. ✅ **RESTful API**: Truy vấn dữ liệu không gian qua API
4. ✅ **Interactive Map**: Bản đồ tương tác với zoom, pan, drag
5. ✅ **Layer Management**: Bật/tắt các lớp bản đồ
6. ✅ **Feature Loading**: Tải features theo vùng nhìn
7. ✅ **Feature Interaction**: Click để xem thông tin features
8. ✅ **Docker Deployment**: Dễ dàng deploy với Docker Compose

## 📈 Có thể mở rộng

- ➕ Thêm nhiều dữ liệu hơn (import từ OSM, Shapefile, GeoJSON)
- ➕ Thêm tính năng search, filter features
- ➕ Thêm popup hiển thị thông tin feature chi tiết
- ➕ Thêm style động theo thuộc tính (theo loại building, road type...)
- ➕ Thêm tính năng edit/update features
- ➕ Thêm authentication/authorization
- ➕ Thêm tính năng export dữ liệu
- ➕ Thêm tính năng routing/navigation
- ➕ Thêm tính năng geocoding/reverse geocoding

## 🧪 Cách test

### Test Backend API:
```bash
# Health check
curl http://localhost:3000/health

# Get layers
curl http://localhost:3000/api/data/layers

# Get features
curl "http://localhost:3000/api/data/layers/buildings/features?bbox=-0.13,51.50,-0.11,51.51"

# Get raster tile (lưu vào file)
curl http://localhost:3000/tiles/raster/14/5115/3406.png -o test.png

# Get vector tile (lưu vào file)
curl http://localhost:3000/tiles/vector/14/5115/3406.mvt -o test.mvt
```

### Test Frontend:
1. Mở http://localhost:8081
2. Bật "Vector Tiles (MVT)" hoặc "Raster Tiles (Mapnik)" để xem dữ liệu được render
3. Click "Load Features" để tải buildings trong vùng nhìn
4. Click vào các features để xem thông tin trong console (F12)

### Test Database:
```bash
# Xem số lượng buildings
docker exec -i webgis-postgres psql -U postgres -d webgis -c "SELECT COUNT(*) FROM buildings;"

# Xem một vài buildings
docker exec -i webgis-postgres psql -U postgres -d webgis -c "SELECT name, type FROM buildings LIMIT 10;"
```

## 📁 Cấu trúc thư mục

```
webgis-main/
├── backend/              # Backend API Server
│   ├── src/
│   │   ├── config/      # Database config
│   │   ├── routes/      # API routes (tiles, data)
│   │   └── server.ts    # Express server
│   ├── styles/          # Mapnik style files
│   │   ├── raster-style.xml
│   │   └── vector-style.xml
│   └── package.json
│
├── frontend/            # Frontend Application
│   ├── src/
│   │   └── app.ts       # OpenLayers application
│   ├── css/
│   │   └── style.css
│   ├── index.html
│   └── package.json
│
├── data/                # Data & Import Scripts
│   ├── init.sql         # Database initialization
│   ├── sample_data.sql  # Sample London data
│   ├── import_osm_data.py
│   └── download_london_osm.py
│
├── docker/              # Dockerfiles
│   └── Dockerfile.backend
│
├── docker-compose.yml   # Docker Compose config
└── README.md
```

## 🎓 Tóm lại

Đây là một **ứng dụng WebGIS hoàn chỉnh** với:
- ✅ Backend API đầy đủ tính năng (tile rendering + data API)
- ✅ Frontend tương tác với OpenLayers
- ✅ Database PostgreSQL/PostGIS với 57 features mẫu
- ✅ Docker setup để dễ dàng deploy
- ✅ Hỗ trợ cả raster và vector tiles
- ✅ Sẵn sàng để mở rộng và phát triển thêm

Dự án này có thể được sử dụng làm:
- 🎯 Base project cho các ứng dụng GIS
- 🎯 Learning project để học về WebGIS, PostGIS, Mapnik
- 🎯 Template cho các dự án mapping tương tự



