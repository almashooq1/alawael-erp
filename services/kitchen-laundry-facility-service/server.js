/**
 * Kitchen, Laundry & Facility Service — Al-Awael ERP
 * Port: 3440
 *
 * Meal planning & dietary management, nutrition tracking, laundry tracking,
 * room/resource booking, facility maintenance requests, inventory (kitchen
 * supplies, cleaning materials), vendor management for food/facility services.
 */

'use strict';

const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const { Queue, Worker } = require('bullmq');
const cron = require('node-cron');
const helmet = require('helmet');
const cors = require('cors');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379/0', {
  maxRetriesPerRequest: null,
  retryStrategy: t => Math.min(t * 200, 5000),
});

const facilityQueue = new Queue('facility-jobs', { connection: redis });

/* ───────── Schemas ───────── */

// ── KITCHEN / NUTRITION ──

// Menu Item
const menuItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nameAr: { type: String, required: true },
    category: { type: String, enum: ['breakfast', 'lunch', 'snack', 'dinner', 'drink', 'dessert'], required: true },
    description: String,
    descriptionAr: String,
    nutrition: {
      calories: Number,
      protein: Number, // grams
      carbs: Number,
      fat: Number,
      fiber: Number,
      sugar: Number,
      sodium: Number, // mg
    },
    allergens: [{ type: String, enum: ['gluten', 'dairy', 'nuts', 'eggs', 'soy', 'fish', 'shellfish', 'sesame', 'wheat', 'corn'] }],
    dietaryTags: [
      {
        type: String,
        enum: ['halal', 'vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free', 'diabetic-friendly', 'low-sodium', 'high-protein'],
      },
    ],
    ageGroup: [{ type: String, enum: ['infant', 'toddler', 'preschool', 'school-age', 'staff'] }],
    ingredients: [{ name: String, nameAr: String, quantity: String }],
    preparationTime: Number, // minutes
    servingSize: String,
    cost: Number, // SAR per serving
    image: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const MenuItem = mongoose.model('MenuItem', menuItemSchema);

// Weekly Meal Plan
const mealPlanSchema = new mongoose.Schema(
  {
    weekStart: { type: Date, required: true },
    weekEnd: Date,
    branchId: String,
    status: { type: String, enum: ['draft', 'approved', 'active', 'completed'], default: 'draft' },
    approvedBy: String,
    days: [
      {
        dayOfWeek: { type: Number, min: 0, max: 6 }, // 0=Sun
        dayName: String,
        dayNameAr: String,
        meals: [
          {
            mealType: { type: String, enum: ['breakfast', 'morning-snack', 'lunch', 'afternoon-snack', 'dinner'] },
            items: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' }],
            servingTime: String,
            notes: String,
          },
        ],
      },
    ],
    specialDiets: [
      {
        studentId: String,
        studentName: String,
        dietType: String,
        restrictions: [String],
        notes: String,
      },
    ],
    totalCost: Number,
    preparedBy: String,
  },
  { timestamps: true },
);

const MealPlan = mongoose.model('MealPlan', mealPlanSchema);

// Dietary Profile (per student)
const dietaryProfileSchema = new mongoose.Schema(
  {
    studentId: { type: String, unique: true, required: true },
    studentName: String,
    allergies: [String],
    intolerances: [String],
    dietaryRestrictions: [
      {
        type: String,
        enum: [
          'halal',
          'vegetarian',
          'vegan',
          'gluten-free',
          'dairy-free',
          'nut-free',
          'diabetic',
          'ketogenic',
          'liquid-only',
          'pureed',
          'custom',
        ],
      },
    ],
    medicalNotes: String,
    preferredFoods: [String],
    dislikedFoods: [String],
    calorieTarget: Number,
    specialInstructions: String,
    parentConsent: { type: Boolean, default: false },
    updatedBy: String,
  },
  { timestamps: true },
);

const DietaryProfile = mongoose.model('DietaryProfile', dietaryProfileSchema);

// ── LAUNDRY ──

const laundryOrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true },
    studentId: String,
    studentName: String,
    branchId: String,
    status: { type: String, enum: ['received', 'washing', 'drying', 'ironing', 'ready', 'delivered', 'lost'], default: 'received' },
    items: [
      {
        type: {
          type: String,
          enum: ['uniform-shirt', 'uniform-pants', 'uniform-skirt', 'jacket', 'pe-kit', 'abaya', 'thobe', 'bedding', 'towel', 'other'],
        },
        quantity: { type: Number, default: 1 },
        condition: { type: String, enum: ['normal', 'stained', 'damaged'] },
        notes: String,
      },
    ],
    receivedAt: { type: Date, default: Date.now },
    expectedReady: Date,
    completedAt: Date,
    deliveredAt: Date,
    receivedBy: String,
    processedBy: String,
    notes: String,
    totalItems: Number,
  },
  { timestamps: true },
);

laundryOrderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const c = await mongoose.model('LaundryOrder').countDocuments();
    this.orderNumber = `LDR-${String(c + 1).padStart(5, '0')}`;
  }
  this.totalItems = this.items.reduce((s, i) => s + (i.quantity || 1), 0);
  if (!this.expectedReady) this.expectedReady = new Date(Date.now() + 24 * 60 * 60 * 1000); // next day
  next();
});

const LaundryOrder = mongoose.model('LaundryOrder', laundryOrderSchema);

// ── FACILITY / ROOMS ──

const roomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nameAr: String,
    branchId: String,
    building: String,
    floor: Number,
    type: {
      type: String,
      enum: [
        'classroom',
        'lab',
        'library',
        'gym',
        'auditorium',
        'meeting-room',
        'therapy-room',
        'sensory-room',
        'kitchen',
        'playground',
        'office',
        'storage',
        'other',
      ],
      required: true,
    },
    capacity: Number,
    equipment: [String],
    amenities: [String],
    isAvailable: { type: Boolean, default: true },
    status: { type: String, enum: ['active', 'maintenance', 'closed'], default: 'active' },
    bookable: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const Room = mongoose.model('Room', roomSchema);

const bookingSchema = new mongoose.Schema(
  {
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    title: { type: String, required: true },
    titleAr: String,
    type: { type: String, enum: ['class', 'meeting', 'event', 'therapy', 'exam', 'training', 'other'], default: 'meeting' },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    bookedBy: { type: String, required: true },
    department: String,
    attendees: Number,
    recurring: { type: Boolean, default: false },
    recurrence: { frequency: String, until: Date },
    status: { type: String, enum: ['confirmed', 'tentative', 'cancelled'], default: 'confirmed' },
    equipmentNeeded: [String],
    notes: String,
  },
  { timestamps: true },
);

bookingSchema.index({ roomId: 1, startTime: 1, endTime: 1 });

const Booking = mongoose.model('Booking', bookingSchema);

// ── MAINTENANCE ──

const maintenanceSchema = new mongoose.Schema(
  {
    ticketNumber: { type: String, unique: true },
    title: { type: String, required: true },
    titleAr: String,
    description: String,
    category: {
      type: String,
      enum: [
        'electrical',
        'plumbing',
        'hvac',
        'furniture',
        'it-equipment',
        'cleaning',
        'painting',
        'security',
        'playground',
        'kitchen-equipment',
        'other',
      ],
      required: true,
    },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    status: { type: String, enum: ['open', 'assigned', 'in-progress', 'on-hold', 'completed', 'closed', 'cancelled'], default: 'open' },
    location: { building: String, floor: Number, room: String },
    branchId: String,
    reportedBy: String,
    assignedTo: String,
    images: [String],
    estimatedCost: Number,
    actualCost: Number,
    vendor: { name: String, phone: String, contractId: String },
    startedAt: Date,
    completedAt: Date,
    resolution: String,
    rating: { type: Number, min: 1, max: 5 },
  },
  { timestamps: true },
);

maintenanceSchema.pre('save', async function (next) {
  if (!this.ticketNumber) {
    const c = await mongoose.model('Maintenance').countDocuments();
    this.ticketNumber = `MNT-${String(c + 1).padStart(5, '0')}`;
  }
  next();
});

