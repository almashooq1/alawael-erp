/**
 * Therapeutic Session Management System - Integration Sample
 * نظام إدارة الجلسات العلاجية - عينة التكامل
 * 
 * This file shows how to integrate the therapy session system into your main Express app
 */

// ============================================
// 1. BASIC ROUTE REGISTRATION
// ============================================

// In your main app.js or server.js:

// Import therapy routes
const therapySessionRoutes = require('./routes/therapy-sessions.routes');

// Register with Express app
function setupTherapyRoutes(app) {
  // Option 1: Register at /api/therapy-sessions
  app.use('/api/therapy-sessions', therapySessionRoutes);
  
  // Option 2: Or with custom prefix
  // app.use('/api/v1/therapy', therapySessionRoutes);
  
  console.log('✓ Therapy session routes initialized');
}

// ============================================
// 2. COMPLETE APP SETUP EXAMPLE
// ============================================

// Full integration example (copy into your app.js)
function setupCompleteApp() {
  const express = require('express');
  const mongoose = require('mongoose');
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Database connection
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rehabilitation', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  // Load all models (IMPORTANT - must be done before routes)
  require('./models/TherapySession');
  require('./models/TherapeuticPlan');
  require('./models/TherapistAvailability');
  require('./models/SessionDocumentation');
  require('./models/Employee');
  require('./models/BeneficiaryFile');
  require('./models/Goal');

  // Register all routes
  const therapySessionRoutes = require('./routes/therapy-sessions.routes');
  
  // Therapy session routes
  app.use('/api/therapy-sessions', therapySessionRoutes);
  
  // Start server
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`✓ Server running on port ${PORT}`);
    console.log(`✓ Therapy sessions API available at /api/therapy-sessions`);
  });

  return app;
}

// ============================================
// 3. AUTHENTICATION MIDDLEWARE SETUP
// ============================================

const authMiddleware = require('./middleware/auth');

function setupAuthenticatedTherapyRoutes(app) {
  const therapySessionRoutes = require('./routes/therapy-sessions.routes');
  
  // Apply authentication to all therapy routes
  app.use('/api/therapy-sessions', [
    authMiddleware.authenticateUser,  // Verify token
    authMiddleware.validateTherapyAccess  // Verify therapy access
  ], therapySessionRoutes);
}

// ============================================
// 4. SERVICE INITIALIZATION
// ============================================

const therapeuticSessionService = require('./services/therapeutic-session.service');

// Initialize service with configurations
function initializeTherapyService() {
  const serviceConfig = {
    minBreakBetweenSessions: parseInt(process.env.MIN_SESSION_BREAK || '15'), // minutes
    maxSessionsPerDay: parseInt(process.env.MAX_SESSIONS_PER_DAY || '8'),
    documentationDeadlineHours: parseInt(process.env.DOCUMENTATION_DEADLINE || '24'),
    sessionReminderDays: parseInt(process.env.SESSION_REMINDER_DAYS || '1')
  };

  return {
    config: serviceConfig,
    service: therapeuticSessionService
  };
}

// ============================================
// 5. EVENT LISTENERS & HOOKS
// ============================================

const EventEmitter = require('events');
const sessionEventEmitter = new EventEmitter();

