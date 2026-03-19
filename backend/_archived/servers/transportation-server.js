/* eslint-disable no-unused-vars */
/**
 * ===================================================================
 * STUDENT TRANSPORTATION SYSTEM - HTTP Server v1.0
 * نظام نقل الطلاب - خادم HTTP
 * ===================================================================
 * Production-ready native Node.js HTTP server
 * Zero dependencies - Pure Node.js implementation
 * ===================================================================
 */

const http = require('http');
const url = require('url');
const _querystring = require('querystring');

// ===================================================================
// In-Memory Data Storage
// ===================================================================
const database = {
  students: [],
  routes: [],
  drivers: [],
  vehicles: [],
  attendance: [],
  payments: [],
  incidents: [],
  notifications: [],
};

const idCounter = {
  student: 1,
  route: 1,
  driver: 1,
  vehicle: 1,
  attendance: 1,
  payment: 1,
  incident: 1,
  notification: 1,
};

// ===================================================================
// Utility Functions
// ===================================================================

// Parse JSON body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}

// Send JSON response
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data, null, 2));
}

// Handle CORS preflight
function handleCORS(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return true;
  }
  return false;
}

// Extract path and method
function _getRouteInfo(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  return parts;
}

// ===================================================================
// Route Handlers
// ===================================================================