const Maintenance = mongoose.model('Maintenance', maintenanceSchema);

// ── INVENTORY (kitchen supplies, cleaning, consumables) ──

const inventorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nameAr: String,
    sku: { type: String, unique: true },
    category: {
      type: String,
      enum: ['food-ingredient', 'beverage', 'cleaning-supply', 'kitchen-equipment', 'laundry-supply', 'stationery', 'consumable', 'other'],
      required: true,
    },
    unit: { type: String, enum: ['kg', 'g', 'liter', 'ml', 'piece', 'pack', 'box', 'carton'], default: 'piece' },
    currentStock: { type: Number, default: 0 },
    minStock: { type: Number, default: 10 },
    maxStock: Number,
    costPerUnit: Number,
    supplier: { name: String, phone: String, email: String },
    location: String,
    expiryDate: Date,
    branchId: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

inventorySchema.pre('save', async function (next) {
  if (!this.sku) {
    const c = await mongoose.model('Inventory').countDocuments();
    this.sku = `INV-${String(c + 1).padStart(5, '0')}`;
  }
  next();
});

const Inventory = mongoose.model('Inventory', inventorySchema);

/* ───────── BullMQ worker ───────── */

new Worker(
  'facility-jobs',
  async job => {
    if (job.name === 'check-low-stock') {
      const lowStock = await Inventory.find({
        isActive: true,
        $expr: { $lte: ['$currentStock', '$minStock'] },
      });
      for (const item of lowStock) {
        console.log(`[Facility] Low stock alert: ${item.name} (${item.currentStock}/${item.minStock})`);
        // In production: send alert via communication-hub
      }
    }

    if (job.name === 'check-expiry') {
      const soon = new Date(Date.now() + 7 * 86400000);
      const expiring = await Inventory.find({ expiryDate: { $lte: soon, $gte: new Date() } });
      for (const item of expiring) {
        console.log(`[Facility] Expiry alert: ${item.name} expires ${item.expiryDate.toISOString().slice(0, 10)}`);
      }
    }
  },
  { connection: redis },
);

/* ───────── Routes ───────── */
const r = express.Router();

