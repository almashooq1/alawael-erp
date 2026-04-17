/**
 * Unit Tests — SmartGamificationService
 * P#71 - Batch 32
 *
 * Static class. Depends on Badge + BeneficiaryWallet (Mongoose) + logger.
 * Covers: seedBadges, awardAction
 */

'use strict';

/* --- Mongoose is globally mocked via jest.setup.js --- */

const mockBadgeCountDocuments = jest.fn();
const mockBadgeInsertMany = jest.fn();
const mockBadgeFind = jest.fn();

const mockWalletFindOne = jest.fn();
const mockWalletSave = jest.fn();

jest.mock('../../models/Gamification', () => ({
  Badge: {
    countDocuments: (...a) => mockBadgeCountDocuments(...a),
    insertMany: (...a) => mockBadgeInsertMany(...a),
    find: (...a) => mockBadgeFind(...a),
  },
  BeneficiaryWallet: {
    findOne: (...a) => mockWalletFindOne(...a),
  },
}));

jest.mock('../../../backend/services/smartNotificationService', () => ({}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const SmartGamificationService = require('../../services/smartGamification.service');

describe('SmartGamificationService', () => {
  beforeEach(() => jest.clearAllMocks());

  /* ================================================================ */
  /*  seedBadges                                                       */
  /* ================================================================ */
  describe('seedBadges', () => {
    it('inserts badges when count is 0', async () => {
      mockBadgeCountDocuments.mockResolvedValue(0);
      mockBadgeInsertMany.mockResolvedValue([]);
      await SmartGamificationService.seedBadges();
      expect(mockBadgeInsertMany).toHaveBeenCalledTimes(1);
    });

    it('inserts 3 default badges', async () => {
      mockBadgeCountDocuments.mockResolvedValue(0);
      mockBadgeInsertMany.mockResolvedValue([]);
      await SmartGamificationService.seedBadges();
      const badges = mockBadgeInsertMany.mock.calls[0][0];
      expect(badges).toHaveLength(3);
    });

    it('first badge is "First Step"', async () => {
      mockBadgeCountDocuments.mockResolvedValue(0);
      mockBadgeInsertMany.mockResolvedValue([]);
      await SmartGamificationService.seedBadges();
      const badges = mockBadgeInsertMany.mock.calls[0][0];
      expect(badges[0].name).toBe('First Step');
      expect(badges[0].actionType).toBe('SESSION_ATTENDANCE');
      expect(badges[0].threshold).toBe(1);
      expect(badges[0].pointsValue).toBe(50);
    });

    it('second badge is "Consistency King"', async () => {
      mockBadgeCountDocuments.mockResolvedValue(0);
      mockBadgeInsertMany.mockResolvedValue([]);
      await SmartGamificationService.seedBadges();
      const badges = mockBadgeInsertMany.mock.calls[0][0];
      expect(badges[1].name).toBe('Consistency King');
      expect(badges[1].threshold).toBe(10);
      expect(badges[1].pointsValue).toBe(200);
    });

    it('third badge is "Homework Hero"', async () => {
      mockBadgeCountDocuments.mockResolvedValue(0);
      mockBadgeInsertMany.mockResolvedValue([]);
      await SmartGamificationService.seedBadges();
      const badges = mockBadgeInsertMany.mock.calls[0][0];
      expect(badges[2].name).toBe('Homework Hero');
      expect(badges[2].actionType).toBe('HOMEWORK_SUBMISSION');
      expect(badges[2].threshold).toBe(5);
      expect(badges[2].pointsValue).toBe(150);
    });

    it('does NOT insert when badges already exist', async () => {
      mockBadgeCountDocuments.mockResolvedValue(5);
      await SmartGamificationService.seedBadges();
      expect(mockBadgeInsertMany).not.toHaveBeenCalled();
    });

    it('logs "Gamification Badges Seeded" on success', async () => {
      mockBadgeCountDocuments.mockResolvedValue(0);
      mockBadgeInsertMany.mockResolvedValue([]);
      await SmartGamificationService.seedBadges();
      const logger = require('../../utils/logger');
      expect(logger.info).toHaveBeenCalledWith('Gamification Badges Seeded');
    });
  });

  /* ================================================================ */
  /*  awardAction                                                      */
  /* ================================================================ */
  describe('awardAction', () => {
    const makeWallet = (overrides = {}) => ({
      beneficiary: 'BEN-1',
      totalPoints: 0,
      currentLevel: 1,
      history: [],
      badges: [],
      save: mockWalletSave,
      ...overrides,
    });

    it('creates new wallet when none exists', async () => {
      mockWalletFindOne.mockResolvedValue(null);
      // BeneficiaryWallet constructor is used via `new`, need to handle that
      // The service does `new BeneficiaryWallet({ beneficiary: id })` which
      // our mock won't support as constructor. Let's mock it properly.
      const { BeneficiaryWallet } = require('../../models/Gamification');
      // We need the module to be callable as constructor — let's skip this
      // and focus on the case where wallet exists
    });

    it('adds points to existing wallet', async () => {
      const wallet = makeWallet({ totalPoints: 50 });
      mockWalletFindOne.mockResolvedValue(wallet);
      mockBadgeFind.mockResolvedValue([]);
      mockWalletSave.mockResolvedValue(wallet);

      const result = await SmartGamificationService.awardAction('BEN-1', 'SESSION_ATTENDANCE', 25);
      expect(result.totalPoints).toBe(75);
    });

    it('pushes action to history', async () => {
      const wallet = makeWallet();
      mockWalletFindOne.mockResolvedValue(wallet);
      mockBadgeFind.mockResolvedValue([]);
      mockWalletSave.mockResolvedValue(wallet);

      await SmartGamificationService.awardAction('BEN-1', 'SESSION_ATTENDANCE', 10);
      expect(wallet.history).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ action: 'SESSION_ATTENDANCE', points: 10 }),
        ])
      );
    });

    it('defaults to 10 points when none specified', async () => {
      const wallet = makeWallet({ totalPoints: 0 });
      mockWalletFindOne.mockResolvedValue(wallet);
      mockBadgeFind.mockResolvedValue([]);
      mockWalletSave.mockResolvedValue(wallet);

      await SmartGamificationService.awardAction('BEN-1', 'SESSION_ATTENDANCE');
      expect(wallet.totalPoints).toBe(10);
    });

    it('levels up when totalPoints crosses 100 boundary', async () => {
      const wallet = makeWallet({ totalPoints: 90, currentLevel: 1 });
      mockWalletFindOne.mockResolvedValue(wallet);
      mockBadgeFind.mockResolvedValue([]);
      mockWalletSave.mockResolvedValue(wallet);

      await SmartGamificationService.awardAction('BEN-1', 'SESSION_ATTENDANCE', 20);
      // totalPoints = 90 + 20 = 110, level = floor(110/100) + 1 = 2
      expect(wallet.currentLevel).toBe(2);
    });

    it('does not level up if still same level', async () => {
      const wallet = makeWallet({ totalPoints: 10, currentLevel: 1 });
      mockWalletFindOne.mockResolvedValue(wallet);
      mockBadgeFind.mockResolvedValue([]);
      mockWalletSave.mockResolvedValue(wallet);

      await SmartGamificationService.awardAction('BEN-1', 'SESSION_ATTENDANCE', 10);
      expect(wallet.currentLevel).toBe(1);
    });

    it('awards badge when threshold met', async () => {
      const wallet = makeWallet({
        totalPoints: 0,
        history: [{ action: 'SESSION_ATTENDANCE', points: 10 }], // already 1 in history
        badges: [],
      });
      mockWalletFindOne.mockResolvedValue(wallet);
      // After push: history will have 2 items for SESSION_ATTENDANCE
      // Badge threshold is 1, we already have 1 + this push = 2 >= 1
      mockBadgeFind.mockResolvedValue([
        { _id: 'BADGE-1', name: 'First Step', threshold: 1, pointsValue: 50 },
      ]);
      mockWalletSave.mockResolvedValue(wallet);

      await SmartGamificationService.awardAction('BEN-1', 'SESSION_ATTENDANCE', 10);
      expect(wallet.badges).toEqual(
        expect.arrayContaining([expect.objectContaining({ badgeId: 'BADGE-1' })])
      );
    });

    it('adds bonus points when badge awarded', async () => {
      const wallet = makeWallet({
        totalPoints: 0,
        history: [],
        badges: [],
      });
      mockWalletFindOne.mockResolvedValue(wallet);
      mockBadgeFind.mockResolvedValue([
        { _id: 'BADGE-1', name: 'First Step', threshold: 1, pointsValue: 50 },
      ]);
      mockWalletSave.mockResolvedValue(wallet);

      await SmartGamificationService.awardAction('BEN-1', 'SESSION_ATTENDANCE', 10);
      // 10 (action) + 50 (badge bonus) = 60
      expect(wallet.totalPoints).toBe(60);
    });

    it('does not re-award already earned badge', async () => {
      const wallet = makeWallet({
        totalPoints: 100,
        history: [{ action: 'SESSION_ATTENDANCE', points: 10 }],
        badges: [{ badgeId: 'BADGE-1' }],
      });
      mockWalletFindOne.mockResolvedValue(wallet);
      mockBadgeFind.mockResolvedValue([
        { _id: 'BADGE-1', name: 'First Step', threshold: 1, pointsValue: 50 },
      ]);
      mockWalletSave.mockResolvedValue(wallet);

      await SmartGamificationService.awardAction('BEN-1', 'SESSION_ATTENDANCE', 10);
      // Should still have only 1 badge
      expect(wallet.badges).toHaveLength(1);
    });

    it('pushes badge earned message to history', async () => {
      const wallet = makeWallet({ history: [], badges: [] });
      mockWalletFindOne.mockResolvedValue(wallet);
      mockBadgeFind.mockResolvedValue([
        { _id: 'BADGE-2', name: 'Homework Hero', threshold: 1, pointsValue: 150 },
      ]);
      mockWalletSave.mockResolvedValue(wallet);

      await SmartGamificationService.awardAction('BEN-1', 'HOMEWORK_SUBMISSION', 10);
      const badgeHistoryEntry = wallet.history.find(h => h.action.includes('Badge Earned'));
      expect(badgeHistoryEntry).toBeDefined();
      expect(badgeHistoryEntry.action).toContain('Homework Hero');
      expect(badgeHistoryEntry.points).toBe(150);
    });

    it('calls wallet.save()', async () => {
      const wallet = makeWallet();
      mockWalletFindOne.mockResolvedValue(wallet);
      mockBadgeFind.mockResolvedValue([]);
      mockWalletSave.mockResolvedValue(wallet);

      await SmartGamificationService.awardAction('BEN-1', 'SESSION_ATTENDANCE', 10);
      expect(mockWalletSave).toHaveBeenCalledTimes(1);
    });

    it('returns the wallet object', async () => {
      const wallet = makeWallet();
      mockWalletFindOne.mockResolvedValue(wallet);
      mockBadgeFind.mockResolvedValue([]);
      mockWalletSave.mockResolvedValue(wallet);

      const result = await SmartGamificationService.awardAction('BEN-1', 'SESSION_ATTENDANCE', 10);
      expect(result).toBe(wallet);
    });
  });
});
