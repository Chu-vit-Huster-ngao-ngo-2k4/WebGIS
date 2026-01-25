import requests
import json
import pandas as pd

# Giả lập Header để không bị website chặn (403 Forbidden)
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://v-green.vn/map' # Thay bằng trang thực tế
}

# URL API mà bạn 'bắt' được ở Bước 2
api_url = "https://api.v-green.vn/v1/stations/public" 

def crawl_stations():
    try:
        response = requests.get(api_url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            stations = data.get('data', []) # Tùy vào cấu trúc JSON trả về
            
            # Trích xuất các trường cần thiết cho GIS
            refined_data = []
            for s in stations:
                refined_data.append({
                    'name': s.get('name'),
                    'lat': s.get('latitude'),
                    'lng': s.get('longitude'),
                    'address': s.get('address'),
                    'type': s.get('station_type'), # Sạc nhanh/thường
                    'status': s.get('status')      # Đang trống/Đầy
                })
            
            # Lưu ra file CSV để dễ kiểm tra
            df = pd.DataFrame(refined_data)
            df.to_csv('tram_sac_2026.csv', index=False, encoding='utf-8-sig')
            print(f"Đã cào xong {len(refined_data)} trạm sạc!")
            
    except Exception as e:
        print(f"Lỗi rồi ông giáo ạ: {e}")

if __name__ == "__main__":
    crawl_stations()