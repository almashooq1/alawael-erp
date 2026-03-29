/** Stub AuthAPI datasource */
module.exports = {
  login: async (username, password) => {
    throw new Error('Authentication not configured');
  },
  logout: async () => true,
  refreshToken: async token => {
    throw new Error('Token refresh not configured');
  },
};
