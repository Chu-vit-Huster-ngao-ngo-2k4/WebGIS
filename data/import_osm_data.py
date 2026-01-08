#!/usr/bin/env python3
"""
Script to import OpenStreetMap data into PostGIS database
Requires: psycopg2, overpy (for Overpass API) or osmium (for PBF files)
"""

import psycopg2
import sys
import time
import random

# Database connection
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'webgis',
    'user': 'postgres',
    'password': 'postgres'
}

OVERPASS_BBOX = (51.500, -0.125, 51.502, -0.120)  # Very small area around Westminster Bridge
OVERPASS_TIMEOUT = 180
OVERPASS_MAX_RETRIES = 3
OVERPASS_RETRY_BASE_WAIT = 10  # seconds


def import_from_overpass():
    """
    Import data from OSM Overpass API
    Example: Get all buildings in London area
    """
    try:
        import overpy
    except ImportError:
        print("Error: Install overpy first: pip install overpy")
        return
    
    api = overpy.Overpass()
    
    south, west, north, east = OVERPASS_BBOX
    bbox_str = f"{south},{west},{north},{east}"
    
    # Query for buildings in the specified bounding box
    query = f"""
    [out:json][timeout:{OVERPASS_TIMEOUT}];
    (
      way["building"]({bbox_str});
      relation["building"]({bbox_str});
    );
    out body;
    >;
    out skel qt;
    """
    
    attempt = 0
    result = None
    while attempt < OVERPASS_MAX_RETRIES:
        attempt += 1
        try:
            print(f"Fetching data from Overpass API (attempt {attempt}/{OVERPASS_MAX_RETRIES})...")
            result = api.query(query)
            break
        except overpy.exception.OverpassGatewayTimeout:
            wait = OVERPASS_RETRY_BASE_WAIT * attempt + random.uniform(0, 2)
            print(f"Overpass gateway timeout. Retrying in {wait:.1f} seconds...")
            time.sleep(wait)
        except overpy.exception.OverpassTooManyRequests:
            wait = OVERPASS_RETRY_BASE_WAIT * attempt + random.uniform(0, 2)
            print(f"Overpass rate limit hit. Retrying in {wait:.1f} seconds...")
            time.sleep(wait)
        except Exception as exc:
            print(f"Failed to query Overpass API: {exc}")
            return
    
    if result is None:
        print("Exceeded maximum retries. Aborting import.")
        return
    
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    
    # Clear existing buildings
    cur.execute("DELETE FROM buildings;")
    
    building_count = 0
    for way in result.ways:
        if 'building' in way.tags:
            # Convert OSM way to PostGIS polygon
            coords = [(node.lon, node.lat) for node in way.nodes]
            if len(coords) >= 3:
                # Close the polygon
                if coords[0] != coords[-1]:
                    coords.append(coords[0])
                
                wkt = f"POLYGON(({', '.join([f'{lon} {lat}' for lon, lat in coords])}))"
                
                cur.execute("""
                    INSERT INTO buildings (name, type, geom)
                    VALUES (%s, %s, ST_GeomFromText(%s, 4326))
                """, (way.tags.get('name', 'Unnamed Building'), 
                      way.tags.get('building', 'unknown'),
                      wkt))
                building_count += 1
    
    conn.commit()
    cur.close()
    conn.close()
    
    print(f"Imported {building_count} buildings from OSM")