const routeHandlers = {
  // System Health
  '/transport/health': {
    GET: (req, res) => {
      sendJSON(res, 200, {
        success: true,
        message: '🚌 Transportation System Health Check',
        data: {
          status: 'healthy',
          service: 'Student Transportation System v1.0',
          uptime: process.uptime(),
          timestamp: new Date(),
          port: 3003,
        },
      });
    },
  },

  // System Statistics
  '/transport/stats': {
    GET: (req, res) => {
      sendJSON(res, 200, {
        success: true,
        message: 'System Statistics',
        data: {
          totalStudents: database.students.length,
          totalRoutes: database.routes.length,
          totalDrivers: database.drivers.length,
          totalVehicles: database.vehicles.length,
          totalPayments: database.payments.length,
          totalIncidents: database.incidents.length,
          totalAttendance: database.attendance.length,
        },
      });
    },
  },

  // System Dashboard
  '/transport/dashboard': {
    GET: (req, res) => {
      const activeRoutes = database.routes.filter(r => r.status === 'active').length;
      const activeDrivers = database.drivers.filter(d => d.status === 'active').length;
      const pendingPayments = database.payments.filter(p => p.status === 'pending').length;

      sendJSON(res, 200, {
        success: true,
        message: 'Dashboard Data',
        data: {
          overview: {
            totalStudents: database.students.length,
            totalRoutes: database.routes.length,
            activeRoutes,
            activeDrivers,
          },
          payments: {
            totalPayments: database.payments.length,
            pendingPayments,
            completedPayments: database.payments.filter(p => p.status === 'completed').length,
          },
          incidents: {
            openIncidents: database.incidents.filter(i => i.status === 'open').length,
            resolvedIncidents: database.incidents.filter(i => i.status === 'closed').length,
          },
        },
      });
    },
  },

  // ===================================================================
  // STUDENTS
  // ===================================================================

  '/transport/students': {
    GET: (req, res) => {
      sendJSON(res, 200, {
        success: true,
        message: 'All Students',
        data: database.students,
        count: database.students.length,
      });
    },

    POST: (req, res, body) => {
      const student = {
        id: `STU-${idCounter.student++}`,
        ...body,
        status: 'active',
        paymentStatus: 'pending',
        createdAt: new Date(),
      };
      database.students.push(student);
      sendJSON(res, 201, {
        success: true,
        message: 'Student created successfully',
        data: student,
      });
    },
  },

  '/transport/students/stats': {
    GET: (req, res) => {
      const activeStudents = database.students.filter(s => s.status === 'active').length;
      const pendingPayments = database.students.filter(s => s.paymentStatus === 'pending').length;

      sendJSON(res, 200, {
        success: true,
        message: 'Student Statistics',
        data: {
          totalStudents: database.students.length,
          activeStudents,
          inactiveStudents: database.students.length - activeStudents,
          paymentPending: pendingPayments,
          paymentPaid: database.students.length - pendingPayments,
        },
      });
    },
  },

  // ===================================================================
  // ROUTES
  // ===================================================================

  '/transport/routes': {
    GET: (req, res) => {
      sendJSON(res, 200, {
        success: true,
        message: 'All Bus Routes',
        data: database.routes,
        count: database.routes.length,
      });
    },

    POST: (req, res, body) => {
      const route = {
        id: `RT-${idCounter.route++}`,
        ...body,
        status: 'active',
        totalStudents: 0,
        currentLoad: 0,
        createdAt: new Date(),
      };
      database.routes.push(route);
      sendJSON(res, 201, {
        success: true,
        message: 'Route created successfully',
        data: route,
      });
    },
  },

  '/transport/routes/stats': {
    GET: (req, res) => {
      const activeRoutes = database.routes.filter(r => r.status === 'active').length;
      const totalStudentsOnRoutes = database.routes.reduce(
        (sum, r) => sum + (r.totalStudents || 0),
        0
      );

      sendJSON(res, 200, {
        success: true,
        message: 'Route Statistics',
        data: {
          totalRoutes: database.routes.length,
          activeRoutes,
          totalStudents: totalStudentsOnRoutes,
          averageLoad:
            database.routes.length > 0
              ? (totalStudentsOnRoutes / database.routes.length).toFixed(2)
              : 0,
        },
      });
    },
  },

  // ===================================================================
  // DRIVERS
  // ===================================================================

  '/transport/drivers': {
    GET: (req, res) => {
      sendJSON(res, 200, {
        success: true,
        message: 'All Drivers',
        data: database.drivers,
        count: database.drivers.length,
      });
    },

    POST: (req, res, body) => {
      const driver = {
        id: `DRV-${idCounter.driver++}`,
        ...body,
        status: 'active',
        rating: 5,
        safetyScore: 100,
        totalTrips: 0,
        incidents: 0,
        createdAt: new Date(),
      };
      database.drivers.push(driver);
      sendJSON(res, 201, {
        success: true,
        message: 'Driver created successfully',
        data: driver,
      });
    },
  },

  '/transport/drivers/stats': {
    GET: (req, res) => {
      const activeDrivers = database.drivers.filter(d => d.status === 'active').length;
      const avgRating =
        database.drivers.length > 0
          ? (
              database.drivers.reduce((sum, d) => sum + d.rating, 0) / database.drivers.length
            ).toFixed(2)
          : 5;

      sendJSON(res, 200, {
        success: true,
        message: 'Driver Statistics',
        data: {
          totalDrivers: database.drivers.length,
          activeDrivers,
          averageRating: parseFloat(avgRating),
          averageSafetyScore: 100,
        },
      });
    },
  },

  // ===================================================================
  // VEHICLES
  // ===================================================================

  '/transport/vehicles': {
    GET: (req, res) => {
      sendJSON(res, 200, {
        success: true,
        message: 'All Vehicles',
        data: database.vehicles,
        count: database.vehicles.length,
      });
    },

    POST: (req, res, body) => {
      const vehicle = {
        id: `VEH-${idCounter.vehicle++}`,
        ...body,
        status: 'operational',
        currentPassengers: 0,
        createdAt: new Date(),
      };
      database.vehicles.push(vehicle);
      sendJSON(res, 201, {
        success: true,
        message: 'Vehicle created successfully',
        data: vehicle,
      });
    },
  },

  '/transport/vehicles/stats': {
    GET: (req, res) => {
      const operationalVehicles = database.vehicles.filter(v => v.status === 'operational').length;
      const totalCapacity = database.vehicles.reduce((sum, v) => sum + (v.seatingCapacity || 0), 0);

      sendJSON(res, 200, {
        success: true,
        message: 'Vehicle Statistics',
        data: {
          totalVehicles: database.vehicles.length,
          operationalVehicles,
          maintenanceVehicles: database.vehicles.length - operationalVehicles,
          totalCapacity,
        },
      });
    },
  },

  // ===================================================================
  // ATTENDANCE
  // ===================================================================

  '/transport/attendance': {
    GET: (req, res) => {
      sendJSON(res, 200, {
        success: true,
        message: 'All Attendance Records',
        data: database.attendance,
        count: database.attendance.length,
      });
    },

    POST: (req, res, body) => {
      const record = {
        id: `ATT-${idCounter.attendance++}`,
        ...body,
        createdAt: new Date(),
      };
      database.attendance.push(record);
      sendJSON(res, 201, {
        success: true,
        message: 'Attendance recorded',
        data: record,
      });
    },
  },

  '/transport/attendance/stats': {
    GET: (req, res) => {
      const present = database.attendance.filter(a => a.status === 'present').length;
      const absent = database.attendance.filter(a => a.status === 'absent').length;
      const late = database.attendance.filter(a => a.status === 'late').length;
      const total = database.attendance.length;

      sendJSON(res, 200, {
        success: true,
        message: 'Attendance Statistics',
        data: {
          totalRecords: total,
          present,
          absent,
          late,
          attendanceRate: total > 0 ? ((present / total) * 100).toFixed(2) : 0,
        },
      });
    },
  },

  // ===================================================================
  // PAYMENTS
  // ===================================================================

  '/transport/payments': {
    GET: (req, res) => {
      sendJSON(res, 200, {
        success: true,
        message: 'All Payments',
        data: database.payments,
        count: database.payments.length,
      });
    },

    POST: (req, res, body) => {
      const payment = {
        id: `PAY-${idCounter.payment++}`,
        paymentNumber: `PAY-${Date.now()}`,
        ...body,
        status: 'pending',
        createdAt: new Date(),
      };
      database.payments.push(payment);
      sendJSON(res, 201, {
        success: true,
        message: 'Payment created',
        data: payment,
      });
    },
  },

  '/transport/payments/stats': {
    GET: (req, res) => {
      const completed = database.payments.filter(p => p.status === 'completed').length;
      const pending = database.payments.filter(p => p.status === 'pending').length;
      const totalAmount = database.payments.reduce((sum, p) => sum + (p.amount || 0), 0);

      sendJSON(res, 200, {
        success: true,
        message: 'Payment Statistics',
        data: {
          totalPayments: database.payments.length,
          completedPayments: completed,
          pendingPayments: pending,
          totalAmount,
        },
      });
    },
  },

  // ===================================================================
  // INCIDENTS
  // ===================================================================

  '/transport/incidents': {
    GET: (req, res) => {
      sendJSON(res, 200, {
        success: true,
        message: 'All Incidents',
        data: database.incidents,
        count: database.incidents.length,
      });
    },

    POST: (req, res, body) => {
      const incident = {
        id: `INC-${idCounter.incident++}`,
        incidentNumber: `INC-${Date.now()}`,
        ...body,
        status: 'open',
        createdAt: new Date(),
      };
      database.incidents.push(incident);
      sendJSON(res, 201, {
        success: true,
        message: 'Incident reported',
        data: incident,
      });
    },
  },

  '/transport/incidents/stats': {
    GET: (req, res) => {
      const open = database.incidents.filter(i => i.status === 'open').length;
      const resolved = database.incidents.filter(i => i.status === 'resolved').length;

      sendJSON(res, 200, {
        success: true,
        message: 'Incident Statistics',
        data: {
          totalIncidents: database.incidents.length,
          openIncidents: open,
          resolvedIncidents: resolved,
        },
      });
    },
  },

  // ===================================================================
  // NOTIFICATIONS
  // ===================================================================

  '/transport/notifications': {
    GET: (req, res) => {
      sendJSON(res, 200, {
        success: true,
        message: 'All Notifications',
        data: database.notifications,
        count: database.notifications.length,
      });
    },

    POST: (req, res, body) => {
      const notification = {
        id: `NOT-${idCounter.notification++}`,
        ...body,
        status: 'unread',
        createdAt: new Date(),
      };
      database.notifications.push(notification);
      sendJSON(res, 201, {
        success: true,
        message: 'Notification sent',
        data: notification,
      });
    },
  },
};

