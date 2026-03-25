import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
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
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
  }),
);
app.use(express.json());

// MongoDB Connection
mongoose
  .connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => process.stderr.write('MongoDB connected\n'))
  .catch(err => process.stderr.write(`MongoDB connection error: ${err.message}\n`));

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
  // Server started
});
