require('dotenv').config();
const express = require('express');
const cors = require('cors');
const tileRouter = require('./routes/tiles');
const dataRouter = require('./routes/data');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/tiles', tileRouter);
app.use('/api/data', dataRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`WebGIS backend server running on port ${PORT}`);
});
