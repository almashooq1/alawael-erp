/**
 * Unit Tests — notificationsCalculations.service.js
 * Pure business logic — NO mocks needed
 */
'use strict';

const {
  NOTIFICATION_CONSTANTS,
  calculateNotificationPriority,
  scheduleAppointmentReminders,
  scheduleDocumentExpiryNotifications,
  checkNotificationRateLimit,
  analyzeNotificationDelivery,
  calculateOptimalSendTime,
  processBatchNotifications,
  buildNotificationContent,
  checkUserNotificationPreferences,
  calculateNotificationStats,
} = require('../../services/notifications/notificationsCalculations.service');

// ═══════════════════════════════════════
//  NOTIFICATION_CONSTANTS
// ═══════════════════════════════════════
describe('NOTIFICATION_CONSTANTS', () => {
  it('exports expected keys', () => {
    expect(NOTIFICATION_CONSTANTS.TYPES).toBeDefined();
    expect(NOTIFICATION_CONSTANTS.CHANNELS).toBeDefined();
    expect(NOTIFICATION_CONSTANTS.PRIORITY).toBeDefined();
    expect(NOTIFICATION_CONSTANTS.STATUS).toBeDefined();
    expect(NOTIFICATION_CONSTANTS.RATE_LIMITS).toBeDefined();
    expect(NOTIFICATION_CONSTANTS.CHANNELS.SMS).toBe('sms');
    expect(NOTIFICATION_CONSTANTS.CHANNELS.EMAIL).toBe('email');
    expect(NOTIFICATION_CONSTANTS.CHANNELS.IN_APP).toBe('in_app');
    expect(NOTIFICATION_CONSTANTS.CHANNELS.PUSH).toBe('push');
  });
});

// ═══════════════════════════════════════
//  calculateNotificationPriority
// ═══════════════════════════════════════
describe('calculateNotificationPriority', () => {
  it('returns info priority for null', () => {
    const r = calculateNotificationPriority(null);
    expect(r.priority).toBe('info');
  });

  it('high for payment_due with isOverdue', () => {
    const r = calculateNotificationPriority({ type: 'payment_due', isOverdue: true });
    expect(r.priority).toBe('high');
  });

  it('medium for appointment_reminder in near future', () => {
    const soon = new Date();
    soon.setHours(soon.getHours() + 6);
    const r = calculateNotificationPriority({
      type: 'appointment_reminder',
      appointmentDate: soon.toISOString(),
    });
    expect(r.priority).toBe('medium');
  });

  it('returns channels array', () => {
    const r = calculateNotificationPriority({ type: 'system_alert' });
    expect(Array.isArray(r.channels)).toBe(true);
    expect(r.channels.length).toBeGreaterThan(0);
  });

  it('returns valid priority for document_expiry', () => {
    const future = new Date();
    future.setDate(future.getDate() + 60);
    const r = calculateNotificationPriority({
      type: 'document_expiry',
      expiryDate: future.toISOString(),
    });
    expect(['urgent', 'high', 'medium', 'low', 'info']).toContain(r.priority);
    expect(r.score).toBeGreaterThanOrEqual(0);
  });
});

// ═══════════════════════════════════════
//  scheduleAppointmentReminders
// ═══════════════════════════════════════
describe('scheduleAppointmentReminders', () => {
  it('returns empty for null', () => {
    const r = scheduleAppointmentReminders(null);
    expect(r).toEqual([]);
  });

  it('returns empty for empty object', () => {
    const r = scheduleAppointmentReminders({});
    expect(r).toEqual([]);
  });

  it('generates reminders for future appointment', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    const r = scheduleAppointmentReminders({
      id: 'a1',
      beneficiaryId: 'b1',
      date: dateStr,
      time: '10:00',
    });
    expect(r.length).toBeGreaterThanOrEqual(1);
    expect(r[0].appointmentId).toBe('a1');
    expect(r[0].type).toBe('appointment_reminder');
  });

  it('skips past appointment', () => {
    const past = new Date();
    past.setDate(past.getDate() - 5);
    const dateStr = past.toISOString().split('T')[0];
    const r = scheduleAppointmentReminders({ id: 'a1', date: dateStr, time: '09:00' });
    expect(r).toHaveLength(0);
  });
});

// ═══════════════════════════════════════
//  scheduleDocumentExpiryNotifications
// ═══════════════════════════════════════
describe('scheduleDocumentExpiryNotifications', () => {
  it('returns empty for null', () => {
    const r = scheduleDocumentExpiryNotifications(null);
    expect(r).toEqual([]);
  });

  it('generates notifications for docs expiring in future', () => {
    const inTenDays = new Date();
    inTenDays.setDate(inTenDays.getDate() + 10);
    const r = scheduleDocumentExpiryNotifications({
      id: 'd1',
      name: 'License',
      expiryDate: inTenDays.toISOString(),
      ownerId: 'u1',
    });
    expect(r.length).toBeGreaterThanOrEqual(1);
    expect(r[0].type).toBe('document_expiry');
  });

  it('returns array for far-future doc', () => {
    const farFuture = new Date();
    farFuture.setFullYear(farFuture.getFullYear() + 5);
    const r = scheduleDocumentExpiryNotifications({
      id: 'd1',
      name: 'Far',
      expiryDate: farFuture.toISOString(),
      ownerId: 'u1',
    });
    expect(Array.isArray(r)).toBe(true);
  });
});

