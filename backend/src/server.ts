import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import tilesRouter from './routes/tiles';
import dataRouter from './routes/data';
import analysisRouter from './routes/analysis';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(cors());
app.use(express.json());

app.use('/tiles', tilesRouter);
app.use('/api/data', dataRouter);
app.use('/api/analysis', analysisRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`WebGIS backend server running on port ${PORT}`);
});
