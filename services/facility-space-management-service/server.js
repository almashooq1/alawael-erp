'use strict';
const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const helmet = require('helmet');
const cors = require('cors');
const { Queue } = require('bullmq');
const cron = require('node-cron');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '5mb' }));

/* ═══════════════════════════════════════════════════════════════ */

const facilitySchema = new mongoose.Schema(
  {
    facilityNo: { type: String, unique: true },
    nameAr: { type: String, required: true },
    nameEn: String,
    type: {
      type: String,
      enum: [
        'building',
        'floor',
        'classroom',
        'lab',
        'library',
        'auditorium',
        'gym',
        'playground',
        'cafeteria',
        'kitchen',
        'clinic',
        'office',
        'meeting-room',
        'prayer-room',
        'storage',
        'parking',
        'entrance',
        'restroom',
        'garden',
        'pool',
        'sensory-room',
        'therapy-room',
        'other',
      ],
      required: true,
    },
    building: String,
    floor: String,
    roomNumber: String,
    capacity: Number,
    area: { sqMeters: Number, sqFeet: Number },
    features: [String],
    equipment: [{ name: String, quantity: Number, condition: String }],
    accessibility: {
      wheelchairAccessible: { type: Boolean, default: false },
      hasElevator: Boolean,
      hasRamp: Boolean,
      brailleSignage: Boolean,
      hearingLoop: Boolean,
      specialNotes: String,
    },
    operatingHours: { open: String, close: String, days: [String] },
    photos: [{ url: String, caption: String }],
    floorPlan: String,
    assignedTo: { department: String, contactPerson: String, contactPhone: String },
    condition: { type: String, enum: ['excellent', 'good', 'fair', 'poor', 'under-maintenance', 'closed'], default: 'good' },
    lastInspection: Date,
    notes: String,
    isBookable: { type: Boolean, default: true },
    status: { type: String, enum: ['active', 'inactive', 'under-construction', 'renovation', 'demolished'], default: 'active' },
    createdBy: { userId: String, name: String },
  },
  { timestamps: true },
);

facilitySchema.pre('save', async function (next) {
  if (!this.facilityNo) {
    const count = await this.constructor.countDocuments();
    this.facilityNo = `FAC-${String(count + 1).padStart(4, '0')}`;
  }
  if (this.area?.sqMeters && !this.area.sqFeet) this.area.sqFeet = Math.round(this.area.sqMeters * 10.764);
  next();
});

const bookingSchema = new mongoose.Schema(
  {
    bookingNo: { type: String, unique: true },
    facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', required: true },
    facilityName: String,
    title: { type: String, required: true },
    description: String,
    type: { type: String, enum: ['class', 'meeting', 'event', 'exam', 'training', 'maintenance', 'private', 'other'], default: 'other' },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    recurring: { isRecurring: Boolean, frequency: { type: String, enum: ['daily', 'weekly', 'monthly'] }, endDate: Date },
    requestedBy: { userId: String, name: String, department: String },
    attendees: Number,
    setupRequirements: [String],
    cateringRequired: Boolean,
    avRequired: Boolean,
    approvedBy: { userId: String, name: String, date: Date },
    conflict: { hasConflict: Boolean, conflictWith: String },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled', 'completed'], default: 'pending' },
    notes: String,
  },
  { timestamps: true },
);