def generate_more_sample_data():
    """
    Generate more sample data by duplicating and offsetting existing buildings
    This creates realistic-looking data without needing Overpass API
    """
    import random
    
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    
    # Get existing buildings
    cur.execute("SELECT name, type, geom FROM buildings LIMIT 5;")
    existing = cur.fetchall()
    
    if not existing:
        print("No existing buildings found. Please import sample data first.")
        return
    
    print(f"Found {len(existing)} existing buildings. Generating more...")
    
    # Clear existing buildings first
    cur.execute("DELETE FROM buildings;")
    
    building_count = 0
    
    # Generate buildings in a grid pattern around London
    base_lat = 51.505
    base_lon = -0.12
    
    building_types = ['residential', 'commercial', 'civic', 'industrial', 'office']
    
    for i in range(20):  # 20 rows
        for j in range(20):  # 20 columns
            # Calculate offset
            lat_offset = (i - 10) * 0.001  # ~100m spacing
            lon_offset = (j - 10) * 0.0015
            
            center_lat = base_lat + lat_offset
            center_lon = base_lon + lon_offset
            
            # Random building size
            size_lat = random.uniform(0.0003, 0.0008)
            size_lon = random.uniform(0.0004, 0.001)
            
            # Create rectangle polygon
            wkt = f"POLYGON(({center_lon} {center_lat}, {center_lon + size_lon} {center_lat}, {center_lon + size_lon} {center_lat + size_lat}, {center_lon} {center_lat + size_lat}, {center_lon} {center_lat}))"
            
            building_type = random.choice(building_types)
            name = f"Building {i*20 + j + 1}"
            
            cur.execute("""
                INSERT INTO buildings (name, type, geom)
                VALUES (%s, %s, ST_GeomFromText(%s, 4326))
            """, (name, building_type, wkt))
            
            building_count += 1
    
    conn.commit()
    cur.close()
    conn.close()
    
    print(f"Generated {building_count} buildings in grid pattern around London")

def import_from_geojson(geojson_file):
    """
    Import buildings from a GeoJSON file
    """
    import json
    
    try:
        with open(geojson_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Error: File {geojson_file} not found")
        return
    except json.JSONDecodeError:
        print(f"Error: Invalid JSON in {geojson_file}")
        return
    
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    
    # Clear existing buildings
    cur.execute("DELETE FROM buildings;")
    
    building_count = 0
    
    if data.get('type') == 'FeatureCollection':
        features = data.get('features', [])
    elif data.get('type') == 'Feature':
        features = [data]
    else:
        print("Error: Invalid GeoJSON format")
        return
    
    for feature in features:
        if feature.get('geometry', {}).get('type') == 'Polygon':
            geom = feature.get('geometry')
            props = feature.get('properties', {})
            
            # Convert GeoJSON coordinates to WKT
            coords = geom['coordinates'][0]  # Outer ring
            wkt_coords = ', '.join([f"{lon} {lat}" for lon, lat in coords])
            wkt = f"POLYGON(({wkt_coords}))"
            
            name = props.get('name', props.get('NAME', 'Unnamed Building'))
            building_type = props.get('building', props.get('type', 'unknown'))
            
            cur.execute("""
                INSERT INTO buildings (name, type, geom)
                VALUES (%s, %s, ST_GeomFromText(%s, 4326))
            """, (name, building_type, wkt))
            
            building_count += 1
    
    conn.commit()
    cur.close()
    conn.close()
    
    print(f"Imported {building_count} buildings from {geojson_file}")

def import_from_pbf(pbf_file):
    """
    Import from OSM PBF file using osmium
    Requires: osmium-tool installed
    """
    import subprocess
    import json
    
    print(f"Processing PBF file: {pbf_file}")
    print("Note: This requires osmium-tool and osmconvert")
    print("Install: sudo apt-get install osmium-tool osmctools")
    
    # Example command to extract buildings
    # osmium tags-filter input.pbf building -o buildings.osm.pbf
    # Then convert to GeoJSON and import

if __name__ == '__main__':
    if len(sys.argv) > 1:
        if sys.argv[1] == 'overpass':
            import_from_overpass()
        elif sys.argv[1] == 'generate':
            generate_more_sample_data()
        elif sys.argv[1] == 'geojson' and len(sys.argv) > 2:
            import_from_geojson(sys.argv[2])
        elif sys.argv[1] == 'pbf' and len(sys.argv) > 2:
            import_from_pbf(sys.argv[2])
        else:
            print("Usage:")
            print("  python import_osm_data.py overpass           # Import from Overpass API (may timeout)")
            print("  python import_osm_data.py generate           # Generate more sample data (recommended)")
            print("  python import_osm_data.py geojson <file.json> # Import from GeoJSON file")
            print("  python import_osm_data.py pbf <file.pbf>      # Import from PBF file")
    else:
        print("Usage:")
        print("  python import_osm_data.py overpass           # Import from Overpass API (may timeout)")
        print("  python import_osm_data.py generate           # Generate more sample data (recommended)")
        print("  python import_osm_data.py geojson <file.json> # Import from GeoJSON file")
        print("  python import_osm_data.py pbf <file.pbf>      # Import from PBF file")


                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   