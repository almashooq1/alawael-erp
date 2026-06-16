/**
 * Functional unit tests for services/notifications/notification-enhanced.service.js
 */
'use strict';

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// ── Model mocks ─────────────────────────────────────────────────────────────
const mockTemplate = {
  findOne: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
};

const mockPreference = {
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
};

const mockBroadcast = {
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  create: jest.fn(),
};

const mockEscalation = {
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
};

const mockNotification = {
  find: jest.fn(),
  countDocuments: jest.fn(),
};

const mockUser = {
  findOne: jest.fn(),
  find: jest.fn(),
};

jest.mock('../../models/NotificationTemplate', () => mockTemplate);
jest.mock('../../models/NotificationPreference', () => mockPreference);
jest.mock('../../models/BroadcastMessage', () => mockBroadcast);
jest.mock('../../models/Escalation', () => mockEscalation);
jest.mock('../../models/Notification', () => mockNotification);
jest.mock('../../models/User', () => mockUser);

// ── Communication mock ───────────────────────────────────────────────────────
const mockSmsService = { sendSms: jest.fn() };
const mockWhatsappService = { sendTemplate: jest.fn(), sendText: jest.fn() };
const mockEmailService = { sendEmail: jest.fn() };
jest.mock('../../communication', () => ({
  smsService: mockSmsService,
  whatsappService: mockWhatsappService,
  emailService: mockEmailService,
}));

const service = require('../../services/notifications/notification-enhanced.service');

// ── Helpers ──────────────────────────────────────────────────────────────────
const makeTmpl = (overrides = {}) => ({
  _id: 'tmpl1',
  code: 'welcome',
  category: 'system',
  channels: ['database'],
  priority: 'normal',
  whatsappTemplateName: null,
  render: jest.fn().mockReturnValue({ subject: 'Hello', body: 'Body' }),
  ...overrides,
});

