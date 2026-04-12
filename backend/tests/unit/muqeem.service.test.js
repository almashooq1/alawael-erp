/**
 * Unit Tests — MuqeemService
 * P#72 - Batch 33
 *
 * Singleton export (module.exports = new MuqeemService()). Uses axios (this.client).
 * Covers: authenticate, authHeaders, getResidenceInfo, getEstablishmentWorkers,
 *         renewResidence, issueExitReEntryVisa, issueFinalExitVisa,
 *         getExpiringResidencies, changeOccupation
 */

'use strict';

const mockPost = jest.fn();
const mockGet = jest.fn();

jest.mock('axios', () => ({
  create: jest.fn(() => ({
    post: mockPost,
    get: mockGet,
  })),
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

let service;

beforeEach(() => {
  jest.clearAllMocks();
  // Get fresh singleton via isolateModules
  jest.isolateModules(() => {
    service = require('../../services/muqeem.service');
  });
});

describe('MuqeemService', () => {
  /* ================================================================ */
  /*  authenticate                                                      */
  /* ================================================================ */
  describe('authenticate', () => {
    it('returns token on success', async () => {
      mockPost.mockResolvedValue({ data: { token: 'TOKEN-123' } });
      const token = await service.authenticate();
      expect(token).toBe('TOKEN-123');
    });

    it('caches token and reuses it', async () => {
      mockPost.mockResolvedValue({ data: { token: 'TOKEN-A' } });
      await service.authenticate();
      await service.authenticate();
      expect(mockPost).toHaveBeenCalledTimes(1);
    });

    it('supports access_token in response', async () => {
      mockPost.mockResolvedValue({ data: { access_token: 'AT-999' } });
      const token = await service.authenticate();
      expect(token).toBe('AT-999');
    });

    it('throws on auth failure', async () => {
      mockPost.mockRejectedValue(new Error('Network error'));
      await expect(service.authenticate()).rejects.toThrow('Muqeem authentication failed');
    });

    it('posts to /auth/token endpoint', async () => {
      mockPost.mockResolvedValue({ data: { token: 'T' } });
      await service.authenticate();
      expect(mockPost).toHaveBeenCalledWith(
        '/auth/token',
        expect.objectContaining({ username: expect.any(String) })
      );
    });
  });

  /* ================================================================ */
  /*  authHeaders                                                       */
  /* ================================================================ */
  describe('authHeaders', () => {
    it('returns Authorization Bearer header', async () => {
      mockPost.mockResolvedValue({ data: { token: 'TOK' } });
      const headers = await service.authHeaders();
      expect(headers).toEqual({ Authorization: 'Bearer TOK' });
    });
  });

  /* ================================================================ */
  /*  getResidenceInfo                                                  */
  /* ================================================================ */
  describe('getResidenceInfo', () => {
    beforeEach(() => {
      mockPost.mockResolvedValue({ data: { token: 'T' } });
    });

    it('returns success with data', async () => {
      mockGet.mockResolvedValue({ data: { name: 'Ahmad', iqama: '123' } });
      const res = await service.getResidenceInfo('123');
      expect(res.success).toBe(true);
      expect(res.data.name).toBe('Ahmad');
    });

    it('calls correct endpoint', async () => {
      mockGet.mockResolvedValue({ data: {} });
      await service.getResidenceInfo('456');
      expect(mockGet).toHaveBeenCalledWith(
        '/residence/info/456',
        expect.objectContaining({ headers: expect.any(Object) })
      );
    });

    it('returns success:false on error', async () => {
      mockGet.mockRejectedValue({ message: 'Not found', response: { data: 'err' } });
      const res = await service.getResidenceInfo('999');
      expect(res.success).toBe(false);
      expect(res.error).toBe('err');
    });
  });

  /* ================================================================ */
  /*  getEstablishmentWorkers                                           */
  /* ================================================================ */
  describe('getEstablishmentWorkers', () => {
    beforeEach(() => {
      mockPost.mockResolvedValue({ data: { token: 'T' } });
    });

    it('returns success with worker list', async () => {
      mockGet.mockResolvedValue({ data: [{ name: 'Worker1' }] });
      const res = await service.getEstablishmentWorkers();
      expect(res.success).toBe(true);
    });

    it('passes page and limit params', async () => {
      mockGet.mockResolvedValue({ data: [] });
      await service.getEstablishmentWorkers(2, 25);
      expect(mockGet).toHaveBeenCalledWith(
        '/establishment/workers',
        expect.objectContaining({
          params: expect.objectContaining({ page: 2, limit: 25 }),
        })
      );
    });

    it('returns success:false on error', async () => {
      mockGet.mockRejectedValue({ message: 'fail' });
      const res = await service.getEstablishmentWorkers();
      expect(res.success).toBe(false);
    });
  });

  /* ================================================================ */
  /*  renewResidence                                                    */
  /* ================================================================ */
  describe('renewResidence', () => {
    beforeEach(() => {
      mockPost.mockResolvedValueOnce({ data: { token: 'T' } });
    });

    it('returns success on renewal', async () => {
      mockPost.mockResolvedValue({ data: { renewed: true } });
      const res = await service.renewResidence('123', '2year');
      expect(res.success).toBe(true);
    });

    it('defaults to 1year renewal period', async () => {
      mockPost.mockResolvedValue({ data: {} });
      await service.renewResidence('123');
      const call = mockPost.mock.calls.find(c => c[0] === '/residence/renew');
      expect(call[1].renewalPeriod).toBe('1year');
    });

    it('returns success:false on error', async () => {
      mockPost.mockRejectedValue({ message: 'fail' });
      const res = await service.renewResidence('123');
      expect(res.success).toBe(false);
    });
  });

  /* ================================================================ */
  /*  issueExitReEntryVisa                                              */
  /* ================================================================ */
  describe('issueExitReEntryVisa', () => {
    beforeEach(() => {
      mockPost.mockResolvedValueOnce({ data: { token: 'T' } });
    });

    it('returns success', async () => {
      mockPost.mockResolvedValue({ data: { visaId: 'V-1' } });
      const res = await service.issueExitReEntryVisa('123', { duration: '60days' });
      expect(res.success).toBe(true);
    });

    it('uses default visa details', async () => {
      mockPost.mockResolvedValue({ data: {} });
      await service.issueExitReEntryVisa('123');
      const call = mockPost.mock.calls.find(c => c[0] === '/visa/exit-reentry');
      expect(call[1].duration).toBe('90days');
      expect(call[1].numberOfTrips).toBe('multiple');
      expect(call[1].purpose).toBe('personal');
    });

    it('returns success:false on error', async () => {
      mockPost.mockRejectedValue({ message: 'fail' });
      const res = await service.issueExitReEntryVisa('123');
      expect(res.success).toBe(false);
    });
  });

  /* ================================================================ */
  /*  issueFinalExitVisa                                                */
  /* ================================================================ */
  describe('issueFinalExitVisa', () => {
    beforeEach(() => {
      mockPost.mockResolvedValueOnce({ data: { token: 'T' } });
    });

    it('returns success', async () => {
      mockPost.mockResolvedValue({ data: { status: 'issued' } });
      const res = await service.issueFinalExitVisa('123');
      expect(res.success).toBe(true);
    });

    it('posts to /visa/final-exit', async () => {
      mockPost.mockResolvedValue({ data: {} });
      await service.issueFinalExitVisa('123');
      const call = mockPost.mock.calls.find(c => c[0] === '/visa/final-exit');
      expect(call).toBeDefined();
      expect(call[1].iqamaNumber).toBe('123');
    });

    it('returns success:false on error', async () => {
      mockPost.mockRejectedValue({ message: 'fail' });
      const res = await service.issueFinalExitVisa('123');
      expect(res.success).toBe(false);
    });
  });

  /* ================================================================ */
  /*  getExpiringResidencies                                            */
  /* ================================================================ */
  describe('getExpiringResidencies', () => {
    beforeEach(() => {
      mockPost.mockResolvedValue({ data: { token: 'T' } });
    });

    it('returns success with data', async () => {
      mockGet.mockResolvedValue({ data: [{ iqama: '1' }] });
      const res = await service.getExpiringResidencies(60);
      expect(res.success).toBe(true);
    });

    it('defaults to 90 daysAhead', async () => {
      mockGet.mockResolvedValue({ data: [] });
      await service.getExpiringResidencies();
      expect(mockGet).toHaveBeenCalledWith(
        '/residence/expiring',
        expect.objectContaining({
          params: expect.objectContaining({ daysAhead: 90 }),
        })
      );
    });

    it('returns success:false on error', async () => {
      mockGet.mockRejectedValue({ message: 'fail' });
      const res = await service.getExpiringResidencies();
      expect(res.success).toBe(false);
    });
  });

  /* ================================================================ */
  /*  changeOccupation                                                  */
  /* ================================================================ */
  describe('changeOccupation', () => {
    beforeEach(() => {
      mockPost.mockResolvedValueOnce({ data: { token: 'T' } });
    });

    it('returns success', async () => {
      mockPost.mockResolvedValue({ data: { updated: true } });
      const res = await service.changeOccupation('123', 'Nurse');
      expect(res.success).toBe(true);
    });

    it('posts correct payload', async () => {
      mockPost.mockResolvedValue({ data: {} });
      await service.changeOccupation('123', 'Engineer');
      const call = mockPost.mock.calls.find(c => c[0] === '/worker/change-occupation');
      expect(call[1].iqamaNumber).toBe('123');
      expect(call[1].newOccupation).toBe('Engineer');
    });

    it('returns success:false on error', async () => {
      mockPost.mockRejectedValue({ message: 'fail' });
      const res = await service.changeOccupation('123', 'X');
      expect(res.success).toBe(false);
    });
  });
});
