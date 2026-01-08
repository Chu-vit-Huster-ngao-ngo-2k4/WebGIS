# Hướng dẫn Import Dữ liệu OSM Thật

## Cách 1: Dùng Docker (Khuyên dùng - Dễ nhất)

### Bước 1: Download file PBF London

```bash
cd D:\KITS\DA1\webgis-main\data
python download_london_osm.py
```

Hoặc download thủ công:
- Truy cập: https://download.geofabrik.de/europe/great-britain/england/
- Download: `greater-london-latest.osm.pbf` (~100-200 MB)

### Bước 2: Import vào PostGIS

**Trên Windows (Git Bash hoặc WSL):**
```bash
cd D:\KITS\DA1\webgis-main\data
bash import_osm_docker.sh greater-london-latest.osm.pbf
```

**Hoặc chạy từng bước thủ công:**

1. Extract buildings từ PBF:
```bash
docker run --rm -v "$(pwd):/data" \
    ghcr.io/osmcode/osmium-tool:latest \
    tags-filter /data/greater-london-latest.osm.pbf building -o /data/buildings.osm.pbf
```

2. Convert sang GeoJSON:
```bash
docker run --rm -v "$(pwd):/data" \
    ghcr.io/osmcode/osmium-tool:latest \
    export /data/buildings.osm.pbf -o /data/buildings.geojson
```

3. Import vào PostGIS:
```bash
docker run --rm \
    -v "$(pwd):/data" \
    --network webgis-main_webgis-network \
    osgeo/gdal:ubuntu-small-latest \
    ogr2ogr -f "PostgreSQL" \
    PG:"host=postgres dbname=webgis user=postgres password=postgres port=5432" \
    /data/buildings.geojson \
    -nln buildings \
    -lco GEOMETRY_NAME=geom \
    -nlt MULTIPOLYGON \
    -t_srs EPSG:4326 \
    -overwrite
```

### Bước 3: Restart backend

```bash
cd D:\KITS\DA1\webgis-main
docker compose restart backend
```

### Bước 4: Xem kết quả

1. Mở http://localhost:8081
2. Hard refresh: `Ctrl + Shift + R`
3. Bật "Vector Tiles (MVT)" hoặc "Raster Tiles (Mapnik)"
4. Zoom vào London → Sẽ thấy hàng nghìn buildings thật!

---

## Cách 2: Dùng Overpass API (Nhỏ, nhanh nhưng dễ timeout)

```bash
cd D:\KITS\DA1\webgis-main\data
python import_osm_data.py overpass
```

**Lưu ý:** Overpass thường timeout với khu vực lớn. Chỉ dùng cho vùng nhỏ.

---

## Cách 3: Import từ GeoJSON có sẵn

Nếu bạn có file GeoJSON:

```bash
python import_osm_data.py geojson your-buildings.geojson
docker compose restart backend
```

---

## Kiểm tra dữ liệu

```bash
# Xem số lượng buildings
docker exec -i webgis-postgres psql -U postgres -d webgis -c "SELECT COUNT(*) FROM buildings;"

# Xem một vài buildings
docker exec -i webgis-postgres psql -U postgres -d webgis -c "SELECT name, type FROM buildings LIMIT 10;"
```

---

## Troubleshooting

### Lỗi: "network webgis-main_webgis-network not found"
```bash
# Tạo network trước
docker network create webgis-main_webgis-network
# Hoặc dùng network mặc định
# Sửa script: --network webgis-main_webgis-network → --network host
```

### Lỗi: "Permission denied" khi chạy script
```bash
# Trên Windows Git Bash
chmod +x import_osm_docker.sh
bash import_osm_docker.sh file.pbf
```

### File PBF quá lớn
- Dùng extract nhỏ hơn từ: https://www.openstreetmap.org/export
- Hoặc filter trước khi import (chỉ lấy khu vực cần)

---

## Kết quả mong đợi

Sau khi import thành công:
- **Hàng nghìn buildings** với shape phức tạp (không phải hình vuông)
- **Khớp hoàn toàn** với bản đồ OpenStreetMap
- **Chi tiết** theo footprint thực tế của từng tòa nhà
- **Render đẹp** với style Mapnik (màu xám cho buildings, xanh cho water, vàng cho roads)


