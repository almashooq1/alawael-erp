# 📊 Database Migration & Setup Guide

**Version:** 1.0.0  
**Date:** 2026-02-18  
**Status:** ✅ Ready for Implementation

---

## 🎯 Database Migration Overview

This guide covers the migration from **Mock Database (Maps)** to **MongoDB** for production use.

### Architecture

```
Development:
└─ Mock Database (In-Memory Maps)
   - No external dependency
   - Data lost on restart
   - Perfect for testing

Production:
└─ MongoDB
   ├─ Persistent data
   ├─ Scalable
   ├─ Multiple collections
   └─ Advanced indexing
```

---

## 📋 What Was Created

### 1. Models (`models/index.js`)

**4 Mongoose Models:**

```javascript
// Supplier Model
- name (String, required)
- email (String, required, unique)
- phone (String)
- address (String)
- category (enum: electronics, furniture, etc.)
- status (enum: active, inactive, suspended)
- rating (Number 0-5)
- totalOrders (Number)
- totalSpent (Number)

// Product Model
- sku (String, unique)
- name (String, required)
- description (String)
- category (String)
- quantity (Number, default: 0)
- minLevel (Number)
- maxLevel (Number)
- price (Number)
- cost (Number)
- unit (enum: piece, kg, liter, box, set)
- supplierId (ObjectId ref)
- lastRestockDate (Date)

// PurchaseOrder Model
- poNumber (String, unique)
- supplierId (ObjectId ref)
- items [{productId, quantity, unitPrice, subtotal}]
- totalAmount (Number)
- tax (Number)
- shipping (Number)
- status (enum: draft, confirmed, shipped, delivered, cancelled)
- priority (enum: low, medium, high, urgent)
- dueDate (Date)
- deliveryDate (Date)
- statusHistory [{status, timestamp, note}]

// Shipment Model
- trackingNumber (String, unique)
- orderId (ObjectId ref)
- carrier (enum: DHL, ARAMEX, SMSA, etc.)
- status (enum: pending, picked-up, in-transit, delivered, etc.)
- location (String)
- estimatedDelivery (Date)
- actualDelivery (Date)
- weight (Number)
- cost (Number)
- statusHistory [{status, location, timestamp, coordinates, note}]
- signedBy (String)
```

### 2. Repository (`repositories/supplyChainRepository.js`)

**Abstraction layer** for all database operations:

```javascript
// Supplier Operations
- createSupplier(data)
- getSupplier(id)
- listSuppliers(filters)
- updateSupplier(id, data)
- deleteSupplier(id)

// Product Operations
- addProduct(data)
- getProduct(id)
- getProductBySku(sku)
- listProducts(filters)
- updateProductQuantity(id, change, reason)
- getInventoryStatus()
- deleteProduct(id)

// Purchase Order Operations
- createPurchaseOrder(data)
- getPurchaseOrder(id)
- listPurchaseOrders(filters)
- updateOrderStatus(id, status, note)
- deletePurchaseOrder(id)

// Shipment Operations
- createShipment(data)
- getShipment(id)
- getShipmentByTracking(number)
- listShipments(filters)
- updateShipmentStatus(id, status, location)
- deleteShipment(id)

// Analytics
- getAnalytics()
```

### 3. Database Seeding (`seeds/initDatabase.js`)

**Initial data loader:**

```javascript
- seedData() - Populate initial test data
  ├─ 4 suppliers
  ├─ 6 products
  ├─ 3 purchase orders
  └─ 2 shipments

- clearDatabase() - Remove all data
- resetDatabase() - Clear + seed (fresh start)
```

---

## 🚀 Implementation Steps

### Step 1: Install MongoDB (if not already installed)

**Option A: Local Installation**

```bash
# Windows - Download from https://www.mongodb.com/try/download/community
# Or use Chocolatey:
choco install mongodb-community

# Verify installation
mongod --version
```

**Option B: Docker**

