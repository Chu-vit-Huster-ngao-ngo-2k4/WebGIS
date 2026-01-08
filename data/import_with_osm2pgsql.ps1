# Script to import OSM data using osm2pgsql via Docker
# Usage: .\import_with_osm2pgsql.ps1 -PbfFile belarus-251111.osm.pbf

param (
    [string]$PbfFile = "belarus-251111.osm.pbf"
)

$ErrorActionPreference = "Stop"

# Check if file exists
if (-not (Test-Path $PbfFile)) {
    Write-Host "Error: File $PbfFile not found in current directory." -ForegroundColor Red
    exit 1
}

Write-Host "=== Starting OSM Import with osm2pgsql ===" -ForegroundColor Cyan
Write-Host "Target File: $PbfFile"
Write-Host "Database: webgis (on container 'webgis-postgres')"

# Ensure network exists (usually created by docker-compose up)
# We assume the network name is 'webgis-main_webgis-network' or similar based on folder name.
# Let's try to find the network name dynamically or assume a standard one.
# Since docker-compose.yml defines 'webgis-network', docker compose usually prefixes it.
# We will use the container name 'webgis-postgres' to link or use the network.

# Run osm2pgsql container
# -c: create (overwrite)
# -d: database name
# -U: user
# -H: host
# -S: style (default)
# --slim: allows updates (optional but good)
# Using iboates/osm2pgsql as it is a well-maintained minimal image (osm2pgsql/osm2pgsql is not available)

Write-Host "Running osm2pgsql container..." -ForegroundColor Yellow

docker run --rm `
    -v "${PWD}:/data" `
    --network webgis-main_webgis-network `
    -e PGPASSWORD=postgres `
    iboates/osm2pgsql:latest `
    -c -d webgis -U postgres -H webgis-postgres `
    --slim `
    "/data/$PbfFile"

if ($LASTEXITCODE -eq 0) {
    Write-Host "=== Import Successful! ===" -ForegroundColor Green
    Write-Host "Tables created: planet_osm_point, planet_osm_line, planet_osm_polygon, planet_osm_roads"
} else {
    Write-Host "=== Import Failed ===" -ForegroundColor Red
}