// Listen for session events
function setupSessionEventListeners() {
  // When session is scheduled
  sessionEventEmitter.on('session:scheduled', async (session) => {
    console.log(`✓ Session scheduled: ${session._id}`);
    
    // Send notification (if service exists)
    try {
      // await notificationService.sendSessionScheduledNotification(session);
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  });

  // When session is completed
  sessionEventEmitter.on('session:completed', async (session) => {
    console.log(`✓ Session completed: ${session._id}`);
    
    // Trigger billing (if service exists)
    try {
      // await billingService.createSessionInvoice(session);
    } catch (error) {
      console.error('Failed to create invoice:', error);
    }
  });

  // When session documentation is submitted
  sessionEventEmitter.on('documentation:submitted', async (documentation) => {
    console.log(`✓ Documentation submitted: ${documentation._id}`);
    
    // Update goals progress (if service exists)
    try {
      // await updateGoalsProgress(documentation);
    } catch (error) {
      console.error('Failed to update goals:', error);
    }
  });
}

// ============================================
// 6. THERAPIST AVAILABILITY SETUP
// ============================================

const therapeuticSessionService = require('./services/therapeutic-session.service');

// Initialize or update therapist availability
async function setupTherapistAvailability(therapistId) {
  const availability = {
    therapist: therapistId,
    recurringSchedule: [
      // Monday
      {
        dayOfWeek: 'Monday',
        startTime: '09:00',
        endTime: '17:00',
        breaks: [
          { startTime: '12:00', endTime: '13:00' } // Lunch
        ],
        roomPreferences: ['Room A', 'Room B']
      },
      // Tuesday
      {
        dayOfWeek: 'Tuesday',
        startTime: '09:00',
        endTime: '17:00',
        breaks: [
          { startTime: '12:00', endTime: '13:00' }
        ],
        roomPreferences: ['Room A', 'Room B']
      },
      // ... Add other days
    ],
    exceptions: [],
    preferences: {
      maxSessionsPerDay: 8,
      minBreakBetweenSessions: 15,
      specializations: ['Physical Therapy', 'Occupational Therapy'],
      languages: ['English', 'Arabic']
    }
  };

  try {
    const result = await therapeuticSessionService.setTherapistAvailability(
      therapistId,
      availability
    );
    console.log(`✓ Availability set for therapist ${therapistId}`);
    return result;
  } catch (error) {
    console.error(`Failed to set availability: ${error.message}`);
    throw error;
  }
}

// ============================================
// 7. SAMPLE API USAGE (CALL EXAMPLES)
// ============================================

/**
 * Example: Schedule a therapy session
 */
async function exampleScheduleSession() {
  const axios = require('axios');
  const api = axios.create({
    baseURL: process.env.API_URL || 'http://localhost:3001/api',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  try {
    const response = await api.post('/therapy-sessions', {
      beneficiary: '507f1f77bcf86cd799439011', // Beneficiary ID
      therapist: '507f1f77bcf86cd799439012',   // Therapist ID
      plan: '507f1f77bcf86cd799439013',       // Therapeutic Plan ID
      date: '2026-02-20',
      startTime: '09:00',
      endTime: '10:00',
      room: 'Therapy Room 1',
      notes: 'Focus on range of motion exercises'
    });

    console.log('✓ Session scheduled:', response.data.data._id);
    return response.data.data;
  } catch (error) {
    console.error('✗ Failed to schedule session:', error.response?.data?.message);
  }
}

/**
 * Example: Check therapist availability
 */
async function exampleCheckAvailability() {
  const axios = require('axios');
  const api = axios.create({
    baseURL: process.env.API_URL || 'http://localhost:3001/api',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  try {
    const response = await api.get('/therapy-sessions/availability/therapist-id/check', {
      params: {
        date: '2026-02-20',
        startTime: '09:00',
        endTime: '10:00'
      }
    });

    if (response.data.data.available) {
      console.log('✓ Time slot is available');
    } else {
      console.log('✗ Time slot is not available:', response.data.data.reason);
    }
  } catch (error) {
    console.error('✗ Failed to check availability:', error.response?.data?.message);
  }
}

/**
 * Example: Document a session (SOAP notes)
 */
async function exampleDocumentSession(sessionId) {
  const axios = require('axios');
  const api = axios.create({
    baseURL: process.env.API_URL || 'http://localhost:3001/api',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  try {
    const response = await api.post(`/therapy-sessions/${sessionId}/documentation`, {
      soapNote: {
        subjective: {
          patientReports: 'Patient reported increased pain in left shoulder',
          mood: 'Anxious',
          cooperationLevel: 'Good'
        },
        objective: {
          observations: 'Reduced range of motion, muscle tension noted',
          accuracy: 75,
          repetitions: 12,
          assistanceLevel: 'Minimal',
          modifications: 'Modified exercises due to pain'
        },
        assessment: {
          progressSummary: 'Good progress, slight improvement in mobility',
          comparisonToBaseline: 'Better than initial assessment'
        },
        plan: {
          homeProgram: 'Continue stretching exercises 3x daily',
          frequency: '3 times per week',
          notes: 'Schedule follow-up in 1 week'
        }
      },
      attachments: []
    });

    console.log('✓ Session documented:', response.data.data._id);
    return response.data.data;
  } catch (error) {
    console.error('✗ Failed to document session:', error.response?.data?.message);
  }
}

/**
 * Example: Get therapist sessions
 */
async function exampleGetTherapistSessions(therapistId) {
  const axios = require('axios');
  const api = axios.create({
    baseURL: process.env.API_URL || 'http://localhost:3001/api',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  try {
    const response = await api.get(`/therapy-sessions/therapist/${therapistId}`, {
      params: {
        startDate: '2026-02-01',
        endDate: '2026-02-28',
        status: 'SCHEDULED'
      }
    });

    console.log(`✓ Found ${response.data.data.length} sessions`);
    response.data.data.forEach(session => {
      console.log(`  - ${session.date} ${session.startTime}: ${session.beneficiary.name}`);
    });
    return response.data.data;
  } catch (error) {
    console.error('✗ Failed to get sessions:', error.response?.data?.message);
  }
}

/**
 * Example: Get session statistics
 */
async function exampleGetStatistics(therapistId) {
  const axios = require('axios');
  const api = axios.create({
    baseURL: process.env.API_URL || 'http://localhost:3001/api',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  try {
    const response = await api.get(`/therapy-sessions/stats/therapist/${therapistId}`, {
      params: {
        startDate: '2026-01-01',
        endDate: '2026-02-28'
      }
    });

    const stats = response.data.data;
    console.log('✓ Session Statistics:');
    console.log(`  - Total Sessions: ${stats.totalSessions}`);
    console.log(`  - Completion Rate: ${stats.completionRate}%`);
    console.log(`  - Cancellation Rate: ${stats.cancellationRate}%`);
    console.log(`  - No-Show Rate: ${stats.noShowRate}%`);
    console.log(`  - Average Rating: ${stats.avgRating}`);
  } catch (error) {
    console.error('✗ Failed to get statistics:', error.response?.data?.message);
  }
}

// ============================================
// 8. DATABASE SETUP & MIGRATION
// ============================================

/**
 * Initialize therapy-related database collections and indexes
 */
async function initializeTherapyDatabase() {
  const mongoose = require('mongoose');
  const db = mongoose.connection;

  try {
    // Create indexes for performance
    const TherapySession = mongoose.model('TherapySession');
    const TherapistAvailability = mongoose.model('TherapistAvailability');
    const SessionDocumentation = mongoose.model('SessionDocumentation');

    // Therapy Session indexes
    await TherapySession.collection.createIndex({ therapist: 1, date: 1, startTime: 1 });
    await TherapySession.collection.createIndex({ beneficiary: 1, date: -1 });
    await TherapySession.collection.createIndex({ status: 1 });
    await TherapySession.collection.createIndex({ createdAt: -1 });

    // Therapist Availability indexes
    await TherapistAvailability.collection.createIndex({ therapist: 1 });
    await TherapistAvailability.collection.createIndex({ "preferences.specializations": 1 });

    // Session Documentation indexes
    await SessionDocumentation.collection.createIndex({ session: 1 });
    await SessionDocumentation.collection.createIndex({ beneficiary: 1, createdAt: -1 });
    await SessionDocumentation.collection.createIndex({ "quality.isComplete": 1 });
    await SessionDocumentation.collection.createIndex({ "quality.reviewedAt": 1 });

    console.log('✓ Database indexes created successfully');
  } catch (error) {
    console.error('✗ Failed to create indexes:', error.message);
  }
}

// ============================================
// 9. CLEANUP & MAINTENANCE
// ============================================

/**
 * Archive old completed sessions (older than 6 months)
 */
async function archiveOldSessions(olderThanMonths = 6) {
  const TherapySession = require('./models/TherapySession');
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - olderThanMonths);

  try {
    const result = await TherapySession.updateMany(
      {
        status: { $in: ['COMPLETED', 'CANCELLED'] },
        completedAt: { $lt: cutoffDate }
      },
      {
        $set: { archived: true }
      }
    );

    console.log(`✓ Archived ${result.modifiedCount} old sessions`);
  } catch (error) {
    console.error('✗ Failed to archive sessions:', error.message);
  }
}

/**
 * Send reminders for pending documentation
 */
async function sendDocumentationReminders() {
  const TherapySession = require('./models/TherapySession');
  const SessionDocumentation = require('./models/SessionDocumentation');
  const notificationService = require('./services/notification.service');

  try {
    // Find completed sessions without documentation
    const incompleteSessions = await TherapySession.find({
      status: 'COMPLETED',
      completedAt: {
        $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      }
    }).populate('therapist');

    for (const session of incompleteSessions) {
      const doc = await SessionDocumentation.findOne({ session: session._id });
      if (!doc || !doc.quality.isComplete) {
        // Send reminder to therapist
        await notificationService.sendReminder({
          type: 'DOCUMENTATION_DUE',
          recipient: session.therapist,
          sessionId: session._id
        });
      }
    }

    console.log(`✓ Sent ${incompleteSessions.length} documentation reminders`);
  } catch (error) {
    console.error('✗ Failed to send reminders:', error.message);
  }
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

module.exports = {
  setupTherapyRoutes,
  setupCompleteApp,
  setupAuthenticatedTherapyRoutes,
  initializeTherapyService,
  setupSessionEventListeners,
  setupTherapistAvailability,
  initializeTherapyDatabase,
  archiveOldSessions,
  sendDocumentationReminders,
  // API Examples
  exampleScheduleSession,
  exampleCheckAvailability,
  exampleDocumentSession,
  exampleGetTherapistSessions,
  exampleGetStatistics
};

/**
 * QUICK START CHECKLIST:
 * 
 * 1. ✓ Copy this file to your project
 * 2. [ ] Import setupTherapyRoutes in your app.js
 * 3. [ ] Call setupTherapyRoutes(app) after loading other routes
 * 4. [ ] Call initializeTherapyDatabase() after MongoDB connection
 * 5. [ ] Set up environment variables in .env
 * 6. [ ] Configure therapist availability using setupTherapistAvailability()
 * 7. [ ] Test API endpoints with exampleScheduleSession(), etc.
 * 8. [ ] Set up cron jobs for archiveOldSessions() and sendDocumentationReminders()
 * 9. [ ] Integrate with UI components (TherapySessionDashboard, etc.)
 * 10. [ ] Run tests to verify all functionality
 * 
 */