```bash
# Run MongoDB in Docker
docker run -d \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  --name mongodb \
  mongo:latest
```

**Option C: MongoDB Atlas (Cloud)**

```
1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account
3. Create cluster
4. Get connection string
5. Set MONGODB_URI environment variable
```

### Step 2: Install Mongoose Dependency

```bash
cd erp_new_system/backend
npm install mongoose
```

### Step 3: Update Environment Variables

Create or update `.env` file:

```env
# Database Configuration
USE_MOCK_DB=false          # Set to false to use MongoDB
MONGODB_URI=mongodb://localhost:27017/erp_system
DB_NAME=erp_system
NODE_ENV=development

# Other existing variables
PORT=3001
SSO_PORT=3002
CORS_ORIGIN=http://localhost:3000
JWT_SECRET=your_secret_key
```

### Step 4: Update Services to Use Repository

**Before (Mock DB):**

```javascript
const supplyChainService = require('./services/supplyChain.service');
const suppliers = new Map();

// Add supplier
suppliers.set(id, data);
```

**After (Real DB):**

```javascript
const repository = require('./repositories/supplyChainRepository');

// Add supplier
const supplier = await repository.createSupplier(data);
```

### Step 5: Initialize Database on Server Start

Update `app.js`:

```javascript
const { connectDB, watchConnectionEvents } = require('./config/database');
const { seedData } = require('./seeds/initDatabase');

// Connect to database
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    watchConnectionEvents();

    // Seed initial data (if empty)
    await seedData();

    // Start server
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start:', error);
    process.exit(1);
  }
};

startServer();
```

### Step 6: Start MongoDB

```bash
# If local installation
mongod

# Or verify Docker container is running
docker ps | grep mongodb
```

### Step 7: Test Connection

```bash
# Start server
npm start

# Should output:
# ✅ MongoDB connected successfully
# ✅ Database seeding completed successfully
# ✅ Server running on port 3001
```

---

## 🧪 Testing Database Integration

### Health Check Endpoint

```bash
# Check if database connected
curl http://localhost:3001/api/supply-chain/status

# Response (with real DB):
{
  "success": true,
  "status": "operational",
  "database": "MongoDB connected",
  "suppliers": 4,
  "products": 6,
  "orders": 3,
  "shipments": 2
}
```

### Test Database Operations

```bash
# Create supplier
curl -X POST http://localhost:3001/api/supply-chain/suppliers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Supplier",
    "email": "test@supplier.com",
    "phone": "+966-500-000-000",
    "address": "Test Address",
    "category": "electronics"
  }'

# List suppliers
curl http://localhost:3001/api/supply-chain/suppliers

# Get inventory status
curl http://localhost:3001/api/supply-chain/inventory/status

# Get analytics
curl http://localhost:3001/api/supply-chain/analytics
```

---

## 📊 Database Schema Reference

### Collections Created

1. **suppliers** - Supplier information
   - Index: `{ email: 1 }` (unique)
   - Index: `{ status: 1, createdAt: -1 }`

2. **products** - Inventory items
   - Index: `{ sku: 1, supplierId: 1 }` (unique)
   - Index: `{ category: 1 }`

3. **purchase_orders** - Purchase orders
   - Index: `{ supplierId: 1, status: 1 }`
   - Index: `{ poNumber: 1 }` (unique)

4. **shipments** - Shipment tracking
   - Index: `{ trackingNumber: 1, status: 1 }` (unique)
   - Index: `{ orderId: 1 }`

---

## 🔄 Migration Script (Mock → MongoDB)

If you have existing data in Mock DB:

```javascript
/**
 * scripts/migrate-mock-to-mongo.js
 * One-time migration from Map storage to MongoDB
 */

const { Supplier, Product, PurchaseOrder, Shipment } = require('../models');
const logger = require('./logger');

const migrate = async () => {
  // Note: Mock DB data is in-memory, need to be saved during runtime
  // Alternative: Keep current API, add MongoDB in parallel

  logger.info('Migration: Mock DB → MongoDB');
  
  // If Mock DB has persisted data, migrate it
  // Otherwise, seed with initial data

  await seedData();
};

module.exports = { migrate };
```

