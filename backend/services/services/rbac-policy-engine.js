/**
 * ═══════════════════════════════════════════════════════════════
 * 🎯 RBAC Policy Engine - محرك السياسات المتقدمة
 * ═══════════════════════════════════════════════════════════════
 * 
 * يوفر نظام قواعد ديناميكي متقدم مع:
 * ✅ تقييم السياسات المعقدة
 * ✅ دعم الشروط المتعددة
 * ✅ إدارة الاستثناءات
 * ✅ نظام الأولويات
 */

const { EventEmitter } = require('events');

class RBACPolicyEngine extends EventEmitter {
  constructor(rbacSystem) {
    super();
    this.rbac = rbacSystem;
    this.policies = new Map();
    this.policyHistory = [];
    this.policyTemplates = new Map();
    this.conditionalRules = new Map();
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * 1️⃣ POLICY MANAGEMENT - إدارة السياسات
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * إنشاء سياسة جديدة
   */
  createPolicy(policyId, policyConfig = {}) {
    if (this.policies.has(policyId)) {
      throw new Error(`Policy ${policyId} already exists`);
    }

    const policy = {
      id: policyId,
      name: policyConfig.name || policyId,
      description: policyConfig.description || '',
      
      // Policy Definition
      principal: policyConfig.principal || {}, // من له الإذن
      action: policyConfig.action || [], // ماذا يمكن أن يفعل
      resource: policyConfig.resource || [], // على ماذا
      
      // Conditions
      conditions: policyConfig.conditions || {},
      
      // Effect
      effect: policyConfig.effect || 'Allow', // Allow or Deny
      priority: policyConfig.priority || 100, // أعلى رقم = أولوية أعلى
      
      // Status
      isActive: policyConfig.isActive !== false,
      
      // Version Control
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: policyConfig.createdBy || 'system',
      
      // Metadata
      metadata: policyConfig.metadata || {}
    };

    this.policies.set(policyId, policy);
    this.policyHistory.push({
      policyId,
      action: 'CREATED',
      timestamp: new Date(),
      data: { ...policy }
    });

    if (this.rbac && this.rbac.emit) {
      this.rbac.emit('policyCreated', policy);
    }
    this.emit('policyCreated', policy);
    return policy;
  }

  /**
   * تحديث سياسة موجودة
   */
  updatePolicy(policyId, updates) {
    const policy = this.policies.get(policyId);
    if (!policy) throw new Error(`Policy ${policyId} not found`);

    const oldPolicy = { ...policy };
    
    Object.assign(policy, updates, {
      version: policy.version + 1,
      updatedAt: new Date()
    });

    this.policyHistory.push({
      policyId,
      action: 'UPDATED',
      timestamp: new Date(),
      oldData: oldPolicy,
      newData: { ...policy }
    });

    if (this.rbac && this.rbac.emit) {
      this.rbac.emit('policyUpdated', policy);
    }
    this.emit('policyUpdated', policy);
    return policy;
  }

  /**
   * حذف سياسة
   */
  deletePolicy(policyId) {
    const policy = this.policies.get(policyId);
    if (!policy) throw new Error(`Policy ${policyId} not found`);

    this.policies.delete(policyId);
    
    this.policyHistory.push({
      policyId,
      action: 'DELETED',
      timestamp: new Date(),
      data: policy
    });

    if (this.rbac && this.rbac.emit) {
      this.rbac.emit('policyDeleted', policyId);
    }
    this.emit('policyDeleted', policyId);
  }

  /**
   * الحصول على سياسة
   */
  getPolicy(policyId) {
    return this.policies.get(policyId) || null;
  }

  /**
   * الحصول على جميع السياسات مع التصفية
   */
  getAllPolicies(filter = {}) {
    let policies = Array.from(this.policies.values());

    if (filter.active !== undefined) {
      policies = policies.filter(p => p.isActive === filter.active);
    }

    if (filter.effect) {
      policies = policies.filter(p => p.effect === filter.effect);
    }

    if (filter.principal) {
      policies = policies.filter(p => 
        this._matchPrincipal(p.principal, filter.principal)
      );
    }

    return policies.sort((a, b) => b.priority - a.priority);
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * 2️⃣ POLICY EVALUATION - تقييم السياسات
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * تقييم السياسات للمستخدم
   */
  evaluatePolicies(userId, context = {}) {
    const evaluationResult = {
      userId,
      timestamp: new Date(),
      policiesApplied: [],
      deniedPolicies: [],
      finalDecision: 'Deny', // Default to deny
      evaluationDetails: []
    };

    // الحصول على السياسات المدرجة حسب الأولوية
    const applicablePolicies = this._getApplicablePolicies(userId, context);

    for (const policy of applicablePolicies) {
      if (!policy.isActive) continue;

      const evaluationDetail = {
        policyId: policy.id,
        effect: policy.effect,
        conditionsMet: true,
        reason: ''
      };

      // تقييم شروط السياسة
      if (!this._evaluatePolicyConditions(userId, policy, context)) {
        evaluationDetail.conditionsMet = false;
        evaluationDetail.reason = 'Conditions not satisfied';
        evaluationResult.evaluationDetails.push(evaluationDetail);
        continue;
      }

      // إذا كانت السياسة تسمح بالوصول ولم نرى رفض حتى الآن
      if (policy.effect === 'Allow') {
        evaluationResult.policiesApplied.push(policy.id);
        evaluationResult.finalDecision = 'Allow';
        evaluationDetail.reason = 'Access granted by policy';
      }

      // الرفض يسبق الموافقة
      if (policy.effect === 'Deny') {
        evaluationResult.deniedPolicies.push(policy.id);
        evaluationResult.finalDecision = 'Deny';
        evaluationDetail.reason = 'Access denied by policy';
        evaluationResult.evaluationDetails.push(evaluationDetail);
        break; // التوقف الفوري عند رفض
      }

      evaluationResult.evaluationDetails.push(evaluationDetail);
    }

    return evaluationResult;
  }

  /**
   * تقييم سياسة واحدة
   */
  evaluatePolicy(policyId, userId, context = {}) {
    const policy = this.policies.get(policyId);
    if (!policy) return { policyId, result: 'Unknown', reason: 'Policy not found' };

    const matches = this._evaluatePolicyConditions(userId, policy, context);
    
    return {
      policyId,
      result: matches ? policy.effect : 'NotApplicable',
      reason: matches ? `Policy effect: ${policy.effect}` : 'Policy conditions not met'
    };
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * 3️⃣ CONDITIONAL RULES - القواعس الشرطية
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * إنشاء قاعدة شرطية
   */
  createConditionalRule(ruleId, ruleConfig = {}) {
    const rule = {
      id: ruleId,
      name: ruleConfig.name || ruleId,
      description: ruleConfig.description || '',
      
      // Condition Operator
      operator: ruleConfig.operator || 'AND', // AND, OR, NOT
      conditions: ruleConfig.conditions || [], // Array of conditions
      
      // Action
      action: ruleConfig.action || 'Allow',
      
      // Priority
      priority: ruleConfig.priority || 50,
      
      // Status
      isActive: ruleConfig.isActive !== false,
      
      // Metadata
      metadata: ruleConfig.metadata || {}
    };

    this.conditionalRules.set(ruleId, rule);
    return rule;
  }

  /**
   * تقييم القاعدة الشرطية
   */
  evaluateRule(ruleId, context = {}) {
    const rule = this.conditionalRules.get(ruleId);
    if (!rule) return false;

    if (!rule.isActive) return false;

    const conditionResults = rule.conditions.map(condition =>
      this._evaluateCondition(condition, context)
    );

    switch (rule.operator) {
      case 'AND':
        return conditionResults.every(r => r === true);
      case 'OR':
        return conditionResults.some(r => r === true);
      case 'NOT':
        return conditionResults.every(r => r === false);
      default:
        return false;
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * 4️⃣ POLICY TEMPLATES - قوالب السياسات
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * إنشاء قالب سياسة
   */
  createPolicyTemplate(templateId, template = {}) {
    const policyTemplate = {
      id: templateId,
      name: template.name || templateId,
      description: template.description || '',
      
      template: template.template || {},
      variables: template.variables || {}, // متغيرات القالب
      
      category: template.category || 'general',
      
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.policyTemplates.set(templateId, policyTemplate);
    return policyTemplate;
  }

  /**
   * إنشاء سياسة من قالب
   */
  createPolicyFromTemplate(policyId, templateId, variables = {}) {
    const template = this.policyTemplates.get(templateId);
    if (!template) throw new Error(`Template ${templateId} not found`);

    // استبدال المتغيرات في القالب
    const policyConfig = this._substituteVariables(template.template, variables);

    return this.createPolicy(policyId, policyConfig);
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * 5️⃣ ACCESS DECISION - اتخاذ قرار الوصول
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * اتخاذ قرار الوصول النهائي
   */
  makeAccessDecision(userId, action, resource, context = {}) {
    const decision = {
      userId,
      action,
      resource,
      timestamp: new Date(),
      allowed: false,
      reason: '',
      policyEvaluations: []
    };

    // تقييم السياسات
    const policyResult = this.evaluatePolicies(userId, {
      action,
      resource,
      ...context
    });

    decision.allowed = policyResult.finalDecision === 'Allow';
    decision.reason = this._generateDecisionReason(policyResult);
    decision.policyEvaluations = policyResult.evaluationDetails;

    // التحقق من الأذونات القائمة على الأدوار
    if (!decision.allowed) {
      const hasPermission = this.rbac.hasPermission(
        userId,
        `${action}:${resource}`,
        context
      );

      if (hasPermission) {
        decision.allowed = true;
        decision.reason = 'Permission granted via role-based access';
      }
    }

    return decision;
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * 6️⃣ EXCEPTION MANAGEMENT - إدارة الاستثناءات
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * إضافة استثناء مؤقت
   */
  addTemporaryException(exceptionId, exceptionConfig = {}) {
    const exception = {
      id: exceptionId,
      userId: exceptionConfig.userId,
      action: exceptionConfig.action,
      resource: exceptionConfig.resource,
      
      effect: exceptionConfig.effect || 'Allow',
      expiresAt: exceptionConfig.expiresAt || new Date(Date.now() + 86400000), // 24 hours
      
      reason: exceptionConfig.reason,
      createdBy: exceptionConfig.createdBy || 'admin',
      createdAt: new Date()
    };

    if (!this.temporaryExceptions) {
      this.temporaryExceptions = new Map();
    }

    this.temporaryExceptions.set(exceptionId, exception);
    
    // إعادة تعيين الاستثناء المنتهي الصلاحية
    setTimeout(() => {
      this.temporaryExceptions.delete(exceptionId);
    }, exceptionConfig.expiresAt - Date.now());

    return exception;
  }

  /**
   * التحقق من الاستثناءات
   */
  _checkTemporaryExceptions(userId, action, resource) {
    if (!this.temporaryExceptions) return null;

    for (const exception of this.temporaryExceptions.values()) {
      if (exception.expiresAt < new Date()) continue;

      if (exception.userId === userId &&
          exception.action === action &&
          exception.resource === resource) {
        return exception;
      }
    }

    return null;
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * PRIVATE METHODS - الطرق الخاصة
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * الحصول على السياسات المنطبقة
   */
  _getApplicablePolicies(userId, context) {
    return this.getAllPolicies({ active: true })
      .filter(policy => {
        // التحقق من انطباق المبدأ
        if (!this._matchPrincipal(policy.principal, userId, context)) {
          return false;
        }

        // التحقق من الإجراء والمورد
        if (context.action && !this._matchAction(policy.action, context.action)) {
          return false;
        }

        if (context.resource && !this._matchResource(policy.resource, context.resource)) {
          return false;
        }

        return true;
      });
  }

  /**
   * تقييم شروط السياسة
   */
  _evaluatePolicyConditions(userId, policy, context) {
    if (!policy.conditions || Object.keys(policy.conditions).length === 0) {
      return true; // لا توجد شروط = موافقة تلقائية
    }

    for (const [key, value] of Object.entries(policy.conditions)) {
      const contextValue = context[key];
      
      if (!this._matchConditionValue(contextValue, value)) {
        return false;
      }
    }

    return true;
  }

  /**
   * تقييم شرط واحد
   */
  _evaluateCondition(condition, context) {
    if (typeof condition === 'function') {
      return condition(context);
    }

    if (typeof condition === 'object' && condition !== null) {
      const { field, operator, value } = condition;
      const contextValue = context[field];

      switch (operator) {
        case 'equals':
          return contextValue === value;
        case 'not_equals':
          return contextValue !== value;
        case 'greater_than':
          return contextValue > value;
        case 'less_than':
          return contextValue < value;
        case 'in':
          return Array.isArray(value) && value.includes(contextValue);
        case 'contains':
          return String(contextValue).includes(String(value));
        case 'starts_with':
          return String(contextValue).startsWith(String(value));
        case 'ends_with':
          return String(contextValue).endsWith(String(value));
        default:
          return false;
      }
    }

    return false;
  }

  /**
   * مطابقة المبدأ
   */
  _matchPrincipal(policiaPrincipal, userId, context = {}) {
    if (!policiaPrincipal) return true;

    if (policiaPrincipal.userId && policiaPrincipal.userId !== userId) {
      return false;
    }

    if (policiaPrincipal.role) {
      const userRoles = this.rbac.getUserRoles(userId);
      const hasRole = userRoles.some(r => r.roleId === policiaPrincipal.role);
      if (!hasRole) return false;
    }

    if (policiaPrincipal.department && context.department !== policiaPrincipal.department) {
      return false;
    }

    return true;
  }

  /**
   * مطابقة الإجراء
   */
  _matchAction(policyActions, contextAction) {
    if (!Array.isArray(policyActions)) return false;
    if (policyActions.includes('*')) return true;
    return policyActions.includes(contextAction);
  }

  /**
   * مطابقة المورد
   */
  _matchResource(policyResources, contextResource) {
    if (!Array.isArray(policyResources)) return false;
    if (policyResources.includes('*')) return true;
    
    return policyResources.some(res => {
      if (res === contextResource) return true;
      
      // دعم wildcards: "users/*" تطابق "users/123"
      if (res.endsWith('/*')) {
        const prefix = res.slice(0, -2);
        return contextResource.startsWith(prefix);
      }

      return false;
    });
  }

  /**
   * مطابقة قيمة الشرط
   */
  _matchConditionValue(actual, expected) {
    if (typeof expected === 'function') {
      return expected(actual);
    }
    if (Array.isArray(expected)) {
      return expected.includes(actual);
    }
    return actual === expected;
  }

  /**
   * استبدال المتغيرات في القالب
   */
  _substituteVariables(template, variables) {
    const substituted = JSON.parse(JSON.stringify(template));

    const substitute = (obj) => {
      for (const key in obj) {
        if (typeof obj[key] === 'string' && obj[key].startsWith('{{') && obj[key].endsWith('}}')) {
          const varName = obj[key].slice(2, -2);
          obj[key] = variables[varName] || obj[key];
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          substitute(obj[key]);
        }
      }
    };

    substitute(substituted);
    return substituted;
  }

  /**
   * توليد سبب القرار
   */
  _generateDecisionReason(policyResult) {
    if (policyResult.finalDecision === 'Allow') {
      return `Access allowed by policies: ${policyResult.policiesApplied.join(', ')}`;
    } else {
      if (policyResult.deniedPolicies.length > 0) {
        return `Access denied by policies: ${policyResult.deniedPolicies.join(', ')}`;
      }
      return 'No matching policies to allow access';
    }
  }

  /**
   * الحصول على سجل السياسات
   */
  getPolicyHistory(filters = {}) {
    let history = this.policyHistory;

    if (filters.policyId) {
      history = history.filter(h => h.policyId === filters.policyId);
    }

    if (filters.action) {
      history = history.filter(h => h.action === filters.action);
    }

    if (filters.limit) {
      history = history.slice(-filters.limit);
    }

    return history;
  }

  /**
   * تصدير السياسات
   */
  exportPolicies() {
    return {
      policies: Array.from(this.policies.values()),
      templates: Array.from(this.policyTemplates.values()),
      rules: Array.from(this.conditionalRules.values()),
      timestamp: new Date()
    };
  }

  /**
   * استيراد السياسات
   */
  importPolicies(data) {
    if (data.policies) {
      data.policies.forEach(policy => {
        this.createPolicy(policy.id, policy);
      });
    }

    if (data.templates) {
      data.templates.forEach(template => {
        this.createPolicyTemplate(template.id, template);
      });
    }

    if (data.rules) {
      data.rules.forEach(rule => {
        this.createConditionalRule(rule.id, rule);
      });
    }
  }
}

module.exports = RBACPolicyEngine;
