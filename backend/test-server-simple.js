#!/usr/bin/env node

/**
 * Simple Test Server for Phase 114 & 115
 * ======================================
 * Minimal Express server without all the complexity
 * for testing smart transport and CRM endpoints
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============ TRANSPORT SMART ============

const vehicleState = {
  v1: { id: 'v1', plateNumber: 'ABC-123', status: 'AVAILABLE', type: 'VAN' },
  v2: { id: 'v2', plateNumber: 'XYZ-789', status: 'IN_USE', type: 'BUS' },
  v3: { id: 'v3', plateNumber: 'DEF-456', status: 'AVAILABLE', type: 'VAN' },
};

const tripState = {};

// Get Fleet
app.get('/api/transport-smart/vehicles', (req, res) => {
  try {
    res.json({ success: true, data: Object.values(vehicleState) });
  } catch (error) {
    console.error('Error in /vehicles:', error);
    res.status(500).json({ message: error.message });
  }
});

// Request Trip
app.post('/api/transport-smart/trips/request', (req, res) => {
  try {
    const { patientId, pickup, dropoff, priority } = req.body;
    const tripId = 'TRIP-' + Date.now();
    const vehicleId = 'v1';

    vehicleState[vehicleId].status = 'BUSY';

    tripState[tripId] = {
      id: tripId,
      status: 'DISPATCHED',
      patientId,
      pickup,
      dropoff,
      priority,
      vehicleId,
    };

    res.status(201).json({ success: true, data: tripState[tripId] });
  } catch (error) {
    console.error('Error in /trips/request:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update Trip Status
app.post('/api/transport-smart/trips/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    const trip = tripState[req.params.id];

    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    trip.status = status;

    if (status === 'COMPLETED') {
      vehicleState[trip.vehicleId].status = 'AVAILABLE';
    }

    res.json({ success: true, data: trip });
  } catch (error) {
    console.error('Error in /trips/:id/status:', error);
    res.status(500).json({ message: error.message });
  }
});

// ============ CRM SMART ============

// Get Patients
app.get('/api/crm-smart/patients', (req, res) => {
  try {
    const patients = [
      { id: 'p1', name: 'Patient 1', segment: 'VIP', engagementScore: 100 },
      { id: 'p2', name: 'Patient 2', segment: 'REGULAR', engagementScore: 50 },
      { id: 'p3', name: 'Patient 3', segment: 'VIP', engagementScore: 120 },
    ];
    res.json({ success: true, data: patients });
  } catch (error) {
    console.error('Error in /patients:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get Campaigns
app.get('/api/crm-smart/campaigns', (req, res) => {
  try {
    const campaigns = [
      { id: 'c1', name: 'VIP Campaign', targetSegment: 'VIP' },
      { id: 'c2', name: 'Regular Campaign', targetSegment: 'REGULAR' },
    ];
    res.json({ success: true, data: campaigns });
  } catch (error) {
    console.error('Error in /campaigns:', error);
    res.status(500).json({ message: error.message });
  }
});

// Run Campaign
app.post('/api/crm-smart/campaigns/:id/run', (req, res) => {
  try {
    res.json({ success: true, data: { targets: 10 } });
  } catch (error) {
    console.error('Error in /campaigns/:id/run:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update Engagement
app.post('/api/crm-smart/engagement', (req, res) => {
  try {
    const { patientId, points } = req.body;
    res.json({
      success: true,
      data: {
        id: patientId,
        engagementScore: 150,
      },
    });
  } catch (error) {
    console.error('Error in /engagement:', error);
    res.status(500).json({ message: error.message });
  }
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   SMART TEST SERVER RUNNING            ║
║   Phases 114 & 115                     ║
╠════════════════════════════════════════╣
║ Transport Smart:  /api/transport-smart║
║ CRM Smart:        /api/crm-smart      ║
║ Health Check:     /api/health         ║
║                                        ║
║ Server: http://localhost:${PORT}        ║
╚════════════════════════════════════════╝
  `);
});

// Graceful shutdown - but don't exit for test compatibility
process.on('SIGTERM', () => {
  console.log('SIGTERM received');
});

process.on('SIGINT', () => {
  console.log('SIGINT received');
});

// Error handling
process.on('uncaughtException', error => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
