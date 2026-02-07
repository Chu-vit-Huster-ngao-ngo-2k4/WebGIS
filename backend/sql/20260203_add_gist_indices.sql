-- Migration: Ensure GIST spatial indices on geom columns
-- For hanoi_districts
CREATE INDEX IF NOT EXISTS hanoi_districts_geom_gist ON hanoi_districts USING GIST (geom);

-- For charging_stations
CREATE INDEX IF NOT EXISTS charging_stations_geom_gist ON charging_stations USING GIST (geom);