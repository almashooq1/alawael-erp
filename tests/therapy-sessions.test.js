/**
 * Therapeutic Session Management System - Test Suite
 * نظام إدارة الجلسات العلاجية - مجموعة الاختبارات
 * 
 * Complete test examples for all therapy session endpoints
 */

const axios = require('axios');

// ============================================
// CONFIGURATION
// ============================================

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001/api';
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || 'your-auth-token';

// Create API client
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json'
  },
  validateStatus: () => true // Don't throw on any status
});

// Test data
const testData = {
  beneficiaryId: '507f1f77bcf86cd799439011',
  therapistId: '507f1f77bcf86cd799439012',
  planId: '507f1f77bcf86cd799439013',
  therapist2Id: '507f1f77bcf86cd799439014'
};

// ============================================
// TEST UTILITIES
// ============================================

class TestSuite {
  constructor(name) {
    this.name = name;
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  async run(testName, testFn) {
    try {
      console.log(`  → ${testName}`);
      await testFn();
      console.log(`    ✓ PASSED`);
      this.passed++;
    } catch (error) {
      console.log(`    ✗ FAILED: ${error.message}`);
      this.failed++;
    }
  }

  async expect(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  async expectEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  }

  async expectDefined(value, message) {
    if (value === undefined || value === null) {
      throw new Error(message || 'Value is not defined');
    }
  }

  async expectStatus(response, expectedStatus) {
    if (response.status !== expectedStatus) {
      throw new Error(
        `Expected status ${expectedStatus}, got ${response.status}. ` +
        `Message: ${response.data?.message || response.data?.error}`
      );
    }
  }

  printResults() {
    console.log(`\n${this.name} Results:`);
    console.log(`  ✓ Passed: ${this.passed}`);
    console.log(`  ✗ Failed: ${this.failed}`);
    console.log(`  Total: ${this.passed + this.failed}\n`);
  }
}

// ============================================
// TEST 1: SCHEDULE SESSION
// ============================================

async function testScheduleSession() {
  const suite = new TestSuite('Schedule Session Tests');

  await suite.run('Schedule a valid session', async () => {
    const response = await api.post('/therapy-sessions', {
      beneficiary: testData.beneficiaryId,
      therapist: testData.therapistId,
      plan: testData.planId,
      date: '2026-02-20',
      startTime: '09:00',
      endTime: '10:00',
      room: 'Therapy Room 1',
      notes: 'Initial assessment'
    });

    await suite.expectStatus(response, 201);
    await suite.expectDefined(response.data.data._id, 'Session ID should be created');
    await suite.expectEqual(response.data.data.status, 'SCHEDULED');
  });

  await suite.run('Reject session with missing beneficiary', async () => {
    const response = await api.post('/therapy-sessions', {
      therapist: testData.therapistId,
      plan: testData.planId,
      date: '2026-02-20',
      startTime: '09:00',
      endTime: '10:00'
    });

    await suite.expectStatus(response, 400);
  });

  await suite.run('Reject session with invalid time slot', async () => {
    const response = await api.post('/therapy-sessions', {
      beneficiary: testData.beneficiaryId,
      therapist: testData.therapistId,
      plan: testData.planId,
      date: '2026-02-20',
      startTime: '10:00',
      endTime: '09:00' // End before start
    });

    await suite.expectStatus(response, 400);
  });

  await suite.run('Reject overlapping sessions', async () => {
    // Schedule first session
    await api.post('/therapy-sessions', {
      beneficiary: testData.beneficiaryId,
      therapist: testData.therapistId,
      plan: testData.planId,
      date: '2026-02-21',
      startTime: '09:00',
      endTime: '10:00'
    });

    // Try to schedule overlapping session
    const response = await api.post('/therapy-sessions', {
      beneficiary: testData.beneficiaryId,
      therapist: testData.therapistId,
      plan: testData.planId,
      date: '2026-02-21',
      startTime: '09:30', // Overlaps with first session
      endTime: '10:30'
    });

    await suite.expectStatus(response, 409); // Conflict status
  });

  suite.printResults();
  return suite;
}

// ============================================
// TEST 2: CHECK AVAILABILITY
// ============================================

async function testCheckAvailability() {
  const suite = new TestSuite('Check Availability Tests');

  await suite.run('Check available time slot', async () => {
    const response = await api.get(
      `/therapy-sessions/availability/${testData.therapistId}/check`,
      {
        params: {
          date: '2026-02-20',
          startTime: '14:00',
          endTime: '15:00'
        }
      }
    );

    await suite.expectStatus(response, 200);
    // Note: Result depends on therapist availability configuration
    console.log(`      Result: ${response.data.data.available ? 'Available' : 'Not Available'}`);
  });

  await suite.run('Reject invalid time format', async () => {
    const response = await api.get(
      `/therapy-sessions/availability/${testData.therapistId}/check`,
      {
        params: {
          date: '2026-02-20',
          startTime: 'invalid',
          endTime: '15:00'
        }
      }
    );

    await suite.expectStatus(response, 400);
  });

  suite.printResults();
  return suite;
}

// ============================================
// TEST 3: GET SESSIONS
// ============================================

async function testGetSessions() {
  const suite = new TestSuite('Get Sessions Tests');

  // First schedule a session
  const scheduleResponse = await api.post('/therapy-sessions', {
    beneficiary: testData.beneficiaryId,
    therapist: testData.therapistId,
    plan: testData.planId,
    date: '2026-02-20',
    startTime: '11:00',
    endTime: '12:00'
  });

  const sessionId = scheduleResponse.data.data?._id;

  await suite.run('Get single session', async () => {
    if (!sessionId) throw new Error('No session ID available');
    
    const response = await api.get(`/therapy-sessions/${sessionId}`);
    await suite.expectStatus(response, 200);
    await suite.expectDefined(response.data.data.beneficiary);
    await suite.expectDefined(response.data.data.therapist);
  });

  await suite.run('Get therapist sessions', async () => {
    const response = await api.get(
      `/therapy-sessions/therapist/${testData.therapistId}`,
      {
        params: {
          startDate: '2026-02-01',
          endDate: '2026-02-28'
        }
      }
    );

    await suite.expectStatus(response, 200);
    await suite.expect(Array.isArray(response.data.data), 'Should return array of sessions');
  });

  await suite.run('Get beneficiary sessions', async () => {
    const response = await api.get(
      `/therapy-sessions/beneficiary/${testData.beneficiaryId}`,
      {
        params: {
          startDate: '2026-02-01',
          endDate: '2026-02-28'
        }
      }
    );

    await suite.expectStatus(response, 200);
    await suite.expect(Array.isArray(response.data.data), 'Should return array of sessions');
  });

  await suite.run('Get upcoming sessions', async () => {
    const response = await api.get(
      `/therapy-sessions/upcoming/${testData.beneficiaryId}`,
      {
        params: {
          daysAhead: 30
        }
      }
    );

    await suite.expectStatus(response, 200);
    console.log(`      Found ${response.data.data.length} upcoming sessions`);
  });

  suite.printResults();
  return suite;
}

// ============================================
// TEST 4: UPDATE SESSION STATUS
// ============================================

async function testUpdateSessionStatus() {
  const suite = new TestSuite('Update Session Status Tests');

  // Schedule a session first
  const scheduleResponse = await api.post('/therapy-sessions', {
    beneficiary: testData.beneficiaryId,
    therapist: testData.therapistId,
    plan: testData.planId,
    date: '2026-02-22',
    startTime: '15:00',
    endTime: '16:00'
  });

  const sessionId = scheduleResponse.data.data?._id;

  await suite.run('Update status to CONFIRMED', async () => {
    if (!sessionId) throw new Error('No session ID available');
    
    const response = await api.patch(
      `/therapy-sessions/${sessionId}/status`,
      {
        status: 'CONFIRMED',
        notes: 'Confirmed by patient'
      }
    );

    await suite.expectStatus(response, 200);
    await suite.expectEqual(response.data.data.status, 'CONFIRMED');
  });

  await suite.run('Update status to COMPLETED', async () => {
    if (!sessionId) throw new Error('No session ID available');
    
    const response = await api.patch(
      `/therapy-sessions/${sessionId}/status`,
      {
        status: 'COMPLETED'
      }
    );

    await suite.expectStatus(response, 200);
    await suite.expectEqual(response.data.data.status, 'COMPLETED');
  });

  await suite.run('Reject invalid status', async () => {
    if (!sessionId) throw new Error('No session ID available');
    
    const response = await api.patch(
      `/therapy-sessions/${sessionId}/status`,
      {
        status: 'INVALID_STATUS'
      }
    );

    await suite.expectStatus(response, 400);
  });

  suite.printResults();
  return suite;
}

// ============================================
// TEST 5: MARK ATTENDANCE
// ============================================

async function testMarkAttendance() {
  const suite = new TestSuite('Mark Attendance Tests');

  // Schedule a session first
  const scheduleResponse = await api.post('/therapy-sessions', {
    beneficiary: testData.beneficiaryId,
    therapist: testData.therapistId,
    plan: testData.planId,
    date: '2026-02-23',
    startTime: '10:00',
    endTime: '11:00'
  });

  const sessionId = scheduleResponse.data.data?._id;

  // First confirm the session
  if (sessionId) {
    await api.patch(
      `/therapy-sessions/${sessionId}/status`,
      { status: 'CONFIRMED' }
    );
  }

  await suite.run('Mark attendance - present', async () => {
    if (!sessionId) throw new Error('No session ID available');
    
    const response = await api.post(
      `/therapy-sessions/${sessionId}/attend`,
      {
        isPresent: true,
        arrivedOnTime: true,
        arrivalTime: new Date()
      }
    );

    await suite.expectStatus(response, 200);
  });

  await suite.run('Mark no-show with reason', async () => {
    if (!sessionId) throw new Error('No session ID available');
    
    // Schedule another session for no-show test
    const response2 = await api.post('/therapy-sessions', {
      beneficiary: testData.beneficiaryId,
      therapist: testData.therapistId,
      plan: testData.planId,
      date: '2026-02-24',
      startTime: '12:00',
      endTime: '13:00'
    });

    const sessionId2 = response2.data.data?._id;
    
    // Confirm it
    await api.patch(
      `/therapy-sessions/${sessionId2}/status`,
      { status: 'CONFIRMED' }
    );

    // Mark as no-show
    const response = await api.post(
      `/therapy-sessions/${sessionId2}/no-show`,
      {
        reason: 'Patient did not arrive',
        notes: 'No communication received'
      }
    );

    await suite.expectStatus(response, 200);
    await suite.expectEqual(response.data.data.status, 'NO_SHOW');
  });

  suite.printResults();
  return suite;
}

// ============================================
// TEST 6: SESSION DOCUMENTATION
// ============================================

async function testSessionDocumentation() {
  const suite = new TestSuite('Session Documentation Tests');

  // Schedule and complete a session
  const scheduleResponse = await api.post('/therapy-sessions', {
    beneficiary: testData.beneficiaryId,
    therapist: testData.therapistId,
    plan: testData.planId,
    date: '2026-02-25',
    startTime: '09:00',
    endTime: '10:00'
  });

  const sessionId = scheduleResponse.data.data?._id;

  // Move to COMPLETED status
  if (sessionId) {
    await api.patch(
      `/therapy-sessions/${sessionId}/status`,
      { status: 'COMPLETED' }
    );
  }

  await suite.run('Document completed session with SOAP notes', async () => {
    if (!sessionId) throw new Error('No session ID available');
    
    const response = await api.post(
      `/therapy-sessions/${sessionId}/documentation`,
      {
        soapNote: {
          subjective: {
            patientReports: 'Reported good improvement in flexibility',
            mood: 'Happy',
            cooperationLevel: 'Excellent'
          },
          objective: {
            observations: 'Full range of motion achieved in shoulder',
            accuracy: 95,
            repetitions: 15,
            assistanceLevel: 'None',
            modifications: 'No modifications needed'
          },
          assessment: {
            progressSummary: 'Excellent progress, exceeding expectations',
            comparisonToBaseline: 'Significant improvement from initial assessment'
          },
          plan: {
            homeProgram: 'Continue daily exercises, increase intensity',
            frequency: '2 times per week',
            notes: 'Ready for discharge in 2 weeks'
          }
        },
        attachments: []
      }
    );

    await suite.expectStatus(response, 201);
    await suite.expectDefined(response.data.data._id, 'Documentation ID should be created');
  });

  await suite.run('Retrieve session documentation', async () => {
    if (!sessionId) throw new Error('No session ID available');
    
    const response = await api.get(
      `/therapy-sessions/${sessionId}/documentation`
    );

    await suite.expectStatus(response, 200);
    await suite.expectDefined(response.data.data.soapNote.subjective);
    await suite.expectDefined(response.data.data.soapNote.objective);
  });

  await suite.run('Reject documentation for incomplete session', async () => {
    // Schedule a session that's not completed
    const response2 = await api.post('/therapy-sessions', {
      beneficiary: testData.beneficiaryId,
      therapist: testData.therapistId,
      plan: testData.planId,
      date: '2026-02-26',
      startTime: '14:00',
      endTime: '15:00'
    });

    const sessionId2 = response2.data.data?._id;

    // Try to document without completing
    const response = await api.post(
      `/therapy-sessions/${sessionId2}/documentation`,
      {
        soapNote: {
          subjective: { patientReports: 'Test' },
          objective: { observations: 'Test' },
          assessment: { progressSummary: 'Test' },
          plan: { homeProgram: 'Test' }
        }
      }
    );

    await suite.expectStatus(response, 400);
  });

  suite.printResults();
  return suite;
}

// ============================================
// TEST 7: RESCHEDULE SESSION
// ============================================

async function testRescheduleSession() {
  const suite = new TestSuite('Reschedule Session Tests');

  // Schedule a session
  const scheduleResponse = await api.post('/therapy-sessions', {
    beneficiary: testData.beneficiaryId,
    therapist: testData.therapistId,
    plan: testData.planId,
    date: '2026-02-27',
    startTime: '11:00',
    endTime: '12:00'
  });

  const sessionId = scheduleResponse.data.data?._id;

  await suite.run('Reschedule to different date/time', async () => {
    if (!sessionId) throw new Error('No session ID available');
    
    const response = await api.patch(
      `/therapy-sessions/${sessionId}/reschedule`,
      {
        newDate: '2026-02-28',
        newStartTime: '16:00',
        newEndTime: '17:00',
        reason: 'Patient requested change'
      }
    );

    await suite.expectStatus(response, 200);
    await suite.expectEqual(response.data.data.date, '2026-02-28');
  });

  await suite.run('Reject reschedule to conflicting time', async () => {
    if (!sessionId) throw new Error('No session ID available');
    
    // Schedule another session
    await api.post('/therapy-sessions', {
      beneficiary: testData.beneficiaryId,
      therapist: testData.therapistId,
      plan: testData.planId,
      date: '2026-03-01',
      startTime: '09:00',
      endTime: '10:00'
    });

    // Try to reschedule to same time
    const response = await api.patch(
      `/therapy-sessions/${sessionId}/reschedule`,
      {
        newDate: '2026-03-01',
        newStartTime: '09:00',
        newEndTime: '10:00'
      }
    );

    await suite.expectStatus(response, 409); // Conflict
  });

  suite.printResults();
  return suite;
}

// ============================================
// TEST 8: THERAPIST AVAILABILITY
// ============================================

async function testTherapistAvailability() {
  const suite = new TestSuite('Therapist Availability Tests');

  await suite.run('Set therapist availability', async () => {
    const response = await api.post(
      `/therapy-sessions/availability/${testData.therapistId}`,
      {
        recurringSchedule: [
          {
            dayOfWeek: 'Monday',
            startTime: '08:00',
            endTime: '17:00',
            breaks: [{ startTime: '12:00', endTime: '13:00' }],
            roomPreferences: ['Room A', 'Room B']
          },
          {
            dayOfWeek: 'Tuesday',
            startTime: '08:00',
            endTime: '17:00',
            breaks: [{ startTime: '12:00', endTime: '13:00' }],
            roomPreferences: ['Room A', 'Room B']
          }
        ],
        exceptions: [],
        preferences: {
          maxSessionsPerDay: 8,
          minBreakBetweenSessions: 15,
          specializations: ['Physical Therapy'],
          languages: ['English', 'Arabic']
        }
      }
    );

    await suite.expectStatus(response, 200);
  });

  await suite.run('Retrieve therapist availability', async () => {
    const response = await api.get(
      `/therapy-sessions/availability/${testData.therapistId}`
    );

    await suite.expectStatus(response, 200);
    await suite.expectDefined(response.data.data.recurringSchedule);
    console.log(`      Therapist has ${response.data.data.recurringSchedule.length} working days configured`);
  });

  suite.printResults();
  return suite;
}

// ============================================
// TEST 9: STATISTICS
// ============================================

async function testStatistics() {
  const suite = new TestSuite('Statistics Tests');

  await suite.run('Get therapist statistics', async () => {
    const response = await api.get(
      `/therapy-sessions/stats/therapist/${testData.therapistId}`,
      {
        params: {
          startDate: '2026-01-01',
          endDate: '2026-12-31'
        }
      }
    );

    await suite.expectStatus(response, 200);
    await suite.expectDefined(response.data.data.totalSessions);
    await suite.expectDefined(response.data.data.completionRate);
    
    console.log(`      Total Sessions: ${response.data.data.totalSessions}`);
    console.log(`      Completion Rate: ${response.data.data.completionRate}%`);
    console.log(`      Avg Rating: ${response.data.data.avgRating}`);
  });

  suite.printResults();
  return suite;
}

// ============================================
// TEST 10: BULK OPERATIONS
// ============================================

async function testBulkOperations() {
  const suite = new TestSuite('Bulk Operations Tests');

  // Schedule multiple sessions
  const sessionIds = [];
  for (let i = 0; i < 3; i++) {
    const response = await api.post('/therapy-sessions', {
      beneficiary: testData.beneficiaryId,
      therapist: testData.therapistId,
      plan: testData.planId,
      date: `2026-03-${10 + i}`,
      startTime: '09:00',
      endTime: '10:00'
    });
    if (response.data.data?._id) {
      sessionIds.push(response.data.data._id);
    }
  }

  await suite.run('Bulk reschedule sessions', async () => {
    if (sessionIds.length === 0) throw new Error('No session IDs available');
    
    const response = await api.post(
      '/therapy-sessions/bulk-reschedule',
      {
        sessionIds: sessionIds,
        newDate: '2026-04-01'
      }
    );

    await suite.expectStatus(response, 200);
    console.log(`      Rescheduled ${response.data.data.successful} sessions`);
  });

  suite.printResults();
  return suite;
}

// ============================================
// RUN ALL TESTS
// ============================================

async function runAllTests() {
  console.log('='.repeat(60));
  console.log('THERAPEUTIC SESSION MANAGEMENT - TEST SUITE');
  console.log('='.repeat(60));
  console.log(`API Base URL: ${API_BASE_URL}\n`);

  try {
    // Test connectivity
    console.log('Testing API connectivity...');
    const testResponse = await api.get('/therapy-sessions/therapist/test-id/check?date=2026-03-01&startTime=09:00&endTime=10:00');
    console.log('✓ API is reachable\n');
  } catch (error) {
    console.error('✗ Cannot reach API. Make sure the server is running.');
    process.exit(1);
  }

  // Run all test suites
  const results = [];
  results.push(await testScheduleSession());
  results.push(await testCheckAvailability());
  results.push(await testGetSessions());
  results.push(await testUpdateSessionStatus());
  results.push(await testMarkAttendance());
  results.push(await testSessionDocumentation());
  results.push(await testRescheduleSession());
  results.push(await testTherapistAvailability());
  results.push(await testStatistics());
  results.push(await testBulkOperations());

  // Print summary
  console.log('='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  
  let totalPassed = 0;
  let totalFailed = 0;
  
  results.forEach(result => {
    totalPassed += result.passed;
    totalFailed += result.failed;
  });

  console.log(`Total Tests: ${totalPassed + totalFailed}`);
  console.log(`✓ Passed: ${totalPassed}`);
  console.log(`✗ Failed: ${totalFailed}`);
  console.log(`Success Rate: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(2)}%\n`);

  if (totalFailed > 0) {
    console.log('⚠ Some tests failed. Please review the output above.');
    process.exit(1);
  } else {
    console.log('✓ All tests passed!');
    process.exit(0);
  }
}

// ============================================
// RUN
// ============================================

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Test suite error:', error);
    process.exit(1);
  });
}

module.exports = {
  testScheduleSession,
  testCheckAvailability,
  testGetSessions,
  testUpdateSessionStatus,
  testMarkAttendance,
  testSessionDocumentation,
  testRescheduleSession,
  testTherapistAvailability,
  testStatistics,
  testBulkOperations,
  runAllTests
};

/**
 * USAGE INSTRUCTIONS:
 * 
 * 1. Set environment variables:
 *    export API_URL=http://localhost:3001/api
 *    export TEST_AUTH_TOKEN=your-auth-token
 * 
 * 2. Make sure the server is running:
 *    npm run dev
 * 
 * 3. Run tests:
 *    node tests/therapy-sessions.test.js
 * 
 * 4. Or run individual test suite:
 *    node -e "require('./tests/therapy-sessions.test.js').runAllTests()"
 * 
 * Expected output:
 *   ✓ THERAPEUTIC SESSION MANAGEMENT - TEST SUITE
 *   ✓ All API endpoints tested
 *   ✓ Success rate displayed
 * 
 */
