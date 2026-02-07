async function testFetch() {
    try {
        console.log("Fetching VinFast data...");
        // Emulate browser headers
        const response = await fetch('https://vinfastauto.com/vn_vi/get-locators', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/javascript, */*; q=0.01'
            }
        });
        
        console.log("Status:", response.status);
        if (response.ok) {
            const data = await response.json();
            console.log("Data Type:", Array.isArray(data) ? "Array" : typeof data);
            
            let list = Array.isArray(data) ? data : data.data;
            if (list && list.length > 0) {
                 console.log("First Item Keys:", Object.keys(list[0]));
                 console.log("First Item Sample:", JSON.stringify(list[0], null, 2));
                 
                 // Check categories in first 20 items
                 const cats = new Set();
                 list.slice(0, 50).forEach(i => cats.add(i.category_name || i.category));
                 console.log("Categories found:", [...cats]);
            }
        } else {
            const text = await response.text();
            console.log("Body preview:", text.substring(0, 200));
        }
    } catch (e) {
        console.error(e);
    }
}

testFetch();