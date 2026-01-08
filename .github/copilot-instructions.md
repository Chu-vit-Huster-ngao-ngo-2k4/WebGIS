- [x] Verify that the copilot-instructions.md file in the .github directory is created.
	- Created and now tracking setup progress here.

- [x] Clarify Project Requirements
	- Frontend: OpenLayers; Backend: Node.js/Express + Mapnik; DB: Postgres/PostGIS; Tiles: Raster + MVT; Deploy: Docker Compose.

- [x] Scaffold the Project
	- Created frontend/, backend/, docker/, data/, docker-compose.yml, README.md, .gitignore.

- [x] Customize the Project
	- Implemented Express server with routes: /tiles/raster, /tiles/vector, /api/data; Mapnik XML styles; OpenLayers UI with layer toggles and feature loader.

- [x] Install Required Extensions
	- No extensions required by setup tool. Skipped.

- [x] Compile the Project
	- Built and started via Docker Compose. Backend health 200 OK. Tiles render (tile.png, tile.mvt saved).

- [x] Create and Run Task
	- Not needed; Docker Compose manages services.

- [x] Launch the Project
	- Running: Frontend http://localhost:8081, Backend http://localhost:3000.

- [x] Ensure Documentation is Complete
	- README.md updated with run instructions and ports. This file cleaned and current.


