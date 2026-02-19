const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Serve product images statically
app.use(
  '/uploads/products',
  express.static(path.join(process.cwd(), 'backend', 'uploads', 'products'))
);

// Serve shipment attachments statically
app.use(
  '/uploads/shipments',
  express.static(path.join(process.cwd(), 'backend', 'uploads', 'shipments'))
);

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/supply_chain_db';

// Connect to MongoDB
mongoose
  .connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Health check
app.get('/', (req, res) => {
  res.send('Supply Chain Management API is running');
});

// Routes
const authRouter = require('./routes/auth');
const barcodeRouter = require('./routes/barcode-pro');
const suppliersRouter = require('./routes/suppliers');
const productsRouter = require('./routes/products');
const inventoryRouter = require('./routes/inventory');
const ordersRouter = require('./routes/orders');
const shipmentsRouter = require('./routes/shipments');
const auditLogRouter = require('./routes/auditlog');
const dashboardRouter = require('./routes/dashboard');
const changelogRouter = require('./routes/changelog');

app.use('/api/auth', authRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/products', productsRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/auditlog', auditLogRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/changelog', changelogRouter);
app.use('/api/shipments', shipmentsRouter);
app.use('/api/barcode', barcodeRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
