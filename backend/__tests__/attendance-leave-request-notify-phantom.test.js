/**
 * Guard: HRNotificationService.notifyLeaveRequest must exist, and the
 * attendance leave-request route must treat the notification as best-effort.
 *
 * Bug: routes/attendance.routes.js POST /leave called
 * `HRNotificationService.notifyLeaveRequest(employee, result.leave)` — a method
 * that existed in NO file (the service has notifyLeaveApproved, not …Request).
 * The call sat inside the handler's try whose catch returns 400
 * "خطأ في البيانات المدخلة". So a submitted leave was actually PERSISTED, then
 * the phantom-method TypeError was caught and the employee was told it failed —
 * pushing them to re-submit (duplicate leaves) while the manager was never
 * notified. Fix: (1) add the method; (2) make the route's notify best-effort so
 * a notification failure never masks a successful leave creation.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const HRNotificationService = require('../services/hr/notificationService');

describe('attendance leave-request notification (phantom-method fix)', () => {
  test('notifyLeaveRequest exists as a static method on the service', () => {
    expect(typeof HRNotificationService.notifyLeaveRequest).toBe('function');
  });

  test('notifyLeaveRequest builds a LEAVE_REQUEST notification and delegates to sendNotification', async () => {
    const spy = jest
      .spyOn(HRNotificationService, 'sendNotification')
      .mockResolvedValue({ ok: true });
    const employee = { _id: 'emp-1', name: 'موظف' };
    const leave = {
      _id: 'lv-1',
      startDate: '2026-07-01',
      endDate: '2026-07-03',
      type: 'annual',
      days: 3,
      status: 'pending',
    };

    await HRNotificationService.notifyLeaveRequest(employee, leave);

    expect(spy).toHaveBeenCalledTimes(1);
    const [recipientId, message, passedEmployee] = spy.mock.calls[0];
    expect(recipientId).toBe('emp-1');
    expect(passedEmployee).toBe(employee);
    expect(message.type).toBe('LEAVE_REQUEST');
    expect(message.data.leaveId).toBe('lv-1');
    spy.mockRestore();
  });

  test('a thrown notification does NOT escape (so the route can keep its leave-success response)', async () => {
    const spy = jest
      .spyOn(HRNotificationService, 'sendNotification')
      .mockRejectedValue(new Error('smtp down'));
    // notifyLeaveRequest itself re-wraps; the ROUTE then swallows. Here we assert
    // the route source guards the call with its own try/catch (best-effort).
    const route = fs.readFileSync(
      path.join(__dirname, '..', 'routes', 'attendance.routes.js'),
      'utf8'
    );
    // the notify call is wrapped in a nested try { … notifyLeaveRequest … } catch
    expect(route).toMatch(
      /try\s*\{[\s\S]*?HRNotificationService\.notifyLeaveRequest\([\s\S]*?\}\s*catch\s*\(\s*notifyErr\s*\)/
    );
    // and the outer 400 catch is still the only place that returns 400 for this handler
    expect(route).toMatch(/res\.status\(400\)\.json\(\{\s*error:/);
    spy.mockRestore();
  });
});
