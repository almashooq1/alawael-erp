'use strict';
const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const http = require('http');
const { WebSocketServer } = require('ws');
const helmet = require('helmet');
const cors = require('cors');
const geolib = require('geolib');

const app = express();
const PORT = process.env.PORT || 3330;
app.use(helmet());
app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://mongodb:27017/alawael_fleet', { maxPoolSize: 15 })
  .then(() => console.log('✅ Fleet DB connected'));
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379/8');
const redisSub = new Redis(process.env.REDIS_URL || 'redis://redis:6379/8');

/* ─── Schemas ─── */
const vehicleSchema = new mongoose.Schema(
  {
    plateNumber: { type: String, unique: true },
    type: { type: String, enum: ['bus', 'van', 'car', 'truck', 'ambulance'] },
    make: String,
    model: String,
    year: Number,
    capacity: Number,
    vin: String,
    color: String,
    fuelType: { type: String, enum: ['gasoline', 'diesel', 'electric', 'hybrid'] },
    currentOdometer: Number,
    gpsDeviceId: String,
    insurance: { provider: String, policyNumber: String, expiryDate: Date },
    registration: { number: String, expiryDate: Date },
    inspection: { lastDate: Date, nextDate: Date, status: String },
    maintenance: { lastDate: Date, nextScheduled: Date, odometerAtLast: Number },
    status: { type: String, enum: ['active', 'maintenance', 'retired', 'reserved'], default: 'active' },
    assignedRoute: { type: mongoose.Schema.Types.ObjectId, ref: 'TransportRoute' },
    assignedDriver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
    branch: String,
  },
  { timestamps: true },
);
const Vehicle = mongoose.model('Vehicle', vehicleSchema);

const driverSchema = new mongoose.Schema(
  {
    employeeId: String,
    fullName: { ar: String, en: String },
    phone: String,
    licenseNumber: String,
    licenseExpiry: Date,
    licenseType: { type: String, enum: ['private', 'public-light', 'public-heavy'] },
    medicalCert: { expiryDate: Date, status: String },
    rating: { type: Number, default: 5.0 },
    totalTrips: { type: Number, default: 0 },
    violations: [{ type: String, date: Date, description: String, fineAmount: Number }],
    status: { type: String, enum: ['available', 'on-duty', 'off-duty', 'on-leave', 'suspended'], default: 'available' },
    currentLocation: { lat: Number, lng: Number, updatedAt: Date },
  },
  { timestamps: true },
);
const Driver = mongoose.model('Driver', driverSchema);

