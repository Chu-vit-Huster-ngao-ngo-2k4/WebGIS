const http = require('http');

http.get('http://localhost:3005/api/district-safety', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    try {
        const json = JSON.parse(data);
        console.log('Data length:', json.length);
        if (json.length > 0) {
            console.log('Sample item:', JSON.stringify(json[0], null, 2));
        }
    } catch (e) {
        console.log('Response not JSON:', data.substring(0, 200));
    }
  });
}).on('error', (err) => {
  console.log('Error:', err.message);
});