// ===================================================================
// Create HTTP Server
// ===================================================================

const PORT = 3004;

const server = http.createServer(async (req, res) => {
  // Handle CORS
  if (handleCORS(req, res)) return;

  // Parse URL
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Parse body for POST/PUT requests
  let body = {};
  if (method === 'POST' || method === 'PUT') {
    try {
      body = await parseBody(req);
    } catch (e) {
      sendJSON(res, 400, {
        success: false,
        message: 'Invalid JSON body',
        error: e.message,
      });
      return;
    }
  }

  // Find matching route handler
  const handler = routeHandlers[pathname];

  if (handler && handler[method]) {
    try {
      handler[method](req, res, body);
    } catch (error) {
      sendJSON(res, 500, {
        success: false,
        message: 'Server error',
        error: error.message,
      });
    }
  } else {
    sendJSON(res, 404, {
      success: false,
      message: '404 - Route not found',
      availableRoutes: Object.keys(routeHandlers),
    });
  }
});

// Start Server
server.listen(PORT, () => {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║ 🚌 STUDENT TRANSPORTATION SYSTEM v1.0              ║');
  console.log('║ HTTP Server (Native Node.js)                         ║');
  console.log('╠═══════════════════════════════════════════════════════╣');
  console.log(`║ ✅ Server running on: http://127.0.0.1:${PORT}              ║`);
  console.log('║ 📡 All features active and ready                     ║');
  console.log('║ 🔌 CORS enabled for all origins                     ║');
  console.log('║ 💾 In-memory data storage                           ║');
  console.log('╠═══════════════════════════════════════════════════════╣');
  console.log('║ Available Endpoints:                                  ║');
  console.log('║ • GET  /transport/health         - System health      ║');
  console.log('║ • GET  /transport/dashboard      - Dashboard data     ║');
  console.log('║ • GET  /transport/stats          - System statistics  ║');
  console.log('║ • GET  /transport/students       - All students       ║');
  console.log('║ • POST /transport/students       - Create student     ║');
  console.log('║ • GET  /transport/routes         - All routes         ║');
  console.log('║ • POST /transport/routes         - Create route       ║');
  console.log('║ • GET  /transport/drivers        - All drivers        ║');
  console.log('║ • POST /transport/drivers        - Create driver      ║');
  console.log('║ • GET  /transport/vehicles       - All vehicles       ║');
  console.log('║ • POST /transport/vehicles       - Create vehicle     ║');
  console.log('║ • GET  /transport/attendance     - Attendance records ║');
  console.log('║ • POST /transport/attendance     - Record attendance  ║');
  console.log('║ • GET  /transport/payments       - All payments       ║');
  console.log('║ • POST /transport/payments       - Create payment     ║');
  console.log('║ • GET  /transport/incidents      - All incidents      ║');
  console.log('║ • POST /transport/incidents      - Report incident    ║');
  console.log('║ • GET  /transport/notifications  - All notifications  ║');
  console.log('║ • POST /transport/notifications  - Send notification  ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log('\n📚 Use Postman or cURL to test the API');
  console.log('📖 Documentation available in project files\n');
});

// Handle errors
server.on('error', error => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
  } else {
    console.error('Server error:', error);
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down server gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

console.log('🚀 Starting Transportation System Server...');
