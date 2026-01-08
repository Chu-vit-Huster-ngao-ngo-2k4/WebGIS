#!/bin/bash
# Script to import OSM data using Docker containers
# This works on Windows with Git Bash or WSL

set -e

echo "=== OSM Data Import Script ==="
echo ""

# Check if PBF file is provided
if [ -z "$1" ]; then
    echo "Usage: ./import_osm_docker.sh <path-to-pbf-file>"
    echo ""
    echo "To download London PBF file:"
    echo "  wget https://download.geofabrik.de/europe/great-britain/england/greater-london-latest.osm.pbf"
    echo ""
    echo "Or use a smaller extract:"
    echo "  wget https://download.geofabrik.de/europe/great-britain/england/greater-london-latest.osm.pbf"
    exit 1
fi

PBF_FILE="$1"

if [ ! -f "$PBF_FILE" ]; then
    echo "Error: PBF file not found: $PBF_FILE"
    exit 1
fi

echo "Processing: $PBF_FILE"
echo ""

# Step 1: Extract buildings using osmium (in Docker)
echo "Step 1: Extracting buildings from PBF..."
docker run --rm -v "$(pwd):/data" \
    ghcr.io/osmcode/osmium-tool:latest \
    tags-filter /data/$(basename "$PBF_FILE") building -o /data/buildings.osm.pbf

# Step 2: Convert to GeoJSON
echo "Step 2: Converting to GeoJSON..."
docker run --rm -v "$(pwd):/data" \
    ghcr.io/osmcode/osmium-tool:latest \
    export /data/buildings.osm.pbf -o /data/buildings.geojson

# Step 3: Import to PostGIS using ogr2ogr
echo "Step 3: Importing to PostGIS..."
docker run --rm \
    -v "$(pwd):/data" \
    --network webgis-main_webgis-network \
    osgeo/gdal:ubuntu-small-latest \
    ogr2ogr -f "PostgreSQL" \
    PG:"host=postgres dbname=webgis user=postgres password=postgres port=5432" \
    /data/buildings.geojson \
    -nln buildings_temp \
    -lco GEOMETRY_NAME=geom \
    -lco FID=id \
    -nlt MULTIPOLYGON \
    -t_srs EPSG:4326 \
    -overwrite

echo ""
echo "Step 4: Cleaning up and merging data..."
# Connect to PostGIS and process the data
docker exec -i webgis-postgres psql -U postgres -d webgis << 'SQL'
-- Clear old buildings
DELETE FROM buildings;

-- Import from temp table, extracting name and building type
INSERT INTO buildings (name, type, geom)
SELECT 
    COALESCE(
        properties->>'name',
        properties->>'addr:housename',
        'Unnamed Building'
    ) as name,
    COALESCE(
        properties->>'building',
        'unknown'
    ) as type,
    geom
FROM (
    SELECT 
        jsonb_build_object(
            'name', name,
            'building', building,
            'addr:housename', addr_housename
        ) as properties,
        geom
    FROM buildings_temp
) t;

-- Drop temp table
DROP TABLE IF EXISTS buildings_temp;

-- Create index
CREATE INDEX IF NOT EXISTS buildings_geom_idx ON buildings USING GIST (geom);

-- Show count
SELECT COUNT(*) as total_buildings FROM buildings;
SQL

echo ""
echo "=== Import Complete ==="
echo "Restart backend to see new data:"
echo "  docker compose restart backend"


