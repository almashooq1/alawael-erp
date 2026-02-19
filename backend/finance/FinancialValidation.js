/**
 * ===================================================================
 * FINANCIAL VALIDATION & COMPLIANCE MODULE
 * وحدة التحقق المالي والامتثال
 * ===================================================================
 * نسخة: 1.0 - احترافية
 * التاريخ: فبراير 2026
 */

const EventEmitter = require('events');

class FinancialValidation extends EventEmitter {
  constructor(financialSystem) {
    super();
    this.fs = financialSystem;
    this.validationRules = new Map();
    this.complianceRules = new Map();
    this.violationQueue = [];
    this.auditTrail = [];
    this.setupDefaultRules();
  }

  // ===================================================================
  // 1. قواعد التحقق الأساسية - Basic Validation Rules
  // ===================================================================

  setupDefaultRules() {
    // قاعدة: يجب موازنة الإدراجات المحاسبية
    this.addValidationRule('BALANCED_JOURNAL', {
      name: 'إدراج محاسبي موازن',
      description: 'مجموع البنود المدينة يجب أن يساوي مجموع البنود الدائنة',
      severity: 'critical',
      validate: journalEntry => {
        const debits = journalEntry.items
          .filter(item => item.type === 'debit')
          .reduce((sum, item) => sum + item.amount, 0);

        const credits = journalEntry.items
          .filter(item => item.type === 'credit')
          .reduce((sum, item) => sum + item.amount, 0);

        return Math.abs(debits - credits) < 0.01;
      },
    });

    // قاعدة: التاريخ يجب أن يكون صحيحاً
    this.addValidationRule('VALID_DATE', {
      name: 'تاريخ صحيح',
      description: 'التاريخ يجب أن يكون في النطاق المسموح',
      severity: 'high',
      validate: entry => {
        if (!entry.date) return false;
        const entryDate = new Date(entry.date);
        const now = new Date();
        // لا يمكن إدخال تاريخ أكثر من سنة في الماضي أو في المستقبل
        return now.getTime() - entryDate.getTime() <= 365 * 24 * 60 * 60 * 1000 && entryDate <= now;
      },
    });

    // قاعدة: الحساب يجب أن يكون فعالاً
    this.addValidationRule('ACTIVE_ACCOUNT', {
      name: 'حساب فعال',
      description: 'الحساب المستخدم يجب أن يكون فعالاً وليس مغلقاً',
      severity: 'critical',
      validate: accountId => {
        const account = this.fs.accounts.get(accountId);
        return account && account.isActive;
      },
    });

    // قاعدة: الوصف يجب أن لا يكون فارغاً
    this.addValidationRule('DESCRIPTION_REQUIRED', {
      name: 'وصف مطلوب',
      description: 'يجب أن يحتوي الإدراج على وصف واضح',
      severity: 'medium',
      validate: entry => {
        return entry.description && entry.description.trim().length > 0;
      },
    });

    // قاعدة: المبلغ يجب أن يكون موجباً
    this.addValidationRule('POSITIVE_AMOUNT', {
      name: 'مبلغ موجب',
      description: 'المبلغ يجب أن يكون موجباً',
      severity: 'critical',
      validate: amount => {
        return amount > 0;
      },
    });

    // قاعدة: مستند مرفق للعملية
    this.addValidationRule('DOCUMENTATION_REQUIRED', {
      name: 'توثيق مطلوب',
      description: 'يجب أن توجد مستندات داعمة للعملية المالية',
      severity: 'high',
      validate: entry => {
        return entry.attachments && entry.attachments.length > 0;
      },
    });
  }

  // ===================================================================
  // 2. إضافة وإدارة القواعس - Rules Management
  // ===================================================================

  addValidationRule(ruleId, rule) {
    if (!rule.name || !rule.validate || !rule.severity) {
      throw new Error('القاعدة يجب أن تحتوي على: name, validate, severity');
    }

    this.validationRules.set(ruleId, {
      id: ruleId,
      ...rule,
      createdAt: new Date(),
      isActive: true,
    });

    this.logAudit('RULE_ADDED', ruleId, `تم إضافة قاعدة: ${rule.name}`);
    return this.validationRules.get(ruleId);
  }

