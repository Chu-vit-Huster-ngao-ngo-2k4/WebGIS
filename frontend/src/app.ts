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

// Base layer - OpenStreetMap (Standard)
const osmLayer = new ol.layer.Tile({
  source: new ol.source.OSM(),
  visible: true,
  zIndex: 0
});
map.addLayer(osmLayer);

// CartoDB Positron (Cleaner, better for analysis overlays) - Optional
const cartoLayer = new ol.layer.Tile({
  source: new ol.source.XYZ({
    url: 'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attributions: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  }),
  visible: false, // Hidden by default
  zIndex: 1 
});
map.addLayer(cartoLayer);

// Google Earth Style - ESRI World Imagery (Satellite)
const satelliteLayer = new ol.layer.Tile({
  source: new ol.source.XYZ({
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attributions: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
  }),
  visible: false,
  zIndex: 1 // Same level as Carto, toggle will control visibility
});
map.addLayer(satelliteLayer);

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

// Filter layer for specific amenities (Restored for compatibility)
const filterSource = new ol.source.Vector();
const filterLayer = new ol.layer.Vector({
  source: filterSource,
  zIndex: 140, 
  style: (feature: any) => {
    // Basic style for filtered items
    return new ol.style.Style({
      image: new ol.style.Circle({
         radius: 6,
         fill: new ol.style.Fill({color: '#e67e22'}),
         stroke: new ol.style.Stroke({color: '#fff', width: 2})
      })
    });
  }
});
map.addLayer(filterLayer);

// Charging Stations Layer
const chargingStationsSource = new ol.source.Vector({
  url: `${API_URL}/api/stations/geojson`,
  format: new ol.format.GeoJSON({ featureProjection: 'EPSG:3857' })
});

// Auto-zoom to data when loaded (optional, but helpful for debugging)
chargingStationsSource.once('change', function(e: any) {
  if (chargingStationsSource.getState() === 'ready') {
    const featureCount = chargingStationsSource.getFeatures().length;
    console.log(`Loaded ${featureCount} charging stations.`);
    
    // Notify user
    const countEl = document.getElementById('feature-count');
    if (countEl) countEl.innerHTML = `<span style="color: green">Loaded ${featureCount} VinFast Stations</span>`;
    
    // Suggest zooming if far away (or auto zoom if desired - commented out for now to avoid jump)
    if (featureCount > 0) {
       map.getView().fit(chargingStationsSource.getExtent(), { 
           padding: [50, 50, 50, 50],
           maxZoom: 16,
           duration: 1000 
       });
    }
  }
});

// Cluster Source for better performance
const clusterSource = new ol.source.Cluster({
  distance: 30, // Distance in pixels to cluster points
  minDistance: 20,
  source: chargingStationsSource
});

// Helper to generate station style
const createStationStyle = (feature: any) => {
    const props = feature.getProperties();
    const status = props.status;
    const category = props.category || '';
    const name = props.name || '';
    
    const isActive = status === '1' || status === 'Đang hoạt động';
    let color = isActive ? '#27ae60' : '#95a5a6';

    let labelText = '\uf0e7'; 
    let font = '900 14px "Font Awesome 6 Free"';
    let offsetY = 1;

    const kwMatch = (name + ' ' + category).match(/(\d+)\s*[kK][wW]/);
    
    if (kwMatch) {
      labelText = kwMatch[1]; 
      font = 'bold 12px "Segoe UI", sans-serif'; 
      offsetY = 1;
      
      const power = parseInt(labelText);
      if (power >= 250) color = '#e74c3c'; 
      else if (power >= 150) color = '#e67e22'; 
      else if (power >= 60) color = '#2980b9'; 
      else color = '#27ae60'; 
    } else if (category.includes('Tủ đổi pin') || name.includes('Tủ đổi pin')) {
       labelText = '\uf240'; 
       font = '900 12px "Font Awesome 6 Free"';
       color = '#8e44ad'; 
    }

    return new ol.style.Style({
      image: new ol.style.Circle({
        radius: 16, 
        fill: new ol.style.Fill({ color: '#ffffff' }),
        stroke: new ol.style.Stroke({ color: color, width: 3 })
      }),
      text: new ol.style.Text({
        text: labelText,
        font: font,
        fill: new ol.style.Fill({ color: color }), 
        stroke: new ol.style.Stroke({ color: '#fff', width: 2 }), 
        offsetY: offsetY
      })
    });
};

const chargingStationsLayer = new ol.layer.Vector({
  source: clusterSource,
  zIndex: 150,
  style: (feature: any) => {
    const features = feature.get('features');
    const size = features ? features.length : 1;

    // --- CASE 1: CLUSTER > 5 ITEMS ---
    if (size > 5) {
      return new ol.style.Style({
        image: new ol.style.Circle({
          radius: 12 + Math.min(size, 10), 
          stroke: new ol.style.Stroke({ color: '#fff', width: 2 }),
          fill: new ol.style.Fill({ color: '#3398DB' })
        }),
        text: new ol.style.Text({
          text: size.toString(),
          fill: new ol.style.Fill({ color: '#fff' }),
          font: 'bold 12px "Segoe UI", sans-serif'
        })
      });
    }

    // --- CASE 2: SMALL CLUSTER (<= 5) OR SINGLE ---
    // If it's a cluster of 2-5 items, we want to show them INDIVIDUALLY visually
    // even though they are technically in a cluster feature.
    // We do this by returning an Array of styles, one for each sub-feature, 
    // with geometry explicitly set to the sub-feature's position.
    
    if (features && features.length > 0) {
        return features.map((f: any) => {
            const style = createStationStyle(f);
            style.setGeometry(f.getGeometry()); // Force render at original location
            return style;
        });
    }

    return createStationStyle(feature); // Fallback
  }
});
map.addLayer(chargingStationsLayer);


// -- SEARCH PANEL LOGIC --
const openSearchBtn = document.getElementById('open-search-btn');
const closeSearchBtn = document.getElementById('close-search-btn');
const sidebarMainView = document.getElementById('sidebar-main-view');
const sidebarSearchView = document.getElementById('sidebar-search-view');
const sidebarSearchInput = document.getElementById('sidebar-search-input') as HTMLInputElement;

if (openSearchBtn && sidebarMainView && sidebarSearchView) {
    openSearchBtn.addEventListener('click', () => {
        console.log('Open Search Clicked');
        sidebarMainView.style.display = 'none';
        sidebarSearchView.style.display = 'flex';
        if (sidebarSearchInput) sidebarSearchInput.focus();
    });
} else {
    console.error('Search elements missing:', { openSearchBtn, sidebarMainView, sidebarSearchView });
}

if (closeSearchBtn && sidebarMainView && sidebarSearchView) {
    closeSearchBtn.addEventListener('click', () => {
        console.log('Close Search Clicked');
        sidebarSearchView.style.display = 'none';
        sidebarMainView.style.display = 'flex'; // Restore as flex
    });
}

// Logic Search function (migrated)
const performSidebarSearch = async () => {
   if (!sidebarSearchInput) return;
   const query = sidebarSearchInput.value;
   if (!query) return;
   
   const resultsContainer = document.getElementById('sidebar-search-results');
   if (resultsContainer) resultsContainer.innerHTML = '<div style="padding:20px; text-align:center"><i class="fas fa-spinner fa-spin"></i> Searching...</div>';
   
   try {
      const response = await fetch(`${API_URL}/api/data/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (resultsContainer) {
          resultsContainer.innerHTML = '';
          if (data.length === 0) {
              resultsContainer.innerHTML = '<div style="padding:20px; text-align:center">No results found</div>';
              return;
          }
          
          data.forEach((item: any) => {
              const div = document.createElement('div');
              div.className = 'layer-item-google'; // Reuse style
              div.style.flexDirection = 'column';
              div.style.alignItems = 'flex-start';
              div.innerHTML = `
                  <div style="font-weight:bold; color:#db4437">${item.name || 'Unknown Place'}</div>
                  <div style="font-size:12px; color:#666">${item.address || item.type}</div>
              `;
              div.onclick = () => {
                // Zoom to feature
                const coords = ol.proj.fromLonLat([item.lon, item.lat]);
                map.getView().animate({ center: coords, zoom: 16 });
                
                // Show marker styling (simplified)
                overlay.setPosition(coords);
                content!.innerHTML = `<div style="font-weight:bold">${item.name}</div>`;
              };
              resultsContainer.appendChild(div);
          });
      }
   } catch(e) {
       console.error(e);
       if (resultsContainer) resultsContainer.innerHTML = '<div style="color:red; padding:20px">Search failed</div>';
   }
};

const searchGoBtn = document.getElementById('sidebar-search-go');
if (searchGoBtn) {
    searchGoBtn.addEventListener('click', performSidebarSearch);
}
if (sidebarSearchInput) {
    sidebarSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSidebarSearch();
    });
}

// -- LAYER FILTER LOGIC (Mô phỏng Ẩn/Hiện lớp con bằng Style) --
// Ta không thực sự có layer con, mà chỉ filter feature trên 1 layer chính
const checkboxes = document.querySelectorAll('.layer-checkbox');
checkboxes.forEach(cb => {
    cb.addEventListener('change', () => {
        chargingStationsLayer.changed(); // Trigger re-render
    });
});

// Update style function to respect filters
const isFeatureVisible = (feature: any) => {
    const props = feature.getProperties();
    // Logic mapping props -> classification
    // (Sao chép logic phân loại từ CreateStationStyle)
    const name = props.name || '';
    const category = props.category || '';
    const kwMatch = (name + ' ' + category).match(/(\d+)\s*[kK][wW]/);
    
    let type = 'normal';
    if (kwMatch) {
         const power = parseInt(kwMatch[1]);
         if (power >= 250) type = 'super_fast';
         else if (power >= 180) type = 'fast_180';
         else if (power >= 150) type = 'fast_150';
         else if (power >= 60) type = 'fast_60';
    } else if (category.includes('Tủ đổi pin') || name.includes('Tủ đổi pin')) {
         type = 'battery';
    }
    
    // Find checkbox for this type
    const cb = document.querySelector(`.layer-checkbox[data-filter="${type}"]`) as HTMLInputElement;
    return cb ? cb.checked : true; // Default true if no filter found
};

// Override layer style function wrapper
const originalStyleFn = chargingStationsLayer.getStyle();
// We need to set the style function on the layer AGAIN with the filter check
chargingStationsLayer.setStyle((feature: any, resolution: any) => {
    // 1. Check visibility first
    // Note: For Clusters, we might need to check if ANY feature in cluster is visible...
    // But for simplicity, let's just check individual features or assume cluster is visible if mostly true.
    
    // Actually, best way is to filter source or use a style that returns null.
    
    const features = feature.get('features');
    if (features) {
         // Cluster: Check if at least one sub-feature is visible? 
         // Or simplistic: Just render cluster. 
         // Real Filtering for Clusters requires re-creating the Cluster Source on filter change.
         // Let's do simple visual HIDING for now.
         
         const visibleFeatures = features.filter(isFeatureVisible);
         if (visibleFeatures.length === 0) return null; // Hide cluster if empty
         
         // If we wanted to be perfect, we'd update cluster size text. 
         // But OL Cluster source is geometric, style just visual.
         // Let's just proceed.
    } else {
        // Single feature
        if (!isFeatureVisible(feature)) return null;
    }

    // Call original logic (which is defined in variable above or just recreate logic)
    // Since originalStyleFn might be complex, let's just call the logic block we defined earlier.
    // Wait, 'chargingStationsLayer' style was defined inline. We can't easily capture 'originalStyleFn' if it was anonymous.
    // Let's just Paste the logic again or use the createStationStyle helper if available.
    
    // RE-USE LOGIC FROM PREVIOUS STEPS:
    
    if (features) {
        const size = features.length;
         // --- CASE 1: CLUSTER > 5 ITEMS ---
        if (size > 5) {
          return new ol.style.Style({
            image: new ol.style.Circle({
              radius: 12 + Math.min(size, 10), 
              stroke: new ol.style.Stroke({ color: '#fff', width: 2 }),
              fill: new ol.style.Fill({ color: '#3398DB' })
            }),
            text: new ol.style.Text({
              text: size.toString(),
              fill: new ol.style.Fill({ color: '#fff' }),
              font: 'bold 12px "Segoe UI", sans-serif'
            })
          });
        }
        
        // --- CASE 2: SMALL CLUSTER (<= 5) OR SINGLE ---
        if (size > 0) {
            return features.filter(isFeatureVisible).map((f: any) => {
                const style = createStationStyle(f);
                style.setGeometry(f.getGeometry()); 
                return style;
            });
        }
    }
    
    return null;
});

// Toggle controls
document.getElementById('osm-layer')?.addEventListener('change', (e: any) => {
  osmLayer.setVisible(e.target.checked);
});
document.getElementById('raster-layer')?.addEventListener('change', (e: any) => {
  rasterLayer.setVisible(e.target.checked);
});
document.getElementById('vector-layer')?.addEventListener('change', (e: any) => {
  vectorLayer.setVisible(e.target.checked);
});
document.getElementById('charging-stations-layer')?.addEventListener('change', (e: any) => {
  chargingStationsLayer.setVisible(e.target.checked);
});

// Refresh button handler
document.getElementById('refresh-stations-btn')?.addEventListener('click', async (e) => {
  e.stopPropagation(); // Prevent layer toggle
  const btn = e.currentTarget as HTMLElement;
  const icon = btn.querySelector('i');
  
  if(icon) icon.classList.add('fa-spin');
  
  try {
      const res = await fetch(`${API_URL}/api/stations/sync`, { method: 'POST' });
      const json = await res.json();
      alert(`Cập nhật thành công! ${json.message}`);
      // Refresh layer
      chargingStationsSource.clear();
      chargingStationsSource.refresh();
  } catch(err) {
      alert('Lỗi cập nhật dữ liệu');
      console.error(err);
  } finally {
      if(icon) icon.classList.remove('fa-spin');
  }
});

// Vector layer for loaded features

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
  
  // 0. Check feature click first (Charging Stations usually)
  const clickedFeature = map.forEachFeatureAtPixel(evt.pixel, (feat: any) => feat);

  if (clickedFeature) {
    let featureToSend = clickedFeature;
    const props = clickedFeature.getProperties();
    
    // Handling Cluster logic
    if (props.features) {
        const features = props.features;
        // If cluster has MANY items (> 5), Zoom in
        if (features.length > 5) {
            const extent = ol.extent.createEmpty();
            features.forEach((f: any) => ol.extent.extend(extent, f.getGeometry().getExtent()));
            const view = map.getView();
            if (view.getZoom() < 19) {
                 view.fit(extent, { duration: 500, padding: [50, 50, 50, 50] });
                 return; 
            }
            featureToSend = features[0];
        } else {
            // Cluster <= 5 items OR Single item
            // Since we visually separated them in the style, the user clicked on a specific location.
            // We need to find WHICH sub-feature is closest to the click coordinate.
            if (features.length > 1) {
                const clickCoord = evt.coordinate;
                let closestFeature = features[0];
                let minDist = Infinity;
                
                features.forEach((f: any) => {
                    const geom = f.getGeometry();
                    const closestPoint = geom.getClosestPoint(clickCoord);
                    const dist = Math.sqrt(
                        Math.pow(clickCoord[0] - closestPoint[0], 2) + 
                        Math.pow(clickCoord[1] - closestPoint[1], 2)
                    );
                    if (dist < minDist) {
                        minDist = dist;
                        closestFeature = f;
                    }
                });
                featureToSend = closestFeature;
            } else {
                featureToSend = features[0];
            }
        }
    }

    const finalProps = featureToSend.getProperties();
    
    // Logic cho trạm sạc VinFast
    if (finalProps.type === 'charging_station') {
        const isWorking = finalProps.status === '1' || finalProps.status === 'Đang hoạt động';
        
        let contentHTML = `
           <div class="popup-header" style="background: linear-gradient(to right, #2c3e50, #4ca1af); color: #fff; padding: 12px; border-radius: 8px 8px 0 0;">
                <div style="font-weight: 700; font-size: 16px;">${finalProps.name}</div>
                <div style="font-size: 12px; opacity: 0.9;"><i class="fas fa-charging-station"></i> Trạm sạc VinFast</div>
           </div>
           <div class="popup-body" style="padding: 15px;">
                <div class="popup-item" style="margin-bottom: 8px;"><i class="fas fa-map-marker-alt" style="color: #e74c3c; width: 20px;"></i> ${finalProps.address}</div>
                <div class="popup-item" style="margin-bottom: 8px;"><i class="fas fa-plug" style="color: #3498db; width: 20px;"></i> Loại: <strong>${finalProps.category}</strong></div>
                <div class="popup-item" style="margin-bottom: 8px;">
                     <i class="fas fa-power-off" style="color: ${isWorking ? '#2ecc71' : '#e74c3c'}; width: 20px;"></i> 
                     Trạng thái: <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background: ${isWorking ? '#e8f8f5' : '#fdedec'}; color: ${isWorking ? '#27ae60' : '#c0392b'}; font-weight: 600;">${isWorking ? 'Đang hoạt động' : (finalProps.status || 'Chưa xác định')}</span>
                </div>
        `;
        
        if (finalProps.hotline) {
            contentHTML += `<div class="popup-item" style="margin-bottom: 8px;"><i class="fas fa-headset" style="color: #f39c12; width: 20px;"></i> Hotline: <a href="tel:${finalProps.hotline}" style="color: #2980b9; text-decoration: none; font-weight: 600;">${finalProps.hotline}</a></div>`;
        }
        
        if (finalProps.open_time) {
            contentHTML += `<div class="popup-item"><i class="fas fa-clock" style="color: #9b59b6; width: 20px;"></i> Giờ mở cửa: ${finalProps.open_time} - ${finalProps.close_time || '...'}</div>`;
        }
        
        contentHTML += `</div>`; // Close body
        
        content!.innerHTML = contentHTML;
        overlay.setPosition(coordinate);
        return; // Stop here, don't run score tool or others
    }
  }

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

  // Base Map Switcher Logic (Radio Buttons)
  const radioOsm = document.getElementById('radio-osm') as HTMLInputElement;
  const radioSatellite = document.getElementById('radio-satellite') as HTMLInputElement;
  const radioCarto = document.getElementById('radio-carto') as HTMLInputElement;

  const updateBaseMap = () => {
     // Default state
     osmLayer.setVisible(true); // Always keep OSM as bottom base
     satelliteLayer.setVisible(false);
     cartoLayer.setVisible(false);

     if (radioSatellite && radioSatellite.checked) {
         satelliteLayer.setVisible(true);
     } else if (radioCarto && radioCarto.checked) {
         cartoLayer.setVisible(true);
     }
  };

  if (radioOsm) radioOsm.addEventListener('change', updateBaseMap);
  if (radioSatellite) radioSatellite.addEventListener('change', updateBaseMap);
  if (radioCarto) radioCarto.addEventListener('change', updateBaseMap);

  /* OLD TOGGLE REMOVED
  const cartoToggle = document.getElementById('carto-layer-toggle') as HTMLInputElement;
  ...
  */

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

  // Score Tool Logic - REMOVED
  /*
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
  */

  // Sidebar Toggle Logic REMOVED for Fixed Sidebar
  /*
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebarClose = document.getElementById('sidebar-close');
  
  // Fixed Sidebar does not use toggle logic
  */

}

// Run init when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}


