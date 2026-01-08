#!/usr/bin/env python3
"""
Download London OSM PBF file from Geofabrik
Then you can use import_osm_docker.sh to import it
"""

import urllib.request
import os
import sys

LONDON_PBF_URL = "https://download.geofabrik.de/europe/great-britain/england/greater-london-latest.osm.pbf"
OUTPUT_FILE = "greater-london-latest.osm.pbf"

def download_file(url, output_path):
    """Download file with progress bar"""
    def progress_hook(count, block_size, total_size):
        percent = int(count * block_size * 100 / total_size)
        sys.stdout.write(f"\rDownloading: {percent}% ({count * block_size / 1024 / 1024:.1f} MB)")
        sys.stdout.flush()
    
    print(f"Downloading from: {url}")
    print(f"Output: {output_path}")
    print("This may take a while (file is ~100-200 MB)...")
    print()
    
    try:
        urllib.request.urlretrieve(url, output_path, progress_hook)
        print(f"\n\nDownload complete: {output_path}")
        print(f"File size: {os.path.getsize(output_path) / 1024 / 1024:.1f} MB")
        return True
    except Exception as e:
        print(f"\nError downloading: {e}")
        return False

if __name__ == '__main__':
    if os.path.exists(OUTPUT_FILE):
        response = input(f"{OUTPUT_FILE} already exists. Overwrite? (y/n): ")
        if response.lower() != 'y':
            print("Cancelled.")
            sys.exit(0)
        os.remove(OUTPUT_FILE)
    
    if download_file(LONDON_PBF_URL, OUTPUT_FILE):
        print("\nNext steps:")
        print("1. Run: bash import_osm_docker.sh greater-london-latest.osm.pbf")
        print("   (or in Git Bash: ./import_osm_docker.sh greater-london-latest.osm.pbf)")
        print("2. Restart backend: docker compose restart backend")
        print("3. Refresh browser to see real OSM buildings!")
    else:
        print("\nDownload failed. You can manually download from:")
        print(LONDON_PBF_URL)