  addComplianceRule(ruleId, rule) {
    if (!rule.name || !rule.description) {
      throw new Error('قاعدة الامتثال يجب أن تحتوي على: name, description');
    }

    this.complianceRules.set(ruleId, {
      id: ruleId,
      ...rule,
      createdAt: new Date(),
      isEnabled: true,
      checkFrequency: rule.checkFrequency || 'daily', // daily, weekly, monthly, quarterly
    });

    return this.complianceRules.get(ruleId);
  }

  // ===================================================================
  // 3. التحقق من صحة الإدراجات - Validation Functions
  // ===================================================================

  validateJournalEntry(journalEntry) {
    const violations = [];

    // تشغيل جميع قواعس التحقق النشطة
    for (const [ruleId, rule] of this.validationRules) {
      if (!rule.isActive) continue;

      try {
        if (!rule.validate(journalEntry)) {
          violations.push({
            ruleId,
            ruleName: rule.name,
            severity: rule.severity,
            message: rule.description,
            timestamp: new Date(),
          });
        }
      } catch (error) {
        violations.push({
          ruleId,
          ruleName: rule.name,
          severity: 'error',
          message: `خطأ في تنفيذ القاعدة: ${error.message}`,
          timestamp: new Date(),
        });
      }
    }

    const result = {
      isValid: violations.filter(v => v.severity === 'critical').length === 0,
      violations,
      warnings: violations.filter(v => v.severity === 'medium'),
      errors: violations.filter(v => v.severity === 'critical' || v.severity === 'error'),
      timestamp: new Date(),
    };

    // تسجيل الانتهاكات
    if (!result.isValid) {
      this.violationQueue.push({
        entryId: journalEntry.id,
        entryType: 'journal',
        violations: result.violations,
        timestamp: new Date(),
      });

      this.emit('validation:failed', result);
    }

    return result;
  }

  validateExpense(expense) {
    const violations = [];

    // التحقق من المبلغ
    if (expense.amount <= 0) {
      violations.push({
        field: 'amount',
        message: 'المبلغ يجب أن يكون موجباً',
        severity: 'critical',
      });
    }

    // التحقق من الفئة
    if (!expense.category) {
      violations.push({
        field: 'category',
        message: 'فئة المصروف مطلوبة',
        severity: 'critical',
      });
    }

    // التحقق من الحساب المدين
    if (!this.fs.accounts.get(expense.accountId)) {
      violations.push({
        field: 'accountId',
        message: 'الحساب المحدد غير موجود',
        severity: 'critical',
      });
    }

    // التحقق من المصادقة
    if (!expense.approvedBy && expense.amount > 10000) {
      violations.push({
        field: 'approvedBy',
        message: 'المصروفات الكبيرة تتطلب موافقة',
        severity: 'high',
      });
    }

    return {
      isValid: violations.filter(v => v.severity === 'critical').length === 0,
      violations,
      timestamp: new Date(),
    };
  }

  validateInvoice(invoice) {
    const violations = [];

    // التحقق من البيانات الأساسية
    if (!invoice.invoiceNumber) {
      violations.push({
        field: 'invoiceNumber',
        message: 'رقم الفاتورة مطلوب',
        severity: 'critical',
      });
    }

    if (!invoice.customerId) {
      violations.push({
        field: 'customerId',
        message: 'بيانات العميل مطلوبة',
        severity: 'critical',
      });
    }

    if (!invoice.items || invoice.items.length === 0) {
      violations.push({
        field: 'items',
        message: 'الفاتورة يجب أن تحتوي على عنصر واحد على الأقل',
        severity: 'critical',
      });
    } else {
      // التحقق من بيانات العناصر
      let totalAmount = 0;
      for (const item of invoice.items) {
        if (!item.description) {
          violations.push({
            field: 'items.description',
            message: 'وصف العنصر مطلوب',
            severity: 'high',
          });
        }
        if (item.quantity <= 0) {
          violations.push({
            field: 'items.quantity',
            message: 'الكمية يجب أن تكون موجبة',
            severity: 'critical',
          });
        }
        if (item.unitPrice <= 0) {
          violations.push({
            field: 'items.unitPrice',
            message: 'سعر الوحدة يجب أن يكون موجباً',
            severity: 'critical',
          });
        }
        totalAmount += item.quantity * item.unitPrice;
      }

      // التحقق من مجموع الفاتورة
      if (Math.abs(totalAmount - invoice.totalAmount) > 0.01) {
        violations.push({
          field: 'totalAmount',
          message: 'مجموع الفاتورة غير صحيح',
          severity: 'critical',
        });
      }
    }

    // التحقق من التاريخ
    if (!invoice.issueDate || invoice.issueDate > new Date()) {
      violations.push({
        field: 'issueDate',
        message: 'تاريخ الإصدار غير صحيح',
        severity: 'critical',
      });
    }

    // التحقق من شروط الدفع
    if (invoice.dueDate < invoice.issueDate) {
      violations.push({
        field: 'dueDate',
        message: 'تاريخ الاستحقاق يجب أن يكون بعد تاريخ الإصدار',
        severity: 'critical',
      });
    }

    return {
      isValid: violations.filter(v => v.severity === 'critical').length === 0,
      violations,
      timestamp: new Date(),
    };
  }

