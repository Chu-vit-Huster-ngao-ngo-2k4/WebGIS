-- Extended London GIS data - More comprehensive coverage
SET client_min_messages TO WARNING;
BEGIN;

-- Clear existing data
DELETE FROM buildings; 
DELETE FROM roads; 
DELETE FROM points; 
DELETE FROM water_polygons;

-- Extended Buildings (covering larger London area)
INSERT INTO buildings (name, type, geom) VALUES
  -- Westminster area
  ('County Hall', 'civic', ST_GeomFromText('POLYGON((-0.1208 51.5010, -0.1208 51.5016, -0.1198 51.5016, -0.1198 51.5010, -0.1208 51.5010))', 4326)),
  ('Houses of Parliament', 'civic', ST_GeomFromText('POLYGON((-0.1265 51.4995, -0.1265 51.5010, -0.1235 51.5010, -0.1235 51.4995, -0.1265 51.4995))', 4326)),
  ('Westminster Abbey', 'religious', ST_GeomFromText('POLYGON((-0.1280 51.4990, -0.1280 51.5000, -0.1270 51.5000, -0.1270 51.4990, -0.1280 51.4990))', 4326)),
  
  -- Trafalgar/Covent Garden area
  ('Trafalgar Building', 'commercial', ST_GeomFromText('POLYGON((-0.1295 51.5076, -0.1295 51.5081, -0.1288 51.5081, -0.1288 51.5076, -0.1295 51.5076))', 4326)),
  ('National Gallery', 'cultural', ST_GeomFromText('POLYGON((-0.1285 51.5085, -0.1285 51.5095, -0.1275 51.5095, -0.1275 51.5085, -0.1285 51.5085))', 4326)),
  ('Covent Garden Market', 'commercial', ST_GeomFromText('POLYGON((-0.1235 51.5120, -0.1235 51.5125, -0.1225 51.5125, -0.1225 51.5120, -0.1235 51.5120))', 4326)),
  
  -- City of London area
  ('City Hall', 'civic', ST_GeomFromText('POLYGON((-0.0833 51.5045, -0.0833 51.5050, -0.0826 51.5050, -0.0826 51.5045, -0.0833 51.5045))', 4326)),
  ('Tower of London', 'historic', ST_GeomFromText('POLYGON((-0.0775 51.5075, -0.0775 51.5085, -0.0765 51.5085, -0.0765 51.5075, -0.0775 51.5075))', 4326)),
  ('St. Paul''s Cathedral', 'religious', ST_GeomFromText('POLYGON((-0.0985 51.5135, -0.0985 51.5145, -0.0975 51.5145, -0.0975 51.5135, -0.0985 51.5135))', 4326)),
  
  -- South Bank area
  ('Southbank Centre', 'cultural', ST_GeomFromText('POLYGON((-0.1170 51.5055, -0.1170 51.5065, -0.1160 51.5065, -0.1160 51.5055, -0.1170 51.5055))', 4326)),
  ('Tate Modern', 'cultural', ST_GeomFromText('POLYGON((-0.0995 51.5075, -0.0995 51.5085, -0.0985 51.5085, -0.0985 51.5075, -0.0995 51.5075))', 4326)),
  
  -- Additional residential/commercial buildings
  ('Residential Block A', 'residential', ST_GeomFromText('POLYGON((-0.1215 51.5020, -0.1215 51.5025, -0.1205 51.5025, -0.1205 51.5020, -0.1215 51.5020))', 4326)),
  ('Residential Block B', 'residential', ST_GeomFromText('POLYGON((-0.1185 51.5035, -0.1185 51.5040, -0.1175 51.5040, -0.1175 51.5035, -0.1185 51.5035))', 4326)),
  ('Office Building 1', 'commercial', ST_GeomFromText('POLYGON((-0.1250 51.5100, -0.1250 51.5105, -0.1240 51.5105, -0.1240 51.5100, -0.1250 51.5100))', 4326)),
  ('Office Building 2', 'commercial', ST_GeomFromText('POLYGON((-0.1100 51.5080, -0.1100 51.5085, -0.1090 51.5085, -0.1090 51.5080, -0.1100 51.5080))', 4326)),
  ('Shopping Centre', 'commercial', ST_GeomFromText('POLYGON((-0.1150 51.5110, -0.1150 51.5115, -0.1140 51.5115, -0.1140 51.5110, -0.1150 51.5110))', 4326));