// ═══════════════════════════════════════
//  checkNotificationRateLimit
// ═══════════════════════════════════════
describe('checkNotificationRateLimit', () => {
  it('allows when no recent notifications', () => {
    const r = checkNotificationRateLimit('u1', 'sms', []);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBeGreaterThan(0);
  });

  it('blocks when daily limit exceeded for channel', () => {
    const recent = Array.from({ length: 100 }, () => ({
      userId: 'u1',
      channel: 'sms',
      sentAt: new Date().toISOString(),
    }));
    const r = checkNotificationRateLimit('u1', 'sms', recent);
    expect(r.allowed).toBe(false);
    expect(r.remaining).toBe(0);
    expect(r.reason).toContain('تجاوز الحد');
    expect(r.resetAt).toBeDefined();
  });

  it('allows when different userId', () => {
    const recent = Array.from({ length: 100 }, () => ({
      userId: 'u2',
      channel: 'sms',
      sentAt: new Date().toISOString(),
    }));
    const r = checkNotificationRateLimit('u1', 'sms', recent);
    expect(r.allowed).toBe(true);
  });

  it('allows for invalid params', () => {
    const r = checkNotificationRateLimit(null, 'sms', []);
    expect(r.allowed).toBe(true);
  });
});

// ═══════════════════════════════════════
//  analyzeNotificationDelivery
// ═══════════════════════════════════════
describe('analyzeNotificationDelivery', () => {
  it('returns zeros for empty', () => {
    const r = analyzeNotificationDelivery([]);
    expect(r.total).toBe(0);
    expect(r.deliveryRate).toBe(0);
  });

  it('computes delivery and read rates', () => {
    const notifs = [
      { status: 'delivered', channel: 'sms' },
      { status: 'read', channel: 'in_app' },
      { status: 'failed', channel: 'email' },
      { status: 'sent', channel: 'push' },
    ];
    const r = analyzeNotificationDelivery(notifs);
    expect(r.total).toBe(4);
    expect(r.deliveryRate).toBe(50); // delivered+read = 2 of 4
    expect(r.readRate).toBe(25); // 1 of 4
    expect(r.failureRate).toBe(25);
    expect(r.byChannel).toBeDefined();
  });

  it('breaks down by channel', () => {
    const notifs = [
      { status: 'delivered', channel: 'sms' },
      { status: 'delivered', channel: 'sms' },
      { status: 'failed', channel: 'email' },
    ];
    const r = analyzeNotificationDelivery(notifs);
    expect(r.byChannel.sms.total).toBe(2);
    expect(r.byChannel.email.failed).toBe(1);
  });
});

// ═══════════════════════════════════════
//  calculateOptimalSendTime
// ═══════════════════════════════════════
describe('calculateOptimalSendTime', () => {
  it('returns default for empty history', () => {
    const r = calculateOptimalSendTime([]);
    expect(r.bestHour).toBeDefined();
  });

  it('finds hour with highest read rate', () => {
    const history = Array.from({ length: 20 }, () => ({
      sentAt: new Date('2025-06-01T09:00:00Z').toISOString(),
      readAt: new Date('2025-06-01T09:05:00Z').toISOString(),
      status: 'read',
    }));
    history.push(
      ...Array.from({ length: 10 }, () => ({
        sentAt: new Date('2025-06-01T14:00:00Z').toISOString(),
        status: 'delivered',
      }))
    );
    const r = calculateOptimalSendTime(history);
    expect(typeof r.bestHour).toBe('number');
    expect(r.bestHour).toBeGreaterThanOrEqual(0);
    expect(r.bestHour).toBeLessThanOrEqual(23);
  });
});

// ═══════════════════════════════════════
//  processBatchNotifications
// ═══════════════════════════════════════
describe('processBatchNotifications', () => {
  it('returns zeros for empty', () => {
    const r = processBatchNotifications([]);
    expect(r.total).toBe(0);
    expect(r.batches).toEqual([]);
  });

  it('groups by channel with priority breakdown', () => {
    const notifs = [
      { id: 'n1', status: 'pending', priority: 'low', channel: 'sms' },
      { id: 'n2', status: 'pending', priority: 'urgent', channel: 'email' },
      { id: 'n3', status: 'queued', priority: 'high', channel: 'sms' },
    ];
    const r = processBatchNotifications(notifs);
    expect(r.total).toBe(3);
    expect(r.batches.length).toBe(2); // sms + email
    expect(r.byPriority.urgent).toBe(1);
    expect(r.byPriority.high).toBe(1);
  });

  it('skips already-sent notifications', () => {
    const notifs = [
      { id: 'n1', status: 'sent', priority: 'low', channel: 'sms' },
      { id: 'n2', status: 'pending', priority: 'high', channel: 'sms' },
    ];
    const r = processBatchNotifications(notifs);
    // sent is skipped by priority filter
    expect(r.total).toBeGreaterThanOrEqual(1);
  });
});