  // ===================================================================
  // 4. قواعس الامتثال التنظيمي - Compliance Rules
  // ===================================================================

  checkFinancialCompliance() {
    const complianceReport = {
      timestamp: new Date(),
      checks: [],
      violations: [],
      recommendations: [],
      complianceScore: 0, // من 0 إلى 100
    };

    // فحص 1: موازنة الميزانية العمومية
    const balanceCheck = this.checkAccountingEquation();
    complianceReport.checks.push(balanceCheck);
    if (!balanceCheck.passed) {
      complianceReport.violations.push({
        type: 'ACCOUNTING_EQUATION',
        severity: 'critical',
        message: 'الميزانية العمومية غير متوازنة',
        details: balanceCheck.details,
      });
    }

    // فحص 2: نسب السيولة
    const liquidityCheck = this.checkLiquidityRatios();
    complianceReport.checks.push(liquidityCheck);
    if (!liquidityCheck.passed) {
      complianceReport.violations.push({
        type: 'LIQUIDITY',
        severity: 'high',
        message: 'نسب السيولة منخفضة',
        details: liquidityCheck.details,
      });
    }

    // فحص 3: نسب الديون
    const debtCheck = this.checkDebtRatios();
    complianceReport.checks.push(debtCheck);
    if (!debtCheck.passed) {
      complianceReport.violations.push({
        type: 'DEBT_RATIO',
        severity: 'high',
        message: 'نسب الديون مرتفعة',
        details: debtCheck.details,
      });
    }

    // فحص 4: المعاملات المشبوهة
    const suspiciousTransactions = this.detectSuspiciousTransactions();
    if (suspiciousTransactions.length > 0) {
      complianceReport.violations.push({
        type: 'SUSPICIOUS_ACTIVITY',
        severity: 'medium',
        message: `تم اكتشاف ${suspiciousTransactions.length} معاملة مشبوهة`,
        details: suspiciousTransactions,
      });
    }

    // فحص 5: التوثيق والتسجيل
    const documentationCheck = this.checkDocumentation();
    complianceReport.checks.push(documentationCheck);

    // حساب درجة الامتثال
    const passedChecks = complianceReport.checks.filter(c => c.passed).length;
    complianceReport.complianceScore = (passedChecks / complianceReport.checks.length) * 100;

    // توصيات التحسين
    if (complianceReport.complianceScore < 100) {
      complianceReport.recommendations = this.generateComplianceRecommendations(complianceReport);
    }

    this.emit('compliance:checked', complianceReport);
    return complianceReport;
  }

  checkAccountingEquation() {
    // Assets = Liabilities + Equity
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    for (const account of this.fs.accounts.values()) {
      const balance = this.fs.getAccountBalance(account.id);

      if (account.type === 'asset') {
        totalAssets += balance;
      } else if (account.type === 'liability') {
        totalLiabilities += balance;
      } else if (account.type === 'equity') {
        totalEquity += balance;
      }
    }

    const difference = Math.abs(totalAssets - (totalLiabilities + totalEquity));
    const passed = difference < 0.01;

    return {
      name: 'معادلة المحاسبة',
      passed,
      details: {
        totalAssets: this.fs.roundNumber(totalAssets),
        totalLiabilities: this.fs.roundNumber(totalLiabilities),
        totalEquity: this.fs.roundNumber(totalEquity),
        difference: this.fs.roundNumber(difference),
      },
    };
  }

