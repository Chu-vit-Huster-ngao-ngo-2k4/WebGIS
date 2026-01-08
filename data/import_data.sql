-- Sample script to import shapefile data using ogr2ogr
-- This is a reference script - run ogr2ogr from command line

-- Example: Import a shapefile to PostgreSQL
-- ogr2ogr -f "PostgreSQL" PG:"host=localhost port=5432 dbname=webgis user=postgres password=postgres" your_shapefile.shp -nln your_table_name -lco GEOMETRY_NAME=geom -lco FID=id -t_srs EPSG:4326

-- After import, create spatial index:
-- CREATE INDEX your_table_name_geom_idx ON your_table_name USING GIST (geom);

-- Sample: Load Natural Earth data
-- Download from: https://www.naturalearthdata.com/downloads/

-- Example command to import countries:
-- ogr2ogr -f "PostgreSQL" PG:"host=localhost port=5432 dbname=webgis user=postgres password=postgres" ne_110m_admin_0_countries.shp -nln countries -lco GEOMETRY_NAME=geom -t_srs EPSG:4326

-- Example command to import cities:
-- ogr2ogr -f "PostgreSQL" PG:"host=localhost port=5432 dbname=webgis user=postgres password=postgres" ne_110m_populated_places.shp -nln cities -lco GEOMETRY_NAME=geom -t_srs EPSG:4326