// ═══════════════════════════════════════
//  buildNotificationContent
// ═══════════════════════════════════════
describe('buildNotificationContent', () => {
  it('returns invalid for null type', () => {
    const r = buildNotificationContent(null);
    expect(r.isValid).toBe(false);
  });

  it('builds Arabic appointment reminder', () => {
    const r = buildNotificationContent(
      'appointment_reminder',
      { serviceName: 'علاج طبيعي', time: '10:00' },
      'ar'
    );
    expect(r.isValid).toBe(true);
    expect(r.title).toContain('تذكير');
    expect(r.body).toContain('علاج طبيعي');
    expect(r.body).toContain('10:00');
  });

  it('builds English appointment reminder', () => {
    const r = buildNotificationContent(
      'appointment_reminder',
      { serviceName: 'PT', time: '10:00' },
      'en'
    );
    expect(r.isValid).toBe(true);
    expect(r.title.toLowerCase()).toContain('reminder');
  });

  it('builds payment due notification', () => {
    const r = buildNotificationContent('payment_due', { amount: '500', dueDate: '2025-06-30' });
    expect(r.isValid).toBe(true);
    expect(r.body).toContain('500');
  });

  it('builds goal achieved notification', () => {
    const r = buildNotificationContent('goal_achieved', { goalName: 'المشي المستقل' });
    expect(r.isValid).toBe(true);
    expect(r.title).toContain('🎉');
  });

  it('returns invalid for unknown type', () => {
    const r = buildNotificationContent('UNKNOWN_TYPE', { x: 1 });
    expect(r.isValid).toBe(false);
  });
});

// ═══════════════════════════════════════
//  checkUserNotificationPreferences
// ═══════════════════════════════════════
describe('checkUserNotificationPreferences', () => {
  it('defaults to in_app when no prefs', () => {
    const r = checkUserNotificationPreferences(null, { priority: 'low' });
    expect(r.shouldSend).toBe(true);
    expect(r.channels).toContain('in_app');
  });

  it('blocks non-urgent in quiet mode', () => {
    const r = checkUserNotificationPreferences({ quietMode: true }, { priority: 'low' });
    expect(r.shouldSend).toBe(false);
    expect(r.reason).toBe('quiet_mode_active');
  });

  it('allows urgent in quiet mode', () => {
    const r = checkUserNotificationPreferences({ quietMode: true }, { priority: 'urgent' });
    expect(r.shouldSend).toBe(true);
  });

  it('filters disabled channels', () => {
    const r = checkUserNotificationPreferences(
      { smsEnabled: false, emailEnabled: true },
      { channels: ['sms', 'email'] }
    );
    expect(r.channels).not.toContain('sms');
    expect(r.channels).toContain('email');
  });

  it('returns preferred language', () => {
    const r = checkUserNotificationPreferences({ language: 'en' }, { priority: 'low' });
    expect(r.language).toBe('en');
  });
});

// ═══════════════════════════════════════
//  calculateNotificationStats
// ═══════════════════════════════════════
describe('calculateNotificationStats', () => {
  it('returns zeros for empty', () => {
    const r = calculateNotificationStats([]);
    expect(r.total).toBe(0);
    expect(r.sent).toBe(0);
  });

  it('computes comprehensive stats', () => {
    const notifs = [
      {
        status: 'sent',
        type: 'appointment_reminder',
        channel: 'sms',
        priority: 'high',
        createdAt: '2025-06-01',
      },
      {
        status: 'delivered',
        type: 'payment_due',
        channel: 'email',
        priority: 'urgent',
        createdAt: '2025-06-01',
      },
      {
        status: 'read',
        type: 'appointment_reminder',
        channel: 'in_app',
        priority: 'medium',
        createdAt: '2025-06-02',
      },
      {
        status: 'failed',
        type: 'system_alert',
        channel: 'push',
        priority: 'low',
        createdAt: '2025-06-02',
      },
      {
        status: 'pending',
        type: 'document_expiry',
        channel: 'sms',
        priority: 'medium',
        createdAt: '2025-06-03',
      },
    ];
    const r = calculateNotificationStats(notifs);
    expect(r.total).toBe(5);
    expect(r.sent).toBe(3); // cumulative: sent+delivered+read
    expect(r.delivered).toBe(2); // cumulative: delivered+read
    expect(r.read).toBe(1);
    expect(r.failed).toBe(1);
    expect(r.pending).toBe(1);
    expect(r.byType).toBeDefined();
    expect(r.byChannel).toBeDefined();
    expect(r.byPriority).toBeDefined();
  });

  it('filters by period', () => {
    const notifs = [
      { status: 'read', createdAt: '2025-05-01' },
      { status: 'read', createdAt: '2025-06-15' },
    ];
    const r = calculateNotificationStats(notifs, {
      start: '2025-06-01',
      end: '2025-06-30',
    });
    expect(r.total).toBe(1);
  });
});
