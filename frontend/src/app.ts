// Configuration
const API_URL: string = 'http://localhost:3000';

// Initialize the map
const map = new ol.Map({
  target: 'map',
  view: new ol.View({
    center: ol.proj.fromLonLat([105.85, 21.02]), // Hanoi, Vietnam
    zoom: 13,
  })
});

// Base layer - OpenStreetMap
const osmLayer = new ol.layer.Tile({
  source: new ol.source.OSM(),
  visible: true
});
map.addLayer(osmLayer);

// Raster tile layer from Mapnik
const rasterLayer = new ol.layer.Tile({
  source: new ol.source.XYZ({
    url: `${API_URL}/tiles/raster/{z}/{x}/{y}.png?t=${Date.now()}`, // Add timestamp to bust cache
    crossOrigin: 'anonymous'
  }),
  visible: false // Disable by default, user can toggle it
});
map.addLayer(rasterLayer);

// Vector tile layer (MVT)
const vectorLayer = new ol.layer.VectorTile({
  source: new ol.source.VectorTile({
    format: new ol.format.MVT(),
    url: `${API_URL}/tiles/vector/{z}/{x}/{y}.mvt`
  }),
  visible: false, // Disable to prevent lag
  style: new ol.style.Style({
    stroke: new ol.style.Stroke({ color: 'rgba(0, 0, 255, 0.8)', width: 2 }),
    fill: new ol.style.Fill({ color: 'rgba(0, 0, 255, 0.1)' }),
    image: new ol.style.Circle({ radius: 5, fill: new ol.style.Fill({ color: 'rgba(255, 0, 0, 0.8)' }) })
  })
});
map.addLayer(vectorLayer);

// Vector layer for loaded features
const featureSource = new ol.source.Vector();
const featureLayer = new ol.layer.Vector({
  source: featureSource,
  style: new ol.style.Style({
    stroke: new ol.style.Stroke({ color: '#ff0000', width: 2 }),
    fill: new ol.style.Fill({ color: 'rgba(255, 0, 0, 0.2)' }),
    image: new ol.style.Circle({ radius: 6, fill: new ol.style.Fill({ color: '#ff0000' }) })
  })
});
map.addLayer(featureLayer);

// Filter layer for specific amenities
const filterSource = new ol.source.Vector();
const filterLayer = new ol.layer.Vector({
  source: filterSource,
  zIndex: 100, // Ensure it's on top
  style: (feature: any) => {
    const type = feature.get('amenity') || feature.get('type');
    let color = '#333';
    let icon = '\uf041'; // Default map marker

    // Match colors/icons from the HTML
    if (type === 'school') { color = '#e67e22'; icon = '\uf549'; } // fa-school
    else if (type === 'hospital') { color = '#e74c3c'; icon = '\uf0f8'; } // fa-hospital
    else if (type === 'cafe') { color = '#795548'; icon = '\uf0f4'; } // fa-coffee
    else if (type === 'bank') { color = '#27ae60'; icon = '\uf19c'; } // fa-university
    else if (type === 'cinema') { color = '#9b59b6'; icon = '\uf008'; } // fa-film
    else if (type === 'parking') { color = '#34495e'; icon = '\uf540'; } // fa-parking
    else if (type === 'fuel') { color = '#2c3e50'; icon = '\uf52f'; } // fa-gas-pump
    else if (type === 'pharmacy') { color = '#2ecc71'; icon = '\uf48e'; } // fa-prescription-bottle-alt
    else { color = '#3498db'; icon = '\uf3c5'; } // Generic pin for others

    return new ol.style.Style({
      text: new ol.style.Text({
        text: icon,
        font: '900 20px "Font Awesome 6 Free"', // Updated for FA 6
        fill: new ol.style.Fill({ color: color }),
        stroke: new ol.style.Stroke({ color: '#fff', width: 3 }),
        offsetY: -10
      })
    });
  }
});
map.addLayer(filterLayer);

