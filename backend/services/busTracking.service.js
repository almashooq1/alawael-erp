/**
 * Bus Tracking Service — خدمة تتبع الحافلات بالوقت الفعلي
 *
 * Real-time school bus tracking for parents:
 *   - Bus & route management
 *   - Trip lifecycle (start → waypoints → end)
 *   - Student boarding/alighting events
 *   - Real-time GPS location broadcasting
 *   - Parent notifications (departure, ETA, boarding, arrival)
 *   - Driver & assistant assignment
 *   - Safety alerts (speed, geofence, SOS)
 *   - Analytics dashboard
 */

const logger = require('../utils/logger');

class BusTrackingService {
  constructor() {
    // ── Data stores ──
    this.buses = new Map();
    this.routes = new Map();
    this.trips = new Map();
    this.students = new Map();
    this.locations = new Map(); // busId → { lat, lng, speed, heading, ts }
    this.notifications = [];
    this.boardingEvents = [];
    this.safetyAlerts = [];

    this._nextBusId = 1000;
    this._nextRouteId = 2000;
    this._nextTripId = 3000;
    this._nextStudentId = 4000;
    this._nextNotifId = 5000;
    this._nextAlertId = 6000;

    this._seed();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BUS MANAGEMENT — إدارة الحافلات
  // ═══════════════════════════════════════════════════════════════════════════

  createBus(data) {
    if (!data.plateNumber || !data.capacity) {
      throw new Error('الحقول المطلوبة: رقم اللوحة، السعة');
    }

    const bus = {
      id: this._nextBusId++,
      plateNumber: data.plateNumber,
      capacity: parseInt(data.capacity),
      model: data.model || 'غير محدد',
      year: data.year || new Date().getFullYear(),
      color: data.color || 'أصفر',
      status: data.status || 'active', // active, maintenance, inactive
      type: data.type || 'school', // school, rehabilitation, transport
      driverId: data.driverId || null,
      driverName: data.driverName || null,
      driverPhone: data.driverPhone || null,
      assistantName: data.assistantName || null,
      assistantPhone: data.assistantPhone || null,
      routeId: data.routeId || null,
      gpsDeviceId: data.gpsDeviceId || null,
      features: data.features || [],
      // wheelchair_accessible, ac, camera, gps_tracker, first_aid
      currentLocation: null,
      lastLocationUpdate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.buses.set(bus.id, bus);
    return bus;
  }

  getBusById(id) {
    const bus = this.buses.get(parseInt(id));
    if (!bus) throw new Error('الحافلة غير موجودة');
    return bus;
  }

  getAllBuses(filters = {}) {
    let result = Array.from(this.buses.values());

    if (filters.status) result = result.filter(b => b.status === filters.status);
    if (filters.type) result = result.filter(b => b.type === filters.type);
    if (filters.routeId) result = result.filter(b => b.routeId === parseInt(filters.routeId));
    if (filters.search) {
      const s = filters.search.toLowerCase();
      result = result.filter(
        b =>
          b.plateNumber.toLowerCase().includes(s) ||
          (b.driverName && b.driverName.toLowerCase().includes(s)) ||
          b.model.toLowerCase().includes(s),
      );
    }

    return result;
  }

  updateBus(id, data) {
    const bus = this.getBusById(id);
    const allowed = [
      'plateNumber',
      'capacity',
      'model',
      'year',
      'color',
      'status',
      'type',
      'driverId',
      'driverName',
      'driverPhone',
      'assistantName',
      'assistantPhone',
      'routeId',
      'gpsDeviceId',
      'features',
    ];
    allowed.forEach(k => {
      if (data[k] !== undefined) bus[k] = data[k];
    });
    bus.updatedAt = new Date();
    return bus;
  }

  deleteBus(id) {
    const bus = this.getBusById(id);
    this.buses.delete(parseInt(id));
    return bus;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ROUTE MANAGEMENT — إدارة المسارات
  // ═══════════════════════════════════════════════════════════════════════════

  createRoute(data) {
    if (!data.name || !data.stops || !Array.isArray(data.stops) || data.stops.length < 2) {
      throw new Error('اسم المسار ومحطتان على الأقل مطلوبة');
    }

    const route = {
      id: this._nextRouteId++,
      name: data.name,
      description: data.description || '',
      type: data.type || 'morning', // morning, afternoon, both
      stops: data.stops.map((s, i) => ({
        order: i + 1,
        name: s.name,
        lat: s.lat || 24.7 + i * 0.01,
        lng: s.lng || 46.7 + i * 0.01,
        estimatedTime: s.estimatedTime || `${7 + Math.floor(i / 4)}:${(i * 5) % 60 || '00'}`,
        studentCount: s.studentCount || 0,
      })),
      distance: data.distance || null, // km
      estimatedDuration: data.estimatedDuration || data.stops.length * 5, // minutes
      assignedBuses: data.assignedBuses || [],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.routes.set(route.id, route);
    return route;
  }

  getRouteById(id) {
    const route = this.routes.get(parseInt(id));
    if (!route) throw new Error('المسار غير موجود');
    return route;
  }

  getAllRoutes(filters = {}) {
    let result = Array.from(this.routes.values());
    if (filters.type) result = result.filter(r => r.type === filters.type);
    if (filters.status) result = result.filter(r => r.status === filters.status);
    if (filters.search) {
      const s = filters.search.toLowerCase();
      result = result.filter(r => r.name.toLowerCase().includes(s));
    }
    return result;
  }

  updateRoute(id, data) {
    const route = this.getRouteById(id);
    ['name', 'description', 'type', 'stops', 'distance', 'estimatedDuration', 'status'].forEach(
      k => {
        if (data[k] !== undefined) route[k] = data[k];
      },
    );
    if (data.stops && Array.isArray(data.stops)) {
      route.stops = data.stops.map((s, i) => ({
        order: i + 1,
        name: s.name,
        lat: s.lat,
        lng: s.lng,
        estimatedTime: s.estimatedTime,
        studentCount: s.studentCount || 0,
      }));
    }
    route.updatedAt = new Date();
    return route;
  }

  deleteRoute(id) {
    const route = this.getRouteById(id);
    this.routes.delete(parseInt(id));
    return route;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STUDENT REGISTRATION — تسجيل الطلاب على الحافلات
  // ═══════════════════════════════════════════════════════════════════════════

  registerStudent(data) {
    if (!data.name || !data.busId || !data.parentPhone) {
      throw new Error('الحقول المطلوبة: اسم الطالب، رقم الحافلة، هاتف ولي الأمر');
    }

    const student = {
      id: this._nextStudentId++,
      name: data.name,
      grade: data.grade || '',
      section: data.section || '',
      busId: parseInt(data.busId),
      routeId: data.routeId || null,
      stopName: data.stopName || '',
      parentName: data.parentName || 'ولي الأمر',
      parentPhone: data.parentPhone,
      parentEmail: data.parentEmail || null,
      emergencyContact: data.emergencyContact || data.parentPhone,
      specialNeeds: data.specialNeeds || null,
      photoUrl: data.photoUrl || null,
      rfidTag: data.rfidTag || null,
      status: 'active', // active, suspended, graduated
      createdAt: new Date(),
    };

    this.students.set(student.id, student);
    return student;
  }

  getStudentById(id) {
    const s = this.students.get(parseInt(id));
    if (!s) throw new Error('الطالب غير موجود');
    return s;
  }

  getStudentsByBus(busId) {
    return Array.from(this.students.values()).filter(
      s => s.busId === parseInt(busId) && s.status === 'active',
    );
  }

  getStudentsByParent(parentPhone) {
    return Array.from(this.students.values()).filter(s => s.parentPhone === parentPhone);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TRIP LIFECYCLE — دورة حياة الرحلة
  // ═══════════════════════════════════════════════════════════════════════════

  startTrip(data) {
    if (!data.busId || !data.routeId) {
      throw new Error('رقم الحافلة والمسار مطلوبان');
    }

    const bus = this.getBusById(data.busId);
    const route = this.getRouteById(data.routeId);

    // Check if bus already has active trip
    const active = Array.from(this.trips.values()).find(
      t => t.busId === parseInt(data.busId) && t.status === 'in-progress',
    );
    if (active) throw new Error('الحافلة لديها رحلة نشطة بالفعل');

    const trip = {
      id: this._nextTripId++,
      busId: parseInt(data.busId),
      routeId: parseInt(data.routeId),
      driverName: bus.driverName,
      type: data.type || 'morning', // morning (to school), afternoon (to home)
      status: 'in-progress',
      startedAt: new Date(),
      endedAt: null,
      currentStop: route.stops[0].name,
      currentStopIndex: 0,
      totalStops: route.stops.length,
      studentsOnBoard: 0,
      boardingLog: [],
      locationLog: [],
      alerts: [],
      estimatedArrival: new Date(Date.now() + route.estimatedDuration * 60000),
    };

    this.trips.set(trip.id, trip);

    // Notify parents
    const students = this.getStudentsByBus(data.busId);
    students.forEach(s => {
      this._createNotification({
        type: 'trip_started',
        studentId: s.id,
        tripId: trip.id,
        busId: bus.id,
        parentPhone: s.parentPhone,
        message: `بدأت رحلة حافلة ${bus.plateNumber} — ${trip.type === 'morning' ? 'الذهاب للمركز' : 'العودة للمنزل'}`,
        eta: trip.estimatedArrival,
      });
    });

    return trip;
  }

  endTrip(tripId) {
    const trip = this.trips.get(parseInt(tripId));
    if (!trip) throw new Error('الرحلة غير موجودة');
    if (trip.status !== 'in-progress') throw new Error('الرحلة ليست نشطة');

    trip.status = 'completed';
    trip.endedAt = new Date();
    trip.currentStop = 'الوجهة النهائية';

    // Notify parents
    const students = this.getStudentsByBus(trip.busId);
    students.forEach(s => {
      this._createNotification({
        type: 'trip_completed',
        studentId: s.id,
        tripId: trip.id,
        busId: trip.busId,
        parentPhone: s.parentPhone,
        message: 'وصلت الحافلة إلى الوجهة — الرحلة مكتملة',
      });
    });

    return trip;
  }

  getTripById(id) {
    const trip = this.trips.get(parseInt(id));
    if (!trip) throw new Error('الرحلة غير موجودة');
    return trip;
  }

  getActiveTrips() {
    return Array.from(this.trips.values()).filter(t => t.status === 'in-progress');
  }

  getTripHistory(filters = {}) {
    let result = Array.from(this.trips.values());
    if (filters.busId) result = result.filter(t => t.busId === parseInt(filters.busId));
    if (filters.status) result = result.filter(t => t.status === filters.status);
    if (filters.type) result = result.filter(t => t.type === filters.type);
    if (filters.date) {
      const d = new Date(filters.date).toDateString();
      result = result.filter(t => new Date(t.startedAt).toDateString() === d);
    }
    return result.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REAL-TIME LOCATION — التتبع بالوقت الفعلي
  // ═══════════════════════════════════════════════════════════════════════════

  updateBusLocation(busId, locationData) {
    if (!locationData.lat || !locationData.lng) {
      throw new Error('الإحداثيات مطلوبة (lat, lng)');
    }

    const bus = this.getBusById(busId);
    const location = {
      busId: parseInt(busId),
      lat: parseFloat(locationData.lat),
      lng: parseFloat(locationData.lng),
      speed: locationData.speed || 0,
      heading: locationData.heading || 0,
      accuracy: locationData.accuracy || 10,
      timestamp: new Date(),
    };

    this.locations.set(parseInt(busId), location);
    bus.currentLocation = { lat: location.lat, lng: location.lng };
    bus.lastLocationUpdate = location.timestamp;

    // Update active trip location log
    const activeTrip = Array.from(this.trips.values()).find(
      t => t.busId === parseInt(busId) && t.status === 'in-progress',
    );
    if (activeTrip) {
      activeTrip.locationLog.push(location);
      // Keep last 100 points
      if (activeTrip.locationLog.length > 100) {
        activeTrip.locationLog = activeTrip.locationLog.slice(-100);
      }
    }

    // Speed alert
    if (location.speed > 80) {
      this._createSafetyAlert({
        type: 'overspeeding',
        busId: parseInt(busId),
        message: `تجاوز السرعة: ${location.speed} كم/ساعة`,
        location,
        severity: location.speed > 120 ? 'critical' : 'warning',
      });
    }

    return location;
  }

  getBusLocation(busId) {
    const location = this.locations.get(parseInt(busId));
    if (!location) throw new Error('لا يوجد موقع محدد للحافلة');
    return location;
  }

  getAllBusLocations() {
    return Array.from(this.locations.values());
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BOARDING / ALIGHTING — صعود ونزول الطلاب
  // ═══════════════════════════════════════════════════════════════════════════

  recordBoarding(data) {
    if (!data.tripId || !data.studentId) {
      throw new Error('رقم الرحلة والطالب مطلوبان');
    }

    const trip = this.getTripById(data.tripId);
    if (trip.status !== 'in-progress') throw new Error('الرحلة ليست نشطة');

    const student = this.getStudentById(data.studentId);

    const event = {
      id: this.boardingEvents.length + 1,
      tripId: parseInt(data.tripId),
      studentId: parseInt(data.studentId),
      studentName: student.name,
      busId: trip.busId,
      type: data.type || 'boarding', // boarding, alighting
      stopName: data.stopName || trip.currentStop,
      timestamp: new Date(),
      method: data.method || 'manual', // manual, rfid, face_recognition
      verifiedBy: data.verifiedBy || 'السائق',
    };

    this.boardingEvents.push(event);
    trip.boardingLog.push(event);

    if (event.type === 'boarding') {
      trip.studentsOnBoard++;
    } else {
      trip.studentsOnBoard = Math.max(0, trip.studentsOnBoard - 1);
    }

    // Notify parent
    this._createNotification({
      type: event.type === 'boarding' ? 'student_boarded' : 'student_alighted',
      studentId: student.id,
      tripId: trip.id,
      busId: trip.busId,
      parentPhone: student.parentPhone,
      message:
        event.type === 'boarding'
          ? `${student.name} صعد الحافلة عند ${event.stopName}`
          : `${student.name} نزل من الحافلة عند ${event.stopName}`,
    });

    return event;
  }

  getBoardingHistory(filters = {}) {
    let result = [...this.boardingEvents];
    if (filters.tripId) result = result.filter(e => e.tripId === parseInt(filters.tripId));
    if (filters.studentId)
      result = result.filter(e => e.studentId === parseInt(filters.studentId));
    if (filters.busId) result = result.filter(e => e.busId === parseInt(filters.busId));
    if (filters.type) result = result.filter(e => e.type === filters.type);
    return result;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PARENT TRACKING PORTAL — بوابة تتبع الأهالي
  // ═══════════════════════════════════════════════════════════════════════════

  getParentDashboard(parentPhone) {
    if (!parentPhone) throw new Error('رقم هاتف ولي الأمر مطلوب');

    const myStudents = this.getStudentsByParent(parentPhone);
    if (myStudents.length === 0) {
      return {
        students: [],
        activeBuses: [],
        recentNotifications: [],
        message: 'لم يتم تسجيل طلاب لهذا الرقم',
      };
    }

    const activeBuses = [];
    const studentStatuses = myStudents.map(s => {
      const bus = this.buses.get(s.busId);
      const location = this.locations.get(s.busId);
      const activeTrip = Array.from(this.trips.values()).find(
        t => t.busId === s.busId && t.status === 'in-progress',
      );

      if (bus && activeTrip && !activeBuses.find(b => b.id === bus.id)) {
        activeBuses.push({
          id: bus.id,
          plateNumber: bus.plateNumber,
          driverName: bus.driverName,
          driverPhone: bus.driverPhone,
          currentLocation: location || null,
          tripStatus: activeTrip.status,
          currentStop: activeTrip.currentStop,
          eta: activeTrip.estimatedArrival,
          studentsOnBoard: activeTrip.studentsOnBoard,
        });
      }

      const lastBoarding = this.boardingEvents
        .filter(e => e.studentId === s.id)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

      return {
        id: s.id,
        name: s.name,
        grade: s.grade,
        busId: s.busId,
        busPlate: bus ? bus.plateNumber : 'غير متاح',
        status: activeTrip
          ? lastBoarding && lastBoarding.type === 'boarding'
            ? 'على الحافلة'
            : 'في المحطة'
          : 'لا توجد رحلة نشطة',
        lastEvent: lastBoarding
          ? {
              type: lastBoarding.type,
              stop: lastBoarding.stopName,
              time: lastBoarding.timestamp,
            }
          : null,
      };
    });

    const recentNotifications = this.notifications
      .filter(n => n.parentPhone === parentPhone)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 20);

    return {
      students: studentStatuses,
      activeBuses,
      recentNotifications,
      totalStudents: myStudents.length,
    };
  }

  trackBusForParent(busId, parentPhone) {
    // Verify parent has student on this bus
    const myStudents = this.getStudentsByParent(parentPhone);
    const hasAccess = myStudents.some(s => s.busId === parseInt(busId));
    if (!hasAccess) throw new Error('غير مصرح — ليس لديك طالب على هذه الحافلة');

    const bus = this.getBusById(busId);
    const location = this.locations.get(parseInt(busId));
    const activeTrip = Array.from(this.trips.values()).find(
      t => t.busId === parseInt(busId) && t.status === 'in-progress',
    );
    const route = bus.routeId ? this.routes.get(bus.routeId) : null;

    return {
      bus: {
        id: bus.id,
        plateNumber: bus.plateNumber,
        driverName: bus.driverName,
        driverPhone: bus.driverPhone,
        assistantName: bus.assistantName,
        model: bus.model,
        color: bus.color,
      },
      location: location || null,
      trip: activeTrip
        ? {
            id: activeTrip.id,
            status: activeTrip.status,
            type: activeTrip.type,
            startedAt: activeTrip.startedAt,
            currentStop: activeTrip.currentStop,
            studentsOnBoard: activeTrip.studentsOnBoard,
            eta: activeTrip.estimatedArrival,
          }
        : null,
      route: route
        ? {
            name: route.name,
            stops: route.stops,
            totalDistance: route.distance,
          }
        : null,
      myStudents: myStudents
        .filter(s => s.busId === parseInt(busId))
        .map(s => ({
          id: s.id,
          name: s.name,
          lastEvent: this.boardingEvents
            .filter(e => e.studentId === s.id)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0],
        })),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NOTIFICATIONS — إشعارات الأهالي
  // ═══════════════════════════════════════════════════════════════════════════

  _createNotification(data) {
    const notif = {
      id: this._nextNotifId++,
      type: data.type,
      studentId: data.studentId,
      tripId: data.tripId,
      busId: data.busId,
      parentPhone: data.parentPhone,
      message: data.message,
      eta: data.eta || null,
      read: false,
      createdAt: new Date(),
    };
    this.notifications.push(notif);
    return notif;
  }

  getParentNotifications(parentPhone, { limit = 50, unreadOnly = false } = {}) {
    let result = this.notifications.filter(n => n.parentPhone === parentPhone);
    if (unreadOnly) result = result.filter(n => !n.read);
    return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit);
  }

  markNotificationRead(notifId) {
    const n = this.notifications.find(n => n.id === parseInt(notifId));
    if (!n) throw new Error('الإشعار غير موجود');
    n.read = true;
    return n;
  }

  markAllNotificationsRead(parentPhone) {
    let count = 0;
    this.notifications.forEach(n => {
      if (n.parentPhone === parentPhone && !n.read) {
        n.read = true;
        count++;
      }
    });
    return { markedRead: count };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SAFETY ALERTS — تنبيهات السلامة
  // ═══════════════════════════════════════════════════════════════════════════

  _createSafetyAlert(data) {
    const alert = {
      id: this._nextAlertId++,
      type: data.type, // overspeeding, geofence_exit, sos, breakdown, accident
      busId: data.busId,
      message: data.message,
      severity: data.severity || 'warning', // info, warning, critical
      location: data.location || null,
      acknowledged: false,
      createdAt: new Date(),
    };
    this.safetyAlerts.push(alert);
    return alert;
  }

  raiseSOS(busId, data = {}) {
    const bus = this.getBusById(busId);
    const location = this.locations.get(parseInt(busId));

    const alert = this._createSafetyAlert({
      type: 'sos',
      busId: parseInt(busId),
      message: data.message || `إشارة SOS من الحافلة ${bus.plateNumber}`,
      severity: 'critical',
      location: location || null,
    });

    // Notify all parents of students on this bus
    const students = this.getStudentsByBus(busId);
    students.forEach(s => {
      this._createNotification({
        type: 'safety_alert',
        studentId: s.id,
        busId: parseInt(busId),
        parentPhone: s.parentPhone,
        message: `⚠️ تنبيه طوارئ: ${alert.message}`,
      });
    });

    return alert;
  }

  getSafetyAlerts(filters = {}) {
    let result = [...this.safetyAlerts];
    if (filters.busId) result = result.filter(a => a.busId === parseInt(filters.busId));
    if (filters.severity) result = result.filter(a => a.severity === filters.severity);
    if (filters.type) result = result.filter(a => a.type === filters.type);
    if (filters.unacknowledged) result = result.filter(a => !a.acknowledged);
    return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  acknowledgeAlert(alertId) {
    const alert = this.safetyAlerts.find(a => a.id === parseInt(alertId));
    if (!alert) throw new Error('التنبيه غير موجود');
    alert.acknowledged = true;
    alert.acknowledgedAt = new Date();
    return alert;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WAYPOINT ARRIVAL — وصول لمحطة
  // ═══════════════════════════════════════════════════════════════════════════

  arriveAtStop(tripId, data) {
    const trip = this.getTripById(tripId);
    if (trip.status !== 'in-progress') throw new Error('الرحلة ليست نشطة');

    const route = this.routes.get(trip.routeId);
    if (!route) throw new Error('المسار غير موجود');

    const stopIndex = data.stopIndex !== undefined ? data.stopIndex : trip.currentStopIndex + 1;
    if (stopIndex >= route.stops.length) {
      throw new Error('لا توجد محطات أخرى — استخدم إنهاء الرحلة');
    }

    const stop = route.stops[stopIndex];
    trip.currentStop = stop.name;
    trip.currentStopIndex = stopIndex;

    // Recalculate ETA
    const remainingStops = route.stops.length - stopIndex - 1;
    trip.estimatedArrival = new Date(Date.now() + remainingStops * 5 * 60000);

    // Notify parents with students at this stop
    const students = this.getStudentsByBus(trip.busId).filter(s => s.stopName === stop.name);
    students.forEach(s => {
      this._createNotification({
        type: 'bus_arriving',
        studentId: s.id,
        tripId: trip.id,
        busId: trip.busId,
        parentPhone: s.parentPhone,
        message: `الحافلة وصلت إلى محطة ${stop.name}`,
        eta: trip.estimatedArrival,
      });
    });

    return {
      tripId: trip.id,
      currentStop: stop.name,
      stopIndex,
      remainingStops,
      eta: trip.estimatedArrival,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DASHBOARD & ANALYTICS — لوحة التحكم
  // ═══════════════════════════════════════════════════════════════════════════

  getDashboard() {
    const allBuses = Array.from(this.buses.values());
    const allTrips = Array.from(this.trips.values());
    const activeTrips = allTrips.filter(t => t.status === 'in-progress');
    const todayTrips = allTrips.filter(
      t => new Date(t.startedAt).toDateString() === new Date().toDateString(),
    );
    const allStudents = Array.from(this.students.values()).filter(s => s.status === 'active');

    return {
      kpi: {
        totalBuses: allBuses.length,
        activeBuses: allBuses.filter(b => b.status === 'active').length,
        inMaintenanceBuses: allBuses.filter(b => b.status === 'maintenance').length,
        totalRoutes: this.routes.size,
        activeTrips: activeTrips.length,
        todayTrips: todayTrips.length,
        completedToday: todayTrips.filter(t => t.status === 'completed').length,
        totalStudents: allStudents.length,
        studentsOnBoard: activeTrips.reduce((sum, t) => sum + t.studentsOnBoard, 0),
        totalBoardingToday: this.boardingEvents.filter(
          e => new Date(e.timestamp).toDateString() === new Date().toDateString(),
        ).length,
        activeAlerts: this.safetyAlerts.filter(a => !a.acknowledged).length,
        criticalAlerts: this.safetyAlerts.filter(a => a.severity === 'critical' && !a.acknowledged)
          .length,
      },
      activeTrips: activeTrips.map(t => {
        const bus = this.buses.get(t.busId);
        const location = this.locations.get(t.busId);
        return {
          tripId: t.id,
          busId: t.busId,
          busPlate: bus ? bus.plateNumber : '-',
          driverName: t.driverName,
          type: t.type,
          currentStop: t.currentStop,
          studentsOnBoard: t.studentsOnBoard,
          startedAt: t.startedAt,
          eta: t.estimatedArrival,
          location: location ? { lat: location.lat, lng: location.lng } : null,
        };
      }),
      recentAlerts: this.safetyAlerts
        .filter(a => !a.acknowledged)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ETA CALCULATION — حساب وقت الوصول المتوقع
  // ═══════════════════════════════════════════════════════════════════════════

  getETAForStudent(studentId) {
    const student = this.getStudentById(studentId);
    const activeTrip = Array.from(this.trips.values()).find(
      t => t.busId === student.busId && t.status === 'in-progress',
    );

    if (!activeTrip) {
      return { hasActiveTrip: false, message: 'لا توجد رحلة نشطة' };
    }

    const route = this.routes.get(activeTrip.routeId);
    if (!route) return { hasActiveTrip: true, eta: null };

    const studentStopIdx = route.stops.findIndex(s => s.name === student.stopName);
    const currentIdx = activeTrip.currentStopIndex;

    if (studentStopIdx <= currentIdx) {
      return { hasActiveTrip: true, passed: true, message: 'الحافلة تجاوزت المحطة' };
    }

    const stopsAway = studentStopIdx - currentIdx;
    const etaMinutes = stopsAway * 5;

    return {
      hasActiveTrip: true,
      passed: false,
      stopsAway,
      etaMinutes,
      eta: new Date(Date.now() + etaMinutes * 60000),
      stopName: student.stopName,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SEED DATA — بيانات تجريبية
  // ═══════════════════════════════════════════════════════════════════════════

  _seed() {
    // 3 buses
    const bus1 = this.createBus({
      plateNumber: 'أ ب ج 1234',
      capacity: 40,
      model: 'تويوتا كوستر',
      year: 2024,
      color: 'أصفر',
      driverName: 'أحمد محمد السالم',
      driverPhone: '0501234567',
      assistantName: 'فاطمة العلي',
      assistantPhone: '0507654321',
      features: ['ac', 'camera', 'gps_tracker', 'first_aid'],
    });

    const bus2 = this.createBus({
      plateNumber: 'د ه و 5678',
      capacity: 30,
      model: 'هيونداي كاونتي',
      year: 2023,
      color: 'أبيض',
      driverName: 'خالد العتيبي',
      driverPhone: '0559876543',
      assistantName: 'نورة الشمري',
      assistantPhone: '0551112222',
      features: ['ac', 'camera', 'gps_tracker', 'wheelchair_accessible'],
    });

    const bus3 = this.createBus({
      plateNumber: 'ز ح ط 9012',
      capacity: 25,
      model: 'ميتسوبيشي روزا',
      year: 2025,
      color: 'أصفر',
      driverName: 'سعد الدوسري',
      driverPhone: '0533334444',
      features: ['ac', 'gps_tracker'],
      status: 'maintenance',
    });

    // 3 routes
    const route1 = this.createRoute({
      name: 'المسار الشمالي — حي النزهة',
      type: 'both',
      stops: [
        { name: 'المركز الرئيسي', lat: 24.7136, lng: 46.6753 },
        { name: 'حي النزهة - محطة 1', lat: 24.72, lng: 46.68 },
        { name: 'حي النزهة - محطة 2', lat: 24.725, lng: 46.685 },
        { name: 'حي الملقا', lat: 24.73, lng: 46.69 },
        { name: 'حي الياسمين', lat: 24.74, lng: 46.695 },
      ],
      distance: 15,
      estimatedDuration: 25,
    });

    const route2 = this.createRoute({
      name: 'المسار الجنوبي — حي السويدي',
      type: 'both',
      stops: [
        { name: 'المركز الرئيسي', lat: 24.7136, lng: 46.6753 },
        { name: 'حي السويدي - محطة 1', lat: 24.7, lng: 46.67 },
        { name: 'حي العزيزية', lat: 24.69, lng: 46.665 },
        { name: 'حي الشفا', lat: 24.68, lng: 46.66 },
      ],
      distance: 12,
      estimatedDuration: 20,
    });

    const route3 = this.createRoute({
      name: 'المسار الشرقي — حي الروابي',
      type: 'morning',
      stops: [
        { name: 'المركز الرئيسي', lat: 24.7136, lng: 46.6753 },
        { name: 'حي الروابي', lat: 24.715, lng: 46.7 },
        { name: 'حي الربوة', lat: 24.718, lng: 46.71 },
      ],
      distance: 8,
      estimatedDuration: 15,
    });

    // Link buses to routes
    this.updateBus(bus1.id, { routeId: route1.id });
    this.updateBus(bus2.id, { routeId: route2.id });
    this.updateBus(bus3.id, { routeId: route3.id });

    // 8 students
    this.registerStudent({
      name: 'عبدالله أحمد',
      grade: 'الصف الثاني',
      busId: bus1.id,
      routeId: route1.id,
      stopName: 'حي النزهة - محطة 1',
      parentName: 'أحمد بن سعد',
      parentPhone: '0512345678',
    });

    this.registerStudent({
      name: 'سارة خالد',
      grade: 'الصف الرابع',
      busId: bus1.id,
      routeId: route1.id,
      stopName: 'حي الملقا',
      parentName: 'خالد المطيري',
      parentPhone: '0512345678', // same parent
    });

    this.registerStudent({
      name: 'محمد فهد',
      grade: 'الصف الأول',
      busId: bus1.id,
      routeId: route1.id,
      stopName: 'حي الياسمين',
      parentName: 'فهد العمري',
      parentPhone: '0598765432',
    });

    this.registerStudent({
      name: 'نورة سعد',
      grade: 'الصف الثالث',
      busId: bus2.id,
      routeId: route2.id,
      stopName: 'حي السويدي - محطة 1',
      parentName: 'سعد الشهراني',
      parentPhone: '0567891234',
    });

    this.registerStudent({
      name: 'يوسف علي',
      grade: 'الصف الخامس',
      busId: bus2.id,
      routeId: route2.id,
      stopName: 'حي العزيزية',
      parentName: 'علي الغامدي',
      parentPhone: '0534567890',
    });

    this.registerStudent({
      name: 'لمى فيصل',
      grade: 'الصف الثاني',
      busId: bus2.id,
      routeId: route2.id,
      stopName: 'حي الشفا',
      parentName: 'فيصل القحطاني',
      parentPhone: '0545678901',
    });

    this.registerStudent({
      name: 'عمر بدر',
      grade: 'الصف السادس',
      busId: bus3.id,
      routeId: route3.id,
      stopName: 'حي الروابي',
      parentName: 'بدر الحربي',
      parentPhone: '0556789012',
    });

    this.registerStudent({
      name: 'ريم ماجد',
      grade: 'الصف الرابع',
      busId: bus3.id,
      routeId: route3.id,
      stopName: 'حي الربوة',
      parentName: 'ماجد السبيعي',
      parentPhone: '0578901234',
    });

    // Seed some locations
    this.updateBusLocation(bus1.id, { lat: 24.72, lng: 46.68, speed: 45, heading: 90 });
    this.updateBusLocation(bus2.id, { lat: 24.7, lng: 46.67, speed: 30, heading: 180 });

    logger.info('BusTrackingService seeded: 3 buses, 3 routes, 8 students');
  }
}

module.exports = new BusTrackingService();
