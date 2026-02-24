/**
 * MongoDB Schemas & Models
 * Supplier, Product, PurchaseOrder, Shipment
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// ==================== SUPPLIER SCHEMA ====================
const supplierSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Supplier name is required'],
    trim: true,
    minlength: 3,
    maxlength: 255
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email']
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['electronics', 'furniture', 'raw-materials', 'chemicals', 'other'],
    default: 'other'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { collection: 'suppliers' });

supplierSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// ==================== PRODUCT SCHEMA ====================
const productSchema = new Schema({
  sku: {
    type: String,
    required: [true, 'SKU is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  minLevel: {
    type: Number,
    required: true,
    min: 0,
    default: 10
  },
  maxLevel: {
    type: Number,
    min: 0,
    default: 1000
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: 0
  },
  cost: {
    type: Number,
    min: 0,
    default: 0
  },
  unit: {
    type: String,
    enum: ['piece', 'kg', 'liter', 'box', 'set'],
    default: 'piece'
  },
  supplierId: {
    type: Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  reorderPoint: {
    type: Number,
    default: 20
  },
  lastRestockDate: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { collection: 'products' });

productSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

productSchema.index({ sku: 1, supplierId: 1 });

// ==================== PURCHASE ORDER SCHEMA ====================
const purchaseOrderSchema = new Schema({
  poNumber: {
    type: String,
    unique: true,
    required: true,
    trim: true
  },
  supplierId: {
    type: Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  items: [{
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  tax: {
    type: Number,
    default: 0,
    min: 0
  },
  shipping: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['draft', 'confirmed', 'shipped', 'delivered', 'cancelled'],
    default: 'draft'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  dueDate: {
    type: Date,
    required: true
  },
  deliveryDate: {
    type: Date,
    default: null
  },
  notes: {
    type: String,
    default: ''
  },
  statusHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    note: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { collection: 'purchase_orders' });

purchaseOrderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

purchaseOrderSchema.index({ supplierId: 1, status: 1 });

// ==================== SHIPMENT SCHEMA ====================
const shipmentSchema = new Schema({
  trackingNumber: {
    type: String,
    unique: true,
    required: true,
    trim: true,
    uppercase: true
  },
  orderId: {
    type: Schema.Types.ObjectId,
    ref: 'PurchaseOrder',
    required: true
  },
  carrier: {
    type: String,
    required: true,
    enum: ['DHL', 'ARAMEX', 'SMSA', 'FedEx', 'UPS', 'TNT', 'Other']
  },
  status: {
    type: String,
    enum: ['pending', 'picked-up', 'in-transit', 'out-for-delivery', 'delivered', 'delayed', 'lost'],
    default: 'pending'
  },
  location: {
    type: String,
    default: 'Warehouse'
  },
  estimatedDelivery: {
    type: Date,
    required: true
  },
  actualDelivery: {
    type: Date,
    default: null
  },
  weight: {
    type: Number,
    default: null,
    min: 0
  },
  dimensions: {
    length: Number,
    width: Number,
    height: Number
  },
  cost: {
    type: Number,
    default: 0,
    min: 0
  },
  statusHistory: [{
    status: String,
    location: String,
    timestamp: { type: Date, default: Date.now },
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    note: String
  }],
  signedBy: {
    type: String,
    default: null
  },
  notes: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { collection: 'shipments' });

shipmentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

shipmentSchema.index({ trackingNumber: 1, status: 1 });

// ==================== Create Models ====================

let Supplier, Product, PurchaseOrder, Shipment;

try {
  // Check if models already exist
  Supplier = mongoose.model('Supplier');
  Product = mongoose.model('Product');
  PurchaseOrder = mongoose.model('PurchaseOrder');
  Shipment = mongoose.model('Shipment');
} catch (_err) {
  // Create models if they don't exist
  Supplier = mongoose.model('Supplier', supplierSchema);
  Product = mongoose.model('Product', productSchema);
  PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);
  Shipment = mongoose.model('Shipment', shipmentSchema);
}

module.exports = {
  Supplier,
  Product,
  PurchaseOrder,
  Shipment,
  schemas: {
    supplierSchema,
    productSchema,
    purchaseOrderSchema,
    shipmentSchema
  }
};
