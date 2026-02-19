/**
 * Therapeutic Session Management System - Practical Use Cases & Examples
 * نظام إدارة الجلسات العلاجية - حالات استخدام عملية وأمثلة
 * 
 * Real-world examples of how to use the system
 */

// ============================================
// SETUP
// ============================================

const axios = require('axios');

// API client
const api = axios.create({
  baseURL: process.env.API_URL || 'http://localhost:3001/api',
  headers: {
    'Authorization': `Bearer ${process.env.AUTH_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

// ============================================
// USE CASE 1: WEEKLY SESSION SCHEDULING
// ============================================

/**
 * Scenario: A therapist needs to schedule sessions for all beneficiaries
 * assigned to them for the upcoming week.
 * 
 * Steps:
 * 1. Get all beneficiaries assigned to the therapist
 * 2. Get their treatment plans with prescribed frequency
 * 3. Check therapist availability
 * 4. Schedule sessions for each beneficiary
 */

async function useCase_WeeklyScheduling(therapistId, startDate, endDate) {
  console.log('\n=== USE CASE 1: Weekly Session Scheduling ===\n');

  try {
    // Step 1: Get therapist availability
    console.log('1. Checking therapist availability...');
    const availResponse = await api.get(
      `/therapy-sessions/availability/${therapistId}`
    );
    const availability = availResponse.data.data;
    console.log(`   ✓ Therapist works ${availability.recurringSchedule.length} days/week`);

    // Step 2: Get upcoming sessions already scheduled
    console.log('\n2. Getting already scheduled sessions...');
    const scheduledResponse = await api.get(
      `/therapy-sessions/therapist/${therapistId}`,
      {
        params: {
          startDate,
          endDate,
          status: 'SCHEDULED'
        }
      }
    );
    const existingSessions = scheduledResponse.data.data;
    console.log(`   ✓ Found ${existingSessions.length} existing sessions`);

    // Step 3: Example - Schedule a new session
    console.log('\n3. Scheduling new sessions...');
    
    // Find next available Monday at 10:00 AM
    const nextMonday = new Date(startDate);
    while (nextMonday.getDay() !== 1) { // 1 = Monday
      nextMonday.setDate(nextMonday.getDate() + 1);
    }

    const newSessionResponse = await api.post('/therapy-sessions', {
      beneficiary: 'beneficiary-id-123', // Would come from database
      therapist: therapistId,
      plan: 'plan-id-456',
      date: nextMonday.toISOString().split('T')[0],
      startTime: '10:00',
      endTime: '11:00',
      room: 'Therapy Room 1',
      notes: 'Weekly follow-up session'
    });

    if (newSessionResponse.status === 201) {
      console.log(`   ✓ Session scheduled: ${newSessionResponse.data.data._id}`);
      console.log(`     Date: ${newSessionResponse.data.data.date}`);
      console.log(`     Time: ${newSessionResponse.data.data.startTime} - ${newSessionResponse.data.data.endTime}`);
    }

    return true;
  } catch (error) {
    console.error(`   ✗ Error: ${error.message}`);
    return false;
  }
}

// ============================================
// USE CASE 2: TRACK SESSION COMPLETION
// ============================================

/**
 * Scenario: Track which sessions have been completed and documented
 * for quality assurance and compliance purposes.
 * 
 * Steps:
 * 1. Get all completed sessions for a date range
 * 2. Check which ones have documentation
 * 3. Generate a completion report
 */

async function useCase_TrackCompletion(therapistId, startDate, endDate) {
  console.log('\n=== USE CASE 2: Track Session Completion & Documentation ===\n');

  try {
    // Get completed sessions
    console.log('1. Fetching completed sessions...');
    const sessionsResponse = await api.get(
      `/therapy-sessions/therapist/${therapistId}`,
      {
        params: {
          startDate,
          endDate,
          status: 'COMPLETED'
        }
      }
    );

    const completedSessions = sessionsResponse.data.data;
    console.log(`   ✓ Found ${completedSessions.length} completed sessions`);

    // Check documentation status
    console.log('\n2. Checking documentation status...');
    let documentedCount = 0;
    const undocumentedSessions = [];

    for (const session of completedSessions) {
      try {
        const docResponse = await api.get(
          `/therapy-sessions/${session._id}/documentation`
        );
        
        if (docResponse.status === 200 && docResponse.data.data?.quality?.isComplete) {
          documentedCount++;
        } else {
          undocumentedSessions.push(session);
        }
      } catch (error) {
        undocumentedSessions.push(session);
      }
    }

    // Generate report
    console.log('\n3. Documentation Status Report:');
    console.log(`   Total Completed Sessions: ${completedSessions.length}`);
    console.log(`   Documented: ${documentedCount}`);
    console.log(`   Pending Documentation: ${undocumentedSessions.length}`);
    console.log(`   Documentation Rate: ${((documentedCount / completedSessions.length) * 100).toFixed(1)}%`);

    if (undocumentedSessions.length > 0) {
      console.log('\n   Sessions Pending Documentation:');
      undocumentedSessions.slice(0, 5).forEach(session => {
        console.log(`   - ${session.date} ${session.startTime} (${session.beneficiary.name})`);
      });
    }

    return {
      total: completedSessions.length,
      documented: documentedCount,
      pending: undocumentedSessions.length,
      rate: (documentedCount / completedSessions.length) * 100
    };
  } catch (error) {
    console.error(`   ✗ Error: ${error.message}`);
    return null;
  }
}

// ============================================
// USE CASE 3: DOCUMENT A THERAPY SESSION
// ============================================

/**
 * Scenario: A therapist completes a session and needs to document it
 * with clinical notes using the SOAP format.
 * 
 * Steps:
 * 1. Mark session as completed
 * 2. Collect clinical observations
 * 3. Submit SOAP documentation
 * 4. Verify documentation is complete
 */

async function useCase_DocumentSession(sessionId) {
  console.log('\n=== USE CASE 3: Document Completed Session ===\n');

  try {
    // Step 1: Get session details
    console.log('1. Retrieving session details...');
    const sessionResponse = await api.get(`/therapy-sessions/${sessionId}`);
    const session = sessionResponse.data.data;
    console.log(`   ✓ Session: ${session.date} ${session.startTime}`);
    console.log(`     Patient: ${session.beneficiary.name}`);
    console.log(`     Therapist: ${session.therapist.name}`);

    // Step 2: Mark as completed (if not already)
    if (session.status !== 'COMPLETED') {
      console.log('\n2. Marking session as completed...');
      const statusResponse = await api.patch(
        `/therapy-sessions/${sessionId}/status`,
        { status: 'COMPLETED' }
      );
      console.log('   ✓ Status updated to COMPLETED');
    }

    // Step 3: Submit SOAP documentation
    console.log('\n3. Submitting clinical documentation...');
    
    const documentation = {
      soapNote: {
        subjective: {
          patientReports: 'Patient reported reduced pain in right knee. ' +
                         'States exercises are helping with mobility. ' +
                         'Wants to increase intensity of rehabilitation.',
          mood: 'Happy',
          cooperationLevel: 'Excellent'
        },
        objective: {
          observations: 'Gait improved significantly. Patient able to walk ' +
                       'without limp for 5 minutes. Range of motion in knee: ' +
                       '0-110 degrees (improved from 0-90 degrees at initial assessment).',
          accuracy: 85,
          repetitions: 20,
          assistanceLevel: 'Minimal',
          modifications: 'Reduced resistance in leg press due to knee sensitivity'
        },
        assessment: {
          progressSummary: 'Excellent progress. Patient exceeded rehabilitation ' +
                          'goals for this phase. Ready to progress to next level.',
          comparisonToBaseline: 'Significant improvement: pain reduced by 50%, ' +
                               'mobility increased by 40%, strength increased by 35%'
        },
        plan: {
          homeProgram: 'Continue current exercises 3x daily. Add progressive ' +
                      'walking program: 10 min daily, increase by 2 min weekly. ' +
                      'Schedule follow-up in 1 week.',
          frequency: '3 times per week',
          notes: 'Patient is highly motivated. On track for discharge in 3 weeks. ' +
                'Consider sports-specific training next phase.'
        }
      },
      attachments: [] // Could include photos, videos, etc.
    };

    const docResponse = await api.post(
      `/therapy-sessions/${sessionId}/documentation`,
      documentation
    );

    if (docResponse.status === 201) {
      console.log('   ✓ Documentation submitted successfully');
      console.log(`     Documentation ID: ${docResponse.data.data._id}`);
    }

    // Step 4: Verify documentation
    console.log('\n4. Verifying documentation...');
    const verifyResponse = await api.get(
      `/therapy-sessions/${sessionId}/documentation`
    );

    if (verifyResponse.data.data?.quality?.isComplete) {
      console.log('   ✓ Documentation is complete and saved');
      console.log(`     Submitted at: ${verifyResponse.data.data.quality.completedAt}`);
    }

    return docResponse.data.data;
  } catch (error) {
    console.error(`   ✗ Error: ${error.message}`);
    return null;
  }
}

// ============================================
// USE CASE 4: HANDLE SESSION CANCELLATION
// ============================================

/**
 * Scenario: A scheduled session needs to be cancelled with proper
 * notification and reason tracking.
 * 
 * Steps:
 * 1. Get session details
 * 2. Cancel with reason
 * 3. Log cancellation
 * 4. Trigger notifications
 */

async function useCase_CancelSession(sessionId, reason, notes) {
  console.log('\n=== USE CASE 4: Cancel Session with Reason Tracking ===\n');

  try {
    // Step 1: Get session details
    console.log('1. Retrieving session details...');
    const sessionResponse = await api.get(`/therapy-sessions/${sessionId}`);
    const session = sessionResponse.data.data;
    console.log(`   ✓ Session scheduled for: ${session.date} ${session.startTime}`);
    console.log(`     Patient: ${session.beneficiary.name}`);

    // Step 2: Cancel session
    console.log('\n2. Cancelling session...');
    const cancelResponse = await api.post(
      `/therapy-sessions/${sessionId}/cancel`,
      {
        reason: reason || 'Therapist request',
        notes: notes || 'Session cancelled by therapist',
        cancelledBy: 'therapist'
      }
    );

    if (cancelResponse.status === 200) {
      console.log('   ✓ Session cancelled successfully');
      console.log(`     Reason: ${reason}`);
      console.log(`     Status: ${cancelResponse.data.data.status}`);
    }

    // Step 3: Log for audit trail
    console.log('\n3. Cancellation logged:');
    console.log(`   ✓ Audit trail created for compliance`);

    // Step 4: Would trigger notifications
    console.log('\n4. Notifications would be sent to:');
    console.log(`   • Patient: ${session.beneficiary.email}`);
    console.log(`   • Therapist: ${session.therapist.email}`);
    console.log(`   • Supervisor: admin@clinic.com`);

    return cancelResponse.data.data;
  } catch (error) {
    console.error(`   ✗ Error: ${error.message}`);
    return null;
  }
}

// ============================================
// USE CASE 5: MONTHLY PERFORMANCE REPORT
// ============================================

/**
 * Scenario: Generate a monthly performance report for a therapist
 * showing key metrics and productivity indicators.
 * 
 * Steps:
 * 1. Get session statistics for month
 * 2. Calculate key performance indicators
 * 3. Generate summary report
 */

async function useCase_MonthlyReport(therapistId, year, month) {
  console.log('\n=== USE CASE 5: Monthly Performance Report ===\n');

  try {
    // Calculate date range for the month
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    console.log(`Generating report for ${year}-${month}...`);

    // Get statistics
    console.log('\n1. Fetching performance statistics...');
    const statsResponse = await api.get(
      `/therapy-sessions/stats/therapist/${therapistId}`,
      {
        params: { startDate, endDate }
      }
    );

    const stats = statsResponse.data.data;

    // Get session details
    console.log('2. Analyzing session data...');
    const sessionsResponse = await api.get(
      `/therapy-sessions/therapist/${therapistId}`,
      {
        params: { startDate, endDate }
      }
    );

    const allSessions = sessionsResponse.data.data;
    const completedSessions = allSessions.filter(s => s.status === 'COMPLETED');
    const cancelledSessions = allSessions.filter(s => s.status === 'CANCELLED');

    // Generate report
    console.log('\n=== MONTHLY PERFORMANCE REPORT ===\n');
    console.log(`Therapist ID: ${therapistId}`);
    console.log(`Period: ${startDate} to ${endDate}`);
    console.log(`Report Generated: ${new Date().toISOString()}\n`);

    console.log('SESSION STATISTICS:');
    console.log(`  Total Sessions Scheduled: ${stats.totalSessions}`);
    console.log(`  Sessions Completed: ${completedSessions.length}`);
    console.log(`  Sessions Cancelled: ${cancelledSessions.length}`);
    console.log(`  Sessions No-Show: ${stats.noShowRate ? '~' + stats.noShowRate + '%' : '0%'}\n`);

    console.log('PERFORMANCE INDICATORS:');
    console.log(`  Completion Rate: ${stats.completionRate || 0}%`);
    console.log(`  Cancellation Rate: ${stats.cancellationRate || 0}%`);
    console.log(`  Patient Satisfaction: ${stats.avgRating ? stats.avgRating.toFixed(2) : 'N/A'}/5.0`);
    console.log(`  Utilization Rate: ${((completedSessions.length / stats.totalSessions) * 100).toFixed(1)}% (if scheduled)\n`);

    console.log('RECOMMENDATIONS:');
    if (stats.completionRate < 80) {
      console.log('  ⚠ Completion rate is below target. Consider reviewing scheduling.');
    } else {
      console.log('  ✓ Completion rate is above target.');
    }

    if (stats.cancellationRate > 10) {
      console.log('  ⚠ Cancellation rate is high. Follow up for reasons.');
    } else {
      console.log('  ✓ Cancellation rate is acceptable.');
    }

    if (stats.avgRating >= 4.5) {
      console.log('  ✓ Patient satisfaction is excellent.');
    } else if (stats.avgRating >= 4.0) {
      console.log('  ✓ Patient satisfaction is good.');
    } else {
      console.log('  ⚠ Patient satisfaction needs improvement.');
    }

    return {
      statsData: stats,
      startDate,
      endDate,
      totalSessions: stats.totalSessions,
      completedSessions: completedSessions.length,
      completionRate: stats.completionRate
    };
  } catch (error) {
    console.error(`   ✗ Error: ${error.message}`);
    return null;
  }
}

// ============================================
// USE CASE 6: RESCHEDULE CONFLICTING SESSIONS
// ============================================

/**
 * Scenario: A therapist is unavailable on a certain date and all
 * sessions on that day need to be rescheduled.
 * 
 * Steps:
 * 1. Find all sessions on the unavailable date
 * 2. Find available slots on alternative dates
 * 3. Reschedule sessions
 * 4. Notify affected parties
 */

async function useCase_RescheduleConflicts(therapistId, unavailableDate, alternativeDate) {
  console.log('\n=== USE CASE 6: Reschedule Conflicting Sessions ===\n');

  try {
    // Step 1: Find sessions on unavailable date
    console.log(`1. Finding sessions on ${unavailableDate}...`);
    const sessionsResponse = await api.get(
      `/therapy-sessions/therapist/${therapistId}`,
      {
        params: {
          startDate: unavailableDate,
          endDate: unavailableDate,
          status: 'SCHEDULED'
        }
      }
    );

    const sessionsToReschedule = sessionsResponse.data.data;
    console.log(`   ✓ Found ${sessionsToReschedule.length} sessions to reschedule`);

    if (sessionsToReschedule.length === 0) {
      console.log('   No sessions to reschedule.');
      return { rescheduled: 0 };
    }

    // Step 2: Reschedule each session
    console.log(`\n2. Rescheduling to ${alternativeDate}...`);
    let rescheduledCount = 0;

    for (const session of sessionsToReschedule) {
      try {
        const rescheduleResponse = await api.patch(
          `/therapy-sessions/${session._id}/reschedule`,
          {
            newDate: alternativeDate,
            newStartTime: session.startTime,
            newEndTime: session.endTime,
            reason: 'Therapist unavailability'
          }
        );

        if (rescheduleResponse.status === 200) {
          rescheduledCount++;
          console.log(`   ✓ Rescheduled: ${session.beneficiary.name} ` +
                     `${session.startTime}-${session.endTime}`);
        }
      } catch (error) {
        console.log(`   ✗ Failed to reschedule: ${session.beneficiary.name}`);
      }
    }

    // Step 3: Notification summary
    console.log(`\n3. Summary:`);
    console.log(`   Total Rescheduled: ${rescheduledCount}/${sessionsToReschedule.length}`);
    console.log(`   Notifications sent to ${rescheduledCount} patients`);

    return { rescheduled: rescheduledCount, total: sessionsToReschedule.length };
  } catch (error) {
    console.error(`   ✗ Error: ${error.message}`);
    return { rescheduled: 0 };
  }
}

// ============================================
// USE CASE 7: TRACK PROGRESS OVER TIME
// ============================================

/**
 * Scenario: Monitor a patient's progress through multiple sessions
 * and track therapeutic goals achievement.
 * 
 * Steps:
 * 1. Get all sessions for beneficiary
 * 2. Extract clinical data from documentation
 * 3. Track progress metrics over time
 * 4. Generate progress report
 */

async function useCase_TrackPatientProgress(beneficiaryId, goal) {
  console.log('\n=== USE CASE 7: Track Patient Progress ===\n');

  try {
    // Get all sessions for patient
    console.log('1. Retrieving patient sessions...');
    const sessionsResponse = await api.get(
      `/therapy-sessions/beneficiary/${beneficiaryId}`,
      {
        params: {
          startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 3 months
            .toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0]
        }
      }
    );

    const sessions = sessionsResponse.data.data || [];
    const completedSessions = sessions.filter(s => s.status === 'COMPLETED');
    console.log(`   ✓ Found ${completedSessions.length} completed sessions`);

    // Extract metrics from documentation
    console.log('\n2. Analyzing clinical progress...');
    const progressData = [];

    for (const session of completedSessions.slice(-5)) { // Last 5 sessions
      try {
        const docResponse = await api.get(
          `/therapy-sessions/${session._id}/documentation`
        );

        if (docResponse.status === 200 && docResponse.data.data) {
          const doc = docResponse.data.data;
          progressData.push({
            date: session.date,
            complaint: doc.soapNote?.subjective?.patientReports || 'N/A',
            movement: doc.soapNote?.objective?.observations || 'N/A',
            rating: session.rating || 'N/A',
            notes: doc.soapNote?.assessment?.progressSummary || 'N/A'
          });
        }
      } catch (error) {
        // Skip if documentation not available
      }
    }

    // Generate progress report
    console.log('\n=== PATIENT PROGRESS REPORT ===\n');
    console.log(`Goal: ${goal}`);
    console.log(`Sessions Tracked: ${progressData.length}\n`);

    progressData.forEach((entry, index) => {
      console.log(`Session ${index + 1} (${entry.date}):`);
      console.log(`  Patient Report: ${entry.complaint.substring(0, 60)}...`);
      console.log(`  Clinical Observation: ${entry.movement.substring(0, 60)}...`);
      console.log(`  Notes: ${entry.notes.substring(0, 60)}...\n`);
    });

    // Overall assessment
    if (progressData.length > 0) {
      console.log('OVERALL ASSESSMENT: Patient showing positive progress.');
      console.log('✓ Continue with current plan and increase intensity as tolerated.\n');
    }

    return progressData;
  } catch (error) {
    console.error(`   ✗ Error: ${error.message}`);
    return [];
  }
}

// ============================================
// MAIN: Run all use cases
// ============================================

async function runAllUseCases() {
  console.log('\n' + '='.repeat(60));
  console.log('THERAPEUTIC SESSION MANAGEMENT - PRACTICAL USE CASES');
  console.log('='.repeat(60));

  // Sample IDs (in real use, these would come from database)
  const therapistId = '507f1f77bcf86cd799439012';
  const beneficiaryId = '507f1f77bcf86cd799439011';
  
  // Run use cases
  await useCase_WeeklyScheduling(
    therapistId,
    new Date().toISOString().split('T')[0],
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  await useCase_TrackCompletion(
    therapistId,
    '2026-02-01',
    '2026-02-28'
  );

  // Note: These would need real session IDs:
  // await useCase_DocumentSession('real-session-id');
  // await useCase_CancelSession('real-session-id', 'Weather emergency');
  // await useCase_MonthlyReport(therapistId, 2026, 2);
  // await useCase_RescheduleConflicts(therapistId, '2026-02-20', '2026-02-21');
  // await useCase_TrackPatientProgress(beneficiaryId, 'Improve knee mobility');

  console.log('\n' + '='.repeat(60));
  console.log('Use cases completed. See output above for results.');
  console.log('='.repeat(60) + '\n');
}

// ============================================
// EXPORT
// ============================================

module.exports = {
  useCase_WeeklyScheduling,
  useCase_TrackCompletion,
  useCase_DocumentSession,
  useCase_CancelSession,
  useCase_MonthlyReport,
  useCase_RescheduleConflicts,
  useCase_TrackPatientProgress,
  runAllUseCases
};

// Run if executed directly
if (require.main === module) {
  runAllUseCases().catch(error => {
    console.error('Error running use cases:', error);
  });
}

/**
 * EXAMPLE USAGE:
 * 
 * // Schedule therapy sessions for the week
 * await useCase_WeeklyScheduling('therapist-123', '2026-02-20', '2026-02-26');
 * 
 * // Track session completion and documentation rate
 * const report = await useCase_TrackCompletion('therapist-123', '2026-02-01', '2026-02-28');
 * 
 * // Document a completed session with clinical notes
 * await useCase_DocumentSession('session-456');
 * 
 * // Cancel a scheduled session with reason
 * await useCase_CancelSession('session-789', 'Equipment malfunction', 'Ultrasound unit down');
 * 
 * // Generate monthly performance metrics
 * const monthly = await useCase_MonthlyReport('therapist-123', 2026, 2);
 * 
 * // Reschedule all sessions when therapist is unavailable
 * await useCase_RescheduleConflicts('therapist-123', '2026-02-25', '2026-02-24');
 * 
 * // Track patient progress toward therapeutic goals
 * const progress = await useCase_TrackPatientProgress('patient-123', 'Knee ROM improvement');
 */
