// Script: fetch_vinfast_stations.js
// Description: Tự động crawl dữ liệu trạm sạc/showroom VinFast và lưu ra file JSON (hoặc import vào DB)
// Yêu cầu: Node.js >= 16, npm install playwright

const fs = require('fs');
const { chromium } = require('playwright');

const OUTPUT_FILE = './vinfast_stations.json';
const VINFAST_URL = 'https://vinfastauto.com/vn_vi/tim-kiem-showroom-tram-sac';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(VINFAST_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Chờ JS load dữ liệu (có thể cần điều chỉnh selector)
  await page.waitForTimeout(5000); // Đợi 5s cho chắc chắn

  // Tìm API nội bộ hoặc lấy từ window.__INITIAL_STATE__
  const data = await page.evaluate(() => {
    // Cách 1: Nếu có biến toàn cục lưu data
    if (window.__INITIAL_STATE__ && window.__INITIAL_STATE__.map && window.__INITIAL_STATE__.map.locations) {
      return window.__INITIAL_STATE__.map.locations;
    }
    // Cách 2: Tìm trong script tag hoặc HTML
    const scripts = Array.from(document.scripts);
    for (const s of scripts) {
      if (s.textContent && s.textContent.includes('locations')) {
        try {
          const match = s.textContent.match(/locations":(\[.*?\])/);
          if (match) return JSON.parse(match[1]);
        } catch {}
      }
    }
    return null;
  });

  if (!data) {
    console.error('Không tìm thấy dữ liệu trạm sạc trên trang!');
    await browser.close();
    process.exit(1);
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`Đã lưu ${data.length} trạm vào ${OUTPUT_FILE}`);
  await browser.close();
})();
