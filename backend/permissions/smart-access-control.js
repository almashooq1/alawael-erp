/**
 * Smart Access Control - نظام التحكم الذكي في الوصول
 * AI-Powered Risk Assessment & Dynamic Access Control
 */

const mongoose = require('mongoose');

/**
 * Smart Access Configuration
 */
const smartAccessConfig = {
  // Risk levels
  riskLevels: {
    low: { score: 0, label: 'منخفض', color: 'green' },
    medium: { score: 30, label: 'متوسط', color: 'yellow' },
    high: { score: 60, label: 'مرتفع', color: 'orange' },
    critical: { score: 80, label: 'حرج', color: 'red' },
  },
  
  // Risk factors
  riskFactors: {
    unusualTime: 15,
    unusualLocation: 25,
    newDevice: 20,
    multipleFailedAttempts: 30,
    sensitiveAction: 25,
    bulkOperation: 20,
    outsideWorkingHours: 15,
    crossDepartmentAccess: 20,
  },
  
  // Adaptive responses
  responses: {
    allow: 'allow',
    stepUp: 'step_up', // Require additional authentication
    restrict: 'restrict', // Limited access
    deny: 'deny',
    monitor: 'monitor', // Allow but monitor closely
  },
};

/**
 * Access Session Schema
 */
const AccessSessionSchema = new mongoose.Schema({
  // Session identification
  sessionId: { type: String, unique: true },
  userId: String,
  tenantId: String,
  
  // Device info
  device: {
    fingerprint: String,
    type: String,
    browser: String,
    os: String,
    ip: String,
    userAgent: String,
  },
  
  // Location
  location: {
    country: String,
    city: String,
    latitude: Number,
    longitude: Number,
    timezone: String,
  },
  
  // Session state
  status: { type: String, enum: ['active', 'expired', 'terminated', 'suspended'], default: 'active' },
  
  // Risk assessment
  riskScore: { type: Number, default: 0 },
  riskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
  riskFactors: [String],
  
  // Behavioral profile
  behavior: {
    typicalLocations: [String],
    typicalDevices: [String],
    typicalTimes: [Number], // Hours of day
    averageSessionDuration: Number,
  },
  
  // Authentication
  authentication: {
    method: String,
    timestamp: Date,
    stepUpRequired: { type: Boolean, default: false },
    stepUpMethod: String,
    stepUpCompleted: { type: Boolean, default: false },
  },
  
  // Access log
  accessLog: [{
    timestamp: { type: Date, default: Date.now },
    resource: String,
    action: String,
    result: String,
    riskScore: Number,
  }],
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  lastActivityAt: Date,
  expiresAt: Date,
}, {
  collection: 'access_sessions',
});

/**
 * Access Policy Schema
 */
const AccessPolicySchema = new mongoose.Schema({
  // Policy identification
  name: { type: String, required: true },
  description: String,
  type: { type: String, enum: ['allow', 'deny', 'conditional', 'adaptive'] },
  
  // Conditions
  conditions: {
    // Time conditions
    time: {
      allowedHours: { start: Number, end: Number },
      allowedDays: [Number], // 0-6
      timezone: String,
    },
    
    // Location conditions
    location: {
      allowedCountries: [String],
      allowedCities: [String],
      blockedCountries: [String],
      requireVPN: Boolean,
    },
    
    // Device conditions
    device: {
      allowedTypes: [String],
      requireTrustedDevice: Boolean,
      blockJailbroken: { type: Boolean, default: true },
    },
    
    // Risk conditions
    risk: {
      maxRiskScore: Number,
      blockHighRisk: Boolean,
      requireStepUpAbove: Number,
    },
    
    // Network conditions
    network: {
      allowedIPs: [String],
      blockedIPs: [String],
      allowedNetworks: [String],
    },
  },
  
  // Actions
  actions: {
    onDeny: { type: String, enum: ['block', 'notify', 'challenge', 'log'] },
    onHighRisk: { type: String, enum: ['block', 'stepUp', 'monitor', 'notify'] },
    notifyUsers: [String],
    notifyEmails: [String],
  },
  
  // Priority
  priority: { type: Number, default: 50 },
  
  // Status
  isActive: { type: Boolean, default: true },
  
  // Tenant
  tenantId: String,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
}, {
  collection: 'access_policies',
});