describe('NotificationEnhancedService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── sendFromTemplate ─────────────────────────────────────────────────────
  describe('sendFromTemplate()', () => {
    test('throws when template not found', async () => {
      mockTemplate.findOne.mockResolvedValue(null);
      await expect(service.sendFromTemplate('bad_code', {})).rejects.toThrow(
        'قالب الإشعار غير موجود: bad_code'
      );
    });

    test('sends via database channel and returns result', async () => {
      const tmpl = makeTmpl({ channels: ['database'] });
      mockTemplate.findOne.mockResolvedValue(tmpl);
      mockPreference.findOne.mockResolvedValue(null);
      mockTemplate.findByIdAndUpdate.mockResolvedValue({});

      const result = await service.sendFromTemplate('welcome', { _id: 'u1' }, {}, 'ar');
      expect(result).toMatchObject({ templateCode: 'welcome', channels: ['database'] });
      expect(tmpl.render).toHaveBeenCalledWith('ar', {});
      expect(mockTemplate.findByIdAndUpdate).toHaveBeenCalledWith(
        'tmpl1',
        expect.objectContaining({ $inc: { usageCount: 1 } })
      );
    });

    test('returns null when all channels filtered out (muted preference)', async () => {
      const tmpl = makeTmpl({ channels: ['sms'] });
      mockTemplate.findOne.mockResolvedValue(tmpl);
      mockPreference.findOne.mockResolvedValue({ isMuted: true });
      mockTemplate.findByIdAndUpdate.mockResolvedValue({});

      const result = await service.sendFromTemplate('welcome', { _id: 'u1' }, {});
      expect(result).toBeNull();
    });

    test('quiet hours: filters non-database channels for non-urgent template', async () => {
      const tmpl = makeTmpl({ channels: ['email', 'database'], priority: 'normal' });
      mockTemplate.findOne.mockResolvedValue(tmpl);
      mockPreference.findOne.mockResolvedValue({
        quietHoursStart: '00:00',
        quietHoursEnd: '23:59',
        isMuted: false,
      });
      mockTemplate.findByIdAndUpdate.mockResolvedValue({});

      const result = await service.sendFromTemplate('welcome', { _id: 'u1' }, {});
      expect(result.channels).toEqual(['database']);
    });

    test('urgent template bypasses quiet hours filter', async () => {
      const tmpl = makeTmpl({ channels: ['email', 'database'], priority: 'urgent' });
      mockTemplate.findOne.mockResolvedValue(tmpl);
      mockPreference.findOne.mockResolvedValue({
        quietHoursStart: '00:00',
        quietHoursEnd: '23:59',
        isMuted: false,
      });
      mockTemplate.findByIdAndUpdate.mockResolvedValue({});
      mockEmailService.sendEmail.mockResolvedValue({ ok: true });

      const result = await service.sendFromTemplate('welcome', { _id: 'u1', email: 'a@b.com' }, {});
      expect(result.channels).toEqual(['email', 'database']);
    });
  });

  // ── _filterByPreferences ─────────────────────────────────────────────────
  describe('_filterByPreferences()', () => {
    test('returns channels unchanged when no preference', () => {
      expect(service._filterByPreferences(['email', 'sms'], null)).toEqual(['email', 'sms']);
    });

    test('returns empty array when muted', () => {
      expect(service._filterByPreferences(['email', 'sms'], { isMuted: true })).toEqual([]);
    });

    test('filters channels based on channelX flags', () => {
      const pref = { isMuted: false, channelEmail: false, channelSms: true };
      expect(service._filterByPreferences(['email', 'sms'], pref)).toEqual(['sms']);
    });

    test('keeps channel when pref flag is undefined (not explicitly false)', () => {
      const pref = { isMuted: false };
      expect(service._filterByPreferences(['database'], pref)).toEqual(['database']);
    });
  });

  // ── _isQuietHours ────────────────────────────────────────────────────────
  describe('_isQuietHours()', () => {
    test('returns false when no preference', () => {
      expect(service._isQuietHours(null)).toBe(false);
    });

    test('returns false when quiet hours not configured', () => {
      expect(service._isQuietHours({})).toBe(false);
    });

    test('returns true when current time is within 00:00–23:59 window', () => {
      expect(service._isQuietHours({ quietHoursStart: '00:00', quietHoursEnd: '23:59' })).toBe(
        true
      );
    });
  });

  // ── _getSlaDeadlines ─────────────────────────────────────────────────────
  describe('_getSlaDeadlines()', () => {
    test.each([
      ['critical', { acknowledge: '30m', resolve: '4h' }],
      ['high', { acknowledge: '1h', resolve: '8h' }],
      ['medium', { acknowledge: '4h', resolve: '24h' }],
      ['low', { acknowledge: '24h', resolve: '72h' }],
    ])('priority %s returns correct SLA', (priority, expected) => {
      expect(service._getSlaDeadlines(priority)).toEqual(expected);
    });

    test('unknown priority falls back to medium SLA', () => {
      expect(service._getSlaDeadlines('unknown')).toEqual({ acknowledge: '4h', resolve: '24h' });
    });
  });

  // ── createEscalation ─────────────────────────────────────────────────────
  describe('createEscalation()', () => {
    test('creates escalation at level 1 with correct fields', async () => {
      const esc = { _id: 'esc1', currentLevel: 1 };
      mockEscalation.create.mockResolvedValue(esc);
      mockUser.findOne.mockResolvedValue({ _id: 'mgr1' });
      mockTemplate.findOne.mockResolvedValue(null); // sendFromTemplate fails silently

      const result = await service.createEscalation(
        'Incident',
        'inc1',
        'incident',
        'desc',
        'b1',
        'critical',
        'rep1'
      );

      expect(mockEscalation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          escalatableType: 'Incident',
          escalatableId: 'inc1',
          type: 'incident',
          priority: 'critical',
          currentLevel: 1,
          branchId: 'b1',
          description: 'desc',
          reportedBy: 'rep1',
          status: 'open',
        })
      );
      expect(result).toEqual(esc);
    });

    test('escalationHistory contains initial entry', async () => {
      mockEscalation.create.mockResolvedValue({ _id: 'esc2' });
      mockUser.findOne.mockResolvedValue(null);
      mockTemplate.findOne.mockResolvedValue(null);

      await service.createEscalation('Task', 't1', 'task', 'desc', 'b1', 'high');

      const createArg = mockEscalation.create.mock.calls[0][0];
      expect(createArg.escalationHistory).toHaveLength(1);
      expect(createArg.escalationHistory[0]).toMatchObject({ level: 1, reason: 'تصعيد أولي' });
    });
  });

  // ── autoEscalate ─────────────────────────────────────────────────────────
  describe('autoEscalate()', () => {
    test('throws when escalation not found', async () => {
      mockEscalation.findById.mockResolvedValue(null);
      await expect(service.autoEscalate('bad')).rejects.toThrow('التصعيد غير موجود');
    });

    test('returns escalation unchanged when already at max level 4', async () => {
      const esc = { _id: 'esc1', currentLevel: 4, escalationHistory: [] };
      mockEscalation.findById.mockResolvedValue(esc);

      const result = await service.autoEscalate('esc1');
      expect(result).toEqual(esc);
      expect(mockEscalation.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    test('increments level and sets slaBreached', async () => {
      const esc = { _id: 'esc1', currentLevel: 1, escalationHistory: [], branchId: 'b1' };
      const updated = { ...esc, currentLevel: 2, slaBreached: true };
      mockEscalation.findById.mockResolvedValueOnce(esc).mockResolvedValueOnce(updated);
      mockEscalation.findByIdAndUpdate.mockResolvedValue(updated);
      mockUser.findOne.mockResolvedValue({ _id: 'mgr2' });

      const result = await service.autoEscalate('esc1');
      expect(mockEscalation.findByIdAndUpdate).toHaveBeenCalledWith(
        'esc1',
        expect.objectContaining({ currentLevel: 2, slaBreached: true })
      );
      expect(result).toEqual(updated);
    });
  });

  // ── getNotifications ─────────────────────────────────────────────────────
  describe('getNotifications()', () => {
    test('returns paginated notifications with unread count', async () => {
      const chainMock = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockResolvedValue([{ _id: 'n1' }]),
      };
      mockNotification.find.mockReturnValue(chainMock);
      mockNotification.countDocuments.mockResolvedValue(5);

      const result = await service.getNotifications('u1', { limit: 10, skip: 0 });
      expect(result).toMatchObject({ notifications: [{ _id: 'n1' }], unreadCount: 5 });
    });

    test('returns empty result when Notification model unavailable', async () => {
      mockNotification.find.mockImplementation(() => {
        throw new Error('not found');
      });

      const result = await service.getNotifications('u1');
      expect(result).toEqual({ notifications: [], unreadCount: 0 });
    });

    test('applies unreadOnly filter when specified', async () => {
      const chainMock = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockResolvedValue([]),
      };
      mockNotification.find.mockReturnValue(chainMock);
      mockNotification.countDocuments.mockResolvedValue(0);

      await service.getNotifications('u1', { unreadOnly: true });
      expect(mockNotification.find).toHaveBeenCalledWith({ userId: 'u1', readAt: null });
    });
  });

  // ── CRUD methods ─────────────────────────────────────────────────────────
  describe('createTemplate()', () => {
    test('creates template with createdBy', async () => {
      mockTemplate.create.mockResolvedValue({ _id: 'tmpl2' });
      const result = await service.createTemplate({ code: 'T1' }, 'user1');
      expect(mockTemplate.create).toHaveBeenCalledWith({ code: 'T1', createdBy: 'user1' });
      expect(result).toEqual({ _id: 'tmpl2' });
    });
  });

  describe('updateTemplate()', () => {
    test('updates template with updatedBy', async () => {
      mockTemplate.findByIdAndUpdate.mockResolvedValue({ _id: 'tmpl1' });
      await service.updateTemplate('tmpl1', { isActive: false }, 'admin');
      expect(mockTemplate.findByIdAndUpdate).toHaveBeenCalledWith(
        'tmpl1',
        { isActive: false, updatedBy: 'admin' },
        { returnDocument: 'after' }
      );
    });
  });

  describe('getTemplates()', () => {
    test('queries by category filter when provided', async () => {
      const sortMock = { sort: jest.fn().mockResolvedValue([]) };
      mockTemplate.find.mockReturnValue(sortMock);

      await service.getTemplates({ category: 'system' });
      expect(mockTemplate.find).toHaveBeenCalledWith({ category: 'system' });
    });

    test('queries without filters when empty options', async () => {
      const sortMock = { sort: jest.fn().mockResolvedValue([]) };
      mockTemplate.find.mockReturnValue(sortMock);

      await service.getTemplates({});
      expect(mockTemplate.find).toHaveBeenCalledWith({});
    });
  });

  describe('updatePreferences()', () => {
    test('upserts preferences with correct options', async () => {
      mockPreference.findOneAndUpdate.mockResolvedValue({ userId: 'u1' });

      const result = await service.updatePreferences('u1', 'alerts', { channelSms: false });
      expect(mockPreference.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: 'u1', category: 'alerts' },
        { channelSms: false },
        { returnDocument: 'after', upsert: true }
      );
      expect(result).toEqual({ userId: 'u1' });
    });
  });

  describe('acknowledgeEscalation()', () => {
    test('sets status to acknowledged with timestamp', async () => {
      mockEscalation.findByIdAndUpdate.mockResolvedValue({ status: 'acknowledged' });

      const result = await service.acknowledgeEscalation('esc1', 'user1');
      expect(mockEscalation.findByIdAndUpdate).toHaveBeenCalledWith(
        'esc1',
        expect.objectContaining({ status: 'acknowledged' }),
        { returnDocument: 'after' }
      );
    });
  });

  describe('resolveEscalation()', () => {
    test('sets status to resolved with notes', async () => {
      mockEscalation.findByIdAndUpdate.mockResolvedValue({ status: 'resolved' });

      await service.resolveEscalation('esc1', 'user1', 'all fixed');
      expect(mockEscalation.findByIdAndUpdate).toHaveBeenCalledWith(
        'esc1',
        expect.objectContaining({ status: 'resolved', resolutionNotes: 'all fixed' }),
        { returnDocument: 'after' }
      );
    });
  });

  describe('createBroadcast()', () => {
    test('creates broadcast with senderId', async () => {
      mockBroadcast.create.mockResolvedValue({ _id: 'bc1' });

      await service.createBroadcast({ subject: 'Announcement' }, 'admin1');
      expect(mockBroadcast.create).toHaveBeenCalledWith({
        subject: 'Announcement',
        senderId: 'admin1',
      });
    });
  });

  describe('approveBroadcast()', () => {
    test('sets status to approved with approver', async () => {
      mockBroadcast.findByIdAndUpdate.mockResolvedValue({ status: 'approved' });

      await service.approveBroadcast('bc1', 'mgr1');
      expect(mockBroadcast.findByIdAndUpdate).toHaveBeenCalledWith(
        'bc1',
        expect.objectContaining({ status: 'approved', approvedBy: 'mgr1' }),
        { returnDocument: 'after' }
      );
    });
  });

  describe('getEscalations()', () => {
    test('queries by branchId and status filters', async () => {
      const populateMock = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue([]),
      };
      mockEscalation.find.mockReturnValue(populateMock);

      await service.getEscalations({ branchId: 'b1', status: 'open' });
      expect(mockEscalation.find).toHaveBeenCalledWith({ branchId: 'b1', status: 'open' });
    });
  });
});
