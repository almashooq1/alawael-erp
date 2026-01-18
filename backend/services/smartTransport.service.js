/**
 * PHASE 114: Smart Transport & Logistics Unit
 * Manages ambulance dispatch, patient transport scheduling, and fleet tracking.
 */

class SmartTransportService {
  constructor() {
    console.log('System: Smart Transport & Logistics Unit - Initialized');

    // In-memory mock DB
    this.vehicles = new Map();
    this.trips = new Map();
    this.drivers = new Map();

    this._seedData();
  }

  // --- Fleet Management ---

  createVehicle(data) {
    const id = `VEH-${Math.floor(Math.random() * 1000)}`;
    const vehicle = {
      id,
      plateNumber: data.plateNumber,
      type: data.type || 'AMBULANCE', // AMBULANCE, SHUTTLE, SUPPLY_VAN
      status: 'AVAILABLE', // AVAILABLE, BUSY, MAINTENANCE
      location: data.location || { lat: 24.7136, lng: 46.6753 }, // Default Riyadh
      fuelLevel: 100,
      lastMaintenance: new Date(),
    };
    this.vehicles.set(id, vehicle);
    return vehicle;
  }

  getAllVehicles() {
    return Array.from(this.vehicles.values());
  }

  // --- Trip Management ---

  requestTrip(patientId, pickupLocation, destination, priority = 'NORMAL') {
    const tripId = `TRIP-${Math.floor(Math.random() * 10000)}`;

    // Auto-assign nearest available vehicle
    const vehicle = this._findNearestVehicle(pickupLocation, priority);

    const trip = {
      id: tripId,
      patientId,
      pickup: pickupLocation,
      dropoff: destination,
      priority, // NORMAL, URGENT, EMERGENCY
      status: vehicle ? 'DISPATCHED' : 'PENDING',
      vehicleId: vehicle ? vehicle.id : null,
      driverId: vehicle ? 'DR-AHMED' : null, // Mock Driver
      requestedAt: new Date(),
      estimatedArrival: vehicle ? 15 : null, // mins
    };

    if (vehicle) {
      vehicle.status = 'BUSY';
    }

    this.trips.set(tripId, trip);
    return trip;
  }

  updateTripStatus(tripId, status) {
    const trip = this.trips.get(tripId);
    if (!trip) throw new Error('Trip not found');

    trip.status = status; // DISPATCHED -> ON_ROUTE -> AT_PICKUP -> IN_TRANSIT -> COMPLETED
    if (status === 'COMPLETED' && trip.vehicleId) {
      const v = this.vehicles.get(trip.vehicleId);
      if (v) v.status = 'AVAILABLE';
    }

    return trip;
  }

  getAllTrips() {
    return Array.from(this.trips.values());
  }

  // --- Intelligence ---

  _findNearestVehicle(location, priority) {
    // Naive mock: Find first available vehicle of correct type
    const requiredType = priority === 'EMERGENCY' ? 'AMBULANCE' : 'SHUTTLE';
    return (
      Array.from(this.vehicles.values()).find(v => v.status === 'AVAILABLE' && v.type === requiredType) ||
      Array.from(this.vehicles.values()).find(v => v.status === 'AVAILABLE')
    ); // Fallback
  }

  _seedData() {
    this.createVehicle({ plateNumber: 'ABC-123', type: 'AMBULANCE' });
    this.createVehicle({ plateNumber: 'XYZ-999', type: 'SHUTTLE' });
    this.createVehicle({ plateNumber: 'MED-555', type: 'AMBULANCE' });
  }
}

module.exports = SmartTransportService;