/**
 * Smart Access Control Service Class
 */
class SmartAccessControlService {
  constructor() {
    this.AccessSession = null;
    this.AccessPolicy = null;
    this.userProfiles = new Map();
  }
  
  /**
   * Initialize service
   */
  async initialize(connection) {
    this.AccessSession = connection.model('AccessSession', AccessSessionSchema);
    this.AccessPolicy = connection.model('AccessPolicy', AccessPolicySchema);
    
    // Create default policies
    await this.createDefaultPolicies();
    
    console.log('✅ Smart Access Control Service initialized');
  }
  
  /**
   * Create default policies
   */
  async createDefaultPolicies() {
    const defaultPolicies = [
      {
        name: 'سياسة العمل القياسية',
        description: 'ساعات العمل الرسمية',
        type: 'conditional',
        conditions: {
          time: { allowedHours: { start: 7, end: 19 }, allowedDays: [0, 1, 2, 3, 4] },
        },
        priority: 50,
      },
      {
        name: 'حماية المعلومات الحساسة',
        description: 'تطلب مصادقة إضافية للوصول للبيانات الحساسة',
        type: 'adaptive',
        conditions: {
          risk: { maxRiskScore: 50, requireStepUpAbove: 30 },
        },
        actions: { onHighRisk: 'stepUp' },
        priority: 70,
      },
      {
        name: 'حظر الدول المحظورة',
        description: 'منع الوصول من دول محددة',
        type: 'deny',
        conditions: {
          location: { blockedCountries: [] }, // Would be populated
        },
        actions: { onDeny: 'block' },
        priority: 90,
      },
    ];
    
    for (const policy of defaultPolicies) {
      const existing = await this.AccessPolicy.findOne({ name: policy.name });
      if (!existing) {
        await this.AccessPolicy.create(policy);
      }
    }
  }
  
  /**
   * Evaluate access request
   */
  async evaluateAccess(userId, resource, action, context = {}) {
    // Calculate risk score
    const riskAssessment = await this.assessRisk(userId, resource, action, context);
    
    // Get applicable policies
    const policies = await this.getApplicablePolicies(userId, context);
    
    // Evaluate policies
    const decision = this.evaluatePolicies(policies, riskAssessment, context);
    
    // Determine response
    const response = this.determineResponse(riskAssessment, decision, context);
    
    return {
      allowed: response.action !== 'deny',
      response: response.action,
      riskScore: riskAssessment.score,
      riskLevel: riskAssessment.level,
      riskFactors: riskAssessment.factors,
      stepUpRequired: response.stepUpRequired,
      stepUpMethod: response.stepUpMethod,
      sessionId: context.sessionId,
      message: response.message,
    };
  }
  
  /**
   * Assess risk
   */
  async assessRisk(userId, resource, action, context) {
    let score = 0;
    const factors = [];
    
    // Get user behavior profile
    const profile = await this.getUserBehaviorProfile(userId);
    
    // Check time anomaly
    const currentHour = new Date().getHours();
    if (profile.typicalTimes && !profile.typicalTimes.includes(currentHour)) {
      score += smartAccessConfig.riskFactors.outsideWorkingHours;
      factors.push('outside_working_hours');
    }
    
    // Check location anomaly
    if (context.location && profile.typicalLocations) {
      if (!profile.typicalLocations.includes(context.location.country)) {
        score += smartAccessConfig.riskFactors.unusualLocation;
        factors.push('unusual_location');
      }
    }
    
    // Check device anomaly
    if (context.device && profile.typicalDevices) {
      if (!profile.typicalDevices.includes(context.device.fingerprint)) {
        score += smartAccessConfig.riskFactors.newDevice;
        factors.push('new_device');
      }
    }
    
    // Check for sensitive action
    if (this.isSensitiveAction(action, resource)) {
      score += smartAccessConfig.riskFactors.sensitiveAction;
      factors.push('sensitive_action');
    }
    
    // Check for bulk operation
    if (context.isBulk) {
      score += smartAccessConfig.riskFactors.bulkOperation;
      factors.push('bulk_operation');
    }
    
    // Check failed attempts
    const failedAttempts = await this.getRecentFailedAttempts(userId);
    if (failedAttempts > 3) {
      score += smartAccessConfig.riskFactors.multipleFailedAttempts;
      factors.push('multiple_failed_attempts');
    }
    
    // Determine risk level
    let level = 'low';
    if (score >= 80) level = 'critical';
    else if (score >= 60) level = 'high';
    else if (score >= 30) level = 'medium';
    
    return { score: Math.min(score, 100), level, factors };
  }
  
