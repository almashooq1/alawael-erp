/** Stub AnalyticsAPI datasource */
module.exports = {
  getAnalytics: async () => ({
    totalUsers: 0,
    totalBeneficiaries: 0,
    totalPrograms: 0,
    totalSessions: 0,
    activeUsers: 0,
    sessionsToday: 0,
  }),
};