  checkLiquidityRatios() {
    // Current Ratio = Current Assets / Current Liabilities
    let currentAssets = 0;
    let currentLiabilities = 0;

    for (const account of this.fs.accounts.values()) {
      const balance = this.fs.getAccountBalance(account.id);

      if (account.type === 'asset' && account.subType === 'current') {
        currentAssets += balance;
      } else if (account.type === 'liability' && account.subType === 'current') {
        currentLiabilities += balance;
      }
    }

    const currentRatio = currentLiabilities !== 0 ? currentAssets / currentLiabilities : 0;

    // النسبة الصحية من 1.5 إلى 3
    const passed = currentRatio >= 1.5 && currentRatio <= 3;

    return {
      name: 'نسب السيولة',
      passed,
      details: {
        currentAssets: this.fs.roundNumber(currentAssets),
        currentLiabilities: this.fs.roundNumber(currentLiabilities),
        currentRatio: this.fs.roundNumber(currentRatio),
        recommended: '1.5 - 3',
      },
    };
  }

  checkDebtRatios() {
    // Debt Ratio = Total Liabilities / Total Assets
    let totalAssets = 0;
    let totalLiabilities = 0;

    for (const account of this.fs.accounts.values()) {
      const balance = this.fs.getAccountBalance(account.id);

      if (account.type === 'asset') {
        totalAssets += balance;
      } else if (account.type === 'liability') {
        totalLiabilities += balance;
      }
    }

    const debtRatio = totalAssets !== 0 ? totalLiabilities / totalAssets : 0;

    // النسبة الصحية أقل من 0.5
    const passed = debtRatio < 0.5;

    return {
      name: 'نسبة الديون',
      passed,
      details: {
        totalAssets: this.fs.roundNumber(totalAssets),
        totalLiabilities: this.fs.roundNumber(totalLiabilities),
        debtRatio: this.fs.roundNumber(debtRatio),
        recommended: '< 0.5',
      },
    };
  }

  detectSuspiciousTransactions() {
    const suspicious = [];
    const averageAmount = this.calculateAverageTransactionAmount();
    const threshold = averageAmount * 3; // عمليات أكبر من 3 أضعاف المتوسط

    for (const journal of this.fs.journals.values()) {
      for (const item of journal.items) {
        if (item.amount > threshold) {
          suspicious.push({
            journalId: journal.id,
            itemId: item.id,
            amount: item.amount,
            averageAmount: this.fs.roundNumber(averageAmount),
            multiplier: this.fs.roundNumber(item.amount / averageAmount),
            timestamp: journal.date,
            reason: 'مبلغ يتجاوز المتوسط بشكل كبير',
          });
        }
      }
    }

    return suspicious;
  }

  calculateAverageTransactionAmount() {
    let totalAmount = 0;
    let count = 0;

    for (const journal of this.fs.journals.values()) {
      for (const item of journal.items) {
        totalAmount += item.amount;
        count++;
      }
    }

    return count > 0 ? totalAmount / count : 0;
  }

  checkDocumentation() {
    let completeDocumentation = 0;
    let totalEntries = 0;

    for (const journal of this.fs.journals.values()) {
      totalEntries++;
      if (journal.attachments && journal.attachments.length > 0) {
        completeDocumentation++;
      }
    }

    const documentationRate = totalEntries > 0 ? (completeDocumentation / totalEntries) * 100 : 0;

    return {
      name: 'التوثيق والتسجيل',
      passed: documentationRate >= 90,
      details: {
        totalEntries,
        completedDocumentation: completeDocumentation,
        documentationRate: this.fs.roundNumber(documentationRate),
        required: 90,
      },
    };
  }

  generateComplianceRecommendations(report) {
    const recommendations = [];

    for (const violation of report.violations) {
      if (violation.type === 'ACCOUNTING_EQUATION') {
        recommendations.push({
          priority: 'critical',
          type: violation.type,
          message: 'يجب تصحيح الميزانية العمومية فوراً',
          action: 'مراجعة جميع الحسابات والتحقق من صحة الأرصدة',
        });
      } else if (violation.type === 'LIQUIDITY') {
        recommendations.push({
          priority: 'high',
          type: violation.type,
          message: 'قد تواجه المؤسسة صعوبات في السيولة',
          action: 'زيادة الأصول المتداولة أو تقليل الالتزامات قصيرة الأجل',
        });
      } else if (violation.type === 'DEBT_RATIO') {
        recommendations.push({
          priority: 'high',
          type: violation.type,
          message: 'مستويات الديون مرتفعة جداً',
          action: 'العمل على تقليل الالتزامات أو زيادة رأس المال',
        });
      }
    }

    return recommendations;
  }

