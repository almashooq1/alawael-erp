/**
 * E-Commerce Models
 * Product, Cart, and Order management for e-commerce functionality
 */

const mongoose = require('mongoose');

// ============================================
// PRODUCT VARIANT SCHEMA
// ============================================

const variantSchema = new mongoose.Schema({
  size: String,
  color: String,
  sku: String,
  quantity: { type: Number, default: 0 },
  price: Number,
});

// ============================================
// PRODUCT SCHEMA
// ============================================

const productSchema = new mongoose.Schema(
  {
    // Basic Info
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    category: {
      type: String,
      enum: [
        'Electronics',
        'Clothing',
        'Food',
        'Books',
        'Home',
        'Sports',
        'Tools',
        'Other',
      ],
      default: 'Other',
    },
    subCategory: String,

    // Pricing
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    originalPrice: Number,
    discount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    finalPrice: Number, // Computed: price - (price * discount / 100)

    // Inventory
    totalStock: {
      type: Number,
      default: 0,
      min: 0,
    },
    lowStockThreshold: {
      type: Number,
      default: 10,
    },
    variants: [variantSchema],

    // Media
    images: [
      {
        url: String,
        alt: String,
        isMain: { type: Boolean, default: false },
      },
    ],
    thumbnail: String,

    // Details
    sku: {
      type: String,
      unique: true,
      sparse: true,
    },
    weight: Number, // in kg
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
    },

    // Ratings & Reviews
    rating: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
    reviews: [
      {
        userId: mongoose.Schema.Types.ObjectId,
        rating: { type: Number, min: 1, max: 5 },
        title: String,
        comment: String,
        helpful: { type: Number, default: 0 },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // Status
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    isNew: { type: Boolean, default: false },

    // SEO
    slug: String,
    metaTitle: String,
    metaDescription: String,

    // Seller/Supplier
    vendorId: mongoose.Schema.Types.ObjectId,
    vendorName: String,

    // Timestamps
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Indexes
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ price: 1 });
productSchema.index({ rating: 1 });
productSchema.index({ slug: 1 });
productSchema.index({ sku: 1 });

// Virtual for low stock
productSchema.virtual('isLowStock').get(function () {
  return this.totalStock <= this.lowStockThreshold;
});

// Pre-save hook to calculate final price
productSchema.pre('save', function (next) {
  this.finalPrice = this.price - (this.price * this.discount) / 100;
  this.updatedAt = new Date();
  next();
});

// ============================================
// SHOPPING CART SCHEMA
// ============================================

const cartItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    max: 9999,
  },
  price: Number, // Price at time of adding to cart
  variant: {
    size: String,
    color: String,
  },
  addedAt: { type: Date, default: Date.now },
});

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      unique: true,
    },
    items: [cartItemSchema],
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    shipping: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    coupon: String,
    notes: String,
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to recalculate totals
cartSchema.pre('save', function (next) {
  this.subtotal = this.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  this.tax = this.subtotal * 0.1; // 10% tax
  this.shipping = this.subtotal > 100 ? 0 : 10; // Free shipping > $100
  this.total = this.subtotal + this.tax + this.shipping - this.discount;
  this.updatedAt = new Date();
  next();
});

// ============================================
// CHECKOUT SESSION SCHEMA
// ============================================

const checkoutSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    sessionId: {
      type: String,
      unique: true,
    },
    items: [
      {
        productId: mongoose.Schema.Types.ObjectId,
        quantity: Number,
        price: Number,
      },
    ],

    // Shipping Address
    shippingAddress: {
      fullName: String,
      email: String,
      phone: String,
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },

    // Billing Address
    billingAddress: {
      fullName: String,
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },

    // Pricing
    subtotal: Number,
    tax: Number,
    shipping: Number,
    discount: Number,
    total: Number,

    // Payment Method
    paymentMethod: {
      type: String,
      enum: ['credit_card', 'debit_card', 'paypal', 'stripe', 'bank_transfer'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },

    // Coupon
    couponCode: String,
    couponDiscount: { type: Number, default: 0 },

    // Status
    status: {
      type: String,
      enum: ['cart', 'checkout', 'payment_pending', 'confirmed', 'cancelled'],
      default: 'checkout',
    },

    // Timestamps
    expiresAt: Date, // Session expiry
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Index for expiring sessions
checkoutSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ============================================
// COUPON/DISCOUNT SCHEMA
// ============================================

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: String,
    discountType: {
      type: String,
      enum: ['percentage', 'fixed_amount'],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    maxDiscount: Number, // Max discount amount for percentage coupons
    minPurchaseAmount: { type: Number, default: 0 },
    maxUses: Number,
    usedCount: { type: Number, default: 0 },

    // Applicable to
    applicableCategories: [String], // Empty = all categories
    applicableProducts: [mongoose.Schema.Types.ObjectId],
    excludedProducts: [mongoose.Schema.Types.ObjectId],

    // Validity
    validFrom: Date,
    validUntil: Date,
    isActive: { type: Boolean, default: true },

    // Usage tracking
    usedBy: [mongoose.Schema.Types.ObjectId],

    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Index
couponSchema.index({ code: 1 });
couponSchema.index({ validUntil: 1 });

// ============================================
// WISH LIST SCHEMA
// ============================================

const wishlistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      unique: true,
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
        },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// ============================================
// INVENTORY LOG SCHEMA
// ============================================

const inventoryLogSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  action: {
    type: String,
    enum: ['stock_in', 'stock_out', 'adjustment', 'damage', 'return'],
  },
  quantity: Number,
  reference: String, // Order ID or Supplier ID
  notes: String,
  createdBy: mongoose.Schema.Types.ObjectId,
  createdAt: { type: Date, default: Date.now },
});

inventoryLogSchema.index({ productId: 1, createdAt: -1 });

// ============================================
// EXPORT MODELS
// ============================================

module.exports = {
  Product: mongoose.model('Product', productSchema),
  Cart: mongoose.model('Cart', cartSchema),
  Checkout: mongoose.model('Checkout', checkoutSchema),
  Coupon: mongoose.model('Coupon', couponSchema),
  Wishlist: mongoose.model('Wishlist', wishlistSchema),
  InventoryLog: mongoose.model('InventoryLog', inventoryLogSchema),

  // Schemas export for reference
  productSchema,
  cartSchema,
  checkoutSchema,
  couponSchema,
  wishlistSchema,
  inventoryLogSchema,
};
