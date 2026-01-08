-- Initialize PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Initialize HSTORE extension (required for osm2pgsql to store tags)
CREATE EXTENSION IF NOT EXISTS hstore;

-- Note: We do not create tables manually here anymore.
-- osm2pgsql will automatically create:
--   planet_osm_point
--   planet_osm_line
--   planet_osm_polygon
--   planet_osm_roads
    ('Side Avenue', 'secondary', ST_GeomFromText('LINESTRING(0.001 0, 0.001 0.004)', 4326));

INSERT INTO points (name, category, geom) VALUES
    ('Park', 'recreation', ST_GeomFromText('POINT(0.0015 0.0015)', 4326)),
    ('School', 'education', ST_GeomFromText('POINT(0.0025 0.0025)', 4326));

INSERT INTO water_polygons (name, water_type, geom) VALUES
    ('Lake', 'lake', ST_GeomFromText('POLYGON((0.004 0.004, 0.004 0.006, 0.006 0.006, 0.006 0.004, 0.004 0.004))', 4326));