// Analysis layer (Buffer & Results)
const analysisSource = new ol.source.Vector();
const analysisLayer = new ol.layer.Vector({
  source: analysisSource,
  zIndex: 200,
  style: (feature: any) => {
    const type = feature.get('type');
    if (type === 'buffer') {
      return new ol.style.Style({
        stroke: new ol.style.Stroke({ color: '#8e44ad', width: 2, lineDash: [10, 10] }),
        fill: new ol.style.Fill({ color: 'rgba(142, 68, 173, 0.1)' })
      });
    } else if (type === 'score-buffer') {
      return new ol.style.Style({
        stroke: new ol.style.Stroke({ color: '#27ae60', width: 2 }),
        fill: new ol.style.Fill({ color: 'rgba(39, 174, 96, 0.1)' })
      });
    } else if (type === 'score-marker') {
       return null; // Style is set on feature directly
    } else {
      // Points inside buffer
      return new ol.style.Style({
        image: new ol.style.Circle({
          radius: 5,
          fill: new ol.style.Fill({ color: '#8e44ad' }),
          stroke: new ol.style.Stroke({ color: '#fff', width: 2 })
        })
      });
    }
  }
});
map.addLayer(analysisLayer);

let isBufferToolActive = false;

// Popup elements
const container = document.getElementById('popup');
const content = document.getElementById('popup-content');
const closer = document.getElementById('popup-closer');

// Create an overlay to anchor the popup to the map
const overlay = new ol.Overlay({
  element: container!,
  autoPan: {
    animation: {
      duration: 250,
    },
  },
});
map.addOverlay(overlay);

// Close popup handler
if (closer) {
  closer.onclick = function () {
    overlay.setPosition(undefined);
    closer.blur();
    return false;
  };
}

let isScoreToolActive = false;

