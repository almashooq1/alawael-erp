const ApiKey = require('../models/ApiKey');

/**
 * Authenticate using X-API-KEY header
 * Useful for automated services, mobile apps, or external integrations
 */
const apiKeyAuth = async (req, res, next) => {
  // Skip auth for public Phase 29-33 endpoints (dev mode)
  if (req.isPhase2933Public) {
    return next();
  }

  const key = req.header('X-API-KEY');

  if (!key) {
    return next(); // Continue to normal bearer auth if no API key is present
  }

  try {
    const apiKey = await ApiKey.findOne({ key, isActive: true });

    if (!apiKey) {
      return res.status(401).json({ success: false, message: 'Invalid API Key' });
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return res.status(401).json({ success: false, message: 'API Key Expired' });
    }

    // track usage
    apiKey.lastUsed = new Date();
    await apiKey.save();

    // Populate helper
    req.apiKey = apiKey;

    // Mock a user context for compatible permissions check
    req.user = {
      id: apiKey.id,
      role: 'API_CLIENT',
      permissions: apiKey.permissions,
    };

    next();
  } catch (error) {
    res.status(500).json({ message: 'API Key Validation Error' });
  }
};

module.exports = apiKeyAuth;