  /**
   * Get user behavior profile
   */
  async getUserBehaviorProfile(userId) {
    // Check cache
    if (this.userProfiles.has(userId)) {
      return this.userProfiles.get(userId);
    }
    
    // Get from sessions
    const sessions = await this.AccessSession.find({ userId })
      .sort({ createdAt: -1 })
      .limit(30);
    
    if (sessions.length === 0) {
      return {
        typicalLocations: [],
        typicalDevices: [],
        typicalTimes: [],
      };
    }
    
    // Analyze patterns
    const locations = new Set();
    const devices = new Set();
    const times = {};
    
    for (const session of sessions) {
      if (session.location?.country) {
        locations.add(session.location.country);
      }
      if (session.device?.fingerprint) {
        devices.add(session.device.fingerprint);
      }
      const hour = new Date(session.createdAt).getHours();
      times[hour] = (times[hour] || 0) + 1;
    }
    
    const typicalTimes = Object.entries(times)
      .filter(([_, count]) => count >= 3)
      .map(([hour]) => parseInt(hour));
    
    const profile = {
      typicalLocations: Array.from(locations),
      typicalDevices: Array.from(devices),
      typicalTimes,
    };
    
    // Cache profile
    this.userProfiles.set(userId, profile);
    
    return profile;
  }
  
  /**
   * Check if action is sensitive
   */
  isSensitiveAction(action, resource) {
    const sensitiveActions = ['delete', 'export', 'approve', 'sign'];
    const sensitiveResources = ['finance', 'hr', 'admin'];
    
    return sensitiveActions.includes(action) || 
           sensitiveResources.some(r => resource?.includes(r));
  }
  
  /**
   * Get recent failed attempts
   */
  async getRecentFailedAttempts(userId) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const sessions = await this.AccessSession.find({
      userId,
      'accessLog.result': 'denied',
      'accessLog.timestamp': { $gte: oneHourAgo },
    });
    
    let count = 0;
    for (const session of sessions) {
      count += session.accessLog.filter(
        log => log.result === 'denied' && log.timestamp >= oneHourAgo
      ).length;
    }
    
