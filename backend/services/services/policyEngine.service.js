/**
 * Policy Engine Service
 * خدمة محرك السياسات
 * 
 * المسؤوليات:
 * - تنفيذ السياسات الديناميكية
 * - تقييم القواعد المخصصة
 * - إدارة شروط الوصول
 * - تتبع قرارات السياسات
 */

const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const Logger = require('../utils/logger');

class PolicyEngine extends EventEmitter {
  constructor() {
    super();
    this.logger = Logger;

    // Policy definitions
    this.policies = new Map();

    // Policy evaluation cache
    this.evaluationCache = new Map();

    // Policy conditions
    this.conditions = {
      'time': this._evaluateTimeCondition,
      'location': this._evaluateLocationCondition,
      'device': this._evaluateDeviceCondition,
      'ipAddress': this._evaluateIpAddressCondition,
      'role': this._evaluateRoleCondition,
      'department': this._evaluateDepartmentCondition,
      'resource': this._evaluateResourceCondition,
      'action': this._evaluateActionCondition,
      'custom': this._evaluateCustomCondition
    };

    // Policy effects
    this.effects = ['Allow', 'Deny'];

    // Initialize default policies
    this._initializeDefaultPolicies();
  }

  /**
   * Initialize default system policies
   * تهيئة السياسات النظامية الافتراضية
   * 
   * @private
   */
  _initializeDefaultPolicies() {
    const defaultPolicies = [
      {
        id: 'policy-admin-full-access',
        name: 'Admin Full Access',
        description: 'Administrators have full access to all resources',
        effect: 'Allow',
        rules: [
          {
            conditions: [
              { type: 'role', value: 'admin' }
            ],
            actions: ['*'],
            resources: ['*']
          }
        ],
        priority: 1000,
        isActive: true,
        isSystem: true
      },
      {
        id: 'policy-user-basic-access',
        name: 'User Basic Access',
        description: 'Users have access to their own data',
        effect: 'Allow',
        rules: [
          {
            conditions: [
              { type: 'role', value: 'user' }
            ],
            actions: ['read', 'update'],
            resources: ['own_resources']
          }
        ],
        priority: 500,
        isActive: true,
        isSystem: true
      },
      {
        id: 'policy-deny-after-hours',
        name: 'Deny After Hours Access',
        description: 'Deny access during non-business hours for sensitive operations',
        effect: 'Deny',
        rules: [
          {
            conditions: [
              { type: 'time', value: { start: '18:00', end: '08:00' } }
            ],
            actions: ['delete', 'modify_permissions'],
            resources: ['sensitive_data']
          }
        ],
        priority: 800,
        isActive: true,
        isSystem: true
      }
    ];

    defaultPolicies.forEach(policy => {
      this.policies.set(policy.id, policy);
    });

    this.logger.info(`Initialized ${defaultPolicies.length} default policies`);
  }

