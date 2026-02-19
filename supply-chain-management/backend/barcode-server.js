import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import barcodeRouter from './routes/barcode-pro.js';

dotenv.config();

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const app = express();
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/supply_chain_db';

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose
  .connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Root health check
app.get('/', (req, res) => {
  res.json({
    service: 'Barcode & QR Code API',
    status: 'online',
    version: '1.0.0',
    timestamp: new Date(),
  });
});

// Barcode routes
app.use('/api/barcode', barcodeRouter);

// Start server
app.listen(PORT, () => {
  console.log(`\n✨ Barcode API Server running on http://localhost:${PORT}`);
  console.log(`📍 Health Check: http://localhost:${PORT}/api/barcode/health`);
  console.log(`\n🔌 Available Endpoints:`);
  console.log(`   POST   /api/barcode/qr-code      - Generate QR Code`);
  console.log(`   POST   /api/barcode/barcode      - Generate Barcode`);
  console.log(`   POST   /api/barcode/batch        - Batch Generation`);
  console.log(`   GET    /api/barcode/statistics   - Get Statistics`);
  console.log(`   GET    /api/barcode/health       - Health Check (Public)\n`);
});
