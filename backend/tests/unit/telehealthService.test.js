/**
 * Unit tests for services/telehealthService.js
 * TelehealthService — Teleconsultations, Waiting Rooms, Prescriptions, Agora tokens
 */

/* ─── mock models ───────────────────────────────────────────────────── */

const mockTeleconsultation = {
  _id: 'c1',
  uuid: 'uuid-1',
  consultationNumber: 'TC-2025-00001',
  roomId: 'room_abc',
  branch: 'b1',
  beneficiary: 'ben1',
  provider: 'prov1',
  status: 'scheduled',
  scheduledAt: new Date('2025-06-01T10:00:00Z'),
  scheduledDurationMinutes: 30,
  specialty: 'rehabilitation',
  type: 'video',
  startedAt: new Date(Date.now() - 30 * 60000),
  endedAt: null,
  therapy_sessions: [],
  updateOne: jest.fn().mockResolvedValue(undefined),
};

const mockWaitingRoom = {
  _id: 'wr1',
  uuid: 'uuid-wr',
  status: 'waiting',
  queuePosition: 1,
};

const mockPrescription = {
  _id: 'rx1',
  prescriptionNumber: 'RX-2025-00001',
  updateOne: jest.fn().mockResolvedValue(undefined),
};

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234-5678-abcd-efgh'),
}));

