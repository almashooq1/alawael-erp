/**
 * Rule Builder Service
 * خدمة منشئ القواعد
 * 
 * المسؤوليات:
 * - بناء القواعد الديناميكية
 * - التحقق من صحة القواعد
 * - إدارة قوالب القواعد
 * - تقييم القواعد المعقدة
 */

const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const Logger = require('../utils/logger');

class RuleBuilderService extends EventEmitter {
  constructor() {
    super();
    this.logger = Logger;

    // Rules storage
    this.rules = new Map();

    // Rule templates
    this.templates = new Map();

    // Rule conditions
    this.conditions = new Map();

    // Rule actions
    this.actions = new Map();

    // Rule validators
    this.validators = new Map();

    // Initialize default templates and conditions
    this._initializeDefaults();
  }

  /**
   * Initialize default templates and conditions
   * تهيئة القوالب والشروط الافتراضية
   * 
   * @private
   */
  _initializeDefaults() {
    // Default condition types
    const conditionTypes = [
      { id: 'time', label: 'Time Range', type: 'time', operators: ['between', 'before', 'after'] },
      { id: 'location', label: 'Location', type: 'string', operators: ['equals', 'in', 'startsWith'] },
      { id: 'role', label: 'User Role', type: 'string', operators: ['equals', 'in', 'notIn'] },
      { id: 'department', label: 'Department', type: 'string', operators: ['equals', 'in'] },
      { id: 'deviceType', label: 'Device Type', type: 'string', operators: ['equals', 'in'] },
      { id: 'ipAddress', label: 'IP Address', type: 'string', operators: ['equals', 'matches', 'in'] },
      { id: 'userAttribute', label: 'User Attribute', type: 'dynamic', operators: ['equals', 'contains', 'matches'] },
      { id: 'dataClassification', label: 'Data Classification', type: 'string', operators: ['equals', 'in'] },
      { id: 'riskLevel', label: 'Risk Level', type: 'string', operators: ['equals', 'lessThan', 'greaterThan'] }
    ];

    conditionTypes.forEach(condition => {
      this.conditions.set(condition.id, {
        ...condition,
        isSystem: true,
        metadata: { createdAt: new Date() }
      });
    });

    // Default action types
    const actionTypes = [
      { id: 'allow', label: 'Allow Access', type: 'decision' },
      { id: 'deny', label: 'Deny Access', type: 'decision' },
      { id: 'require_mfa', label: 'Require MFA', type: 'control' },
      { id: 'log_action', label: 'Log Action', type: 'audit' },
      { id: 'notify_admin', label: 'Notify Administrator', type: 'trigger' },
      { id: 'escalate', label: 'Escalate for Review', type: 'review' },
      { id: 'throttle', label: 'Throttle Request', type: 'rate_limit' },
      { id: 'redirect_to_mfa', label: 'Redirect to MFA', type: 'control' }
    ];

    actionTypes.forEach(action => {
      this.actions.set(action.id, {
        ...action,
        isSystem: true,
        metadata: { createdAt: new Date() }
      });
    });

    // Default rule templates
    this._createDefaultTemplates();

    this.logger.info(
      `Initialized ${conditionTypes.length} condition types and ${actionTypes.length} action types`
    );
  }

  /**
   * Create default rule templates
   * إنشاء قوالب القواعد الافتراضية
   * 
   * @private
   */
  _createDefaultTemplates() {
    const defaultTemplates = [
      {
        name: 'Business Hours Only',
        description: 'Restrict access to business hours',
        conditions: [
          {
            type: 'time',
            operator: 'between',
            value: { start: '08:00', end: '18:00' }
          }
        ],
        action: 'allow'
      },
      {
        name: 'MFA Required',
        description: 'Require multi-factor authentication',
        conditions: [
          {
            type: 'userAttribute',
            operator: 'equals',
            value: { field: 'mfaEnabled', value: true }
          }
        ],
        action: 'allow'
      },
      {
        name: 'Sensitive Data Access',
        description: 'Control access to sensitive data',
        conditions: [
          {
            type: 'dataClassification',
            operator: 'equals',
            value: 'sensitive'
          },
          {
            type: 'role',
            operator: 'in',
            value: ['admin', 'security']
          }
        ],
        action: 'require_mfa'
      },
      {
        name: 'Location-Based Access',
        description: 'Allow access only from specific locations',
        conditions: [
          {
            type: 'location',
            operator: 'in',
            value: ['office', 'vpn']
          }
        ],
        action: 'allow'
      }
    ];

    defaultTemplates.forEach(template => {
      this.templates.set(template.name, {
        id: `template-${uuidv4()}`,
        ...template,
        isSystem: true,
        metadata: {
          createdAt: new Date(),
          usageCount: 0
        }
      });
    });
  }

