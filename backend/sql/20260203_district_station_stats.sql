-- Spatial Join: District statistics with charging stations
SELECT 
  d.id,
  d.ten_xa,
  d.dan_so,
  ST_AsGeoJSON(d.geom) AS geom_geojson,
  COUNT(s.id) AS total_stations,
  COUNT(CASE WHEN s.status = 'Open' THEN 1 END) AS open_stations,
  COUNT(CASE WHEN s.status = 'Maintenance' THEN 1 END) AS maintenance_stations
FROM hanoi_districts d
LEFT JOIN charging_stations s
  ON ST_Contains(d.geom, s.geom)
GROUP BY d.id, d.ten_xa, d.dan_so, d.geom;