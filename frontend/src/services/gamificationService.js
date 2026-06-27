/**
 * Gamification Service — API layer for gamification module
 * واجهة برمجة نظام التحفيز والشارات
 */

import apiClient from './api.client';

const gamificationService = {
  /** Get full gamification profile for a beneficiary */
  getProfile: async (beneficiaryId) => {
    try {
      const res = await apiClient.get(`/api/v1/gamification/profile/${beneficiaryId}`);
      return res?.data?.data || res?.data || null;
    } catch (err) {
      console.warn('gamificationService.getProfile', err);
      return null;
    }
  },

  /** Award points to a beneficiary */
  awardPoints: async (beneficiaryId, points, reason) => {
    try {
      const res = await apiClient.post('/api/v1/gamification/award-points', {
        beneficiaryId,
        points,
        reason,
      });
      return res?.data?.data || null;
    } catch (err) {
      console.warn('gamificationService.awardPoints', err);
      return null;
    }
  },

  /** Get leaderboard */
  getLeaderboard: async (branchId = null, limit = 20) => {
    try {
      const params = new URLSearchParams();
      if (branchId) params.append('branchId', branchId);
      params.append('limit', String(limit));
      const res = await apiClient.get(`/api/v1/gamification/leaderboard?${params.toString()}`);
      return res?.data?.data || [];
    } catch (err) {
      console.warn('gamificationService.getLeaderboard', err);
      return [];
    }
  },

  /** Create a challenge for a beneficiary */
  createChallenge: async (beneficiaryId, challengeData) => {
    try {
      const res = await apiClient.post('/api/v1/gamification/challenges', {
        beneficiaryId,
        ...challengeData,
      });
      return res?.data?.data || null;
    } catch (err) {
      console.warn('gamificationService.createChallenge', err);
      return null;
    }
  },

  /** Update challenge progress */
  updateChallengeProgress: async (beneficiaryId, challengeId, progress) => {
    try {
      const res = await apiClient.patch(`/api/v1/gamification/challenges/${challengeId}/progress`, {
        beneficiaryId,
        progress,
      });
      return res?.data?.data || null;
    } catch (err) {
      console.warn('gamificationService.updateChallengeProgress', err);
      return null;
    }
  },

  /** Get badges for a beneficiary */
  getBadges: async (beneficiaryId) => {
    try {
      const res = await apiClient.get(`/api/v1/gamification/badges/${beneficiaryId}`);
      return res?.data?.data || [];
    } catch (err) {
      console.warn('gamificationService.getBadges', err);
      return [];
    }
  },

  /** Check and award badges */
  checkAndAwardBadges: async (beneficiaryId) => {
    try {
      const res = await apiClient.post(`/api/v1/gamification/check-badges/${beneficiaryId}`);
      return res?.data?.data || null;
    } catch (err) {
      console.warn('gamificationService.checkAndAwardBadges', err);
      return null;
    }
  },
};

export default gamificationService;
