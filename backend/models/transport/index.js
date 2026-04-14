'use strict';
// 10 models split from transport.models.js
const Bus = require('./Bus.model');
const Driver = require('./Driver.model');
const BusAssistant = require('./BusAssistant.model');
const Route = require('./BusRoute.model');
const StudentTransport = require('./StudentTransport.model');
const TransportAttendance = require('./TransportAttendance.model');
const TransportPayment = require('./TransportPayment.model');
const TransportComplaint = require('./TransportComplaint.model');
const TripReport = require('./TripReport.model');
const TransportNotification = require('./TransportNotification.model');
// 5 pre-existing models
const GpsTracking = require('./GpsTracking');
const TransportRoute = require('./TransportRoute');
const Trip = require('./Trip');
const Vehicle = require('./Vehicle');
const VehicleMaintenance = require('./VehicleMaintenance');

module.exports = {
  Bus,
  Driver,
  BusAssistant,
  Route,
  StudentTransport,
  TransportAttendance,
  TransportPayment,
  TransportComplaint,
  TripReport,
  TransportNotification,
  GpsTracking,
  TransportRoute,
  Trip,
  Vehicle,
  VehicleMaintenance,
};