// Handle map click for identification
map.on('singleclick', async (evt: any) => {
  const coordinate = evt.coordinate;
  
  // -1. Check if Score Tool is active
  if (isScoreToolActive) {
    const lonLat = ol.proj.toLonLat(coordinate);
    const [lon, lat] = lonLat;
    const scoreResults = document.getElementById('score-results');
    const scoreValue = document.getElementById('score-value');
    const scoreClass = document.getElementById('score-class');
    const scoreDetails = document.getElementById('score-details');
    
    if (scoreResults) scoreResults.style.display = 'block';
    if (scoreValue) scoreValue.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size: 0.5em;"></i>';
    
    // Add a temporary marker
    analysisSource.clear();
    
    // Add 1km visual circle
    const circle = new ol.Feature({
      geometry: new ol.geom.Circle(coordinate, 1000),
      type: 'score-buffer'
    });
    analysisSource.addFeature(circle);

    const marker = new ol.Feature({
      geometry: new ol.geom.Point(coordinate),
      type: 'score-marker'
    });
    marker.setStyle(new ol.style.Style({
      image: new ol.style.Icon({
        src: 'https://cdn-icons-png.flaticon.com/512/447/447031.png',
        scale: 0.05,
        anchor: [0.5, 1]
      })
    }));
    analysisSource.addFeature(marker);

    try {
      // Get weights
      const wEdu = (document.getElementById('w-edu') as HTMLInputElement)?.value || '3';
      const wHealth = (document.getElementById('w-health') as HTMLInputElement)?.value || '3';
      const wService = (document.getElementById('w-service') as HTMLInputElement)?.value || '2';
      const wLeisure = (document.getElementById('w-leisure') as HTMLInputElement)?.value || '2';

      const response = await fetch(`${API_URL}/api/analysis/score?lat=${lat}&lon=${lon}&w_edu=${wEdu}&w_health=${wHealth}&w_service=${wService}&w_leisure=${wLeisure}`);
      const data = await response.json();
      
      if (scoreValue) {
        scoreValue.innerText = data.score;
        scoreValue.style.color = data.score >= 80 ? '#27ae60' : (data.score >= 50 ? '#f39c12' : '#c0392b');
      }
      if (scoreClass) scoreClass.innerText = data.classification;
      
      if (scoreDetails) {
        if (data.score === 0 && data.details.message) {
           scoreDetails.innerHTML = `<div style="color: red; font-weight: bold; text-align: center;">${data.details.message}</div>`;
        } else {
          // Calculate total services count for display
          const servicesCount = data.details.banks + data.details.markets + data.details.fuel;

          scoreDetails.innerHTML = `
            <div style="margin-bottom: 5px; font-weight: bold; border-bottom: 1px solid #eee;">Amenities Found:</div>
            <div style="display:flex; justify-content:space-between;"><span>Schools:</span> <b>${data.details.schools}</b></div>
            <div style="display:flex; justify-content:space-between;"><span>Universities:</span> <b>${data.details.universities}</b></div>
            <div style="display:flex; justify-content:space-between;"><span>Kindergartens:</span> <b>${data.details.kindergartens}</b></div>
            <div style="display:flex; justify-content:space-between;"><span>Health:</span> <b>${data.details.hospitals}</b></div>
            <div style="display:flex; justify-content:space-between;"><span>Services:</span> <b>${servicesCount}</b></div>
            <div style="display:flex; justify-content:space-between;"><span>Leisure:</span> <b>${data.details.food}</b></div>
            <div style="margin-top: 5px; font-size: 0.8em; color: #888; font-style: italic;">
              (Includes schools, hospitals, markets, banks, food, etc.)
            </div>
          `;
        }
      }
      
      // Deactivate tool
      isScoreToolActive = false;
      document.getElementById('map')!.style.cursor = 'default';
      const btn = document.getElementById('score-btn');
      if (btn) btn.style.background = '#27ae60';
      
    } catch (error) {
      console.error('Score error:', error);
      if (scoreValue) scoreValue.innerText = 'Err';
    }
    return;
  }

  // 0. Check if Buffer Tool is active
  if (isBufferToolActive) {
    const lonLat = ol.proj.toLonLat(coordinate);
    const [lon, lat] = lonLat;
    const radiusInput = document.getElementById('buffer-radius') as HTMLInputElement;
    const radius = radiusInput ? radiusInput.value : 500;
    const resultsDiv = document.getElementById('analysis-results');
    
    if (resultsDiv) resultsDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
    
    try {
      const response = await fetch(`${API_URL}/api/analysis/buffer?lat=${lat}&lon=${lon}&radius=${radius}`);
      const data = await response.json();
      
      analysisSource.clear();
      
      // Add buffer geometry
      if (data.buffer) {
        const bufferFeature = new ol.format.GeoJSON().readFeature(data.buffer, { featureProjection: 'EPSG:3857' });
        analysisSource.addFeature(bufferFeature);
      }
      
      // Add found features
      if (data.features && data.features.features) {
        const features = new ol.format.GeoJSON().readFeatures(data.features, { featureProjection: 'EPSG:3857' });
        analysisSource.addFeatures(features);
        
        if (resultsDiv) resultsDiv.innerHTML = `Found <strong>${features.length}</strong> places within ${radius}m.`;
      } else {
        if (resultsDiv) resultsDiv.innerHTML = `No places found within ${radius}m.`;
      }
      
      // Show clear button
      const clearBtn = document.getElementById('clear-analysis-btn');
      if (clearBtn) clearBtn.style.display = 'block';
      
      // Deactivate tool after use
      isBufferToolActive = false;
      document.getElementById('map')!.style.cursor = 'default';
      const btn = document.getElementById('buffer-btn');
      if (btn) btn.style.background = '#8e44ad';
      
    } catch (error) {
      console.error('Analysis error:', error);
      if (resultsDiv) resultsDiv.innerHTML = 'Error during analysis.';
    }
    return;
  }

  // 1. Check for client-side features (Vector Tiles or loaded GeoJSON)
  const feature = map.forEachFeatureAtPixel(evt.pixel, (f: any) => f);
  
  if (feature) {
    const properties = feature.getProperties();
    let html = `<div class="popup-row"><span class="popup-label">Source:</span> Vector Layer</div>`;
    
    // Filter out geometry and internal properties
    Object.keys(properties).forEach(key => {
      if (key !== 'geometry' && key !== 'layer' && typeof properties[key] !== 'object') {
        html += `<div class="popup-row"><span class="popup-label">${key}:</span> ${properties[key]}</div>`;
      }
    });
    
    if (content) content.innerHTML = html;
    overlay.setPosition(coordinate);
    return; // Stop here if we found a vector feature
  }

  // 2. If no vector feature, fall back to Server-side Identify API
  const lonLat = ol.proj.toLonLat(coordinate);
  const [lon, lat] = lonLat;

  console.log(`Clicked at: ${lat}, ${lon}`);

  try {
    const response = await fetch(`${API_URL}/api/data/identify?lat=${lat}&lon=${lon}`);
    const data = await response.json();

    if (data && data.length > 0) {
      const feature = data[0];
      let html = `<div class="popup-row"><span class="popup-label">Source:</span> Server Identify</div>`;
      html += `<div class="popup-row"><span class="popup-label">Type:</span> ${feature.type}</div>`;
      
      if (feature.name) html += `<div class="popup-row"><span class="popup-label">Name:</span> ${feature.name}</div>`;
      if (feature.building) html += `<div class="popup-row"><span class="popup-label">Building:</span> ${feature.building}</div>`;
      if (feature.amenity) html += `<div class="popup-row"><span class="popup-label">Amenity:</span> ${feature.amenity}</div>`;
      if (feature.natural) html += `<div class="popup-row"><span class="popup-label">Natural:</span> ${feature.natural}</div>`;
      if (feature.place) html += `<div class="popup-row"><span class="popup-label">Place:</span> ${feature.place}</div>`;
      
      if (content) content.innerHTML = html;
      overlay.setPosition(coordinate);
    } else {
      overlay.setPosition(undefined);
      console.log('No features found at this location');
    }
  } catch (error) {
    console.error('Error identifying feature:', error);
  }
});

