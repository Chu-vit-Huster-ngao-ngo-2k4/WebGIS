import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import tilesRouter from './routes/tiles';
import dataRouter from './routes/data';
import analysisRouter from './routes/analysis';
import stationsRouter, { syncChargingStations } from './routes/stations';
import districtSafetyRouter from './routes/districtSafety';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(cors());
app.use(express.json());

app.use('/tiles', tilesRouter);
app.use('/api/data', dataRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/stations', stationsRouter); // Đăng ký route trạm sạc
app.use('/api/district-safety', districtSafetyRouter); // Đăng ký route thống kê quận

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, async () => {
  console.log(`WebGIS backend server running on port ${PORT}`);
  
  // Tự động kiểm tra và đồng bộ trạm sạc khi khởi động
  console.log("Khởi động hệ thống: Đang kiểm tra cập nhật trạm sạc từ VinFast...");
  // Chạy background sync, không block server startup
  syncChargingStations(false).catch(err => {
      console.error("Lỗi đồng bộ tự động lúc khởi động:", err);
  });
});
