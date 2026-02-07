const http = require('http');

http.get('http://localhost:3005/api/stations/geojson', (resp) => {
  let data = '';

  resp.on('data', (chunk) => {
    data += chunk;
  });

  resp.on('end', () => {
    try {
        const json = JSON.parse(data);
        console.log("Features count:", json.features.length);
        if (json.features.length > 0) {
            console.log("First feature props:", JSON.stringify(json.features[0].properties, null, 2));
            
            // Check categories distribution
            const cats = {};
            json.features.forEach(f => {
                const c = f.properties.category || 'undefined';
                cats[c] = (cats[c] || 0) + 1;
            });
            console.log("Categories distribution:", cats);
        }
    } catch (e) {
        console.log("Parse error:", e);
        console.log("Raw data preview:", data.substring(0, 100));
    }
  });

}).on("error", (err) => {
  console.log("Error: " + err.message);
});