    return count;
  }
  
  /**
   * Get applicable policies
   */
  async getApplicablePolicies(userId, context) {
    const filter = { isActive: true };
    
    return this.AccessPolicy.find(filter).sort({ priority: -1 });
  }
  
  /**
   * Evaluate policies
   */
  evaluatePolicies(policies, riskAssessment, context) {
    for (const policy of policies) {
      const result = this.evaluatePolicy(policy, riskAssessment, context);
      if (result.deny) {
        return { action: 'deny', reason: result.reason };
      }
    }
    return { action: 'allow' };
  }
  
  /**
   * Evaluate single policy
   */
  evaluatePolicy(policy, riskAssessment, context) {
    const conditions = policy.conditions;
    
    // Check time conditions
    if (conditions.time) {
      const now = new Date();
      const hour = now.getHours();
      const day = now.getDay();
      
      if (conditions.time.allowedHours) {
        const { start, end } = conditions.time.allowedHours;
        if (hour < start || hour > end) {
          return { deny: policy.type === 'deny', reason: 'outside_allowed_hours' };
        }
      }
      
      if (conditions.time.allowedDays && !conditions.time.allowedDays.includes(day)) {
        return { deny: policy.type === 'deny', reason: 'not_allowed_day' };
      }
    }
    
    // Check risk conditions
    if (conditions.risk) {
      if (riskAssessment.score > (conditions.risk.maxRiskScore || 100)) {
        return { deny: true, reason: 'risk_score_exceeded' };
      }
    }
    
    // Check location conditions
    if (conditions.location && context.location) {
      if (conditions.location.blockedCountries?.includes(context.location.country)) {
        return { deny: true, reason: 'blocked_country' };
      }
    }
    
    return { deny: false };
  }
  
  /**
   * Determine response
   */
  determineResponse(riskAssessment, decision, context) {
    const { score, level, factors } = riskAssessment;
    
    if (decision.action === 'deny') {
      return {
        action: 'deny',
        message: `تم رفض الوصول: ${decision.reason}`,
      };
    }
    
    if (level === 'critical') {
      return {
        action: 'deny',
        message: 'مستوى الخطر حرج جداً',
      };
    }
    
    if (level === 'high' || score >= 50) {
      return {
        action: 'stepUp',
        stepUpRequired: true,
        stepUpMethod: factors.includes('new_device') ? 'sms' : 'totp',
        message: 'مطلوب مصادقة إضافية',
      };
    }
    
    if (level === 'medium') {
      return {
        action: 'monitor',
        message: 'الوصول مسموح مع المراقبة',
      };
    }
    
    return {
      action: 'allow',
      message: 'الوصول مسموح',
    };
  }
  
  /**
   * Create access session
   */
  async createSession(userId, context = {}) {
    const sessionId = `SES-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const session = await this.AccessSession.create({
      sessionId,
      userId,
      tenantId: context.tenantId,
      device: context.device,
      location: context.location,
      authentication: {
        method: context.authMethod || 'password',
        timestamp: new Date(),
      },
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
    });
    
    return session;
  }
  
  /**
   * Update session activity
   */
  async logActivity(sessionId, resource, action, result, riskScore = 0) {
    const session = await this.AccessSession.findOne({ sessionId });
    if (!session) return;
    
    session.accessLog.push({
      timestamp: new Date(),
      resource,
      action,
      result,
      riskScore,
    });
    
    session.lastActivityAt = new Date();
    await session.save();
  }
  
  /**
   * Terminate session
   */
  async terminateSession(sessionId, reason = 'user_logout') {
    const session = await this.AccessSession.findOne({ sessionId });
    if (!session) return;
    
    session.status = 'terminated';
    await session.save();
    
    return session;
  }
  
  /**
   * Get active sessions for user
   */
  async getActiveSessions(userId) {
    return this.AccessSession.find({
      userId,
      status: 'active',
      expiresAt: { $gt: new Date() },
    }).sort({ lastActivityAt: -1 });
  }
  
  /**
   * Complete step-up authentication
   */
  async completeStepUp(sessionId, method) {
    const session = await this.AccessSession.findOne({ sessionId });
    if (!session) return false;
    
    session.authentication.stepUpCompleted = true;
    session.authentication.stepUpMethod = method;
    await session.save();
    
    return true;
  }
  
  /**
   * Get statistics
   */
  async getStatistics(tenantId) {
    const filter = tenantId ? { tenantId } : {};
    
    const [totalSessions, activeSessions, highRiskSessions] = await Promise.all([
      this.AccessSession.countDocuments(filter),
      this.AccessSession.countDocuments({ ...filter, status: 'active' }),
      this.AccessSession.countDocuments({ ...filter, riskLevel: { $in: ['high', 'critical'] } }),
    ]);
    
    return {
      totalSessions,
      activeSessions,
      highRiskSessions,
    };
  }
}

// Singleton instance
const smartAccessControlService = new SmartAccessControlService();

module.exports = {
  SmartAccessControlService,
  smartAccessControlService,
  smartAccessConfig,
};