#!/usr/bin/env python3
"""
Simple script to import OSM buildings into PostGIS
Works on Windows without needing Bash/WSL
"""

import subprocess
import os
import sys
import urllib.request
import urllib.error

def run_docker_command(cmd, description):
    """Run a docker command and show progress"""
    print(f"\n{description}...")
    print(f"Command: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
        return False
    print("✓ Done")
    return True

def download_pbf(url, output_file):
    """Download PBF file with progress and redirect handling"""
    if os.path.exists(output_file):
        file_size = os.path.getsize(output_file) / 1024 / 1024
        if file_size > 10:  # File > 10MB, probably valid
            response = input(f"{output_file} already exists ({file_size:.1f} MB). Use it? (y/n): ")
            if response.lower() == 'y':
                return True
        os.remove(output_file)
    
    print(f"\nDownloading {output_file}...")
    print("This may take a while (100-200 MB)...")
    print("URL: " + url)
    
    try:
        # Create request with proper headers
        req = urllib.request.Request(url)
        req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
        
        # Open URL and handle redirects
        with urllib.request.urlopen(req) as response:
            # Get file size from headers
            total_size = int(response.headers.get('Content-Length', 0))
            total_mb = total_size / 1024 / 1024 if total_size > 0 else 0
            
            if total_size == 0:
                # Try to get size from Content-Disposition or estimate
                print("⚠ Could not determine file size from headers")
            
            print(f"File size: {total_mb:.1f} MB" if total_mb > 0 else "Downloading...")
            
            downloaded = 0
            last_percent = -1
            
            with open(output_file, 'wb') as f:
                while True:
                    chunk = response.read(8192)  # 8KB chunks
                    if not chunk:
                        break
                    f.write(chunk)
                    downloaded += len(chunk)
                    
                    if total_size > 0:
                        percent = min(int(downloaded * 100 / total_size), 100)
                        if percent != last_percent:
                            mb = downloaded / 1024 / 1024
                            print(f"\rProgress: {percent}% ({mb:.1f} / {total_mb:.1f} MB)", end='', flush=True)
                            last_percent = percent
                    else:
                        mb = downloaded / 1024 / 1024
                        print(f"\rDownloaded: {mb:.1f} MB", end='', flush=True)
        
        file_size = os.path.getsize(output_file) / 1024 / 1024
        print(f"\n✓ Download complete: {file_size:.1f} MB")
        
        if file_size < 10:
            print("⚠ Warning: File seems too small. Download may have failed.")
            if os.path.exists(output_file):
                os.remove(output_file)
            return False
        
        return True
    except urllib.error.HTTPError as e:
        print(f"\n✗ HTTP Error: {e.code} - {e.reason}")
        if os.path.exists(output_file):
            os.remove(output_file)
        return False
    except Exception as e:
        print(f"\n✗ Download failed: {e}")
        if os.path.exists(output_file):
            os.remove(output_file)
        return False

def import_osm_buildings(pbf_file):
    """Import buildings from OSM PBF file"""
    
    if not os.path.exists(pbf_file):
        print(f"Error: File not found: {pbf_file}")
        return False
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = script_dir
    pbf_name = os.path.basename(pbf_file)
    pbf_path = os.path.join(data_dir, pbf_name)
    
    # Use absolute path and copy PBF to data directory if needed
    pbf_file_abs = os.path.abspath(pbf_file)
    pbf_path_abs = os.path.abspath(pbf_path)
    
    if pbf_file_abs != pbf_path_abs:
        import shutil
        print(f"Copying {pbf_file} to {pbf_path}...")
        shutil.copy2(pbf_file_abs, pbf_path_abs)
        pbf_file = pbf_path_abs
    else:
        pbf_file = pbf_file_abs
    
    # Verify file exists and has reasonable size
    if not os.path.exists(pbf_file):
        print(f"Error: File not found: {pbf_file}")
        return False
    
    file_size = os.path.getsize(pbf_file) / 1024 / 1024
    if file_size < 10:
        print(f"Error: File too small ({file_size:.1f} MB). Download may have failed.")
        return False
    
    print(f"Using PBF file: {pbf_file} ({file_size:.1f} MB)")
    
    # Step 1: Extract buildings directly from PBF using ogr2ogr
    print("\nStep 1: Extracting buildings from PBF...")
    print("Note: This may take 5-15 minutes for large files (300+ MB)...")
    print("Using ogr2ogr to read PBF directly...")
    
    # Check network
    network_name = "webgis-main_webgis-network"
    result = subprocess.run(['docker', 'network', 'ls'], capture_output=True, text=True)
    if network_name not in result.stdout:
        print(f"⚠ Network {network_name} not found. Using 'host' network...")
        network_arg = ['--network', 'host']
    else:
        network_arg = ['--network', network_name]
    
    # Try different GDAL images - initialize variable
    gdal_image = None
    gdal_images = [
        'osgeo/gdal:alpine-small-latest',
        'osgeo/gdal:ubuntu-latest',
        'ghcr.io/osgeo/gdal:ubuntu-small-latest',
        'osgeo/gdal:latest'
    ]
    
    print("Finding available GDAL Docker image...")
    for img in gdal_images:
        print(f"  Trying: {img}...")
        result = subprocess.run(['docker', 'pull', img], capture_output=True, text=True, timeout=120)
        if result.returncode == 0:
            print(f"  ✓ Found working image: {img}")
            gdal_image = img
            break
        else:
            print(f"  ✗ {img} not available")
    
    if not gdal_image:
        print("\n⚠ Could not find GDAL image. Pulling default...")
        gdal_image = 'osgeo/gdal:alpine-small-latest'
        print(f"Pulling {gdal_image}...")
        subprocess.run(['docker', 'pull', gdal_image], timeout=300)
    
    # Extract buildings to GeoJSON directly from PBF
    if not run_docker_command([
        'docker', 'run', '--rm',
        '-v', f'{data_dir}:/data'
    ] + network_arg + [
        gdal_image,
        'ogr2ogr', '-f', 'GeoJSON',
        '/data/buildings.geojson',
        f'/data/{pbf_name}',
        '-sql', "SELECT * FROM multipolygons WHERE building IS NOT NULL",
        '-skipfailures',
        '-progress'
    ], "Extracting buildings from PBF"):
        print("\n⚠ Direct extraction failed. Trying alternative SQL...")
        # Try without SQL filter
        if not run_docker_command([
            'docker', 'run', '--rm',
            '-v', f'{data_dir}:/data'
        ] + network_arg + [
            gdal_image,
            'ogr2ogr', '-f', 'GeoJSON',
            '/data/buildings.geojson',
            f'/data/{pbf_name}',
            'multipolygons',
            '-where', "building IS NOT NULL",
            '-skipfailures'
        ], "Extracting buildings (alternative method)"):
            print("✗ Failed to extract buildings. The PBF file might be corrupted or in an unsupported format.")
            return False
    
    # Step 2: Import to PostGIS (network already checked above)
    print("\nStep 2: Importing to PostGIS...")
    
    # Use the same GDAL image for import
    if not gdal_image:
        gdal_image = 'osgeo/gdal:alpine-small-latest'
    
    if not run_docker_command([
        'docker', 'run', '--rm',
        '-v', f'{data_dir}:/data'
    ] + network_arg + [
        gdal_image,
        'ogr2ogr', '-f', 'PostgreSQL',
        'PG:host=postgres dbname=webgis user=postgres password=postgres port=5432',
        '/data/buildings.geojson',
        '-nln', 'buildings_temp',
        '-lco', 'GEOMETRY_NAME=geom',
        '-lco', 'FID=id',
        '-nlt', 'MULTIPOLYGON',
        '-t_srs', 'EPSG:4326',
        '-overwrite'
    ], "Step 2: Importing to PostGIS"):
        return False
    
    # Step 4: Process data in PostGIS
    print("\nStep 4: Processing data in PostGIS...")
    
    sql = """
    -- Clear old buildings
    DELETE FROM buildings;
    
    -- Import from temp table
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
    """
    
    result = subprocess.run([
        'docker', 'exec', '-i', 'webgis-postgres',
        'psql', '-U', 'postgres', '-d', 'webgis'
    ], input=sql, text=True, capture_output=True)
    
    if result.returncode == 0:
        print("✓ Data processed")
        print(result.stdout)
    else:
        print("✗ Error processing data:")
        print(result.stderr)
        return False
    
    return True

def main():
    print("=== OSM Buildings Import Tool ===")
    print()
    
    if len(sys.argv) > 1:
        pbf_file = sys.argv[1]
    else:
        # Ask user
        print("Options:")
        print("1. Download and import London PBF (recommended)")
        print("2. Use existing PBF file")
        choice = input("\nChoose (1/2): ").strip()
        
        if choice == '1':
            url = "https://download.geofabrik.de/europe/great-britain/england/greater-london-latest.osm.pbf"
            pbf_file = "greater-london-latest.osm.pbf"
            if not download_pbf(url, pbf_file):
                return
        elif choice == '2':
            pbf_file = input("Enter path to PBF file: ").strip().strip('"')
        else:
            print("Invalid choice")
            return
    
    if import_osm_buildings(pbf_file):
        print("\n" + "="*50)
        print("✓ Import successful!")
        print("\nNext steps:")
        print("1. Restart backend: docker compose restart backend")
        print("2. Refresh browser: http://localhost:8081")
        print("3. Enable 'Vector Tiles (MVT)' or 'Raster Tiles (Mapnik)'")
        print("4. Zoom into London to see thousands of real buildings!")
    else:
        print("\n✗ Import failed. Check errors above.")

if __name__ == '__main__':
    main()