-- Extended Roads Network
INSERT INTO roads (name, road_type, geom) VALUES
  -- Primary roads
  ('Westminster Bridge Rd', 'primary', ST_GeomFromText('LINESTRING(-0.1228 51.5012, -0.1184 51.5017)', 4326)),
  ('Strand', 'primary', ST_GeomFromText('LINESTRING(-0.1246 51.5114, -0.1137 51.5103)', 4326)),
  ('Tooley Street', 'secondary', ST_GeomFromText('LINESTRING(-0.0907 51.5042, -0.0792 51.5045)', 4326)),
  ('Whitehall', 'primary', ST_GeomFromText('LINESTRING(-0.1265 51.5005, -0.1265 51.5055)', 4326)),
  ('Fleet Street', 'primary', ST_GeomFromText('LINESTRING(-0.1100 51.5130, -0.0980 51.5140)', 4326)),
  ('Oxford Street', 'primary', ST_GeomFromText('LINESTRING(-0.1400 51.5150, -0.1200 51.5150)', 4326)),
  ('Regent Street', 'primary', ST_GeomFromText('LINESTRING(-0.1400 51.5120, -0.1300 51.5120)', 4326)),
  
  -- Secondary roads
  ('Downing Street', 'secondary', ST_GeomFromText('LINESTRING(-0.1265 51.5030, -0.1265 51.5035)', 4326)),
  ('The Mall', 'secondary', ST_GeomFromText('LINESTRING(-0.1350 51.5040, -0.1280 51.5080)', 4326)),
  ('Victoria Embankment', 'secondary', ST_GeomFromText('LINESTRING(-0.1250 51.5070, -0.1100 51.5080)', 4326)),
  ('Blackfriars Road', 'secondary', ST_GeomFromText('LINESTRING(-0.1050 51.5100, -0.1000 51.5080)', 4326)),
  ('Borough High Street', 'secondary', ST_GeomFromText('LINESTRING(-0.0920 51.5040, -0.0850 51.5045)', 4326)),
  
  -- Connecting roads
  ('Waterloo Road', 'secondary', ST_GeomFromText('LINESTRING(-0.1180 51.5020, -0.1150 51.5050)', 4326)),
  ('Lambeth Road', 'secondary', ST_GeomFromText('LINESTRING(-0.1200 51.5000, -0.1150 51.4990)', 4326)),
  ('Tower Bridge Road', 'secondary', ST_GeomFromText('LINESTRING(-0.0780 51.5040, -0.0750 51.5055)', 4326));

-- Extended Points of Interest
INSERT INTO points (name, category, geom) VALUES
  -- Major landmarks
  ('London Eye', 'attraction', ST_GeomFromText('POINT(-0.1195 51.5033)', 4326)),
  ('Big Ben', 'landmark', ST_GeomFromText('POINT(-0.1246 51.5007)', 4326)),
  ('Trafalgar Square', 'plaza', ST_GeomFromText('POINT(-0.1281 51.5080)', 4326)),
  ('Tower Bridge', 'bridge', ST_GeomFromText('POINT(-0.0754 51.5055)', 4326)),
  ('London Bridge', 'bridge', ST_GeomFromText('POINT(-0.0875 51.5075)', 4326)),
  ('Westminster Bridge', 'bridge', ST_GeomFromText('POINT(-0.1205 51.5010)', 4326)),
  
  -- Cultural sites
  ('British Museum', 'museum', ST_GeomFromText('POINT(-0.1269 51.5194)', 4326)),
  ('National Gallery', 'museum', ST_GeomFromText('POINT(-0.1283 51.5089)', 4326)),
  ('Tate Modern', 'museum', ST_GeomFromText('POINT(-0.0996 51.5076)', 4326)),
  ('Shakespeare Globe', 'theatre', ST_GeomFromText('POINT(-0.0942 51.5081)', 4326)),
  
  -- Parks and open spaces
  ('Hyde Park', 'park', ST_GeomFromText('POINT(-0.1650 51.5073)', 4326)),
  ('St. James Park', 'park', ST_GeomFromText('POINT(-0.1340 51.5030)', 4326)),
  ('Green Park', 'park', ST_GeomFromText('POINT(-0.1420 51.5045)', 4326)),
  
  -- Transport hubs
  ('Waterloo Station', 'transport', ST_GeomFromText('POINT(-0.1130 51.5030)', 4326)),
  ('Charing Cross Station', 'transport', ST_GeomFromText('POINT(-0.1248 51.5074)', 4326)),
  ('London Bridge Station', 'transport', ST_GeomFromText('POINT(-0.0860 51.5075)', 4326)),
  
  -- Other points
  ('Buckingham Palace', 'landmark', ST_GeomFromText('POINT(-0.1419 51.5014)', 4326)),
  ('Covent Garden', 'attraction', ST_GeomFromText('POINT(-0.1230 51.5123)', 4326)),
  ('Piccadilly Circus', 'plaza', ST_GeomFromText('POINT(-0.1340 51.5101)', 4326)));

-- Extended Water Polygons (Thames River segments)
INSERT INTO water_polygons (name, water_type, geom) VALUES
  -- Main Thames section (Westminster to Tower Bridge)
  ('Thames Section 1', 'river', ST_GeomFromText('POLYGON((-0.1238 51.5030, -0.1238 51.5040, -0.1185 51.5040, -0.1185 51.5030, -0.1238 51.5030))', 4326)),
  ('Thames Section 2', 'river', ST_GeomFromText('POLYGON((-0.1185 51.5040, -0.1185 51.5050, -0.1135 51.5050, -0.1135 51.5040, -0.1185 51.5040))', 4326)),
  ('Thames Section 3', 'river', ST_GeomFromText('POLYGON((-0.1135 51.5050, -0.1135 51.5060, -0.1085 51.5060, -0.1085 51.5050, -0.1135 51.5050))', 4326)),
  ('Thames Section 4', 'river', ST_GeomFromText('POLYGON((-0.1085 51.5060, -0.1085 51.5070, -0.1000 51.5070, -0.1000 51.5060, -0.1085 51.5060))', 4326)),
  ('Thames Section 5', 'river', ST_GeomFromText('POLYGON((-0.1000 51.5070, -0.1000 51.5080, -0.0900 51.5080, -0.0900 51.5070, -0.1000 51.5070))', 4326)),
  ('Thames Section 6', 'river', ST_GeomFromText('POLYGON((-0.0900 51.5080, -0.0900 51.5090, -0.0800 51.5090, -0.0800 51.5080, -0.0900 51.5080))', 4326)),
  ('Thames Section 7', 'river', ST_GeomFromText('POLYGON((-0.0800 51.5090, -0.0800 51.5100, -0.0750 51.5100, -0.0750 51.5090, -0.0800 51.5090))', 4326)));

COMMIT;