jest.mock('axios', () => ({
  post: jest
    .fn()
    .mockResolvedValue({
      data: { appointment_id: 'ext1', prescription_id: 'rx_ext1', status: 'issued' },
    }),
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../../models/Telehealth', () => ({
  Teleconsultation: {
    create: jest.fn(),
    findById: jest.fn(),
    countDocuments: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
  VirtualSession: {},
  RemotePrescription: {
    create: jest.fn(),
    findById: jest.fn(),
    countDocuments: jest.fn(),
  },
  TelehealthWaitingRoom: {
    create: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
    find: jest.fn(),
  },
  SessionRecording: {},
  TelehealthDevice: {},
  ProviderAvailabilitySlot: {},
  TeleconsultationParticipant: {
    create: jest.fn(),
    updateMany: jest.fn(),
  },
}));

const {
  Teleconsultation,
  RemotePrescription,
  TelehealthWaitingRoom,
  TeleconsultationParticipant,
} = require('../../models/Telehealth');

const telehealthService = require('../../services/telehealthService');

/* ─── helpers ───────────────────────────────────────────────────────── */

function freshConsultation(overrides = {}) {
  return {
    ...mockTeleconsultation,
    updateOne: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

/* ─── tests ─────────────────────────────────────────────────────────── */

describe('TelehealthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default stubs
    Teleconsultation.countDocuments.mockResolvedValue(5);
    RemotePrescription.countDocuments.mockResolvedValue(3);
  });

  // ── generateAgoraToken ───────────────────────────────────────────

  describe('generateAgoraToken', () => {
    it('generates dev token when env vars are missing', () => {
      delete process.env.AGORA_APP_ID;
      delete process.env.AGORA_APP_CERTIFICATE;

      const token = telehealthService.generateAgoraToken('room1', 'uid1', 'publisher');

      expect(token).toContain('dev_token_');
    });
  });

  // ── scheduleConsultation ─────────────────────────────────────────

  describe('scheduleConsultation', () => {
    it('creates consultation with auto-generated number', async () => {
      const created = freshConsultation();
      Teleconsultation.create.mockResolvedValue(created);

      const result = await telehealthService.scheduleConsultation({
        beneficiaryId: 'ben1',
        providerId: 'prov1',
        type: 'video',
        specialty: 'rehabilitation',
        scheduledAt: new Date(),
      });

      expect(result._id).toBe('c1');
      expect(Teleconsultation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          consultationNumber: expect.stringMatching(/^TC-\d{4}-00006$/),
          type: 'video',
        })
      );
    });

    it('syncs with external platform when specified', async () => {
      const created = freshConsultation();
      Teleconsultation.create.mockResolvedValue(created);
      // syncWithSaudiPlatform will call findById, then axios
      Teleconsultation.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue({
            ...created,
            beneficiary: { nationalId: '111' },
            provider: { licenseNumber: 'L1', mawidProviderId: 'MW1' },
          }),
        }),
      });

      const result = await telehealthService.scheduleConsultation({
        beneficiaryId: 'ben1',
        providerId: 'prov1',
        type: 'video',
        specialty: 'rehabilitation',
        scheduledAt: new Date(),
        platformSource: 'sehhaty',
      });

      expect(result._id).toBe('c1');
    });

    it('uses defaults for optional fields', async () => {
      Teleconsultation.create.mockResolvedValue(freshConsultation());

      await telehealthService.scheduleConsultation({
        beneficiaryId: 'ben1',
        providerId: 'prov1',
        type: 'video',
        scheduledAt: new Date(),
      });

      expect(Teleconsultation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          scheduledDurationMinutes: 30,
          priority: 'routine',
          isEmergency: false,
          platformSource: 'internal',
        })
      );
    });
  });

  // ── startConsultation ────────────────────────────────────────────

  describe('startConsultation', () => {
    it('starts consultation and returns tokens', async () => {
      const c = freshConsultation({ status: 'scheduled' });
      Teleconsultation.findById.mockResolvedValue(c);
      TelehealthWaitingRoom.findOneAndUpdate.mockResolvedValue(undefined);

      const result = await telehealthService.startConsultation('c1');

      expect(result.providerToken).toContain('dev_token_');
      expect(result.patientToken).toContain('dev_token_');
      expect(result.roomId).toBe('room_abc');
      expect(c.updateOne).toHaveBeenCalledWith(expect.objectContaining({ status: 'in_progress' }));
    });

    it('throws when consultation not found', async () => {
      Teleconsultation.findById.mockResolvedValue(null);

      await expect(telehealthService.startConsultation('bad')).rejects.toThrow(
        'الاستشارة غير موجودة'
      );
    });

    it('throws when status not allowed', async () => {
      const c = freshConsultation({ status: 'completed' });
      Teleconsultation.findById.mockResolvedValue(c);

      await expect(telehealthService.startConsultation('c1')).rejects.toThrow('لا يمكن بدء الجلسة');
    });
  });

  // ── endConsultation ──────────────────────────────────────────────

  describe('endConsultation', () => {
    it('ends consultation and returns populated data', async () => {
      const c = freshConsultation({ status: 'in_progress' });
      Teleconsultation.findById
        .mockResolvedValueOnce(c) // first call
        .mockReturnValueOnce({
          // second call (populated)
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue({ ...c, status: 'completed' }),
          }),
        });
      TeleconsultationParticipant.updateMany.mockResolvedValue(undefined);

      const result = await telehealthService.endConsultation('c1', {
        clinicalNotes: 'Good progress',
      });

      expect(c.updateOne).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }));
    });

    it('throws when not in progress', async () => {
      const c = freshConsultation({ status: 'scheduled' });
      Teleconsultation.findById.mockResolvedValue(c);

      await expect(telehealthService.endConsultation('c1')).rejects.toThrow(
        'الجلسة ليست جارية حالياً'
      );
    });

    it('schedules follow-up when requested', async () => {
      const c = freshConsultation({ status: 'in_progress' });
      Teleconsultation.findById.mockResolvedValueOnce(c).mockReturnValueOnce({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue({ ...c, status: 'completed' }),
        }),
      });
      Teleconsultation.create.mockResolvedValue(freshConsultation());
      TeleconsultationParticipant.updateMany.mockResolvedValue(undefined);

      await telehealthService.endConsultation('c1', {
        scheduleFollowUp: true,
        followUpDays: 7,
      });

      // scheduleConsultation called internally for follow-up
      expect(Teleconsultation.create).toHaveBeenCalled();
    });
  });

  // ── joinWaitingRoom ──────────────────────────────────────────────

  describe('joinWaitingRoom', () => {
    it('creates waiting room entry', async () => {
      Teleconsultation.findById.mockResolvedValue(freshConsultation());
      TelehealthWaitingRoom.findOne.mockResolvedValue(null);
      TelehealthWaitingRoom.countDocuments.mockResolvedValue(2);
      TelehealthWaitingRoom.create.mockResolvedValue(mockWaitingRoom);

      const result = await telehealthService.joinWaitingRoom('c1', { deviceType: 'mobile' });

      expect(result.status).toBe('waiting');
      expect(TelehealthWaitingRoom.create).toHaveBeenCalledWith(
        expect.objectContaining({ queuePosition: 3 })
      );
    });

    it('returns existing entry if already waiting', async () => {
      Teleconsultation.findById.mockResolvedValue(freshConsultation());
      TelehealthWaitingRoom.findOne.mockResolvedValue(mockWaitingRoom);

      const result = await telehealthService.joinWaitingRoom('c1');

      expect(result).toBe(mockWaitingRoom);
      expect(TelehealthWaitingRoom.create).not.toHaveBeenCalled();
    });

    it('throws when consultation not found', async () => {
      Teleconsultation.findById.mockResolvedValue(null);

      await expect(telehealthService.joinWaitingRoom('bad')).rejects.toThrow(
        'الاستشارة غير موجودة'
      );
    });
  });

  // ── updateDeviceTest ─────────────────────────────────────────────

  describe('updateDeviceTest', () => {
    it('updates device test results and checks readiness', async () => {
      TelehealthWaitingRoom.findByIdAndUpdate.mockResolvedValue({
        cameraTested: true,
        microphoneTested: true,
        connectionTested: true,
      });

      const result = await telehealthService.updateDeviceTest('wr1', {
        cameraTested: true,
        microphoneTested: true,
        connectionTested: true,
        connectionQuality: 'good',
      });

      expect(result.isReady).toBe(true);
    });

    it('returns not ready when tests incomplete', async () => {
      TelehealthWaitingRoom.findByIdAndUpdate.mockResolvedValue({
        cameraTested: true,
        microphoneTested: false,
        connectionTested: true,
      });

      const result = await telehealthService.updateDeviceTest('wr1', {
        cameraTested: true,
        microphoneTested: false,
        connectionTested: true,
      });

      expect(result.isReady).toBe(false);
    });
  });

  // ── addParticipant ───────────────────────────────────────────────

  describe('addParticipant', () => {
    it('creates participant and returns join info', async () => {
      const c = freshConsultation({ status: 'in_progress' });
      Teleconsultation.findById.mockResolvedValue(c);
      TeleconsultationParticipant.create.mockResolvedValue({
        _id: 'part1',
      });

      const result = await telehealthService.addParticipant('c1', {
        type: 'family_member',
        name: 'Ahmed',
        phone: '0501234567',
        relation: 'father',
      });

      expect(result.participantId).toBe('part1');
      expect(result.agoraToken).toContain('dev_token_');
      expect(result.roomId).toBe('room_abc');
    });

    it('throws when consultation not found', async () => {
      Teleconsultation.findById.mockResolvedValue(null);

      await expect(telehealthService.addParticipant('bad', { type: 'observer' })).rejects.toThrow(
        'الاستشارة غير موجودة'
      );
    });

    it('throws when session not active', async () => {
      const c = freshConsultation({ status: 'completed' });
      Teleconsultation.findById.mockResolvedValue(c);

      await expect(telehealthService.addParticipant('c1', { type: 'observer' })).rejects.toThrow(
        'الجلسة غير نشطة'
      );
    });
  });

  // ── detectAndAdjustQuality ───────────────────────────────────────

  describe('detectAndAdjustQuality', () => {
    it('returns excellent for high bandwidth', async () => {
      Teleconsultation.findByIdAndUpdate.mockResolvedValue(undefined);

      const result = await telehealthService.detectAndAdjustQuality('c1', 3000);

      expect(result.quality).toBe('excellent');
      expect(result.resolution).toBe('1080p');
      expect(result.framerate).toBe(30);
    });

    it('returns good for medium bandwidth', async () => {
      Teleconsultation.findByIdAndUpdate.mockResolvedValue(undefined);

      const result = await telehealthService.detectAndAdjustQuality('c1', 1500);

      expect(result.quality).toBe('good');
      expect(result.resolution).toBe('720p');
    });

    it('returns fair for low bandwidth', async () => {
      Teleconsultation.findByIdAndUpdate.mockResolvedValue(undefined);

      const result = await telehealthService.detectAndAdjustQuality('c1', 750);

      expect(result.quality).toBe('fair');
      expect(result.resolution).toBe('480p');
    });

    it('returns poor for very low bandwidth', async () => {
      Teleconsultation.findByIdAndUpdate.mockResolvedValue(undefined);

      const result = await telehealthService.detectAndAdjustQuality('c1', 200);

      expect(result.quality).toBe('poor');
      expect(result.resolution).toBe('360p');
      expect(result.bitrate).toBe(300);
    });
  });

  // ── issuePrescription ────────────────────────────────────────────

  describe('issuePrescription', () => {
    it('creates prescription and marks as issued', async () => {
      Teleconsultation.findById.mockResolvedValue(freshConsultation());
      RemotePrescription.create.mockResolvedValue(mockPrescription);
      RemotePrescription.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue({
            ...mockPrescription,
            prescriber: { name: 'Dr. X', licenseNumber: 'L1' },
            beneficiary: { name: 'Patient', nationalId: '111' },
          }),
        }),
      });

      const result = await telehealthService.issuePrescription('c1', 'prov1', {
        type: 'medication',
        medications: [{ name: 'Med A', dose: '10mg' }],
      });

      expect(result.prescriptionNumber).toBe('RX-2025-00001');
      expect(mockPrescription.updateOne).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'issued' })
      );
    });

    it('throws when consultation not found', async () => {
      Teleconsultation.findById.mockResolvedValue(null);

      await expect(telehealthService.issuePrescription('bad', 'prov1', {})).rejects.toThrow(
        'الاستشارة غير موجودة'
      );
    });

    it('sends to Wasfaty when requested', async () => {
      const axios = require('axios');
      Teleconsultation.findById.mockResolvedValue(freshConsultation());
      RemotePrescription.create.mockResolvedValue(mockPrescription);
      RemotePrescription.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue({
            ...mockPrescription,
            beneficiary: { nationalId: '111' },
            prescriber: { licenseNumber: 'L1' },
            medications: [{ name: 'Med', dose: '5mg' }],
            isControlledSubstance: false,
          }),
        }),
      });

      // Set env so Wasfaty goes through
      process.env.WASFATY_API_KEY = 'test-key';
      axios.post.mockResolvedValue({ data: { prescription_id: 'rx_ext', status: 'issued' } });

      await telehealthService.issuePrescription('c1', 'prov1', {
        sendToWasfaty: true,
        medications: [{ name: 'Med', dose: '5mg' }],
      });

      expect(mockPrescription.updateOne).toHaveBeenCalledWith(
        expect.objectContaining({ wasfatyPrescriptionId: 'rx_ext', status: 'sent' })
      );

      delete process.env.WASFATY_API_KEY;
    });
  });

  // ── sendToWasfaty ────────────────────────────────────────────────

  describe('sendToWasfaty', () => {
    it('returns error when API key not set', async () => {
      delete process.env.WASFATY_API_KEY;
      RemotePrescription.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockPrescription),
        }),
      });

      const result = await telehealthService.sendToWasfaty(mockPrescription);

      expect(result.success).toBe(false);
    });
  });

  // ── getDashboardStats ────────────────────────────────────────────

  describe('getDashboardStats', () => {
    it('returns all stats counts', async () => {
      Teleconsultation.countDocuments
        .mockResolvedValueOnce(5) // todayCount
        .mockResolvedValueOnce(2) // activeCount
        .mockResolvedValueOnce(3) // completedToday
        .mockResolvedValueOnce(20); // thisWeekCount

      const result = await telehealthService.getDashboardStats('b1');

      expect(result.todayCount).toBe(5);
      expect(result.activeCount).toBe(2);
      expect(result.completedToday).toBe(3);
      expect(result.thisWeekCount).toBe(20);
    });
  });

  // ── getProviderQueue ─────────────────────────────────────────────

  describe('getProviderQueue', () => {
    it('returns waiting room queue', async () => {
      TelehealthWaitingRoom.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([mockWaitingRoom]),
            }),
          }),
        }),
      });

      const result = await telehealthService.getProviderQueue('b1', 'prov1');

      expect(result).toHaveLength(1);
    });
  });
});
