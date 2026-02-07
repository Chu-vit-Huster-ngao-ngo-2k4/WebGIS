"use strict";
var _a, _b, _c, _d, _e, _f;
// Configuration
const API_URL = 'http://localhost:3005';
// Initialize the map
const map = new ol.Map({
    target: 'map',
    view: new ol.View({
        center: ol.proj.fromLonLat([105.85, 21.02]), // Hanoi, Vietnam
        zoom: 13,
    })
});
// --- HANOI DISTRICTS/COMMUNES LAYER ---
const districtSafetySource = new ol.source.Vector();
// Highlight Interaction Layer (Selected District)
const selectedDistrictSource = new ol.source.Vector();
const selectedDistrictLayer = new ol.layer.Vector({
    source: selectedDistrictSource,
    zIndex: 11, // Above district layer
    style: new ol.style.Style({
        stroke: new ol.style.Stroke({ color: '#f1c40f', width: 3 }), // Yellow selection border
        fill: new ol.style.Fill({ color: 'rgba(241, 196, 15, 0.2)' }) // Semi-transparent yellow fill
    })
});
map.addLayer(selectedDistrictLayer);
// Dimmer Layer (Dark background outside Hanoi)
// We use a large extent polygon to cover the "world"
const dimmerSource = new ol.source.Vector();
const dimmerFeature = new ol.Feature({
    geometry: new ol.geom.Polygon.fromExtent([-20037508.34, -20037508.34, 20037508.34, 20037508.34]) // Web Mercator full extent
});
dimmerSource.addFeature(dimmerFeature);
const dimmerLayer = new ol.layer.Vector({
    source: dimmerSource,
    zIndex: 9, // Below districts (10) but above base maps
    visible: true,
    style: new ol.style.Style({
        fill: new ol.style.Fill({ color: 'rgba(0, 0, 0, 0.5)' }) // 50% opacity black
    })
});
map.addLayer(dimmerLayer);
const districtSafetyLayer = new ol.layer.Vector({
    source: districtSafetySource,
    zIndex: 10,
    style: new ol.style.Style({
        stroke: new ol.style.Stroke({ color: '#74b9ff', width: 2 }), // Light Blue border
        fill: new ol.style.Fill({ color: 'rgba(255, 255, 255, 0)' }) // Transparent fill
    })
});
map.addLayer(districtSafetyLayer);
// Dimmer Layer implementation using 'prerender' to clip
// We want the dimmer to draw EVERYWHERE EXCEPT the districtSafetySource features.
dimmerLayer.on('prerender', (evt) => {
    const ctx = evt.context;
    // Only clip if we have districts loaded
    if (districtSafetySource.getFeatures().length === 0)
        return;
    ctx.save();
    ctx.beginPath();
    // Draw all district polygons to the path
    // Note: This draws them in pixel coordinates.
    // We need to transform coordinates. 
    // This is complex and performance heavy for 126 polygons on every frame.
    // Optimisation: Just draw the dimming rect.
    // Let's rely on a simpler visual: Focus on Hanoi borders.
    // If we MUST dim the outside, we really need that inverted polygon.
    ctx.restore();
});
async function loadDistrictSafety() {
    try {
        console.log('Fetching boundary data...');
        const res = await fetch(`${API_URL}/api/district-safety`);
        if (!res.ok)
            throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        console.log(`Received ${data.length} boundary records`);
        districtSafetySource.clear();
        if (data.length === 0) {
            console.warn('No boundary data returned from API');
            alert('Cảnh báo: Không tải được dữ liệu ranh giới (0 bản ghi). Hãy kiểm tra lại backend.');
            return;
        }
        data.forEach((d) => {
            if (!d.geom)
                return;
            const feature = new ol.format.GeoJSON().readFeature({
                type: 'Feature',
                geometry: d.geom,
                properties: {
                    id: d.id,
                    ten_xa: d.ten_xa,
                    dan_so: d.dan_so,
                    total_stations: d.total_stations,
                    open_stations: d.open_stations,
                    maintenance_stations: d.maintenance_stations,
                    charging_stations: d.charging_stations,
                    battery_stations: d.battery_stations,
                    safety_score: d.safety_score
                }
            }, { featureProjection: 'EPSG:3857' });
            districtSafetySource.addFeature(feature);
        });
        console.log('Added features to map source');
        // Zoom to extent if data loaded
        if (districtSafetySource.getFeatures().length > 0) {
            const extent = districtSafetySource.getExtent();
            if (!ol.extent.isEmpty(extent)) {
                map.getView().fit(extent, { padding: [50, 50, 50, 50], duration: 1000 });
            }
        }
    }
    catch (e) {
        console.error('Failed to load boundaries:', e);
        alert('Lỗi tải dữ liệu biên giới: ' + (e.message || String(e)));
    }
}
// Gọi khi khởi động app
loadDistrictSafety();
// Old District Popup Handler removed in favor of Sidebar integration
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
    style: (feature) => {
        // Basic style for filtered items
        return new ol.style.Style({
            image: new ol.style.Circle({
                radius: 6,
                fill: new ol.style.Fill({ color: '#e67e22' }),
                stroke: new ol.style.Stroke({ color: '#fff', width: 2 })
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
chargingStationsSource.once('change', function (e) {
    if (chargingStationsSource.getState() === 'ready') {
        const featureCount = chargingStationsSource.getFeatures().length;
        console.log(`Loaded ${featureCount} charging stations.`);
        // Notify user
        const countEl = document.getElementById('feature-count');
        if (countEl)
            countEl.innerHTML = `<span style="color: green">Loaded ${featureCount} VinFast Stations</span>`;
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
// Helper for Status Style
const createStatusStyle = (feature) => {
    const props = feature.getProperties();
    const status = props.status;
    const isActive = status === '1' || status === 'Đang hoạt động' || status === 'Hoạt động';
    // Status Mode: Green vs Gray
    const color = isActive ? '#27ae60' : '#95a5a6';
    const icon = '\uf0e7'; // Bolt
    return new ol.style.Style({
        image: new ol.style.Circle({
            radius: 10,
            fill: new ol.style.Fill({ color: color }),
            stroke: new ol.style.Stroke({ color: '#fff', width: 2 })
        }),
        text: new ol.style.Text({
            text: icon,
            font: '900 10px "Font Awesome 6 Free"',
            fill: new ol.style.Fill({ color: '#fff' }),
            offsetY: 0
        })
    });
};
// Helper for Type Style
const createTypeStyle = (feature) => {
    const props = feature.getProperties();
    const rawCategory = props.category || '';
    const category = rawCategory.toLowerCase();
    let color = '#f1c40f'; // Default
    let icon = '\uf128';
    if (category.includes('ô tô') || category.includes('car') || category.includes('bus')) {
        color = '#2980b9'; // Blue
        icon = '\uf1b9'; // Car
    }
    else if (category.includes('xe máy') || category.includes('bike') || category.includes('moto')) {
        color = '#e67e22'; // Orange
        icon = '\uf21c'; // Motorcycle
    }
    else if (category.includes('pin') || category.includes('tủ') || category.includes('battery')) {
        color = '#8e44ad'; // Purple
        icon = '\uf0e7'; // Bolt
    }
    else if (category.includes('hỗn hợp') || category.includes('mix')) {
        color = '#16a085'; // Teal
        icon = '\uf5fd'; // Layer Group
    }
    return new ol.style.Style({
        image: new ol.style.Circle({
            radius: 10,
            fill: new ol.style.Fill({ color: color }),
            stroke: new ol.style.Stroke({ color: '#fff', width: 2 })
        }),
        text: new ol.style.Text({
            text: icon,
            font: '900 10px "Font Awesome 6 Free"',
            fill: new ol.style.Fill({ color: '#fff' }),
            offsetY: 0
        })
    });
};
// Generic Cluster Style Generator
const getLayerStyle = (feature, type) => {
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
    if (features && features.length > 0) {
        return features.map((f) => {
            const style = type === 'status' ? createStatusStyle(f) : createTypeStyle(f);
            style.setGeometry(f.getGeometry());
            return style;
        });
    }
    return type === 'status' ? createStatusStyle(feature) : createTypeStyle(feature);
};
// 1. Status Layer
const statusLayer = new ol.layer.Vector({
    source: clusterSource,
    zIndex: 150,
    visible: true, // Default ON
    style: (feature) => getLayerStyle(feature, 'status')
});
// 2. Type Layer
const typeLayer = new ol.layer.Vector({
    source: clusterSource,
    zIndex: 150,
    visible: false, // Default OFF
    style: (feature) => getLayerStyle(feature, 'type')
});
map.addLayer(statusLayer);
map.addLayer(typeLayer);
// --- STYLE MODE LOGIC ---
const modeStatus = document.getElementById('mode-status');
const modeType = document.getElementById('mode-type');
const updateStyleMode = () => {
    if (modeStatus && modeStatus.checked) {
        statusLayer.setVisible(true);
        typeLayer.setVisible(false);
    }
    if (modeType && modeType.checked) {
        statusLayer.setVisible(false);
        typeLayer.setVisible(true);
        // --- DEBUGGING DATA FROM BACKEND ---
        console.group("🔍 DEBUG: Data Check for Type Mode");
        const features = chargingStationsSource.getFeatures();
        if (features.length === 0) {
            console.warn("⚠️ No features loaded in chargingStationsSource.");
        }
        else {
            console.log(`✅ Loaded ${features.length} stations.`);
            // Count categories to see what data we actually have
            const categoryCounts = {};
            const sampleFeatures = [];
            features.forEach((f, index) => {
                const props = f.getProperties();
                const cat = props.category || 'UNDEFINED';
                categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
                if (sampleFeatures.length < 5)
                    sampleFeatures.push({ id: index, category: cat, status: props.status });
            });
            console.log("📊 Category Distribution:", categoryCounts);
            console.log("📝 First 5 Samples:", sampleFeatures);
            console.log("ℹ️ If categories are 'UNDEFINED', check your database or backend query.");
        }
        console.groupEnd();
    }
};
if (modeStatus)
    modeStatus.addEventListener('change', updateStyleMode);
if (modeType)
    modeType.addEventListener('change', updateStyleMode);
// --- GLOBAL LAYER TOGGLES ---
const toggleStationsCheckbox = document.getElementById('toggle-stations');
const toggleDistrictsCheckbox = document.getElementById('toggle-districts');
if (toggleStationsCheckbox) {
    toggleStationsCheckbox.addEventListener('change', () => {
        // Toggle both potential station layers
        const isVisible = toggleStationsCheckbox.checked;
        if (modeStatus && modeStatus.checked)
            statusLayer.setVisible(isVisible);
        else
            statusLayer.setVisible(false); // If mode not active, keep hidden. Logic below handles actual active layer.
        if (modeType && modeType.checked)
            typeLayer.setVisible(isVisible);
        else
            typeLayer.setVisible(false);
        // Update the updateStyleMode function to respect this master toggle
        updateStyleMode();
    });
}
if (toggleDistrictsCheckbox) {
    toggleDistrictsCheckbox.addEventListener('change', () => {
        const isChecked = toggleDistrictsCheckbox.checked;
        districtSafetyLayer.setVisible(isChecked);
        selectedDistrictLayer.setVisible(isChecked); // Hide selection if layer is hidden
        if (!isChecked) {
            selectedDistrictSource.clear(); // Clear selection when hiding
            // Also hide dimmer if we decide to link them
        }
    });
}
// Override updateStyleMode to include visibility check
const _originalUpdateStyleMode = updateStyleMode; // Keep reference if needed, but we redefine simple logic below
const updateStyleModeEnhanced = () => {
    const isStationsEnabled = toggleStationsCheckbox ? toggleStationsCheckbox.checked : true;
    if (modeStatus && modeStatus.checked) {
        statusLayer.setVisible(isStationsEnabled);
        typeLayer.setVisible(false);
    }
    if (modeType && modeType.checked) {
        statusLayer.setVisible(false);
        typeLayer.setVisible(isStationsEnabled);
    }
};
// --- SELECTION LOGIC FOR DISTRICTS ---
const selectDistrict = (feature) => {
    if (!feature) {
        selectedDistrictSource.clear();
        return;
    }
    selectedDistrictSource.clear();
    // Clone the feature to the selection layer so we can style it independently
    const selectedFeature = feature.clone();
    selectedDistrictSource.addFeature(selectedFeature);
};
// -- SEARCH & SIDEBAR LOGIC (Moved Up for Scope Accessibility) --
const openSearchBtn = document.getElementById('open-search-btn');
const closeSearchBtn = document.getElementById('close-search-btn');
const sidebarMainView = document.getElementById('sidebar-main-view');
const sidebarSearchView = document.getElementById('sidebar-search-view');
const sidebarDistrictView = document.getElementById('sidebar-district-view');
const sidebarRight = document.getElementById('sidebar-right'); // NEW: Right Sidebar Container
const closeDistrictBtn = document.getElementById('close-district-btn');
const districtInfoContent = document.getElementById('district-info-content');
const sidebarSearchInput = document.getElementById('sidebar-search-input');
if (openSearchBtn && sidebarMainView && sidebarSearchView) {
    openSearchBtn.addEventListener('click', () => {
        console.log('Open Search Clicked');
        sidebarMainView.style.display = 'none';
        sidebarSearchView.style.display = 'flex';
        // We don't need to force close the right sidebar, as it doesn't overlap.
        // But if we wanted to enforce focus, we could:
        // if(sidebarRight) sidebarRight.style.display = 'none'; 
        if (sidebarSearchInput)
            sidebarSearchInput.focus();
    });
}
else {
    console.error('Search elements missing:', { openSearchBtn, sidebarMainView, sidebarSearchView });
}
if (closeSearchBtn && sidebarMainView && sidebarSearchView) {
    closeSearchBtn.addEventListener('click', () => {
        console.log('Close Search Clicked');
        sidebarSearchView.style.display = 'none';
        sidebarMainView.style.display = 'flex'; // Restore as flex
    });
}
// Updated Close Logic for Right Sidebar
if (closeDistrictBtn && sidebarDistrictView) {
    closeDistrictBtn.addEventListener('click', () => {
        // Hide the Right Sidebar Container
        if (sidebarRight)
            sidebarRight.style.display = 'none';
        // No longer need to restore Sidebar Left (sidebarMainView) because we don't hide it anymore!
        selectedDistrictSource.clear();
    });
}
// Update Single Click Logic to handle District Selection
map.on('singleclick', (evt) => {
    // 1. Check Stations first (Higher Priority)
    const stationFeature = map.forEachFeatureAtPixel(evt.pixel, (f) => f, {
        layerFilter: (l) => l === statusLayer || l === typeLayer
    });
    if (stationFeature) {
        // Logic for Station Popup (handled elsewhere in existing code, we ensure we don't block it)
        // Just return here to let existing handler pick it up, OR ensure existing handler stops propogation
        // The existing handler is async and registered separately.
        // We should ideally merge them, but for now, let's just clear district selection if a station is clicked?
        // No, user might want to see context.
        return;
    }
    // 2. Check Districts
    const districtFeature = map.forEachFeatureAtPixel(evt.pixel, (f) => f, {
        layerFilter: (l) => l === districtSafetyLayer
    });
    if (districtFeature) {
        // Select it
        selectDistrict(districtFeature);
        // AUTO ZOOM LOGIC
        const geometry = districtFeature.getGeometry();
        if (geometry) {
            const isMobile = window.innerWidth <= 768;
            // Calculate padding to ensure popup doesn't cover feature
            // Right Sidebar Width is ~350px. Mobile bottom is ~40%.
            const padding = isMobile
                ? [50, 50, (window.innerHeight * 0.4) + 50, 50]
                : [50, 400, 50, 50]; // 400px right padding gives space for sidebar + gap
            map.getView().fit(geometry, {
                padding: padding,
                duration: 1000, // Smooth execution
                maxZoom: 15.5 // Limit zoom level so it's not too close for small areas
            });
        }
        const props = districtFeature.getProperties();
        console.log("DEBUG: Clicked District Props:", props); // Log properties to console for debugging
        // Open Sidebar View (RIGHT SIDE)
        if (districtInfoContent && sidebarDistrictView && sidebarRight) {
            console.log("DEBUG: Opening Right Sidebar for", props.ten_xa);
            // Do NOT hide Left Sidebar anymore
            // sidebarMainView.style.display = 'none'; 
            // sidebarSearchView.style.display = 'none';
            sidebarRight.style.display = 'block'; // Show the container
            sidebarDistrictView.style.display = 'flex'; // Ensure content flex
            districtInfoContent.innerHTML = `
            <div style="padding: 25px;"> 
                <div style="padding-bottom: 15px; border-bottom: 1px solid #eee;">
                    <h3 style="color: #c0392b; margin-top: 0; margin-bottom: 5px; font-size: 22px;">${props.ten_xa}</h3>
                    <div style="color: #7f8c8d; font-size: 0.95em;">
                        <i class="fas fa-users" style="width: 20px;"></i> Dân số: <b>${props.dan_so ? props.dan_so.toLocaleString() : 'N/A'}</b>
                    </div>
                </div>
            
                <div style="margin-top: 20px;">
                <h4 style="margin-bottom: 15px; color: #2c3e50; border-left: 3px solid #c0392b; padding-left: 10px;">Thống kê Trạm sạc</h4>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; text-align: center; grid-column: span 2;">
                        <div style="font-size: 32px; font-weight: bold; color: #2c3e50;">${props.total_stations}</div>
                        <div style="font-size: 12px; color: #7f8c8d; text-transform: uppercase; letter-spacing: 1px;">Tổng số trạm</div>
                    </div>
                </div>

                <div style="margin-bottom: 15px;">
                   <h5 style="margin: 0 0 10px 0; color: #34495e; font-size: 14px; border-bottom: 1px dashed #ddd; padding-bottom: 5px;">Phân loại Trạm</h5>
                   <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                      <span style="color: #666"><i class="fas fa-charging-station" style="color:#2980b9"></i> Trạm sạc xe:</span>
                      <span style="font-weight: bold; color: #2c3e50">${props.charging_stations !== undefined ? props.charging_stations : 'Loading...'}</span>
                   </div>
                   <div style="display: flex; justify-content: space-between;">
                      <span style="color: #666"><i class="fas fa-battery-full" style="color:#f39c12"></i> Tủ đổi pin:</span>
                      <span style="font-weight: bold; color: #2c3e50">${props.battery_stations !== undefined ? props.battery_stations : 'Loading...'}</span>
                   </div>
                </div>

                <div style="margin-bottom: 15px;">
                   <h5 style="margin: 0 0 10px 0; color: #34495e; font-size: 14px; border-bottom: 1px dashed #ddd; padding-bottom: 5px;">Trạng thái hoạt động</h5>
                   <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                     <div style="background: #eafaf1; padding: 10px; border-radius: 6px; text-align: center;">
                        <div style="font-size: 18px; font-weight: bold; color: #27ae60;">${props.open_stations}</div>
                        <div style="font-size: 10px; color: #27ae60; font-weight: 600;">HOẠT ĐỘNG</div>
                    </div>
                    
                     <div style="background: #fef5e7; padding: 10px; border-radius: 6px; text-align: center;">
                        <div style="font-size: 18px; font-weight: bold; color: #e67e22;">${props.maintenance_stations}</div>
                        <div style="font-size: 10px; color: #d35400; font-weight: 600;">BẢO TRÌ</div>
                    </div>
                   </div>
                </div>
                
                <div style="background: #fff; padding: 10px; border: 1px solid #eee; border-radius: 4px; font-size: 13px; line-height: 1.6; color: #555;">
                    <i class="fas fa-info-circle" style="color: #3498db;"></i> 
                    Khu vực <b>${props.ten_xa}</b> hiện có <b>${props.total_stations}</b> trạm sạc VinFast.
                    ${props.total_stations > 0 ? 'Hạ tầng sạc tại đây ' + (props.total_stations > 5 ? 'được đầu tư mạnh.' : 'đang ở mức cơ bản.') : 'Chưa có trạm sạc tại đây.'}
                </div>
            </div>
          `;
        }
    }
    else {
        // Clicked on empty space (map background)
        selectDistrict(null);
        if (sidebarDistrictView && sidebarMainView) {
            sidebarDistrictView.style.display = 'none';
            sidebarMainView.style.display = 'flex';
        }
    }
});
// Re-bind listeners to new function
if (modeStatus) {
    modeStatus.removeEventListener('change', updateStyleMode); // Remove old ref event
    modeStatus.addEventListener('change', updateStyleModeEnhanced);
}
if (modeType) {
    modeType.removeEventListener('change', updateStyleMode);
    modeType.addEventListener('change', updateStyleModeEnhanced);
}
// Also update the station checkbox listener to call this new function
if (toggleStationsCheckbox) {
    // Clear previous listener to avoid double call (though simple override is cleaner code structure in future)
    toggleStationsCheckbox.onchange = updateStyleModeEnhanced;
}
// --- CLUSTER TOGGLE LOGIC ---
const clusterCheckbox = document.getElementById('toggle-cluster');
if (clusterCheckbox) {
    clusterCheckbox.addEventListener('change', () => {
        const isClusterEnabled = clusterCheckbox.checked;
        const source = isClusterEnabled ? clusterSource : chargingStationsSource;
        statusLayer.setSource(source);
        typeLayer.setSource(source);
    });
}
// Logic Search function (migrated)
const performSidebarSearch = async () => {
    if (!sidebarSearchInput)
        return;
    const query = sidebarSearchInput.value;
    if (!query)
        return;
    const resultsContainer = document.getElementById('sidebar-search-results');
    if (resultsContainer)
        resultsContainer.innerHTML = '<div style="padding:20px; text-align:center"><i class="fas fa-spinner fa-spin"></i> Searching...</div>';
    try {
        const response = await fetch(`${API_URL}/api/data/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        if (resultsContainer) {
            resultsContainer.innerHTML = '';
            if (data.length === 0) {
                resultsContainer.innerHTML = '<div style="padding:20px; text-align:center">No results found</div>';
                return;
            }
            data.forEach((item) => {
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
                    content.innerHTML = `<div style="font-weight:bold">${item.name}</div>`;
                };
                resultsContainer.appendChild(div);
            });
        }
    }
    catch (e) {
        console.error(e);
        if (resultsContainer)
            resultsContainer.innerHTML = '<div style="color:red; padding:20px">Search failed</div>';
    }
};
const searchGoBtn = document.getElementById('sidebar-search-go');
if (searchGoBtn) {
    searchGoBtn.addEventListener('click', performSidebarSearch);
}
if (sidebarSearchInput) {
    sidebarSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter')
            performSidebarSearch();
    });
}
// -- LAYER FILTER LOGIC (Mô phỏng Ẩn/Hiện lớp con bằng Style) --
// Ta không thực sự có layer con, mà chỉ filter feature trên 1 layer chính
const checkboxes = document.querySelectorAll('.layer-checkbox');
checkboxes.forEach(cb => {
    cb.addEventListener('change', () => {
        statusLayer.changed(); // Trigger re-render
        typeLayer.changed(); // Trigger re-render
    });
});
// Update style function to respect filters
const isFeatureVisible = (feature) => {
    const props = feature.getProperties();
    const status = props.status;
    // Check status based on both numeric code and text description
    // Status 1 = Active. VinFast Status string = "Đang hoạt động" or "Hoạt động" or "active"
    const isActive = status === '1' ||
        status === 'Đang hoạt động' ||
        status === 'Hoạt động' ||
        (typeof status === 'string' && status.toLowerCase() === 'active');
    // Determine type for filter
    const filterType = isActive ? 'active' : 'inactive';
    // Find checkbox for this type
    const cb = document.querySelector(`.layer-checkbox[data-filter="${filterType}"]`);
    return cb ? cb.checked : true; // Default true if no filter found
};
// Generic Filtered Style Wrapper
const getFilteredStyle = (feature, resolution, type) => {
    const features = feature.get('features'); // For clusters
    if (features) {
        // --- CLUSTER LOGIC ---
        const visibleFeatures = features.filter((f) => isFeatureVisible(f));
        if (visibleFeatures.length === 0) {
            return null; // Hide entire cluster if all sub-features are hidden
        }
        const size = features.length;
        if (size > 5) {
            // Reuse cluster bubble style
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
        // Small cluster -> Map to individual styles
        return features.map((f) => {
            if (!isFeatureVisible(f))
                return new ol.style.Style({});
            const style = type === 'status' ? createStatusStyle(f) : createTypeStyle(f);
            style.setGeometry(f.getGeometry());
            return style;
        });
    }
    else {
        // --- SINGLE FEATURE LOGIC ---
        if (!isFeatureVisible(feature))
            return null;
        return type === 'status' ? createStatusStyle(feature) : createTypeStyle(feature);
    }
};
// Apply filtered style logic
statusLayer.setStyle((f, r) => getFilteredStyle(f, r, 'status'));
typeLayer.setStyle((f, r) => getFilteredStyle(f, r, 'type'));
// Basemap Switcher Logic
const setBasemap = (type) => {
    osmLayer.setVisible(type === 'osm');
    satelliteLayer.setVisible(type === 'satellite');
    cartoLayer.setVisible(type === 'carto');
};
(_a = document.getElementById('radio-osm')) === null || _a === void 0 ? void 0 : _a.addEventListener('change', () => setBasemap('osm'));
(_b = document.getElementById('radio-satellite')) === null || _b === void 0 ? void 0 : _b.addEventListener('change', () => setBasemap('satellite'));
(_c = document.getElementById('radio-carto')) === null || _c === void 0 ? void 0 : _c.addEventListener('change', () => setBasemap('carto'));
// Layer Toggles
(_d = document.getElementById('check-all')) === null || _d === void 0 ? void 0 : _d.addEventListener('change', (e) => {
    // Toggle the visible ONE
    if (modeStatus && modeStatus.checked)
        statusLayer.setVisible(e.target.checked);
    if (modeType && modeType.checked)
        typeLayer.setVisible(e.target.checked);
});
// Unified Refresh button handler
const updateLastUpdatedInfo = async () => {
    try {
        const res = await fetch(`${API_URL}/api/stations/info`);
        const data = await res.json();
        const lastUpdatedEl = document.getElementById('last-updated');
        if (lastUpdatedEl && data.last_updated) {
            const date = new Date(data.last_updated);
            const formatted = date.toLocaleString('vi-VN', {
                hour: '2-digit', minute: '2-digit',
                day: '2-digit', month: '2-digit', year: 'numeric'
            });
            lastUpdatedEl.innerText = `Cập nhật: ${formatted}`;
        }
    }
    catch (e) {
        console.error('Failed to fetch stations info:', e);
    }
};
const handleRefresh = async (e) => {
    var _a, _b, _c;
    e.stopPropagation();
    const btn = e.currentTarget;
    const icon = btn.querySelector('i');
    if (icon)
        icon.classList.add('fa-spin');
    try {
        // Notify user process started
        console.log('Starting sync...');
        const res = await fetch(`${API_URL}/api/stations/sync`, { method: 'POST' });
        const json = await res.json();
        if (res.ok) {
            alert(`Cập nhật thành công!\nTổng: ${((_a = json.stats) === null || _a === void 0 ? void 0 : _a.total) || 0}\nMới: ${((_b = json.stats) === null || _b === void 0 ? void 0 : _b.new) || 0}\nCập nhật: ${((_c = json.stats) === null || _c === void 0 ? void 0 : _c.updated) || 0}`);
            // Refresh layer
            chargingStationsSource.clear();
            chargingStationsSource.refresh();
            // Update info text
            updateLastUpdatedInfo();
        }
        else {
            throw new Error(json.error || 'Server returned error');
        }
    }
    catch (err) {
        alert('Lỗi cập nhật dữ liệu. Vui lòng kiểm tra Server console.');
        console.error(err);
    }
    finally {
        if (icon)
            icon.classList.remove('fa-spin');
    }
};
(_e = document.getElementById('refresh-stations-btn')) === null || _e === void 0 ? void 0 : _e.addEventListener('click', handleRefresh);
(_f = document.getElementById('refresh-data-btn')) === null || _f === void 0 ? void 0 : _f.addEventListener('click', handleRefresh);
// Vector layer for loaded features
// Analysis layer (Buffer & Results)
const analysisSource = new ol.source.Vector();
const analysisLayer = new ol.layer.Vector({
    source: analysisSource,
    zIndex: 200,
    style: (feature) => {
        const type = feature.get('type');
        if (type === 'buffer') {
            return new ol.style.Style({
                stroke: new ol.style.Stroke({ color: '#8e44ad', width: 2, lineDash: [10, 10] }),
                fill: new ol.style.Fill({ color: 'rgba(142, 68, 173, 0.1)' })
            });
        }
        else if (type === 'score-buffer') {
            return new ol.style.Style({
                stroke: new ol.style.Stroke({ color: '#27ae60', width: 2 }),
                fill: new ol.style.Fill({ color: 'rgba(39, 174, 96, 0.1)' })
            });
        }
        else if (type === 'score-marker') {
            return null; // Style is set on feature directly
        }
        else {
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
    element: container,
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
map.on('singleclick', async (evt) => {
    var _a, _b, _c, _d;
    const coordinate = evt.coordinate;
    // 0. Check feature click first (Charging Stations usually)
    const clickedFeature = map.forEachFeatureAtPixel(evt.pixel, (feat) => feat);
    if (clickedFeature) {
        let featureToSend = clickedFeature;
        const props = clickedFeature.getProperties();
        // Handling Cluster logic
        if (props.features) {
            const features = props.features;
            // If cluster has MANY items (> 5), Zoom in
            if (features.length > 5) {
                const extent = ol.extent.createEmpty();
                features.forEach((f) => ol.extent.extend(extent, f.getGeometry().getExtent()));
                const view = map.getView();
                if (view.getZoom() < 19) {
                    view.fit(extent, { duration: 500, padding: [50, 50, 50, 50] });
                    return;
                }
                featureToSend = features[0];
            }
            else {
                // Cluster <= 5 items OR Single item
                // Since we visually separated them in the style, the user clicked on a specific location.
                // We need to find WHICH sub-feature is closest to the click coordinate.
                if (features.length > 1) {
                    const clickCoord = evt.coordinate;
                    let closestFeature = features[0];
                    let minDist = Infinity;
                    features.forEach((f) => {
                        const geom = f.getGeometry();
                        const closestPoint = geom.getClosestPoint(clickCoord);
                        const dist = Math.sqrt(Math.pow(clickCoord[0] - closestPoint[0], 2) +
                            Math.pow(clickCoord[1] - closestPoint[1], 2));
                        if (dist < minDist) {
                            minDist = dist;
                            closestFeature = f;
                        }
                    });
                    featureToSend = closestFeature;
                }
                else {
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
            content.innerHTML = contentHTML;
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
        if (scoreResults)
            scoreResults.style.display = 'block';
        if (scoreValue)
            scoreValue.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size: 0.5em;"></i>';
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
            const wEdu = ((_a = document.getElementById('w-edu')) === null || _a === void 0 ? void 0 : _a.value) || '3';
            const wHealth = ((_b = document.getElementById('w-health')) === null || _b === void 0 ? void 0 : _b.value) || '3';
            const wService = ((_c = document.getElementById('w-service')) === null || _c === void 0 ? void 0 : _c.value) || '2';
            const wLeisure = ((_d = document.getElementById('w-leisure')) === null || _d === void 0 ? void 0 : _d.value) || '2';
            const response = await fetch(`${API_URL}/api/analysis/score?lat=${lat}&lon=${lon}&w_edu=${wEdu}&w_health=${wHealth}&w_service=${wService}&w_leisure=${wLeisure}`);
            const data = await response.json();
            if (scoreValue) {
                scoreValue.innerText = data.score;
                scoreValue.style.color = data.score >= 80 ? '#27ae60' : (data.score >= 50 ? '#f39c12' : '#c0392b');
            }
            if (scoreClass)
                scoreClass.innerText = data.classification;
            if (scoreDetails) {
                if (data.score === 0 && data.details.message) {
                    scoreDetails.innerHTML = `<div style="color: red; font-weight: bold; text-align: center;">${data.details.message}</div>`;
                }
                else {
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
            document.getElementById('map').style.cursor = 'default';
            const btn = document.getElementById('score-btn');
            if (btn)
                btn.style.background = '#27ae60';
        }
        catch (error) {
            console.error('Score error:', error);
            if (scoreValue)
                scoreValue.innerText = 'Err';
        }
        return;
    }
    // 0. Check if Buffer Tool is active
    if (isBufferToolActive) {
        const lonLat = ol.proj.toLonLat(coordinate);
        const [lon, lat] = lonLat;
        const radiusInput = document.getElementById('buffer-radius');
        const radius = radiusInput ? radiusInput.value : 500;
        const resultsDiv = document.getElementById('analysis-results');
        if (resultsDiv)
            resultsDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
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
                if (resultsDiv)
                    resultsDiv.innerHTML = `Found <strong>${features.length}</strong> places within ${radius}m.`;
            }
            else {
                if (resultsDiv)
                    resultsDiv.innerHTML = `No places found within ${radius}m.`;
            }
            // Show clear button
            const clearBtn = document.getElementById('clear-analysis-btn');
            if (clearBtn)
                clearBtn.style.display = 'block';
            // Deactivate tool after use
            isBufferToolActive = false;
            document.getElementById('map').style.cursor = 'default';
            const btn = document.getElementById('buffer-btn');
            if (btn)
                btn.style.background = '#8e44ad';
        }
        catch (error) {
            console.error('Analysis error:', error);
            if (resultsDiv)
                resultsDiv.innerHTML = 'Error during analysis.';
        }
        return;
    }
    // 1. Check for client-side features (Vector Tiles or loaded GeoJSON)
    const hit = map.forEachFeatureAtPixel(evt.pixel, (f, l) => ({ feature: f, layer: l }));
    if (hit && hit.feature) {
        // IGNORE Districts (Handled by Sidebar) and other UI layers to prevent double popup
        if (hit.layer === districtSafetyLayer || hit.layer === selectedDistrictLayer || hit.layer === dimmerLayer) {
            return;
        }
        const properties = hit.feature.getProperties();
        let html = `<div class="popup-row"><span class="popup-label">Source:</span> Vector Layer</div>`;
        // Filter out geometry and internal properties
        Object.keys(properties).forEach(key => {
            if (key !== 'geometry' && key !== 'layer' && typeof properties[key] !== 'object') {
                html += `<div class="popup-row"><span class="popup-label">${key}:</span> ${properties[key]}</div>`;
            }
        });
        if (content)
            content.innerHTML = html;
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
            if (feature.name)
                html += `<div class="popup-row"><span class="popup-label">Name:</span> ${feature.name}</div>`;
            if (feature.building)
                html += `<div class="popup-row"><span class="popup-label">Building:</span> ${feature.building}</div>`;
            if (feature.amenity)
                html += `<div class="popup-row"><span class="popup-label">Amenity:</span> ${feature.amenity}</div>`;
            if (feature.natural)
                html += `<div class="popup-row"><span class="popup-label">Natural:</span> ${feature.natural}</div>`;
            if (feature.place)
                html += `<div class="popup-row"><span class="popup-label">Place:</span> ${feature.place}</div>`;
            if (content)
                content.innerHTML = html;
            overlay.setPosition(coordinate);
        }
        else {
            overlay.setPosition(undefined);
            console.log('No features found at this location');
        }
    }
    catch (error) {
        console.error('Error identifying feature:', error);
    }
});
// Initialize application logic
function initApp() {
    console.log('WebGIS App Initializing...');
    // Update info on load
    updateLastUpdatedInfo();
    // Layer controls
    // Base Map Switcher Logic (Radio Buttons)
    const radioOsm = document.getElementById('radio-osm');
    const radioSatellite = document.getElementById('radio-satellite');
    const radioCarto = document.getElementById('radio-carto');
    const updateBaseMap = () => {
        // Default state
        osmLayer.setVisible(true); // Always keep OSM as bottom base
        satelliteLayer.setVisible(false);
        cartoLayer.setVisible(false);
        if (radioSatellite && radioSatellite.checked) {
            satelliteLayer.setVisible(true);
        }
        else if (radioCarto && radioCarto.checked) {
            cartoLayer.setVisible(true);
        }
    };
    if (radioOsm)
        radioOsm.addEventListener('change', updateBaseMap);
    if (radioSatellite)
        radioSatellite.addEventListener('change', updateBaseMap);
    if (radioCarto)
        radioCarto.addEventListener('change', updateBaseMap);
    // Style Mode Switcher
    // (Moved logic to global scope earlier, but cleaning up this init function duplicate)
    /*
       Logic is now handled by:
       const updateStyleMode = () => { ... }
       attached directly to the elements globally.
       We can remove this redundant block or keep it empty.
    */
    /* OLD TOGGLE REMOVED
    const cartoToggle = document.getElementById('carto-layer-toggle') as HTMLInputElement;
    ...
    */
    const osmCheckbox = document.getElementById('osm-layer');
    if (osmCheckbox) {
        osmCheckbox.addEventListener('change', (e) => {
            const target = e.target;
            osmLayer.setVisible(target.checked);
        });
    }
    const rasterCheckbox = document.getElementById('raster-layer');
    if (rasterCheckbox) {
        rasterCheckbox.addEventListener('change', (e) => {
            const target = e.target;
            rasterLayer.setVisible(target.checked);
        });
    }
    const vectorCheckbox = document.getElementById('vector-layer');
    if (vectorCheckbox) {
        vectorCheckbox.addEventListener('change', (e) => {
            const target = e.target;
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
                if (!response.ok)
                    throw new Error('Failed to load features');
                const geojson = await response.json();
                featureSource.clear();
                const features = new ol.format.GeoJSON().readFeatures(geojson, { featureProjection: 'EPSG:3857' });
                featureSource.addFeatures(features);
                const countEl = document.getElementById('feature-count');
                if (countEl)
                    countEl.innerHTML = `<strong>Loaded ${features.length} features</strong>`;
            }
            catch (error) {
                console.error('Error loading features:', error);
                const countEl = document.getElementById('feature-count');
                if (countEl)
                    countEl.innerHTML = `<strong style="color: red;">Error: ${error.message}</strong>`;
            }
        });
    }
    // Search Logic
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const searchResults = document.getElementById('search-results-list');
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
            }
            else {
                results.forEach((item) => {
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
        }
        catch (error) {
            console.error('Search error:', error);
            alert('Search failed: ' + error);
        }
        finally {
            searchBtn.innerHTML = '<i class="fas fa-arrow-right"></i>';
        }
    }
    if (searchBtn) {
        searchBtn.addEventListener('click', (e) => {
            console.log('Search button clicked');
            performSearch();
        });
    }
    else {
        console.error('Search button not found');
    }
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                console.log('Enter key pressed in search input');
                performSearch();
            }
        });
    }
    else {
        console.error('Search input not found');
    }
    // Filter Logic
    const filterInput = document.getElementById('filter-input');
    const filterBtn = document.getElementById('filter-btn');
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
            if (!response.ok)
                throw new Error('Filter fetch failed');
            const geojson = await response.json();
            filterSource.clear();
            if (geojson.features && geojson.features.length > 0) {
                const features = new ol.format.GeoJSON().readFeatures(geojson, {
                    featureProjection: 'EPSG:3857'
                });
                filterSource.addFeatures(features);
            }
        }
        catch (error) {
            console.error('Error updating filters:', error);
        }
        finally {
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
                document.getElementById('map').style.cursor = 'crosshair';
            }
            else {
                bufferBtn.style.background = '#8e44ad'; // Original purple
                document.getElementById('map').style.cursor = 'default';
            }
        });
    }
    if (clearAnalysisBtn) {
        clearAnalysisBtn.addEventListener('click', () => {
            analysisSource.clear();
            clearAnalysisBtn.style.display = 'none';
            const resultsDiv = document.getElementById('analysis-results');
            if (resultsDiv)
                resultsDiv.innerHTML = '';
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
}
else {
    initApp();
}