// Initialize application logic
function initApp() {
  console.log('WebGIS App Initializing...');

  // Layer controls
  const osmCheckbox = document.getElementById('osm-layer') as HTMLInputElement;
  if (osmCheckbox) {
    osmCheckbox.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      osmLayer.setVisible(target.checked);
    });
  }

  const rasterCheckbox = document.getElementById('raster-layer') as HTMLInputElement;
  if (rasterCheckbox) {
    rasterCheckbox.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      rasterLayer.setVisible(target.checked);
    });
  }

  const vectorCheckbox = document.getElementById('vector-layer') as HTMLInputElement;
  if (vectorCheckbox) {
    vectorCheckbox.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      vectorLayer.setVisible(target.checked);
    });
  }

  // Load features button
  const loadFeaturesBtn = document.getElementById('load-features');
  if (loadFeaturesBtn) {
    loadFeaturesBtn.addEventListener('click', async () => {
      try {
        const view = map.getView();
        const extent = view.calculateExtent(map.getSize());
        const bbox = ol.proj.transformExtent(extent, 'EPSG:3857', 'EPSG:4326');

        const response = await fetch(`${API_URL}/api/data/layers/buildings/features?bbox=${bbox.join(',')}`);
        if (!response.ok) throw new Error('Failed to load features');

        const geojson = await response.json();
        featureSource.clear();

        const features = new ol.format.GeoJSON().readFeatures(geojson, { featureProjection: 'EPSG:3857' });
        featureSource.addFeatures(features);

        const countEl = document.getElementById('feature-count');
        if (countEl) countEl.innerHTML = `<strong>Loaded ${features.length} features</strong>`;
      } catch (error: any) {
        console.error('Error loading features:', error);
        const countEl = document.getElementById('feature-count');
        if (countEl) countEl.innerHTML = `<strong style="color: red;">Error: ${error.message}</strong>`;
      }
    });
  }

  // Search Logic
  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  const searchBtn = document.getElementById('search-btn') as HTMLButtonElement;
  const searchResults = document.getElementById('search-results-list') as HTMLDivElement;

  console.log('Search elements:', { searchInput, searchBtn, searchResults });

  async function performSearch() {
    console.log('Perform search called');
    const query = searchInput.value.trim();
    console.log('Search query:', query);
    
    if (query.length < 2) {
      alert('Please enter at least 2 characters');
      return;
    }

    try {
      searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      console.log(`Fetching: ${API_URL}/api/data/search?q=${encodeURIComponent(query)}`);
      
      const response = await fetch(`${API_URL}/api/data/search?q=${encodeURIComponent(query)}`);
      console.log('Search response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const results = await response.json();
      console.log('Search results:', results);
      
      searchResults.innerHTML = '';
      searchResults.style.display = 'block';

      if (results.length === 0) {
        searchResults.innerHTML = '<div class="search-result-item">No results found</div>';
      } else {
        results.forEach((item: any) => {
          const div = document.createElement('div');
          div.className = 'search-result-item';
          div.innerHTML = `
            <div>${item.name}</div>
            <small>${item.type}</small>
          `;
          div.onclick = () => {
            const coords = ol.proj.fromLonLat([item.lon, item.lat]);
            map.getView().animate({
              center: coords,
              zoom: 16,
              duration: 1000
            });
            
            // Show popup
            overlay.setPosition(coords);
            if (content) {
              content.innerHTML = `
                <div class="popup-row"><span class="popup-label">Name:</span> ${item.name}</div>
                <div class="popup-row"><span class="popup-label">Type:</span> ${item.type}</div>
              `;
            }
            
            searchResults.style.display = 'none';
          };
          searchResults.appendChild(div);
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('Search failed: ' + error);
    } finally {
      searchBtn.innerHTML = '<i class="fas fa-arrow-right"></i>';
    }
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', (e) => {
      console.log('Search button clicked');
      performSearch();
    });
  } else {
    console.error('Search button not found');
  }

  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        console.log('Enter key pressed in search input');
        performSearch();
      }
    });
  } else {
    console.error('Search input not found');
  }

  // Filter Logic
  const filterInput = document.getElementById('filter-input') as HTMLInputElement;
  const filterBtn = document.getElementById('filter-btn') as HTMLButtonElement;
  
  async function updateFilters() {
    const typeStr = filterInput.value.trim();

    if (!typeStr) {
      filterSource.clear();
      return;
    }

    try {
      filterBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      const view = map.getView();
      const extent = view.calculateExtent(map.getSize());
      const bbox = ol.proj.transformExtent(extent, 'EPSG:3857', 'EPSG:4326');
      
      const url = `${API_URL}/api/data/filter?type=${encodeURIComponent(typeStr)}&bbox=${bbox.join(',')}`;
      
      console.log('Fetching filters:', url);
      const response = await fetch(url);
      if (!response.ok) throw new Error('Filter fetch failed');
      
      const geojson = await response.json();
      filterSource.clear();
      
      if (geojson.features && geojson.features.length > 0) {
        const features = new ol.format.GeoJSON().readFeatures(geojson, {
          featureProjection: 'EPSG:3857'
        });
        filterSource.addFeatures(features);
      }
      
    } catch (error) {
      console.error('Error updating filters:', error);
    } finally {
      filterBtn.innerHTML = '<i class="fas fa-search"></i>';
    }
  }

  if (filterBtn) {
    filterBtn.addEventListener('click', updateFilters);
  }

  if (filterInput) {
    filterInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        updateFilters();
      }
    });
  }

  // Update filters when map moves if filter input is not empty
  map.on('moveend', () => {
    if (filterInput && filterInput.value.trim()) {
      updateFilters();
    }
  });

  // Buffer Tool Logic
  const bufferBtn = document.getElementById('buffer-btn');
  const clearAnalysisBtn = document.getElementById('clear-analysis-btn');

  if (bufferBtn) {
    bufferBtn.addEventListener('click', () => {
      isBufferToolActive = !isBufferToolActive;
      if (isBufferToolActive) {
        bufferBtn.style.background = '#e74c3c'; // Red to indicate active
        document.getElementById('map')!.style.cursor = 'crosshair';
      } else {
        bufferBtn.style.background = '#8e44ad'; // Original purple
        document.getElementById('map')!.style.cursor = 'default';
      }
    });
  }

  if (clearAnalysisBtn) {
    clearAnalysisBtn.addEventListener('click', () => {
      analysisSource.clear();
      clearAnalysisBtn.style.display = 'none';
      const resultsDiv = document.getElementById('analysis-results');
      if (resultsDiv) resultsDiv.innerHTML = '';
    });
  }

  // Score Tool Logic
  const scoreBtn = document.getElementById('score-btn');
  if (scoreBtn) {
    scoreBtn.addEventListener('click', () => {
      isScoreToolActive = !isScoreToolActive;
      // Deactivate other tools
      isBufferToolActive = false;
      const bufferBtn = document.getElementById('buffer-btn');
      if (bufferBtn) bufferBtn.style.background = '#8e44ad';

      if (isScoreToolActive) {
        scoreBtn.style.background = '#e74c3c'; // Red to indicate active
        document.getElementById('map')!.style.cursor = 'help';
      } else {
        scoreBtn.style.background = '#27ae60'; // Original green
        document.getElementById('map')!.style.cursor = 'default';
      }
    });
  }

  // Weight Sliders Logic
  ['w-edu', 'w-health', 'w-service', 'w-leisure'].forEach(id => {
    const slider = document.getElementById(id) as HTMLInputElement;
    const display = document.getElementById(`val-${id}`);
    if (slider && display) {
      slider.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        display.innerText = target.value;
      });
    }
  });

  // Sidebar Toggle Logic
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebarClose = document.getElementById('sidebar-close');

  console.log('Sidebar elements:', { sidebar, sidebarToggle, sidebarClose });

  if (sidebar && sidebarToggle && sidebarClose) {
    sidebarToggle.addEventListener('click', () => {
      console.log('Opening sidebar');
      sidebar.classList.add('active');
    });

    sidebarClose.addEventListener('click', () => {
      console.log('Closing sidebar');
      sidebar.classList.remove('active');
    });
  } else {
    console.error('Sidebar elements missing', { sidebar, sidebarToggle, sidebarClose });
  }
}

// Run init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}


