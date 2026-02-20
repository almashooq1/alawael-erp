/**
 * Enhanced Models with Better Indexes and Optimization
 * Replaces existing models with production-grade versions
 */

const mongoose = require('mongoose');

/**
 * Product Model - Enhanced with full-text search and indexes
 */
const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    minlength: [3, 'Product name must be at least 3 characters'],
    text: true,
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000,
    text: true,
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  stock: {
    type: Number,
    required: true,
    min: [0, 'Stock cannot be negative'],
    default: 0,
  },
  image: {
    type: String,
    trim: true,
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  },
  reorderLevel: {
    type: Number,
    default: 10,
    min: 0,
  },
  lastRestocked: Date,
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound indexes
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ name: 'text', description: 'text' });

// Auto-update updatedAt
productSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

/**
 * Order Model - Enhanced
 */
const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    trim: true
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  products: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        min: [1, 'Quantity must be at least 1'],
      },
      price: {
        type: Number,
        required: true,
        min: [0, 'Price cannot be negative'],
      },
      subtotal: Number,
    },
  ],
  status: {
    type: String,
    enum: {
      values: ['pending', 'approved', 'shipped', 'delivered', 'cancelled'],
      message: 'Invalid order status',
    },
    default: 'pending'
  },
  totalAmount: {
    type: Number,
    default: 0,
  },
  orderDate: {
    type: Date,
    default: Date.now
  },
  deliveryDate: Date,
  estimatedDelivery: Date,
  notes: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: Date,
});

orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ supplier: 1, createdAt: -1 });

orderSchema.pre('save', function (next) {
  this.updatedAt = Date.now();

  // Calculate totals
  this.totalAmount = this.products.reduce((sum, item) => {
    item.subtotal = item.quantity * item.price;
    return sum + item.subtotal;
  }, 0);

  next();
});

/**
 * Supplier Model - Enhanced
 */
const supplierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Supplier name is required'],
    trim: true,
    minlength: [2, 'Supplier name must be at least 2 characters']
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format']
  },
  phone: {
    type: String,
    trim: true,
  },
  address: {
    type: String,
    required: true,
    trim: true,
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  country: {
    type: String,
    required: true,
    trim: true,
  },
  website: {
    type: String,
    trim: true,
  },
  rating: {
    type: Number,
    min: [0, 'Rating cannot be less than 0'],
    max: [5, 'Rating cannot exceed 5'],
    default: 0,
  },
  totalOrders: {
    type: Number,
    default: 0,
  },
  totalSpent: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: Date,
});

supplierSchema.index({ isActive: 1, createdAt: -1 });

supplierSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

/**
 * Inventory Model - Enhanced
 */
const inventorySchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    unique: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [0, 'Quantity cannot be negative'],
    default: 0,
  },
  warehouseLocation: {
    type: String,
    trim: true
  },
  reserved: {
    type: Number,
    default: 0,
    min: 0,
  },
  available: {
    type: Number,
    default: 0,
  },
  lastRestocked: {
    type: Date,
    default: Date.now,
  },
  lastCounted: Date,
  reorderLevel: Number,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: Date,
});

inventorySchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  this.available = this.quantity - this.reserved;
  next();
});

/**
 * Shipment Model - Enhanced
 */
const shipmentSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  carrier: {
    type: String,
    required: true,
    trim: true
  },
  trackingNumber: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'in_transit', 'delivered', 'returned', 'lost'],
      message: 'Invalid shipment status',
    },
    default: 'pending'
  },
  address: {
    type: String,
    required: true,
    trim: true,
  },
  estimatedDelivery: Date,
  sentAt: {
    type: Date,
    default: Date.now,
  },
  deliveredAt: Date,
  notes: {
    type: String,
    trim: true,
  },
  cost: {
    type: Number,
    min: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: Date,
});

shipmentSchema.index({ status: 1, estimatedDelivery: 1 });
shipmentSchema.index({ order: 1, createdAt: -1 });

shipmentSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

/**
 * User Model - Enhanced with security
 */
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format']\n
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'manager', 'viewer'],
    default: 'user'
  },
  phone: String,
},
  phone: String,
  department: String,
  isActive: {
  type: Boolean,
  default: true {
  type: Number,
  default: 0,
},
  lockUntil: Date,
  createdAt: {
  type: Date,
  default: Date.now
}, e,
});

userSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for checking if locked
userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

module.exports = {
  Product: mongoose.model('Product', productSchema),
  Order: mongoose.model('Order', orderSchema),
  Supplier: mongoose.model('Supplier', supplierSchema),
  Inventory: mongoose.model('Inventory', inventorySchema),
  Shipment: mongoose.model('Shipment', shipmentSchema),
  User: mongoose.model('User', userSchema),
};
