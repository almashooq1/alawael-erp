/**
 * Example: Integrating WebSocket in Vehicle Controller
 * Shows how to emit real-time updates when vehicles are updated
 */

const websocketService = require('../services/websocket.service');
const Vehicle = require('../models/vehicle.model');
const Trip = require('../models/trip.model');

// Example 1: Update GPS Location
exports.updateGPSLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, speed, heading } = req.body;

    // Update vehicle in database
    const vehicle = await Vehicle.findByIdAndUpdate(
      id,
      {
        currentLocation: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        currentSpeed: speed,
        heading: heading,
        lastLocationUpdate: new Date(),
      },
      { new: true }
    );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found',
      });
    }

    // 🔥 Emit real-time GPS update via WebSocket
    websocketService.emitGPSUpdate(id, {
      latitude,
      longitude,
      speed,
      heading,
      timestamp: new Date(),
    });

    res.json({
      success: true,
      message: 'GPS location updated',
      data: vehicle,
    });
  } catch (error) {
    console.error('Error updating GPS:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update GPS location',
    });
  }
};

// Example 2: Update Vehicle Status
exports.updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const vehicle = await Vehicle.findByIdAndUpdate(id, updates, { new: true });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found',
      });
    }

    // 🔥 Emit vehicle update via WebSocket
    websocketService.emitVehicleUpdate(id, vehicle);

    // Check for low fuel
    if (vehicle.fuelLevel && vehicle.fuelLevel < 20) {
      websocketService.emitLowFuelWarning(id, vehicle.fuelLevel);
    }

    res.json({
      success: true,
      message: 'Vehicle updated successfully',
      data: vehicle,
    });
  } catch (error) {
    console.error('Error updating vehicle:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update vehicle',
    });
  }
};

// Example 3: Emergency Alert
exports.triggerEmergencyAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, location } = req.body;

    const vehicle = await Vehicle.findById(id);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found',
      });
    }

    // 🔥 Emit emergency alert via WebSocket
    websocketService.emitEmergencyAlert(id, {
      vehicleId: id,
      plateNumber: vehicle.plateNumber,
      message,
      location,
      driver: vehicle.driver,
      timestamp: new Date(),
    });

    res.json({
      success: true,
      message: 'Emergency alert sent',
    });
  } catch (error) {
    console.error('Error sending emergency alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send emergency alert',
    });
  }
};

// Example 4: Trip Started
exports.startTrip = async (req, res) => {
  try {
    const { id } = req.params;

    const trip = await Trip.findById(id);

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found',
      });
    }

    if (trip.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        message: 'Trip cannot be started',
      });
    }

    trip.status = 'in-progress';
    trip.actualStartTime = new Date();
    await trip.save();

    // 🔥 Emit trip started via WebSocket
    websocketService.emitTripStarted(id, {
      tripId: id,
      vehicle: trip.vehicle,
      driver: trip.driver,
      route: trip.route,
      startTime: trip.actualStartTime,
    });

    res.json({
      success: true,
      message: 'Trip started successfully',
      data: trip,
    });
  } catch (error) {
    console.error('Error starting trip:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start trip',
    });
  }
};

// Example 5: Trip Completed
exports.completeTrip = async (req, res) => {
  try {
    const { id } = req.params;

    const trip = await Trip.findById(id);

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found',
      });
    }

    if (trip.status !== 'in-progress') {
      return res.status(400).json({
        success: false,
        message: 'Trip is not in progress',
      });
    }

    trip.status = 'completed';
    trip.actualEndTime = new Date();
    await trip.save();

    // 🔥 Emit trip completed via WebSocket
    websocketService.emitTripCompleted(id, {
      tripId: id,
      vehicle: trip.vehicle,
      driver: trip.driver,
      route: trip.route,
      endTime: trip.actualEndTime,
      duration: trip.actualEndTime - trip.actualStartTime,
    });

    res.json({
      success: true,
      message: 'Trip completed successfully',
      data: trip,
    });
  } catch (error) {
    console.error('Error completing trip:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete trip',
    });
  }
};