// ── Menu Items ──
r.get('/menu-items', async (req, res) => {
  try {
    const { category, ageGroup, dietaryTag, allergenFree } = req.query;
    const q = { isActive: true };
    if (category) q.category = category;
    if (ageGroup) q.ageGroup = ageGroup;
    if (dietaryTag) q.dietaryTags = dietaryTag;
    if (allergenFree) q.allergens = { $nin: allergenFree.split(',') };
    const items = await MenuItem.find(q).sort({ category: 1, name: 1 });
    res.json({ success: true, data: items });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.post('/menu-items', async (req, res) => {
  try {
    const item = await MenuItem.create(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.put('/menu-items/:id', async (req, res) => {
  try {
    const m = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: m });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// ── Meal Plans ──
r.get('/meal-plans', async (req, res) => {
  try {
    const { branchId, status, weekStart } = req.query;
    const q = {};
    if (branchId) q.branchId = branchId;
    if (status) q.status = status;
    if (weekStart) q.weekStart = new Date(weekStart);
    const plans = await MealPlan.find(q).sort({ weekStart: -1 }).populate('days.meals.items');
    res.json({ success: true, data: plans });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.post('/meal-plans', async (req, res) => {
  try {
    const plan = await MealPlan.create(req.body);
    res.status(201).json({ success: true, data: plan });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.put('/meal-plans/:id', async (req, res) => {
  try {
    const p = await MealPlan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: p });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.post('/meal-plans/:id/approve', async (req, res) => {
  try {
    const p = await MealPlan.findByIdAndUpdate(req.params.id, { status: 'approved', approvedBy: req.body.approvedBy }, { new: true });
    res.json({ success: true, data: p });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Dietary Profiles ──
r.get('/dietary-profiles', async (req, res) => {
  try {
    const profiles = await DietaryProfile.find().sort({ studentName: 1 });
    res.json({ success: true, data: profiles });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.post('/dietary-profiles', async (req, res) => {
  try {
    const p = await DietaryProfile.create(req.body);
    res.status(201).json({ success: true, data: p });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.put('/dietary-profiles/:studentId', async (req, res) => {
  try {
    const p = await DietaryProfile.findOneAndUpdate({ studentId: req.params.studentId }, req.body, { new: true, upsert: true });
    res.json({ success: true, data: p });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// Check meal compatibility for student
r.get('/dietary-profiles/:studentId/check-meal/:menuItemId', async (req, res) => {
  try {
    const [profile, item] = await Promise.all([
      DietaryProfile.findOne({ studentId: req.params.studentId }),
      MenuItem.findById(req.params.menuItemId),
    ]);
    if (!profile || !item) return res.status(404).json({ success: false, error: 'Not found' });

    const warnings = [];
    for (const allergy of profile.allergies || []) {
      if (item.allergens.includes(allergy.toLowerCase())) {
        warnings.push({ type: 'allergy', allergen: allergy, severity: 'critical' });
      }
    }
    for (const intolerance of profile.intolerances || []) {
      if (item.allergens.includes(intolerance.toLowerCase())) {
        warnings.push({ type: 'intolerance', allergen: intolerance, severity: 'warning' });
      }
    }
    const safe = warnings.filter(w => w.severity === 'critical').length === 0;
    res.json({ success: true, data: { safe, warnings, menuItem: item.name, student: profile.studentName } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Laundry ──
r.get('/laundry', async (req, res) => {
  try {
    const { status, studentId, branchId } = req.query;
    const q = {};
    if (status) q.status = status;
    if (studentId) q.studentId = studentId;
    if (branchId) q.branchId = branchId;
    const orders = await LaundryOrder.find(q).sort({ receivedAt: -1 });
    res.json({ success: true, data: orders });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.post('/laundry', async (req, res) => {
  try {
    const order = await LaundryOrder.create(req.body);
    res.status(201).json({ success: true, data: order });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.put('/laundry/:id/status', async (req, res) => {
  try {
    const update = { status: req.body.status, processedBy: req.body.processedBy };
    if (req.body.status === 'ready') update.completedAt = new Date();
    if (req.body.status === 'delivered') update.deliveredAt = new Date();
    const order = await LaundryOrder.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json({ success: true, data: order });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// ── Rooms ──
r.get('/rooms', async (req, res) => {
  try {
    const { type, branchId, bookable } = req.query;
    const q = {};
    if (type) q.type = type;
    if (branchId) q.branchId = branchId;
    if (bookable !== undefined) q.bookable = bookable === 'true';
    const rooms = await Room.find(q).sort({ building: 1, floor: 1, name: 1 });
    res.json({ success: true, data: rooms });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.post('/rooms', async (req, res) => {
  try {
    const room = await Room.create(req.body);
    res.status(201).json({ success: true, data: room });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.put('/rooms/:id', async (req, res) => {
  try {
    const r2 = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: r2 });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// ── Bookings ──
r.get('/bookings', async (req, res) => {
  try {
    const { roomId, date, bookedBy } = req.query;
    const q = { status: { $ne: 'cancelled' } };
    if (roomId) q.roomId = roomId;
    if (bookedBy) q.bookedBy = bookedBy;
    if (date) {
      const d = new Date(date);
      q.startTime = { $gte: d, $lt: new Date(d.getTime() + 86400000) };
    }
    const bookings = await Booking.find(q).populate('roomId').sort({ startTime: 1 });
    res.json({ success: true, data: bookings });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.post('/bookings', async (req, res) => {
  try {
    // Conflict check
    const conflict = await Booking.findOne({
      roomId: req.body.roomId,
      status: 'confirmed',
      $or: [{ startTime: { $lt: new Date(req.body.endTime) }, endTime: { $gt: new Date(req.body.startTime) } }],
    });
    if (conflict) return res.status(409).json({ success: false, error: 'Room already booked for this time slot' });
    const booking = await Booking.create(req.body);
    res.status(201).json({ success: true, data: booking });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.delete('/bookings/:id', async (req, res) => {
  try {
    await Booking.findByIdAndUpdate(req.params.id, { status: 'cancelled' });
    res.json({ success: true, message: 'Booking cancelled' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Maintenance ──
r.get('/maintenance', async (req, res) => {
  try {
    const { status, priority, category, branchId } = req.query;
    const q = {};
    if (status) q.status = status;
    if (priority) q.priority = priority;
    if (category) q.category = category;
    if (branchId) q.branchId = branchId;
    const tickets = await Maintenance.find(q).sort({ priority: -1, createdAt: -1 });
    res.json({ success: true, data: tickets });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.post('/maintenance', async (req, res) => {
  try {
    const ticket = await Maintenance.create(req.body);
    res.status(201).json({ success: true, data: ticket });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.put('/maintenance/:id', async (req, res) => {
  try {
    if (req.body.status === 'in-progress' && !req.body.startedAt) req.body.startedAt = new Date();
    if (req.body.status === 'completed' && !req.body.completedAt) req.body.completedAt = new Date();
    const t = await Maintenance.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: t });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// ── Inventory ──
r.get('/inventory', async (req, res) => {
  try {
    const { category, lowStock, branchId } = req.query;
    const q = { isActive: true };
    if (category) q.category = category;
    if (branchId) q.branchId = branchId;
    if (lowStock === 'true') q.$expr = { $lte: ['$currentStock', '$minStock'] };
    const items = await Inventory.find(q).sort({ category: 1, name: 1 });
    res.json({ success: true, data: items });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

r.post('/inventory', async (req, res) => {
  try {
    const item = await Inventory.create(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

r.put('/inventory/:id', async (req, res) => {
  try {
    const i = await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: i });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// Stock adjustment (add/remove)
r.post('/inventory/:id/adjust', async (req, res) => {
  try {
    const { quantity, type, reason } = req.body; // type: 'add' | 'remove'
    const inc = type === 'add' ? quantity : -quantity;
    const item = await Inventory.findByIdAndUpdate(req.params.id, { $inc: { currentStock: inc } }, { new: true });
    if (item.currentStock <= item.minStock) {
      console.log(`[Facility] Low stock: ${item.name} → ${item.currentStock}`);
    }
    res.json({ success: true, data: item });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// ── Dashboard ──
r.get('/dashboard', async (req, res) => {
  try {
    const [pendingLaundry, openMaintenance, lowStock, todayBookings] = await Promise.all([
      LaundryOrder.countDocuments({ status: { $in: ['received', 'washing', 'drying', 'ironing'] } }),
      Maintenance.countDocuments({ status: { $in: ['open', 'assigned', 'in-progress'] } }),
      Inventory.countDocuments({ isActive: true, $expr: { $lte: ['$currentStock', '$minStock'] } }),
      Booking.countDocuments({
        status: 'confirmed',
        startTime: { $gte: new Date(new Date().toISOString().slice(0, 10)), $lt: new Date(Date.now() + 86400000) },
      }),
    ]);
    res.json({ success: true, data: { pendingLaundry, openMaintenance, lowStockItems: lowStock, todayBookings } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.use('/api', r);

// Health
app.get('/health', async (_req, res) => {
  const mongoOk = mongoose.connection.readyState === 1;
  const redisOk = redis.status === 'ready';
  const ok = mongoOk && redisOk;
  res.status(ok ? 200 : 503).json({ status: ok ? 'healthy' : 'degraded', mongo: mongoOk, redis: redisOk, uptime: process.uptime() });
});

/* ── Crons ── */
// Check low stock & expiry daily at 6 AM
cron.schedule('0 6 * * *', async () => {
  await facilityQueue.add('check-low-stock', {});
  await facilityQueue.add('check-expiry', {});
});

/* ───────── Start ───────── */
const PORT = process.env.PORT || 3440;
const MONGO = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://mongodb:27017/alawael_facility';

mongoose
  .connect(MONGO)
  .then(() => {
    console.log('[Facility] MongoDB connected');
    app.listen(PORT, '0.0.0.0', () => console.log(`[Facility] listening on ${PORT}`));
  })
  .catch(err => {
    console.error('[Facility] Mongo error', err);
    process.exit(1);
  });