bookingSchema.pre('save', async function (next) {
  if (!this.bookingNo) {
    const count = await this.constructor.countDocuments();
    this.bookingNo = `BK-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

const spaceAllocationSchema = new mongoose.Schema(
  {
    allocationNo: { type: String, unique: true },
    facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', required: true },
    academicYear: String,
    semester: String,
    allocatedTo: { type: String, enum: ['class', 'department', 'activity', 'administration', 'shared'], required: true },
    className: String,
    department: String,
    schedule: [
      {
        day: { type: String, enum: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'] },
        periods: [{ period: Number, subject: String, teacher: String }],
      },
    ],
    startDate: Date,
    endDate: Date,
    status: { type: String, enum: ['active', 'pending', 'expired'], default: 'active' },
    createdBy: { userId: String, name: String },
  },
  { timestamps: true },
);

spaceAllocationSchema.pre('save', async function (next) {
  if (!this.allocationNo) {
    const count = await this.constructor.countDocuments();
    this.allocationNo = `SA-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

const maintenanceTicketSchema = new mongoose.Schema(
  {
    ticketNo: { type: String, unique: true },
    facilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', required: true },
    category: {
      type: String,
      enum: [
        'electrical',
        'plumbing',
        'hvac',
        'painting',
        'furniture',
        'cleaning',
        'pest-control',
        'landscaping',
        'security-system',
        'fire-safety',
        'it-infrastructure',
        'structural',
        'other',
      ],
      required: true,
    },
    priority: { type: String, enum: ['low', 'medium', 'high', 'emergency'], default: 'medium' },
    description: { type: String, required: true },
    photos: [{ url: String, caption: String }],
    reportedBy: { userId: String, name: String, department: String },
    assignedTo: { userId: String, name: String, team: String },
    estimatedCost: Number,
    actualCost: Number,
    scheduledDate: Date,
    completedDate: Date,
    resolution: String,
    partsUsed: [{ name: String, quantity: Number, cost: Number }],
    status: {
      type: String,
      enum: ['open', 'assigned', 'in-progress', 'waiting-parts', 'completed', 'verified', 'closed'],
      default: 'open',
    },
  },
  { timestamps: true },
);

maintenanceTicketSchema.pre('save', async function (next) {
  if (!this.ticketNo) {
    const count = await this.constructor.countDocuments();
    this.ticketNo = `MT-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

const Facility = mongoose.model('Facility', facilitySchema);
const Booking = mongoose.model('Booking', bookingSchema);
const SpaceAllocation = mongoose.model('SpaceAllocation', spaceAllocationSchema);
const MaintenanceTicket = mongoose.model('MaintenanceTicket', maintenanceTicketSchema);

const MONGO = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael_facility';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const PORT = process.env.PORT || 3590;

const redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null, retryStrategy: t => Math.min(t * 200, 5000) });
const facilityQueue = new Queue('facility-tasks', { connection: redis });

/* ═══════════════════════════════════════════════════════════════ */
app.get('/health', async (_req, res) => {
  const mongo = mongoose.connection.readyState === 1;
  const red = redis.status === 'ready';
  res
    .status(mongo && red ? 200 : 503)
    .json({
      status: mongo && red ? 'ok' : 'degraded',
      service: 'facility-space-management-service',
      mongo,
      redis: red,
      uptime: process.uptime(),
    });
});

// Facilities
app.post('/api/facilities', async (req, res) => {
  try {
    res.status(201).json(await Facility.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/facilities', async (req, res) => {
  const { type, building, floor, bookable, status, search, page = 1, limit = 20 } = req.query;
  const q = {};
  if (type) q.type = type;
  if (building) q.building = building;
  if (floor) q.floor = floor;
  if (bookable !== undefined) q.isBookable = bookable === 'true';
  if (status) q.status = status;
  if (search) q.$or = [{ nameAr: new RegExp(search, 'i') }, { nameEn: new RegExp(search, 'i') }, { roomNumber: new RegExp(search, 'i') }];
  const [data, total] = await Promise.all([
    Facility.find(q)
      .skip((page - 1) * limit)
      .limit(+limit)
      .sort({ building: 1, floor: 1, roomNumber: 1 }),
    Facility.countDocuments(q),
  ]);
  res.json({ data, total, page: +page, pages: Math.ceil(total / limit) });
});
app.get('/api/facilities/:id', async (req, res) => {
  const f = await Facility.findById(req.params.id);
  if (!f) return res.status(404).json({ error: 'المرفق غير موجود' });
  const [upcomingBookings, activeAllocations, openTickets] = await Promise.all([
    Booking.find({ facilityId: f._id, status: { $in: ['approved', 'pending'] }, date: { $gte: new Date() } })
      .limit(10)
      .sort({ date: 1 }),
    SpaceAllocation.find({ facilityId: f._id, status: 'active' }),
    MaintenanceTicket.find({ facilityId: f._id, status: { $nin: ['completed', 'verified', 'closed'] } }),
  ]);
  res.json({ ...f.toObject(), upcomingBookings, activeAllocations, openTickets });
});
app.put('/api/facilities/:id', async (req, res) => {
  res.json(await Facility.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

// Bookings
app.post('/api/bookings', async (req, res) => {
  try {
    // Check for conflicts
    const existing = await Booking.findOne({
      facilityId: req.body.facilityId,
      date: req.body.date,
      status: { $in: ['approved', 'pending'] },
      $or: [{ startTime: { $lt: req.body.endTime }, endTime: { $gt: req.body.startTime } }],
    });
    if (existing) {
      req.body.conflict = { hasConflict: true, conflictWith: existing.bookingNo };
      return res.status(409).json({ error: 'يوجد تعارض مع حجز آخر', conflictWith: existing.bookingNo });
    }
    res.status(201).json(await Booking.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/bookings', async (req, res) => {
  const { facilityId, date, type, status, from, to, page = 1, limit = 20 } = req.query;
  const q = {};
  if (facilityId) q.facilityId = facilityId;
  if (date) q.date = new Date(date);
  if (type) q.type = type;
  if (status) q.status = status;
  if (from || to) {
    q.date = {};
    if (from) q.date.$gte = new Date(from);
    if (to) q.date.$lte = new Date(to);
  }
  const [data, total] = await Promise.all([
    Booking.find(q)
      .populate('facilityId', 'nameAr type roomNumber')
      .skip((page - 1) * limit)
      .limit(+limit)
      .sort({ date: 1, startTime: 1 }),
    Booking.countDocuments(q),
  ]);
  res.json({ data, total, page: +page, pages: Math.ceil(total / limit) });
});
app.put('/api/bookings/:id', async (req, res) => {
  res.json(await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

// Facility availability check
app.get('/api/facilities/:id/availability', async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'التاريخ مطلوب' });
  const bookings = await Booking.find({ facilityId: req.params.id, date: new Date(date), status: { $in: ['approved', 'pending'] } })
    .select('startTime endTime title type status')
    .sort({ startTime: 1 });
  res.json({ date, bookings, totalBookings: bookings.length });
});

// Space Allocations
app.post('/api/space-allocations', async (req, res) => {
  try {
    res.status(201).json(await SpaceAllocation.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/space-allocations', async (req, res) => {
  const { facilityId, academicYear, allocatedTo, status } = req.query;
  const q = {};
  if (facilityId) q.facilityId = facilityId;
  if (academicYear) q.academicYear = academicYear;
  if (allocatedTo) q.allocatedTo = allocatedTo;
  if (status) q.status = status;
  res.json(await SpaceAllocation.find(q).populate('facilityId', 'nameAr type roomNumber').sort({ createdAt: -1 }));
});

// Maintenance Tickets
app.post('/api/maintenance-tickets', async (req, res) => {
  try {
    const ticket = await MaintenanceTicket.create(req.body);
    if (req.body.priority === 'emergency') {
      await facilityQueue.add('emergency-maintenance', { ticketId: ticket._id.toString() }, { priority: 1, attempts: 3 });
    }
    res.status(201).json(ticket);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/maintenance-tickets', async (req, res) => {
  const { facilityId, category, priority, status, page = 1, limit = 20 } = req.query;
  const q = {};
  if (facilityId) q.facilityId = facilityId;
  if (category) q.category = category;
  if (priority) q.priority = priority;
  if (status) q.status = status;
  const [data, total] = await Promise.all([
    MaintenanceTicket.find(q)
      .populate('facilityId', 'nameAr roomNumber')
      .skip((page - 1) * limit)
      .limit(+limit)
      .sort({ priority: 1, createdAt: -1 }),
    MaintenanceTicket.countDocuments(q),
  ]);
  res.json({ data, total, page: +page, pages: Math.ceil(total / limit) });
});
app.put('/api/maintenance-tickets/:id', async (req, res) => {
  res.json(await MaintenanceTicket.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

// Dashboard
app.get('/api/facility/dashboard', async (_req, res) => {
  const cacheKey = 'facility:dashboard';
  const cached = await redis.get(cacheKey);
  if (cached) return res.json(JSON.parse(cached));
  const [totalFacilities, activeFacilities, todayBookings, openTickets, byType, maintenanceByCat] = await Promise.all([
    Facility.countDocuments(),
    Facility.countDocuments({ status: 'active' }),
    Booking.countDocuments({
      date: { $gte: new Date(new Date().setHours(0, 0, 0, 0)), $lte: new Date(new Date().setHours(23, 59, 59, 999)) },
      status: 'approved',
    }),
    MaintenanceTicket.countDocuments({ status: { $nin: ['completed', 'verified', 'closed'] } }),
    Facility.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$type', count: { $sum: 1 }, totalCapacity: { $sum: '$capacity' } } },
      { $sort: { count: -1 } },
    ]),
    MaintenanceTicket.aggregate([
      { $match: { status: { $nin: ['completed', 'verified', 'closed'] } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);
  const result = { totalFacilities, activeFacilities, todayBookings, openTickets, byType, maintenanceByCat };
  await redis.set(cacheKey, JSON.stringify(result), 'EX', 300);
  res.json(result);
});

// Cron: auto-complete past bookings daily at midnight
cron.schedule('0 0 * * *', async () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const { modifiedCount } = await Booking.updateMany({ status: 'approved', date: { $lt: yesterday } }, { status: 'completed' });
  if (modifiedCount) console.log(`✅ Auto-completed ${modifiedCount} past bookings`);
});

// Cron: expire old space allocations
cron.schedule('0 6 * * *', async () => {
  const now = new Date();
  const { modifiedCount } = await SpaceAllocation.updateMany({ status: 'active', endDate: { $lte: now } }, { status: 'expired' });
  if (modifiedCount) console.log(`⏰ Expired ${modifiedCount} space allocations`);
});

mongoose
  .connect(MONGO)
  .then(() => {
    console.log('✅ MongoDB connected — facility-space-management');
    app.listen(PORT, () => console.log(`🏢 Facility-Space-Management Service running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
