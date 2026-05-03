/**
 * Auto-Issue Subscribers — مستمعو الإصدار التلقائي
 *
 * Subscribes the blockchain auto-issue service to the database event bus
 * (MongoDB Change Streams). When a source-domain doc transitions to its
 * "completed" state, we extract the recipient + title from the doc and call
 * `autoIssue()`. Idempotency in the auto-issue service makes redelivery safe.
 *
 * Sources wired:
 *   • CourseEnrollment:update — when status flips to 'completed'
 *   • SmartIEP:update         — when status flips to 'completed'
 *   • OnboardingChecklist:update — when status flips to 'completed'
 *
 * CPE is NOT wired here — it's a derived state computed from many CpdRecord
 * rows. Wire it via a scheduled job that calls `autoIssueOnCpeMilestone()`
 * directly when a practitioner's window crosses the renewal threshold.
 *
 * Boot order:
 *   1. databaseEventBus.start() (in app.js) starts the change streams
 *   2. register(databaseEventBus) registers the handlers below
 *   3. BLOCKCHAIN_AUTO_ISSUE=1 must be set or `autoIssue()` returns skipped
 *
 * Failure isolation: handlers swallow errors so a chain outage cannot block
 * the source-domain's update event from being delivered to other consumers.
 */

'use strict';

const autoIssueService = require('../blockchainAutoIssueService');
const logger = require('../../utils/logger');

function statusFlippedToCompleted(event) {
  // ChangeStream "update" event shapes vary slightly — fullDocument has the
  // post-image, updatedFields has the diff. We treat status === 'completed'
  // in the post-image AND status appearing in updatedFields as the trigger.
  const after = event?.fullDocument;
  const updated = event?.updateDescription?.updatedFields || {};
  if (!after) return false;
  if (after.status !== 'completed') return false;
  // Re-emits with no status change shouldn't trigger us.
  return Object.prototype.hasOwnProperty.call(updated, 'status');
}

function pickRecipientFromUserDoc(user) {
  if (!user) return null;
  return {
    name: { ar: user.fullNameAr || user.name || '', en: user.fullNameEn || user.name || '' },
    nationalId: user.nationalId,
    email: user.email,
    userId: user._id,
  };
}

async function onCourseEnrollmentCompleted(event) {
  if (!statusFlippedToCompleted(event)) return;
  const e = event.fullDocument;
  // Source services typically don't include populated user/course here —
  // we let auto-issue work with whatever names we have. Worst case the
  // recipient is empty and the call is rejected; nothing else breaks.
  const recipient = pickRecipientFromUserDoc(e.user || e.userInfo) || {
    name: { ar: e.userName || 'Unknown', en: e.userName || 'Unknown' },
    userId: e.userId,
  };
  await autoIssueService.autoIssue({
    source: 'lms',
    sourceRef: String(e._id),
    recipient,
    title: {
      ar: e.courseTitleAr || e.courseTitle || 'إكمال دورة',
      en: e.courseTitleEn || e.courseTitle || 'Course Completion',
    },
    data: {
      enrollmentId: String(e._id),
      courseId: e.courseId ? String(e.courseId) : undefined,
      cpdHours: e.cpdHours,
      score: e.finalScore,
    },
  });
}

async function onSmartIepCompleted(event) {
  if (!statusFlippedToCompleted(event)) return;
  const e = event.fullDocument;
  const ben = e.beneficiary || {};
  const recipient = {
    name: {
      ar: ben.fullNameAr || ben.name || ben.nameAr || '',
      en: ben.fullNameEn || ben.name || ben.nameEn || '',
    },
    nationalId: ben.nationalId,
    userId: e.beneficiary_id,
  };
  await autoIssueService.autoIssue({
    source: 'iep',
    sourceRef: String(e._id),
    recipient,
    title: {
      ar: 'شهادة إنجاز الخطة الفردية للتعليم',
      en: 'IEP Completion Certificate',
    },
    data: {
      iepNumber: e.iep_number,
      planPeriod: e.plan_period,
      goalsAchieved: e.goalsAchieved || (Array.isArray(e.goals) ? e.goals.length : undefined),
    },
  });
}

async function onOnboardingCompleted(event) {
  if (!statusFlippedToCompleted(event)) return;
  const e = event.fullDocument;
  const emp = e.employee || e.employeeInfo || {};
  const recipient = {
    name: {
      ar: emp.fullNameAr || emp.name || '',
      en: emp.fullNameEn || emp.name || '',
    },
    nationalId: emp.nationalId,
    email: emp.email,
    userId: e.employeeId,
  };
  await autoIssueService.autoIssue({
    source: 'onboarding',
    sourceRef: String(e._id),
    recipient,
    title: { ar: 'شهادة إكمال التهيئة', en: 'Onboarding Completion Certificate' },
    data: {
      checklistId: String(e._id),
      completedTasks: Array.isArray(e.tasks) ? e.tasks.filter(t => t.completed).length : undefined,
      totalTasks: Array.isArray(e.tasks) ? e.tasks.length : undefined,
    },
  });
}

const HANDLERS = [
  ['CourseEnrollment:update', onCourseEnrollmentCompleted],
  ['SmartIEP:update', onSmartIepCompleted],
  ['OnboardingChecklist:update', onOnboardingCompleted],
];

let registered = false;

function register(eventBus) {
  if (registered) return { registered: 0, alreadyRegistered: true };
  if (!eventBus || typeof eventBus.handle !== 'function') {
    logger?.warn?.('[blockchain.autoIssue] eventBus has no .handle() — skip register');
    return { registered: 0 };
  }
  for (const [key, fn] of HANDLERS) {
    eventBus.handle(key, async e => {
      try {
        await fn(e);
      } catch (err) {
        logger?.warn?.(`[blockchain.autoIssue] ${key} handler threw — ${err.message}`);
      }
    });
  }
  registered = true;
  return { registered: HANDLERS.length };
}

function _resetForTests() {
  registered = false;
}

module.exports = {
  register,
  // exported for direct invocation by routes/jobs that don't go through change streams
  onCourseEnrollmentCompleted,
  onSmartIepCompleted,
  onOnboardingCompleted,
  // helpers exported for testability
  statusFlippedToCompleted,
  _resetForTests,
};