  // ===================================================================
  // 5. تتبع الانتهاكات والتدقيق - Violation & Audit Tracking
  // ===================================================================

  logAudit(action, targetId, description) {
    const auditLog = {
      id: `AUDIT_${Date.now()}`,
      action,
      targetId,
      description,
      timestamp: new Date(),
      user: 'system',
    };

    this.auditTrail.push(auditLog);

    // الاحتفاظ بآخر 10000 سجل تدقيق فقط
    if (this.auditTrail.length > 10000) {
      this.auditTrail.shift();
    }

    return auditLog;
  }

  getViolationReport(limit = 100) {
    const sorted = this.violationQueue.sort((a, b) => b.timestamp - a.timestamp);

    const severity = {
      critical: [],
      high: [],
      medium: [],
    };

    for (const violation of sorted.slice(0, limit)) {
      for (const v of violation.violations) {
        severity[v.severity]?.push({
          ...v,
          entryId: violation.entryId,
        });
      }
    }

    return {
      totalViolations: this.violationQueue.length,
      criticalCount: severity.critical.length,
      highCount: severity.high.length,
      mediumCount: severity.medium.length,
      violations: severity,
      timestamp: new Date(),
    };
  }

  getAuditTrail(filters = {}) {
    let result = [...this.auditTrail];

    if (filters.action) {
      result = result.filter(log => log.action === filters.action);
    }

    if (filters.targetId) {
      result = result.filter(log => log.targetId === filters.targetId);
    }

    if (filters.startDate && filters.endDate) {
      result = result.filter(
        log => log.timestamp >= filters.startDate && log.timestamp <= filters.endDate
      );
    }

    return result.sort((a, b) => b.timestamp - a.timestamp);
  }

  // ===================================================================
  // 6. التقارير الميدانية - Summary Reports
  // ===================================================================

  generateValidationSummary() {
    const summary = {
      timestamp: new Date(),
      totalRules: this.validationRules.size,
      activeRules: Array.from(this.validationRules.values()).filter(r => r.isActive).length,
      totalViolations: this.violationQueue.length,
      violationsByType: {},
      recentViolations: this.violationQueue.slice(-10),
    };

    for (const violation of this.violationQueue) {
      for (const v of violation.violations) {
        summary.violationsByType[v.severity] = (summary.violationsByType[v.severity] || 0) + 1;
      }
    }

    return summary;
  }

  exportComplianceReport(format = 'json') {
    const report = {
      generatedAt: new Date(),
      complianceOverview: this.checkFinancialCompliance(),
      validationSummary: this.generateValidationSummary(),
      recentAuditTrail: this.getAuditTrail().slice(-50),
    };

    if (format === 'json') {
      return JSON.stringify(report, null, 2);
    } else if (format === 'html') {
      return this.convertReportToHTML(report);
    }

    return report;
  }

  convertReportToHTML(report) {
    let html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>تقرير الامتثال المالي</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; }
          .score { font-size: 24px; font-weight: bold; }
          .critical { color: red; }
          .high { color: orange; }
          .medium { color: gold; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: right; }
          th { background-color: #f0f0f0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>تقرير الامتثال المالي</h1>
          <p>تاريخ التوليد: ${report.generatedAt}</p>
        </div>
        
        <div class="section">
          <h2>نظرة عامة الامتثال</h2>
          <p class="score">درجة الامتثال: ${report.complianceOverview.complianceScore}%</p>
          <p>عدد الانتهاكات: ${report.complianceOverview.violations.length}</p>
        </div>

        <div class="section">
          <h2>ملخص التحقق</h2>
          <p>إجمالي القواعس: ${report.validationSummary.totalRules}</p>
          <p>القواعس النشطة: ${report.validationSummary.activeRules}</p>
          <p>إجمالي الانتهاكات: ${report.validationSummary.totalViolations}</p>
        </div>
      </body>
      </html>
    `;

    return html;
  }
}

module.exports = FinancialValidation;