  /**
   * Create a new rule
   * إنشاء قاعدة جديدة
   * 
   * @param {Object} ruleData - Rule data
   * @returns {Object} Created rule
   */
  createRule(ruleData) {
    try {
      const { name, description, conditions, actions, priority = 500, metadata = {} } = ruleData;

      // Validation
      if (!name) throw new Error('Rule name is required');
      if (!Array.isArray(conditions) || conditions.length === 0) {
        throw new Error('At least one condition is required');
      }
      if (!Array.isArray(actions) || actions.length === 0) {
        throw new Error('At least one action is required');
      }

      // Validate conditions
      conditions.forEach(condition => this._validateCondition(condition));

      // Validate actions
      actions.forEach(action => this._validateAction(action));

      const ruleId = `rule-${uuidv4()}`;

      const rule = {
        id: ruleId,
        name,
        description: description || '',
        conditions,
        actions,
        priority,
        enabled: true,
        metadata: {
          ...metadata,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: metadata.userId,
          executionCount: 0,
          lastExecuted: null
        }
      };

      this.rules.set(ruleId, rule);
      this.emit('rule:created', { ruleId, rule });

      this.logger.info(`Rule created: ${ruleId} (${name})`);
      return rule;
    } catch (error) {
      this.logger.error(`Error creating rule: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate condition
   * التحقق من صحة الشرط
   * 
   * @private
   */
  _validateCondition(condition) {
    const { type, operator, value } = condition;

    if (!type) throw new Error('Condition type is required');
    if (!operator) throw new Error('Condition operator is required');
    if (value === undefined || value === null) throw new Error('Condition value is required');

    const conditionType = this.conditions.get(type);
    if (!conditionType) {
      throw new Error(`Unknown condition type: ${type}`);
    }

    // Validate operator
    if (!conditionType.operators.includes(operator)) {
      throw new Error(`Invalid operator '${operator}' for condition type '${type}'`);
    }

    // Type-specific validation
    this._validateConditionValue(type, operator, value);
  }

  /**
   * Validate condition value
   * التحقق من قيمة الشرط
   * 
   * @private
   */
  _validateConditionValue(type, operator, value) {
    switch (type) {
      case 'time':
        if (operator === 'between') {
          if (!value.start || !value.end) {
            throw new Error('Time range requires start and end');
          }
        }
        break;

      case 'ipAddress':
        if (operator === 'matches') {
          // Validate regex pattern
          try {
            new RegExp(value);
          } catch {
            throw new Error('Invalid IP pattern regex');
          }
        }
        break;

      case 'role':
      case 'location':
        if (operator === 'in' && !Array.isArray(value)) {
          throw new Error(`Operator '${operator}' requires array value`);
        }
        break;

      default:
        // Generic validation
        break;
    }
  }

  /**
   * Validate action
   * التحقق من صحة الإجراء
   * 
   * @private
   */
  _validateAction(action) {
    const { id, params } = action;

    if (!id) throw new Error('Action id is required');

    const actionType = this.actions.get(id);
    if (!actionType) {
      throw new Error(`Unknown action type: ${id}`);
    }

    // Validate action-specific parameters if needed
    if (actionType.requiredParams) {
      actionType.requiredParams.forEach(param => {
        if (!params || !params[param]) {
          throw new Error(`Action '${id}' requires parameter '${param}'`);
        }
      });
    }
  }

  /**
   * Update rule
   * تحديث القاعدة
   * 
   * @param {String} ruleId - Rule ID
   * @param {Object} updates - Updates
   */
  updateRule(ruleId, updates) {
    try {
      const rule = this.rules.get(ruleId);
      if (!rule) throw new Error(`Rule not found: ${ruleId}`);

      if (rule.metadata && rule.metadata.isLocked) {
        throw new Error('Cannot modify locked rule');
      }

      // Validate updated conditions and actions
      if (updates.conditions) {
        updates.conditions.forEach(condition => this._validateCondition(condition));
      }

      if (updates.actions) {
        updates.actions.forEach(action => this._validateAction(action));
      }

      // Update rule
      Object.assign(rule, updates);
      rule.metadata.updatedAt = new Date();

      this.emit('rule:updated', { ruleId, updates });
      this.logger.info(`Rule updated: ${ruleId}`);
    } catch (error) {
      this.logger.error(`Error updating rule: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete rule
   * حذف القاعدة
   * 
   * @param {String} ruleId - Rule ID
   */
  deleteRule(ruleId) {
    try {
      const rule = this.rules.get(ruleId);
      if (!rule) throw new Error(`Rule not found: ${ruleId}`);

      if (rule.isSystem) {
        throw new Error('Cannot delete system rule');
      }

      this.rules.delete(ruleId);
      this.emit('rule:deleted', { ruleId });

      this.logger.info(`Rule deleted: ${ruleId}`);
    } catch (error) {
      this.logger.error(`Error deleting rule: ${error.message}`);
      throw error;
    }
  }

  /**
   * Enable/Disable rule
   * تفعيل/تعطيل القاعدة
   * 
   * @param {String} ruleId - Rule ID
   * @param {Boolean} enabled - Enabled state
   */
  setRuleEnabled(ruleId, enabled) {
    try {
      const rule = this.rules.get(ruleId);
      if (!rule) throw new Error(`Rule not found: ${ruleId}`);

      rule.enabled = enabled;
      rule.metadata.updatedAt = new Date();

      this.emit('rule:status_changed', { ruleId, enabled });
      this.logger.info(`Rule ${enabled ? 'enabled' : 'disabled'}: ${ruleId}`);
    } catch (error) {
      this.logger.error(`Error changing rule status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Evaluate rule against context
   * تقييم القاعدة مقابل السياق
   * 
   * @param {String} ruleId - Rule ID
   * @param {Object} context - Context data
   * @returns {Object} Evaluation result
   */
  evaluateRule(ruleId, context) {
    try {
      const rule = this.rules.get(ruleId);
      if (!rule) throw new Error(`Rule not found: ${ruleId}`);

      if (!rule.enabled) {
        return { matched: false, reason: 'Rule is disabled' };
      }

      // Evaluate all conditions (AND logic)
      const conditionResults = rule.conditions.map(condition =>
        this._evaluateCondition(condition, context)
      );

      const allConditionsMet = conditionResults.every(result => result.matched);

      // Update execution stats
      rule.metadata.executionCount++;
      rule.metadata.lastExecuted = new Date();

      if (allConditionsMet) {
        this.emit('rule:matched', { ruleId, context });
        return {
          matched: true,
          actions: rule.actions,
          priority: rule.priority
        };
      }

      return { matched: false, reason: 'Conditions not met' };
    } catch (error) {
      this.logger.error(`Error evaluating rule: ${error.message}`);
      return { matched: false, reason: 'Evaluation error' };
    }
  }

  /**
   * Evaluate condition
   * تقييم الشرط
   * 
   * @private
   */
  _evaluateCondition(condition, context) {
    const { type, operator, value } = condition;

    try {
      switch (type) {
        case 'time':
          return this._evaluateTimeCondition(operator, value, context);

        case 'role':
          return this._evaluateRoleCondition(operator, value, context);

        case 'location':
          return this._evaluateLocationCondition(operator, value, context);

        case 'ipAddress':
          return this._evaluateIPCondition(operator, value, context);

        case 'userAttribute':
          return this._evaluateUserAttributeCondition(operator, value, context);

        case 'dataClassification':
          return this._evaluateDataClassificationCondition(operator, value, context);

        case 'deviceType':
          return this._evaluateDeviceTypeCondition(operator, value, context);

        default:
          return { matched: false, reason: `Unknown condition type: ${type}` };
      }
    } catch (error) {
      this.logger.error(`Error evaluating condition: ${error.message}`);
      return { matched: false, reason: 'Evaluation error' };
    }
  }

  /**
   * Evaluate time condition
   */
  _evaluateTimeCondition(operator, value, context) {
    const currentTime = new Date();
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    const currentMinutes = hours * 60 + minutes;

    if (operator === 'between') {
      const [startH, startM] = value.start.split(':').map(Number);
      const [endH, endM] = value.end.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      return {
        matched: currentMinutes >= startMinutes && currentMinutes < endMinutes,
        reason: operator === 'between' ? `Current time: ${hours}:${minutes}` : ''
      };
    }

    return { matched: false };
  }

  /**
   * Evaluate role condition
   */
  _evaluateRoleCondition(operator, value, context) {
    const userRole = context.role;
    if (!userRole) return { matched: false };

    if (operator === 'equals') {
      return { matched: userRole === value };
    }

    if (operator === 'in') {
      return { matched: Array.isArray(value) && value.includes(userRole) };
    }

    if (operator === 'notIn') {
      return { matched: Array.isArray(value) && !value.includes(userRole) };
    }

    return { matched: false };
  }

  /**
   * Evaluate location condition
   */
  _evaluateLocationCondition(operator, value, context) {
    const userLocation = context.location;
    if (!userLocation) return { matched: false };

    if (operator === 'equals') {
      return { matched: userLocation === value };
    }

    if (operator === 'in') {
      return { matched: Array.isArray(value) && value.includes(userLocation) };
    }

    if (operator === 'startsWith') {
      return { matched: userLocation.startsWith(value) };
    }

    return { matched: false };
  }

  /**
   * Evaluate IP condition
   */
  _evaluateIPCondition(operator, value, context) {
    const userIP = context.ipAddress;
    if (!userIP) return { matched: false };

    if (operator === 'equals') {
      return { matched: userIP === value };
    }

    if (operator === 'matches') {
      try {
        const regex = new RegExp(value);
        return { matched: regex.test(userIP) };
      } catch {
        return { matched: false };
      }
    }

    if (operator === 'in') {
      return { matched: Array.isArray(value) && value.includes(userIP) };
    }

    return { matched: false };
  }

  /**
   * Evaluate user attribute condition
   */
  _evaluateUserAttributeCondition(operator, value, context) {
    if (!value.field || context.attributes === undefined) {
      return { matched: false };
    }

    const attrValue = context.attributes[value.field];

    if (operator === 'equals') {
      return { matched: attrValue === value.value };
    }

    if (operator === 'contains') {
      return { matched: String(attrValue).includes(value.value) };
    }

    return { matched: false };
  }

  /**
   * Evaluate data classification condition
   */
  _evaluateDataClassificationCondition(operator, value, context) {
    const dataClass = context.dataClassification;
    if (!dataClass) return { matched: false };

    if (operator === 'equals') {
      return { matched: dataClass === value };
    }

    if (operator === 'in') {
      return { matched: Array.isArray(value) && value.includes(dataClass) };
    }

    return { matched: false };
  }

  /**
   * Evaluate device type condition
   */
  _evaluateDeviceTypeCondition(operator, value, context) {
    const deviceType = context.deviceType;
    if (!deviceType) return { matched: false };

    if (operator === 'equals') {
      return { matched: deviceType === value };
    }

    if (operator === 'in') {
      return { matched: Array.isArray(value) && value.includes(deviceType) };
    }

    return { matched: false };
  }

  /**
   * Get all rules
   * الحصول على جميع القواعد
   * 
   * @param {Object} filters - Filters
   * @returns {Array} Rules
   */
  getAllRules(filters = {}) {
    try {
      let rules = Array.from(this.rules.values());

      if (filters.enabled !== undefined) {
        rules = rules.filter(rule => rule.enabled === filters.enabled);
      }

      if (filters.search) {
        const search = filters.search.toLowerCase();
        rules = rules.filter(
          rule =>
            rule.name.toLowerCase().includes(search) ||
            rule.description.toLowerCase().includes(search)
        );
      }

      // Sort by priority
      rules.sort((a, b) => b.priority - a.priority);

      return rules;
    } catch (error) {
      this.logger.error(`Error getting rules: ${error.message}`);
      return [];
    }
  }

  /**
   * Get templates
   * الحصول على القوالب
   * 
   * @returns {Array} Templates
   */
  getTemplates() {
    return Array.from(this.templates.values());
  }

  /**
   * Get statistics
   * الحصول على الإحصائيات
   * 
   * @returns {Object} Statistics
   */
  getStatistics() {
    const rules = Array.from(this.rules.values());
    const totalExecutions = rules.reduce((sum, rule) => sum + (rule.metadata.executionCount || 0), 0);

    return {
      totalRules: rules.length,
      enabledRules: rules.filter(r => r.enabled).length,
      disabledRules: rules.filter(r => !r.enabled).length,
      totalExecutions,
      averageExecutionsPerRule: rules.length > 0 ? (totalExecutions / rules.length).toFixed(2) : 0,
      templates: this.templates.size,
      conditions: this.conditions.size,
      actions: this.actions.size
    };
  }
}

module.exports = new RuleBuilderService();
