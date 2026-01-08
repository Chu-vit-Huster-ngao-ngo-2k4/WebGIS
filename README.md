# WebGIS - 2D Map Data Visualization Application

A full-stack web mapping application with OpenLayers frontend, Node.js/Express backend (TypeScript), and PostgreSQL/PostGIS database. Supports both raster and vector tile rendering using Mapnik.

## Features

- 🗺️ Interactive map visualization with OpenLayers
- 🎨 Raster tile rendering via Mapnik
- 📦 Vector tile support (Mapbox Vector Tiles - MVT)
- 🗄️ PostgreSQL with PostGIS for spatial data storage
- 🚀 RESTful API for data access
- 🐳 Docker Compose for easy deployment
- 📊 Layer controls and feature querying
- 💎 TypeScript for both frontend and backend

## Tech Stack

### Frontend
- **OpenLayers 8.x** - Interactive map library
- **TypeScript** - Type-safe development
- HTML5, CSS3

### Backend
- **Node.js** with Express
- **TypeScript** - Type-safe backend
- **Mapnik** - Map rendering engine
- **PostgreSQL** - Database
- **PostGIS** - Spatial database extension

### Deployment
- Docker & Docker Compose

## Project Structure

```
webgis/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.ts              # Database connection
│   │   ├── routes/
│   │   │   ├── tiles.ts           # Tile serving endpoints
│   │   │   └── data.ts            # Data API endpoints
│   │   ├── types/
│   │   │   └── mapnik.d.ts        # Mapnik type declarations
│   │   └── server.ts              # Express server
│   ├── styles/
│   │   ├── raster-style.xml       # Mapnik raster style
│   │   └── vector-style.xml       # Mapnik vector style
│   ├── tsconfig.json
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app.ts                 # OpenLayers application
│   │   └── global.d.ts            # Global type declarations
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── app.js                 # Compiled JS output
│   ├── index.html
│   ├── tsconfig.json
│   └── package.json
├── docker/
│   └── Dockerfile.backend         # Backend container
├── data/
│   ├── init.sql                   # Database initialization
│   └── sample_data.sql            # Sample London data
├── docker-compose.yml
└── README.md
```

## Prerequisites

- **Docker** and **Docker Compose** (recommended)
- OR locally: Node.js 18+, PostgreSQL 15+ with PostGIS

## Quick Start with Docker

1. **Clone the repository:**
   ```bash
   git clone git@gitlab.com:webgis5270842/webgis.git
   cd webgis
   ```

2. **Start all services:**
   ```bash
   docker-compose up -d
   ```

3. **Access the application:**
   - Frontend: http://localhost:8081
   - Backend API: http://localhost:3000
   - PostgreSQL: localhost:5432

4. **Stop services:**
   ```bash
   docker-compose down
   ```

## Development

### Backend Development

The backend is written in TypeScript and compiled during the Docker build process.

```bash
cd backend
npm install
npm run build    # Compile TypeScript to dist/
npm run dev      # Run with ts-node and nodemon
npm start        # Run compiled JavaScript
```

### Frontend Development

The frontend uses TypeScript with OpenLayers from CDN.

```bash
cd frontend
npm install
npm run build    # Compile TypeScript to js/app.js
npm run dev      # Start development server
```

## API Endpoints

### Tiles

- **Raster tiles:** `GET /tiles/raster/:z/:x/:y.png`
- **Vector tiles:** `GET /tiles/vector/:z/:x/:y.mvt`

Example: http://localhost:3000/tiles/raster/10/511/340.png

### Data

- **Get layers:** `GET /api/data/layers`
- **Get features:** `GET /api/data/layers/:layerName/features?bbox=minX,minY,maxX,maxY`

### Health Check

- **Health:** `GET /health`

## Sample Data

The project includes sample GIS data for central London:
- Buildings
- Roads
- Water polygons
- Points of interest

Located around: Longitude -0.13 to -0.08, Latitude 51.50 to 51.51

## Mapnik Configuration

Mapnik styles are defined in XML files:

- `backend/styles/raster-style.xml` - For raster tile rendering
- `backend/styles/vector-style.xml` - For vector tile rendering

Both styles reference the same PostGIS data sources to ensure consistency between raster and vector tiles.

## Troubleshooting

### Mapnik Installation Issues

If Mapnik fails to install:
- On Windows: Use Docker (recommended)
- On Linux: Install system dependencies first
  ```bash
  sudo apt-get install libmapnik-dev mapnik-utils
  ```

### Database Connection Issues

- Verify PostgreSQL is running: `docker-compose ps`
- Check backend logs: `docker-compose logs backend`
- Ensure PostGIS extension is installed

### Empty Vector Tiles

Vector tiles may be empty if tile coordinates don't intersect with data:
- Use appropriate zoom levels (10-14 work well for city-level data)
- Check sample tile: http://localhost:3000/tiles/vector/10/511/340.mvt
- Enable debug logging by setting `DEBUG_TILES=1` environment variable

## License

MIT

## Contributing

Contributions welcome! Please open an issue or submit a pull request.

## Resources

- [OpenLayers Documentation](https://openlayers.org/doc/)
- [Mapnik Documentation](https://mapnik.org/documentation/)
- [PostGIS Documentation](https://postgis.net/documentation/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