const routeSchema = new mongoose.Schema(
  {
    name: { ar: String, en: String },
    code: { type: String, unique: true },
    type: { type: String, enum: ['morning-pickup', 'afternoon-dropoff', 'trip', 'custom'] },
    stops: [
      {
        name: { ar: String, en: String },
        location: { lat: Number, lng: Number },
        order: Number,
        estimatedTime: String,
        passengers: [{ beneficiaryId: mongoose.Schema.Types.ObjectId, name: String, phone: String }],
      },
    ],
    startLocation: { lat: Number, lng: Number, name: String },
    endLocation: { lat: Number, lng: Number, name: String },
    estimatedDuration: Number, // minutes
    estimatedDistance: Number, // km
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
    schedule: { daysOfWeek: [Number], departureTime: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);
const TransportRoute = mongoose.model('TransportRoute', routeSchema);

const tripSchema = new mongoose.Schema(
  {
    route: { type: mongoose.Schema.Types.ObjectId, ref: 'TransportRoute' },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
    date: Date,
    startTime: Date,
    endTime: Date,
    status: { type: String, enum: ['planned', 'in-progress', 'completed', 'cancelled'], default: 'planned' },
    passengers: [
      {
        beneficiaryId: mongoose.Schema.Types.ObjectId,
        name: String,
        pickedUp: { type: Boolean, default: false },
        pickedUpAt: Date,
        droppedOff: { type: Boolean, default: false },
        droppedOffAt: Date,
        parentNotified: Boolean,
      },
    ],
    gpsTrail: [{ lat: Number, lng: Number, speed: Number, timestamp: Date }],
    odometerStart: Number,
    odometerEnd: Number,
    fuelConsumed: Number,
    incidents: [{ type: String, description: String, time: Date, location: { lat: Number, lng: Number } }],
  },
  { timestamps: true },
);
tripSchema.index({ date: 1, status: 1 });
const Trip = mongoose.model('Trip', tripSchema);

const geofenceSchema = new mongoose.Schema(
  {
    name: { ar: String, en: String },
    type: { type: String, enum: ['circle', 'polygon'] },
    center: { lat: Number, lng: Number },
    radius: Number, // meters (for circle)
    polygon: [{ lat: Number, lng: Number }],
    alertType: { type: String, enum: ['enter', 'exit', 'both'], default: 'both' },
    isActive: { type: Boolean, default: true },
    notifyParents: { type: Boolean, default: true },
  },
  { timestamps: true },
);
const Geofence = mongoose.model('Geofence', geofenceSchema);

const maintenanceSchema = new mongoose.Schema(
  {
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    type: { type: String, enum: ['scheduled', 'unscheduled', 'emergency', 'inspection'] },
    description: String,
    parts: [{ name: String, cost: Number, quantity: Number }],
    laborCost: Number,
    totalCost: Number,
    vendor: String,
    startDate: Date,
    endDate: Date,
    odometerAt: Number,
    status: { type: String, enum: ['pending', 'in-progress', 'completed', 'cancelled'], default: 'pending' },
    nextScheduled: Date,
  },
  { timestamps: true },
);
const Maintenance = mongoose.model('Maintenance', maintenanceSchema);

const fuelLogSchema = new mongoose.Schema(
  {
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
    date: Date,
    fuelType: String,
    liters: Number,
    costPerLiter: Number,
    totalCost: Number,
    odometer: Number,
    station: String,
    cardNumber: String,
  },
  { timestamps: true },
);
const FuelLog = mongoose.model('FuelLog', fuelLogSchema);

/* ─── WebSocket for live GPS ─── */
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/fleet' });
const vehicleClients = new Map(); // vehicleId → Set<ws>

wss.on('connection', (ws, req) => {
  const vehicleId = new URL(req.url, 'http://x').searchParams.get('vehicleId');
  if (vehicleId) {
    if (!vehicleClients.has(vehicleId)) vehicleClients.set(vehicleId, new Set());
    vehicleClients.get(vehicleId).add(ws);
    ws.on('close', () => vehicleClients.get(vehicleId)?.delete(ws));
  }
  ws.on('message', async data => {
    try {
      const msg = JSON.parse(data);
      if (msg.type === 'gps_update') {
        await redis.set(
          `vehicle:gps:${msg.vehicleId}`,
          JSON.stringify({ lat: msg.lat, lng: msg.lng, speed: msg.speed, timestamp: Date.now() }),
          'EX',
          300,
        );
        await redis.publish('fleet:gps', JSON.stringify(msg));
        // Check geofences
        const geofences = await Geofence.find({ isActive: true }).lean();
        for (const gf of geofences) {
          const inside =
            gf.type === 'circle'
              ? geolib.isPointWithinRadius(
                  { latitude: msg.lat, longitude: msg.lng },
                  { latitude: gf.center.lat, longitude: gf.center.lng },
                  gf.radius,
                )
              : geolib.isPointInPolygon(
                  { latitude: msg.lat, longitude: msg.lng },
                  gf.polygon.map(p => ({ latitude: p.lat, longitude: p.lng })),
                );
          if (inside && (gf.alertType === 'enter' || gf.alertType === 'both')) {
            await redis.publish('fleet:geofence', JSON.stringify({ vehicleId: msg.vehicleId, geofenceName: gf.name, event: 'enter' }));
          }
        }
      }
    } catch {}
  });
});

redisSub.subscribe('fleet:gps');
redisSub.on('message', (channel, message) => {
  if (channel === 'fleet:gps') {
    const data = JSON.parse(message);
    const clients = vehicleClients.get(data.vehicleId);
    if (clients)
      clients.forEach(ws => {
        if (ws.readyState === 1) ws.send(message);
      });
  }
});

/* ─── Vehicle Routes ─── */
app.get('/api/vehicles', async (req, res) => {
  const { status, type, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (type) filter.type = type;
  const [vehicles, total] = await Promise.all([
    Vehicle.find(filter)
      .populate('assignedRoute assignedDriver')
      .skip((page - 1) * limit)
      .limit(+limit),
    Vehicle.countDocuments(filter),
  ]);
  res.json({ vehicles, total, page: +page });
});

app.post('/api/vehicles', async (req, res) => {
  try {
    res.status(201).json(await Vehicle.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/vehicles/:id', async (req, res) => {
  const v = await Vehicle.findById(req.params.id).populate('assignedRoute assignedDriver');
  v ? res.json(v) : res.status(404).json({ error: 'Not found' });
});
app.put('/api/vehicles/:id', async (req, res) => res.json(await Vehicle.findByIdAndUpdate(req.params.id, req.body, { new: true })));

// Live vehicle positions
app.get('/api/vehicles/live/positions', async (req, res) => {
  const keys = await redis.keys('vehicle:gps:*');
  const positions = [];
  for (const k of keys) {
    const data = JSON.parse(await redis.get(k));
    positions.push({ vehicleId: k.replace('vehicle:gps:', ''), ...data });
  }
  res.json(positions);
});

/* ─── Driver Routes ─── */
app.get('/api/drivers', async (req, res) => res.json(await Driver.find(req.query.status ? { status: req.query.status } : {})));
app.post('/api/drivers', async (req, res) => {
  try {
    res.status(201).json(await Driver.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.put('/api/drivers/:id', async (req, res) => res.json(await Driver.findByIdAndUpdate(req.params.id, req.body, { new: true })));
app.post('/api/drivers/:id/rate', async (req, res) => {
  const driver = await Driver.findById(req.params.id);
  driver.rating = (driver.rating * driver.totalTrips + req.body.rating) / (driver.totalTrips + 1);
  driver.totalTrips += 1;
  await driver.save();
  res.json({ rating: driver.rating });
});

/* ─── Route Management ─── */
app.get('/api/routes', async (req, res) =>
  res.json(
    await TransportRoute.find(req.query.type ? { type: req.query.type, isActive: true } : { isActive: true }).populate('vehicle driver'),
  ),
);
app.post('/api/routes', async (req, res) => {
  try {
    res.status(201).json(await TransportRoute.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.put('/api/routes/:id', async (req, res) => res.json(await TransportRoute.findByIdAndUpdate(req.params.id, req.body, { new: true })));

// Optimize route order
app.post('/api/routes/:id/optimize', async (req, res) => {
  const route = await TransportRoute.findById(req.params.id);
  if (!route) return res.status(404).json({ error: 'Not found' });
  const origin = route.startLocation;
  const sorted = [...route.stops].sort((a, b) => {
    const distA = geolib.getDistance(
      { latitude: origin.lat, longitude: origin.lng },
      { latitude: a.location.lat, longitude: a.location.lng },
    );
    const distB = geolib.getDistance(
      { latitude: origin.lat, longitude: origin.lng },
      { latitude: b.location.lat, longitude: b.location.lng },
    );
    return distA - distB;
  });
  sorted.forEach((s, i) => {
    s.order = i + 1;
  });
  route.stops = sorted;
  const totalDist = geolib.getPathLength(sorted.map(s => ({ latitude: s.location.lat, longitude: s.location.lng })));
  route.estimatedDistance = Math.round(totalDist / 1000);
  await route.save();
  res.json(route);
});

/* ─── Trip Routes ─── */
app.get('/api/trips', async (req, res) => {
  const { date, status, vehicle, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (vehicle) filter.vehicle = vehicle;
  if (date) {
    const d = new Date(date);
    filter.date = { $gte: d, $lt: new Date(d.getTime() + 86400000) };
  }
  const [trips, total] = await Promise.all([
    Trip.find(filter)
      .populate('route vehicle driver')
      .skip((page - 1) * limit)
      .limit(+limit)
      .sort({ date: -1 }),
    Trip.countDocuments(filter),
  ]);
  res.json({ trips, total, page: +page });
});

app.post('/api/trips', async (req, res) => {
  try {
    res.status(201).json(await Trip.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/trips/:id/start', async (req, res) => {
  const trip = await Trip.findByIdAndUpdate(
    req.params.id,
    { status: 'in-progress', startTime: new Date(), odometerStart: req.body.odometer },
    { new: true },
  );
  await Driver.findByIdAndUpdate(trip.driver, { status: 'on-duty' });
  res.json(trip);
});

app.put('/api/trips/:id/complete', async (req, res) => {
  const trip = await Trip.findByIdAndUpdate(
    req.params.id,
    { status: 'completed', endTime: new Date(), odometerEnd: req.body.odometer, fuelConsumed: req.body.fuelConsumed },
    { new: true },
  );
  await Driver.findByIdAndUpdate(trip.driver, { status: 'available' });
  if (trip.odometerEnd && trip.odometerStart) {
    await Vehicle.findByIdAndUpdate(trip.vehicle, { currentOdometer: trip.odometerEnd });
  }
  res.json(trip);
});

app.post('/api/trips/:id/passenger/:passIdx/pickup', async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  const p = trip.passengers[+req.params.passIdx];
  if (p) {
    p.pickedUp = true;
    p.pickedUpAt = new Date();
    p.parentNotified = true;
  }
  await trip.save();
  await redis.publish('fleet:passenger', JSON.stringify({ event: 'pickup', tripId: trip._id, passengerId: p?.beneficiaryId }));
  res.json(trip);
});

app.post('/api/trips/:id/passenger/:passIdx/dropoff', async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  const p = trip.passengers[+req.params.passIdx];
  if (p) {
    p.droppedOff = true;
    p.droppedOffAt = new Date();
  }
  await trip.save();
  await redis.publish('fleet:passenger', JSON.stringify({ event: 'dropoff', tripId: trip._id, passengerId: p?.beneficiaryId }));
  res.json(trip);
});

/* ─── Geofence, Maintenance, Fuel ─── */
app.get('/api/geofences', async (_, res) => res.json(await Geofence.find({ isActive: true })));
app.post('/api/geofences', async (req, res) => {
  try {
    res.status(201).json(await Geofence.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/maintenance', async (req, res) => {
  const filter = req.query.vehicle ? { vehicle: req.query.vehicle } : {};
  res.json(await Maintenance.find(filter).populate('vehicle').sort({ startDate: -1 }));
});
app.post('/api/maintenance', async (req, res) => {
  const m = await Maintenance.create(req.body);
  if (req.body.status === 'in-progress') await Vehicle.findByIdAndUpdate(req.body.vehicle, { status: 'maintenance' });
  res.status(201).json(m);
});

app.get('/api/fuel-logs', async (req, res) => {
  const filter = req.query.vehicle ? { vehicle: req.query.vehicle } : {};
  res.json(await FuelLog.find(filter).populate('vehicle driver').sort({ date: -1 }).limit(100));
});
app.post('/api/fuel-logs', async (req, res) => {
  try {
    res.status(201).json(await FuelLog.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/* ─── Fleet Stats ─── */
app.get('/api/fleet/stats', async (_, res) => {
  const [totalVehicles, activeVehicles, totalDrivers, availableDrivers, activeRoutes, tripsToday] = await Promise.all([
    Vehicle.countDocuments(),
    Vehicle.countDocuments({ status: 'active' }),
    Driver.countDocuments(),
    Driver.countDocuments({ status: 'available' }),
    TransportRoute.countDocuments({ isActive: true }),
    Trip.countDocuments({ date: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }, status: { $in: ['planned', 'in-progress'] } }),
  ]);
  const fuelThisMonth = await FuelLog.aggregate([
    { $match: { date: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } },
    { $group: { _id: null, totalLiters: { $sum: '$liters' }, totalCost: { $sum: '$totalCost' } } },
  ]);
  res.json({
    totalVehicles,
    activeVehicles,
    totalDrivers,
    availableDrivers,
    activeRoutes,
    tripsToday,
    fuelThisMonth: fuelThisMonth[0] || {},
  });
});

app.get('/health', (_, res) => res.json({ status: 'healthy', service: 'fleet-transport-service', uptime: process.uptime() }));
server.listen(PORT, () => console.log(`🚌 Fleet Transport Service running on port ${PORT}`));