---

## 🛠️ Troubleshooting

### MongoDB Connection Failed

```bash
# Problem: Connection refused on localhost:27017
# Solution 1: Start MongoDB
mongod

# Solution 2: Check if already running
netstat -ano | findstr :27017

# Solution 3: Use MongoDB Atlas (Cloud)
# Update .env: MONGODB_URI=mongodb+srv://...
```

### Models Already Exist Error

```
Error: Cannot overwrite model once compiled

Solution:
// Check models/index.js - already handles this:
try {
  Model = mongoose.model('ModelName');
} catch {
  Model = mongoose.model('ModelName', schema);
}
```

### Duplicate Key Error

```
Error: E11000 duplicate key error

Solution:
// Drop collections and re-seed
db.getCollection('suppliers').deleteMany({});
db.getCollection('products').deleteMany({});

// Or in code:
const { resetDatabase } = require('./seeds/initDatabase');
await resetDatabase();
```

---

## 📈 Performance Optimization

### Indexes Already Created

```javascript
// Auto-created in models:

supplierSchema.pre('save', updateTimestamp);
// Indexes on: email (unique), status+createdAt

productSchema.index({ sku: 1, supplierId: 1 });
// Searches by SKU+Supplier

purchaseOrderSchema.index({ supplierId: 1, status: 1 });
// Filter by supplier + status

shipmentSchema.index({ trackingNumber: 1, status: 1 });
// Track by number or status
```

### Query Optimization

```javascript
// Use pagination for large lists
const { products, total } = await repository.listProducts({
  limit: 50,
  offset: 0
});

// Use populated references
const order = await repository.getPurchaseOrder(id);
// Includes supplier and product details
```

---

## 🔒 Security Best Practices

### Connection String

```env
# Development (local)
MONGODB_URI=mongodb://localhost:27017/erp_system

# Production (Atlas)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/erp_system?retryWrites=true&w=majority

# With Authentication
MONGODB_URI=mongodb://admin:password@localhost:27017/erp_system?authSource=admin
```

### Data Validation

All models include:
- Required fields validation
- Type checking
- Email format validation
- Min/max value constraints
- Enum validation

```javascript
email: {
  type: String,
  required: true,
  match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email']
}
```

### Backup Strategy

```bash
# Backup MongoDB
mongodump --uri mongodb://localhost:27017/erp_system \
  --out ./backups/

# Restore from backup
mongorestore --uri mongodb://localhost:27017/erp_system \
  ./backups/erp_system/
```

---

## 📋 Migration Checklist

- [ ] MongoDB installed and running
- [ ] `.env` file configured with `MONGODB_URI`
- [ ] `USE_MOCK_DB=false` set in `.env`
- [ ] `npm install mongoose` executed
- [ ] Services updated to use repository (or adapter pattern)
- [ ] Database connection working (`npm start` shows ✅)
- [ ] Initial data seeded (4 suppliers, 6 products, etc.)
- [ ] Tests passing with MongoDB
- [ ] Backup strategy implemented
- [ ] Performance verified
- [ ] Production `MONGODB_URI` configured

---

## ✅ Status

**Database Migration:** Ready for Implementation

### Created Files
- ✅ `config/database.js` - Connection & configuration
- ✅ `models/index.js` - 4 Mongoose schemas
- ✅ `repositories/supplyChainRepository.js` - Data access layer
- ✅ `seeds/initDatabase.js` - Seeding & initialization

### Next Steps
1. Install MongoDB
2. Configure `.env`
3. Run `npm start`
4. Verify data appears in MongoDB
5. Run tests
6. Deploy to production

---

**Database Migration Guide v1.0**  
**Task #6 - In Progress**  
**Last Updated:** 2026-02-18