  /**
   * Create a new policy
   * إنشاء سياسة جديدة
   * 
   * @param {Object} policyData - Policy data
   * @returns {Object} Created policy
   */
  createPolicy(policyData) {
    try {
      const {
        name,
        description,
        effect,
        rules,
        priority = 500,
        isActive = true,
        metadata = {}
      } = policyData;

      // Validate required fields
      if (!name) throw new Error('Policy name is required');
      if (!effect || !this.effects.includes(effect)) {
        throw new Error(`Invalid effect: ${effect}. Must be ${this.effects.join(' or ')}`);
      }
      if (!Array.isArray(rules) || rules.length === 0) {
        throw new Error('At least one rule is required');
      }

      const policyId = `policy-${uuidv4()}`;

      // Validate rules
      const validatedRules = rules.map(rule => this._validateRule(rule));

      const policy = {
        id: policyId,
        name,
        description: description || '',
        effect,
        rules: validatedRules,
        priority: Math.min(Math.max(priority, 1), 1000), // 1-1000
        isActive,
        isSystem: false,
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: metadata.userId,
          evaluations: 0,
          lastEvaluated: null
        }
      };

      this.policies.set(policyId, policy);
      this._clearCacheForPolicy(policyId);
      this.emit('policy:created', { policyId, policy });

      this.logger.info(`Policy created: ${policyId}`);
      return policy;
    } catch (error) {
      this.logger.error(`Error creating policy: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update policy
   * تحديث السياسة
   * 
   * @param {String} policyId - Policy ID
   * @param {Object} updates - Update data
   * @returns {Object} Updated policy
   */
  updatePolicy(policyId, updates) {
    try {
      const policy = this.policies.get(policyId);
      if (!policy) {
        throw new Error(`Policy not found: ${policyId}`);
      }

      if (policy.isSystem) {
        throw new Error('Cannot modify system policies');
      }

      const allowedFields = ['name', 'description', 'effect', 'rules', 'priority', 'isActive'];

      allowedFields.forEach(field => {
        if (field in updates) {
          if (field === 'rules') {
            policy[field] = updates[field].map(rule => this._validateRule(rule));
          } else if (field === 'priority') {
            policy[field] = Math.min(Math.max(updates[field], 1), 1000);
          } else {
            policy[field] = updates[field];
          }
        }
      });

      policy.metadata.updatedAt = new Date();

      this._clearCacheForPolicy(policyId);
      this.emit('policy:updated', { policyId, updates });

      this.logger.info(`Policy updated: ${policyId}`);
      return policy;
    } catch (error) {
      this.logger.error(`Error updating policy: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete policy
   * حذف السياسة
   * 
   * @param {String} policyId - Policy ID
   */
  deletePolicy(policyId) {
    try {
      const policy = this.policies.get(policyId);
      if (!policy) {
        throw new Error(`Policy not found: ${policyId}`);
      }

      if (policy.isSystem) {
        throw new Error('Cannot delete system policies');
      }

      this.policies.delete(policyId);
      this._clearCacheForPolicy(policyId);
      this.emit('policy:deleted', { policyId });

      this.logger.info(`Policy deleted: ${policyId}`);
    } catch (error) {
      this.logger.error(`Error deleting policy: ${error.message}`);
      throw error;
    }
  }

  /**
   * Evaluate policies for a request
   * تقييم السياسات لطلب معين
   * 
   * @param {Object} context - Evaluation context
   * @returns {Object} Evaluation result
   */
  evaluatePolicies(context) {
    try {
      const {
        userId,
        action,
        resource,
        userContext = {}
      } = context;

      // Create cache key
      const cacheKey = this._generateCacheKey(context);
      const cached = this._getCachedEvaluation(cacheKey);
      
      if (cached) {
        this.logger.debug(`Policy evaluation from cache: ${cacheKey}`);
        return cached;
      }

      // Get applicable policies sorted by priority
      const applicablePolicies = Array.from(this.policies.values())
        .filter(p => p.isActive)
        .sort((a, b) => b.priority - a.priority);

      let decision = 'Deny'; // Default deny
      let evaluatedPolicies = [];
      let reason = 'No matching allow policy found';

      for (const policy of applicablePolicies) {
        const matches = policy.rules.some(rule => {
          return this._evaluateRule(rule, { userId, action, resource, userContext });
        });

        if (matches) {
          evaluatedPolicies.push({
            policyId: policy.id,
            name: policy.name,
            effect: policy.effect,
            priority: policy.priority
          });

          if (policy.effect === 'Allow') {
            decision = 'Allow';
            reason = `Allowed by policy: ${policy.name}`;
            break;
          } else if (policy.effect === 'Deny') {
            decision = 'Deny';
            reason = `Denied by policy: ${policy.name}`;
            break;
          }
        }

        // Update evaluation count
        policy.metadata.evaluations++;
        policy.metadata.lastEvaluated = new Date();
      }

      const result = {
        decision,
        reason,
        evaluatedPolicies,
        timestamp: new Date(),
        context: {
          userId,
          action,
          resource
        }
      };

      // Cache result
      this._cacheEvaluation(cacheKey, result);

      this.emit('policy:evaluated', result);
      return result;
    } catch (error) {
      this.logger.error(`Error evaluating policies: ${error.message}`);
      return {
        decision: 'Deny',
        reason: `Policy evaluation error: ${error.message}`,
        evaluatedPolicies: [],
        timestamp: new Date()
      };
    }
  }

  /**
   * Validate a rule structure
   * التحقق من صحة هيكل القاعدة
   * 
   * @private
   */
  _validateRule(rule) {
    if (!rule.conditions || !Array.isArray(rule.conditions)) {
      throw new Error('Rule must have conditions array');
    }

    if (!rule.actions || !Array.isArray(rule.actions) || rule.actions.length === 0) {
      throw new Error('Rule must have actions array');
    }

    if (!rule.resources || !Array.isArray(rule.resources) || rule.resources.length === 0) {
      throw new Error('Rule must have resources array');
    }

    // Validate conditions
    rule.conditions.forEach(condition => {
      if (!condition.type || !this.conditions[condition.type]) {
        throw new Error(`Invalid condition type: ${condition.type}`);
      }
    });

    return {
      conditions: rule.conditions,
      actions: rule.actions,
      resources: rule.resources,
      effect: rule.effect || 'Allow'
    };
  }

  /**
   * Evaluate a single rule
   * تقييم قاعدة واحدة
   * 
   * @private
   */
  _evaluateRule(rule, context) {
    try {
      // Check if resource matches
      const resourceMatch = rule.resources.some(resource =>
        resource === '*' || resource === context.resource || context.resource.startsWith(resource + ':')
      );

      if (!resourceMatch) return false;

      // Check if action matches
      const actionMatch = rule.actions.some(action =>
        action === '*' || action === context.action
      );

      if (!actionMatch) return false;

      // Evaluate all conditions (AND logic)
      const conditionsMatch = rule.conditions.every(condition => {
        const conditionFunc = this.conditions[condition.type];
        return conditionFunc.call(this, condition, context);
      });

      return conditionsMatch;
    } catch (error) {
      this.logger.error(`Error evaluating rule: ${error.message}`);
      return false;
    }
  }

  /**
   * Evaluate time condition
   * تقييم شرط الوقت
   * 
   * @private
   */
  _evaluateTimeCondition(condition, context) {
    try {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const { start, end } = condition.value;

      if (start && end) {
        // Range check (can wrap around midnight)
        if (start <= end) {
          return currentTime >= start && currentTime <= end;
        } else {
          return currentTime >= start || currentTime <= end;
        }
      }

      return true;
    } catch (error) {
      this.logger.error(`Error evaluating time condition: ${error.message}`);
      return false;
    }
  }

  /**
   * Evaluate location condition
   * تقييم شرط الموقع
   * 
   * @private
   */
  _evaluateLocationCondition(condition, context) {
    try {
      const { value } = condition;
      const userLocation = context.userContext.location;

      if (!userLocation) return false;

      if (Array.isArray(value)) {
        return value.includes(userLocation);
      }

      return userLocation === value;
    } catch (error) {
      this.logger.error(`Error evaluating location condition: ${error.message}`);
      return false;
    }
  }

  /**
   * Evaluate device condition
   * تقييم شرط الجهاز
   * 
   * @private
   */
  _evaluateDeviceCondition(condition, context) {
    try {
      const { value } = condition;
      const userDevice = context.userContext.device;

      if (!userDevice) return false;

      if (Array.isArray(value)) {
        return value.includes(userDevice);
      }

      return userDevice === value;
    } catch (error) {
      this.logger.error(`Error evaluating device condition: ${error.message}`);
      return false;
    }
  }

  /**
   * Evaluate IP address condition
   * تقييم شرط عنوان IP
   * 
   * @private
   */
  _evaluateIpAddressCondition(condition, context) {
    try {
      const { value } = condition;
      const userIP = context.userContext.ipAddress;

      if (!userIP) return false;

      if (Array.isArray(value)) {
        return value.some(ip => this._ipMatches(userIP, ip));
      }

      return this._ipMatches(userIP, value);
    } catch (error) {
      this.logger.error(`Error evaluating IP condition: ${error.message}`);
      return false;
    }
  }

  /**
   * Evaluate role condition
   * تقييم شرط الدور
   * 
   * @private
   */
  _evaluateRoleCondition(condition, context) {
    try {
      const { value } = condition;
      const userRoles = context.userContext.roles || [];

      if (Array.isArray(value)) {
        return value.some(role => userRoles.includes(role));
      }

      return userRoles.includes(value);
    } catch (error) {
      this.logger.error(`Error evaluating role condition: ${error.message}`);
      return false;
    }
  }

  /**
   * Evaluate department condition
   * تقييم شرط القسم
   * 
   * @private
   */
  _evaluateDepartmentCondition(condition, context) {
    try {
      const { value } = condition;
      const userDept = context.userContext.department;

      if (!userDept) return false;

      if (Array.isArray(value)) {
        return value.includes(userDept);
      }

      return userDept === value;
    } catch (error) {
      this.logger.error(`Error evaluating department condition: ${error.message}`);
      return false;
    }
  }

  /**
   * Evaluate resource condition
   * تقييم شرط المورد
   * 
   * @private
   */
  _evaluateResourceCondition(condition, context) {
    try {
      const { value } = condition;
      const resource = context.resource;

      if (Array.isArray(value)) {
        return value.some(r => r === '*' || r === resource || resource.startsWith(r + ':'));
      }

      return value === '*' || value === resource || resource.startsWith(value + ':');
    } catch (error) {
      this.logger.error(`Error evaluating resource condition: ${error.message}`);
      return false;
    }
  }

  /**
   * Evaluate action condition
   * تقييم شرط الإجراء
   * 
   * @private
   */
  _evaluateActionCondition(condition, context) {
    try {
      const { value } = condition;
      const action = context.action;

      if (Array.isArray(value)) {
        return value.includes(action) || value.includes('*');
      }

      return value === action || value === '*';
    } catch (error) {
      this.logger.error(`Error evaluating action condition: ${error.message}`);
      return false;
    }
  }

  /**
   * Evaluate custom condition
   * تقييم شرط مخصص
   * 
   * @private
   */
  _evaluateCustomCondition(condition, context) {
    try {
      const { expression } = condition;
      if (!expression) return false;

      // Simple expression evaluation for custom conditions
      // In production, use sandboxed evaluation
      const func = new Function('context', `return ${expression}`);
      return func(context);
    } catch (error) {
      this.logger.error(`Error evaluating custom condition: ${error.message}`);
      return false;
    }
  }

  /**
   * Get policy by ID
   * الحصول على السياسة بـ ID
   * 
   * @param {String} policyId - Policy ID
   * @returns {Object} Policy
   */
  getPolicy(policyId) {
    try {
      const policy = this.policies.get(policyId);
      if (!policy) {
        throw new Error(`Policy not found: ${policyId}`);
      }
      return policy;
    } catch (error) {
      this.logger.error(`Error getting policy: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all policies
   * الحصول على جميع السياسات
   * 
   * @param {Object} filter - Filter options
   * @returns {Array} Policies
   */
  getAllPolicies(filter = {}) {
    try {
      let policies = Array.from(this.policies.values());

      // Filter by active status
      if (filter.active !== undefined) {
        policies = policies.filter(p => p.isActive === filter.active);
      }

      // Filter by effect
      if (filter.effect) {
        policies = policies.filter(p => p.effect === filter.effect);
      }

      // Filter by search term
      if (filter.search) {
        const term = filter.search.toLowerCase();
        policies = policies.filter(p =>
          p.name.toLowerCase().includes(term) ||
          p.description.toLowerCase().includes(term)
        );
      }

      // Sort by priority
      policies.sort((a, b) => b.priority - a.priority);

      return policies;
    } catch (error) {
      this.logger.error(`Error getting policies: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get policies by effect
   * الحصول على السياسات حسب التأثير
   * 
   * @param {String} effect - Effect type
   * @returns {Array} Policies
   */
  getPoliciesByEffect(effect) {
    try {
      return Array.from(this.policies.values())
        .filter(p => p.effect === effect)
        .sort((a, b) => b.priority - a.priority);
    } catch (error) {
      this.logger.error(`Error getting policies by effect: ${error.message}`);
      throw error;
    }
  }

  /**
   * Duplicate a policy
   * نسخ سياسة
   * 
   * @param {String} policyId - Policy ID to duplicate
   * @param {Object} newData - New policy data
   * @returns {Object} New policy
   */
  duplicatePolicy(policyId, newData = {}) {
    try {
      const original = this.policies.get(policyId);
      if (!original) {
        throw new Error(`Policy not found: ${policyId}`);
      }

      const duplicated = {
        id: `policy-${uuidv4()}`,
        name: newData.name || `${original.name} (Copy)`,
        description: newData.description || original.description,
        effect: original.effect,
        rules: JSON.parse(JSON.stringify(original.rules)),
        priority: original.priority,
        isActive: false,
        isSystem: false,
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: newData.userId,
          evaluations: 0,
          lastEvaluated: null
        }
      };

      this.policies.set(duplicated.id, duplicated);
      this.emit('policy:duplicated', { original: policyId, duplicated: duplicated.id });

      return duplicated;
    } catch (error) {
      this.logger.error(`Error duplicating policy: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get policy statistics
   * الحصول على إحصائيات السياسات
   * 
   * @returns {Object} Statistics
   */
  getStatistics() {
    try {
      const policies = Array.from(this.policies.values());
      const stats = {
        total: policies.length,
        active: policies.filter(p => p.isActive).length,
        inactive: policies.filter(p => !p.isActive).length,
        allowPolicies: policies.filter(p => p.effect === 'Allow').length,
        denyPolicies: policies.filter(p => p.effect === 'Deny').length,
        systemPolicies: policies.filter(p => p.isSystem).length,
        customPolicies: policies.filter(p => !p.isSystem).length,
        totalEvaluations: policies.reduce((sum, p) => sum + p.metadata.evaluations, 0),
        mostEvaluated: policies
          .filter(p => p.metadata.evaluations > 0)
          .sort((a, b) => b.metadata.evaluations - a.metadata.evaluations)
          .slice(0, 5)
          .map(p => ({ id: p.id, name: p.name, evaluations: p.metadata.evaluations }))
      };

      return stats;
    } catch (error) {
      this.logger.error(`Error getting statistics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cache management helpers
   */

  _generateCacheKey(context) {
    return `${context.userId}:${context.action}:${context.resource}`;
  }

  _getCachedEvaluation(cacheKey) {
    const cached = this.evaluationCache.get(cacheKey);
    if (!cached) return null;

    // Check if cache is still valid (5 minutes)
    if (Date.now() - cached.timestamp > 5 * 60 * 1000) {
      this.evaluationCache.delete(cacheKey);
      return null;
    }

    return cached.result;
  }

  _cacheEvaluation(cacheKey, result) {
    this.evaluationCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });

    // Keep cache size manageable (max 10000 entries)
    if (this.evaluationCache.size > 10000) {
      const firstKey = this.evaluationCache.keys().next().value;
      this.evaluationCache.delete(firstKey);
    }
  }

  _clearCacheForPolicy(policyId) {
    // Simple cache clear - in production, could be more selective
    if (this.evaluationCache.size > 0) {
      this.evaluationCache.clear();
    }
  }

  _ipMatches(userIP, policyIP) {
    if (policyIP.includes('*')) {
      const pattern = new RegExp('^' + policyIP.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
      return pattern.test(userIP);
    }
    return userIP === policyIP;
  }
}

module.exports = new PolicyEngine();
