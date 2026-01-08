-- Sample GIS data around London area (EPSG:4326)
SET client_min_messages TO WARNING;
BEGIN;

-- Clear existing sample data
DELETE FROM buildings; 
DELETE FROM roads; 
DELETE FROM points; 
DELETE FROM water_polygons;

-- Buildings (simple squares)
INSERT INTO buildings (name, type, geom) VALUES
  ('County Hall', 'civic', ST_GeomFromText('POLYGON((-0.1208 51.5010, -0.1208 51.5016, -0.1198 51.5016, -0.1198 51.5010, -0.1208 51.5010))', 4326)),
  ('Trafalgar Building', 'commercial', ST_GeomFromText('POLYGON((-0.1295 51.5076, -0.1295 51.5081, -0.1288 51.5081, -0.1288 51.5076, -0.1295 51.5076))', 4326)),
  ('City Hall', 'civic', ST_GeomFromText('POLYGON((-0.0833 51.5045, -0.0833 51.5050, -0.0826 51.5050, -0.0826 51.5045, -0.0833 51.5045))', 4326));

-- Roads (LineStrings)
INSERT INTO roads (name, road_type, geom) VALUES
  ('Westminster Bridge Rd', 'primary', ST_GeomFromText('LINESTRING(-0.1228 51.5012, -0.1184 51.5017)', 4326)),
  ('Strand', 'primary', ST_GeomFromText('LINESTRING(-0.1246 51.5114, -0.1137 51.5103)', 4326)),
  ('Tooley Street', 'secondary', ST_GeomFromText('LINESTRING(-0.0907 51.5042, -0.0792 51.5045)', 4326));

-- Points of Interest
INSERT INTO points (name, category, geom) VALUES
  ('London Eye', 'attraction', ST_GeomFromText('POINT(-0.1195 51.5033)', 4326)),
  ('Big Ben', 'landmark', ST_GeomFromText('POINT(-0.1246 51.5007)', 4326)),
  ('Trafalgar Square', 'plaza', ST_GeomFromText('POINT(-0.1281 51.5080)', 4326)),
  ('Tower Bridge', 'bridge', ST_GeomFromText('POINT(-0.0754 51.5055)', 4326));

-- Water polygon (a small rectangle near the Thames segment)
INSERT INTO water_polygons (name, water_type, geom) VALUES
  ('Thames Section', 'river', ST_GeomFromText('POLYGON((-0.1238 51.5030, -0.1238 51.5040, -0.1185 51.5040, -0.1185 51.5030, -0.1238 51.5030))', 4326));

COMMIT;