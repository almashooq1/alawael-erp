/**
 * ===================================================================
 * ENTERPRISE FINANCIAL SYSTEM - نظام المالية المتكامل للمؤسسات
 * ===================================================================
 * نسخة: 2.0 - احترافية كاملة
 * التاريخ: فبراير 2026
 * الوصف: نظام محاسبي ومالي متطور مع دعم كامل للعمليات المالية المعقدة
 * ===================================================================
 */

const EventEmitter = require('events');
const mongoose = require('mongoose');

class EnterpriseFinancialSystem extends EventEmitter {
  constructor(options = {}) {
    super();
    this.config = {
      currency: options.currency || 'SAR',
      fiscalYearStart: options.fiscalYearStart || 1, // شهر بداية السنة المالية
      defaultTaxRate: options.defaultTaxRate || 0.15,
      decimalPlaces: options.decimalPlaces || 2,
      ...options,
    };

    this.accounts = new Map();
    this.journals = new Map();
    this.invoices = new Map();
    this.expenses = new Map();
    this.taxRecords = new Map();
    this.cashFlows = new Map();
    this.budgets = new Map();
    this.forecasts = new Map();
    this.auditLog = [];

    this.counters = {
      accountId: 1000,
      journalId: 2000,
      invoiceId: 3000,
      expenseId: 4000,
      transactionId: 5000,
      budgetId: 6000,
    };
  }

  // ===================================================================
  // 1. إدارة الحسابات - Account Management
  // ===================================================================

  /**
   * إنشاء حساب محاسبي جديد
   * @param {Object} accountData - بيانات الحساب
   */
  createAccount(accountData) {
    const {
      code,
      name,
      type, // asset, liability, equity, revenue, expense
      subType, // current, fixed, shortTerm, longTerm, etc.
      category,
      currency = this.config.currency,
      isActive = true,
    } = accountData;

    // التحقق من البيانات المطلوبة
    if (!code || !name || !type) {
      throw new Error('رمز الحساب والاسم والنوع مطلوبة');
    }

    // التحقق من عدم تكرار الرمز
    if (Array.from(this.accounts.values()).some(acc => acc.code === code)) {
      throw new Error(`رمز الحساب ${code} موجود بالفعل`);
    }

    const account = {
      id: ++this.counters.accountId,
      code,
      name,
      type,
      subType,
      category,
      currency,
      isActive,
      balance: 0,
      debitBalance: 0,
      creditBalance: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      transactions: [],
      description: accountData.description || '',
    };

    this.accounts.set(account.id, account);
    this.logAudit('ACCOUNT_CREATED', account.id, `تم إنشاء حساب: ${name}`);

    return account;
  }

  /**
   * الحصول على رصيد الحساب
   */
  getAccountBalance(accountId) {
    const account = this.accounts.get(accountId);
    if (!account) throw new Error('الحساب غير موجود');

    // حساب الرصيد بناءً على نوع الحساب
    const isDebitAccount = ['asset', 'expense'].includes(account.type);
    const balance = isDebitAccount
      ? account.debitBalance - account.creditBalance
      : account.creditBalance - account.debitBalance;

    return this.roundNumber(balance);
  }

  /**
   * تحديث رصيد الحساب
   */
  updateAccountBalance(accountId, amount, isDebit) {
    const account = this.accounts.get(accountId);
    if (!account) throw new Error('الحساب غير موجود');

    if (isDebit) {
      account.debitBalance += amount;
    } else {
      account.creditBalance += amount;
    }

    account.balance = this.getAccountBalance(accountId);
    account.updatedAt = new Date();
  }

  /**
   * إغلاق الحساب
   */
  closeAccount(accountId, reason = '') {
    const account = this.accounts.get(accountId);
    if (!account) throw new Error('الحساب غير موجود');

    if (Math.abs(account.balance) > 0.01) {
      throw new Error('لا يمكن إغلاق حساب له رصيد');
    }

    account.isActive = false;
    account.closedAt = new Date();
    account.closureReason = reason;

    this.logAudit('ACCOUNT_CLOSED', accountId, `تم إغلاق الحساب: ${reason}`);
    return account;
  }

  // ===================================================================
  // 2. إدارة القيود اليومية - Journal Entry Management
  // ===================================================================

  /**
   * إنشاء قيد يوميّ
   */
  createJournalEntry(entryData) {
    const {
      description,
      date = new Date(),
      reference,
      notes,
      lines = [], // { accountId, debit, credit, description }
    } = entryData;

    // التحقق من توازن القيد (مجموع المدين = مجموع الدائن)
    const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error('القيد غير متوازن: المدين لا يساوي الدائن');
    }

    if (lines.length < 2) {
      throw new Error('القيد يجب أن يحتوي على سطرين على الأقل');
    }

    const journalEntry = {
      id: ++this.counters.journalId,
      description,
      date,
      reference,
      notes,
      lines: lines.map(line => ({
        ...line,
        id: Math.random().toString(36).substr(2, 9),
      })),
      totalDebit: this.roundNumber(totalDebit),
      totalCredit: this.roundNumber(totalCredit),
      status: 'draft', // draft, posted, reversed
      createdAt: new Date(),
      updatedAt: new Date(),
      postedAt: null,
      postedBy: null,
    };

    this.journals.set(journalEntry.id, journalEntry);

    // تسجيل العملية
    this.logAudit('JOURNAL_CREATED', journalEntry.id, `تم إنشاء قيد: ${description}`);

    return journalEntry;
  }

  /**
   * ترحيل القيد إلى الدفاتر المحاسبية
   */
  postJournalEntry(journalId, postedBy) {
    const journal = this.journals.get(journalId);
    if (!journal) throw new Error('القيد غير موجود');

    if (journal.status === 'posted') {
      throw new Error('هذا القيد مرحل بالفعل');
    }

    // ترحيل السطور إلى الحسابات
    for (const line of journal.lines) {
      const account = this.accounts.get(line.accountId);
      if (!account) throw new Error(`الحساب ${line.accountId} غير موجود`);

      if (line.debit) {
        this.updateAccountBalance(line.accountId, line.debit, true);
      } else if (line.credit) {
        this.updateAccountBalance(line.accountId, line.credit, false);
      }
    }

    journal.status = 'posted';
    journal.postedAt = new Date();
    journal.postedBy = postedBy;
    journal.updatedAt = new Date();

    this.logAudit('JOURNAL_POSTED', journalId, 'تم ترحيل القيد بنجاح');
    this.emit('journal:posted', journal);

    return journal;
  }

  /**
   * عكس قيد مرحل
   */
  reverseJournalEntry(journalId, reason) {
    const originalJournal = this.journals.get(journalId);
    if (!originalJournal) throw new Error('القيد الأصلي غير موجود');

    if (originalJournal.status !== 'posted') {
      throw new Error('يمكن فقط عكس القيود المرحلة');
    }

    // إنشاء قيد عكسي
    const reverseLines = originalJournal.lines.map(line => ({
      accountId: line.accountId,
      debit: line.credit,
      credit: line.debit,
      description: `عكس: ${line.description}`,
    }));

    const reverseEntry = this.createJournalEntry({
      description: `قيد عكسي لـ: ${originalJournal.description}`,
      reference: `REV-${journalId}`,
      notes: reason,
      lines: reverseLines,
    });

    // ترحيل القيد العكسي
    this.postJournalEntry(reverseEntry.id, 'system');

    // وضع علامة على القيد الأصلي
    originalJournal.status = 'reversed';
    originalJournal.reversedBy = reverseEntry.id;
    originalJournal.reversedAt = new Date();

    this.logAudit('JOURNAL_REVERSED', journalId, `تم عكس القيد: ${reason}`);
    this.emit('journal:reversed', { original: originalJournal, reverse: reverseEntry });

    return { original: originalJournal, reverse: reverseEntry };
  }

  // ===================================================================
  // 3. الفواتير والإيصالات - Invoicing System
  // ===================================================================

  /**
   * إنشاء فاتورة
   */
  createInvoice(invoiceData) {
    const {
      invoiceNumber,
      invoiceDate = new Date(),
      dueDate,
      customerId,
      vendorId,
      items = [], // { description, quantity, unitPrice, taxRate, accountId }
      taxRate = this.config.defaultTaxRate,
      notes,
      status = 'draft',
    } = invoiceData;

    // حساب الإجماليات
    let subtotal = 0;
    const processedItems = items.map(item => {
      const lineTotal = item.quantity * item.unitPrice;
      const tax = lineTotal * (item.taxRate || taxRate);
      subtotal += lineTotal + tax;
      return {
        id: Math.random().toString(36).substr(2, 9),
        ...item,
        lineTotal: this.roundNumber(lineTotal),
        tax: this.roundNumber(tax),
        total: this.roundNumber(lineTotal + tax),
      };
    });

    const totalTax = processedItems.reduce((sum, item) => sum + item.tax, 0);
    const total = subtotal;

    const invoice = {
      id: ++this.counters.invoiceId,
      invoiceNumber: invoiceNumber || `INV-${Date.now()}`,
      invoiceDate,
      dueDate: dueDate || new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000),
      customerId,
      vendorId,
      items: processedItems,
      subtotal: this.roundNumber(subtotal - totalTax),
      totalTax: this.roundNumber(totalTax),
      total: this.roundNumber(total),
      amountPaid: 0,
      amountDue: this.roundNumber(total),
      status, // draft, sent, overdue, paid, cancelled
      notes,
      createdAt: new Date(),
      updatedAt: new Date(),
      sentAt: null,
      paidAt: null,
      payments: [],
    };

    this.invoices.set(invoice.id, invoice);

    // إنشاء قيد محاسبي تلقائي إذا كانت الفاتورة مُقيدة
    if (status === 'posted') {
      this.postInvoice(invoice.id);
    }

    this.logAudit('INVOICE_CREATED', invoice.id, `تم إنشاء فاتورة: ${invoiceNumber}`);
    this.emit('invoice:created', invoice);

    return invoice;
  }

  /**
   * تسجيل دفع الفاتورة
   */
  recordPayment(invoiceId, paymentData) {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) throw new Error('الفاتورة غير موجودة');

    const { amount, paymentMethod, reference, date = new Date() } = paymentData;

    if (amount > invoice.amountDue) {
      throw new Error('مبلغ الدفع يزيد عن المستحق');
    }

    const payment = {
      id: Math.random().toString(36).substr(2, 9),
      amount: this.roundNumber(amount),
      paymentMethod,
      reference,
      date,
      processedAt: new Date(),
    };

    invoice.payments.push(payment);
    invoice.amountPaid = this.roundNumber(invoice.amountPaid + amount);
    invoice.amountDue = this.roundNumber(invoice.total - invoice.amountPaid);

    if (invoice.amountDue <= 0.01) {
      invoice.status = 'paid';
      invoice.paidAt = new Date();
    }

    invoice.updatedAt = new Date();

    // إنشاء قيد محاسبي للدفع
    this.createPaymentJournal(invoice, payment);

    this.logAudit('PAYMENT_RECORDED', invoiceId, `تم تسجيل دفع: ${amount}`);
    this.emit('payment:recorded', { invoice, payment });

    return payment;
  }

  /**
   * إنشاء قيد محاسبي للدفع
   */
  createPaymentJournal(invoice, payment) {
    const lines = [];

    // حساب النقد
    lines.push({
      accountId: 1000, // حساب النقد - يجب أن يكون موجود
      debit: payment.amount,
      credit: 0,
      description: `دفع فاتورة ${invoice.invoiceNumber}`,
    });

    // حساب الذمم المدينة
    lines.push({
      accountId: invoice.customerAccountId || 1200,
      debit: 0,
      credit: payment.amount,
      description: `دفع من العميل على فاتورة ${invoice.invoiceNumber}`,
    });

    const journalEntry = this.createJournalEntry({
      description: `دفع فاتورة: ${invoice.invoiceNumber}`,
      reference: payment.reference,
      date: payment.date,
      lines,
    });

    this.postJournalEntry(journalEntry.id, 'system');
    return journalEntry;
  }

  /**
   * ترحيل الفاتورة
   */
  postInvoice(invoiceId) {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) throw new Error('الفاتورة غير موجودة');

    const lines = [];

    // حساب الذمم المدينة
    lines.push({
      accountId: invoice.customerAccountId || 1200,
      debit: invoice.total,
      credit: 0,
      description: `فاتورة: ${invoice.invoiceNumber}`,
    });

    // حساب الإيرادات
    lines.push({
      accountId: invoice.revenueAccountId || 4000,
      debit: 0,
      credit: invoice.subtotal,
      description: `إيرادات من فاتورة: ${invoice.invoiceNumber}`,
    });

    // حساب الضريبة المستحقة (إن وجدت)
    if (invoice.totalTax > 0.01) {
      lines.push({
        accountId: invoice.taxAccountId || 2100,
        debit: 0,
        credit: invoice.totalTax,
        description: `ضريبة على فاتورة: ${invoice.invoiceNumber}`,
      });
    }

    const journalEntry = this.createJournalEntry({
      description: `ترحيل فاتورة: ${invoice.invoiceNumber}`,
      reference: invoice.invoiceNumber,
      date: invoice.invoiceDate,
      lines,
    });

    this.postJournalEntry(journalEntry.id, 'system');
    invoice.journalEntryId = journalEntry.id;

    return journalEntry;
  }

  // ===================================================================
  // 4. إدارة المصروفات - Expense Management
  // ===================================================================

  /**
   * تسجيل مصروف
   */
  recordExpense(expenseData) {
    const {
      description,
      amount,
      category, // salaries, utilities, supplies, etc.
      accountId,
      date = new Date(),
      reference,
      vendor,
      approval = null,
      taxable = true,
      taxRate = this.config.defaultTaxRate,
    } = expenseData;

    if (!accountId || !amount) {
      throw new Error('رقم الحساب والمبلغ مطلوبان');
    }

    const expense = {
      id: ++this.counters.expenseId,
      description,
      amount: this.roundNumber(amount),
      tax: taxable ? this.roundNumber(amount * taxRate) : 0,
      total: taxable ? this.roundNumber(amount + amount * taxRate) : this.roundNumber(amount),
      category,
      accountId,
      date,
      reference,
      vendor,
      taxable,
      taxRate,
      status: 'draft', // draft, submitted, approved, paid
      approval,
      createdAt: new Date(),
      updatedAt: new Date(),
      approvedAt: null,
      approvedBy: null,
    };

    this.expenses.set(expense.id, expense);
    this.logAudit('EXPENSE_RECORDED', expense.id, `تم تسجيل مصروف: ${description}`);
    this.emit('expense:recorded', expense);

    return expense;
  }

  /**
   * الموافقة على المصروف
   */
  approveExpense(expenseId, approver, notes = '') {
    const expense = this.expenses.get(expenseId);
    if (!expense) throw new Error('المصروف غير موجود');

    if (expense.status === 'approved') {
      throw new Error('هذا المصروف موافق عليه بالفعل');
    }

    expense.status = 'approved';
    expense.approvedAt = new Date();
    expense.approvedBy = approver;
    expense.approvalNotes = notes;
    expense.updatedAt = new Date();

    // إنشاء قيد محاسبي
    this.createExpenseJournal(expense);

    this.logAudit('EXPENSE_APPROVED', expenseId, `تم الموافقة على المصروف من قبل ${approver}`);
    this.emit('expense:approved', expense);

    return expense;
  }

  /**
   * إنشاء قيد محاسبي للمصروف
   */
  createExpenseJournal(expense) {
    const lines = [];

    // حساب المصروف
    lines.push({
      accountId: expense.accountId,
      debit: expense.amount,
      credit: 0,
      description: expense.description,
    });

    // حساب النقد أو الذمم الدائنة
    lines.push({
      accountId: 1100, // حساب النقد أو الذمم
      debit: 0,
      credit: expense.amount,
      description: `دفع مصروف: ${expense.description}`,
    });

    // حساب الضريبة (إن وجدت)
    if (expense.tax > 0.01) {
      lines.push({
        accountId: 2200, // حساب الضرائب المستحقة
        debit: 0,
        credit: expense.tax,
        description: `ضريبة على مصروف: ${expense.description}`,
      });
    }

    const journalEntry = this.createJournalEntry({
      description: `مصروف: ${expense.description}`,
      reference: expense.reference,
      date: expense.date,
      lines,
    });

    this.postJournalEntry(journalEntry.id, 'system');
    expense.journalEntryId = journalEntry.id;

    return journalEntry;
  }

  // ===================================================================
  // 5. إدارة الميزانيات - Budget Management
  // ===================================================================

  /**
   * إنشاء ميزانية
   */
  createBudget(budgetData) {
    const {
      name,
      fiscalYear,
      period, // annual, quarterly, monthly
      startDate,
      endDate,
      department,
      lines = [], // { accountId, budgeted }
      notes,
    } = budgetData;

    const budget = {
      id: ++this.counters.budgetId,
      name,
      fiscalYear,
      period,
      startDate,
      endDate,
      department,
      lines: lines.map(line => ({
        ...line,
        id: Math.random().toString(36).substr(2, 9),
        spent: 0,
        variance: 0,
        variancePercentage: 0,
      })),
      totalBudgeted: lines.reduce((sum, line) => sum + (line.budgeted || 0), 0),
      totalSpent: 0,
      totalVariance: 0,
      utilizationPercentage: 0,
      status: 'draft', // draft, approved, active, closed
      notes,
      createdAt: new Date(),
      updatedAt: new Date(),
      approvedAt: null,
      approvedBy: null,
    };

    this.budgets.set(budget.id, budget);
    this.logAudit('BUDGET_CREATED', budget.id, `تم إنشاء ميزانية: ${name}`);
    this.emit('budget:created', budget);

    return budget;
  }

  /**
   * تحديث الإنفاق على الميزانية
   */
  updateBudgetSpending(budgetId, accountId, amount) {
    const budget = this.budgets.get(budgetId);
    if (!budget) throw new Error('الميزانية غير موجودة');

    const line = budget.lines.find(l => l.accountId === accountId);
    if (!line) throw new Error('سطر الميزانية غير موجود');

    line.spent = this.roundNumber(line.spent + amount);
    line.variance = this.roundNumber(line.budgeted - line.spent);
    line.variancePercentage = this.roundNumber((line.variance / line.budgeted) * 100);

    budget.totalSpent = budget.lines.reduce((sum, l) => sum + l.spent, 0);
    budget.totalVariance = budget.lines.reduce((sum, l) => sum + l.variance, 0);
    budget.utilizationPercentage = this.roundNumber(
      (budget.totalSpent / budget.totalBudgeted) * 100
    );

    // التنبيهات
    if (budget.utilizationPercentage > 90) {
      this.emit('budget:alert', {
        budgetId,
        type: 'critical',
        message: `تم استهلاك 90% من الميزانية: ${budget.name}`,
        utilizationPercentage: budget.utilizationPercentage,
      });
    } else if (budget.utilizationPercentage > 75) {
      this.emit('budget:alert', {
        budgetId,
        type: 'warning',
        message: `تم استهلاك 75% من الميزانية: ${budget.name}`,
        utilizationPercentage: budget.utilizationPercentage,
      });
    }

    budget.updatedAt = new Date();
    return budget;
  }

  // ===================================================================
  // 6. إدارة التدفق النقدي - Cash Flow Management
  // ===================================================================

  /**
   * تسجيل تدفق نقدي
   */
  recordCashFlow(flowData) {
    const {
      description,
      amount,
      type, // inflow, outflow
      category, // operating, investing, financing
      accountId,
      date = new Date(),
      reference,
      relatedTransactionId,
    } = flowData;

    const isInflow = type === 'inflow';
    const balance = isInflow ? amount : -amount;

    const cashFlow = {
      id: Math.random().toString(36).substr(2, 9),
      description,
      amount: this.roundNumber(amount),
      type,
      category,
      accountId,
      date,
      reference,
      relatedTransactionId,
      balance: this.roundNumber(balance),
      createdAt: new Date(),
    };

    const key = `${date.getFullYear()}-${date.getMonth()}`;
    if (!this.cashFlows.has(key)) {
      this.cashFlows.set(key, []);
    }

    this.cashFlows.get(key).push(cashFlow);
    this.logAudit('CASH_FLOW_RECORDED', reference, `تم تسجيل تدفق نقدي: ${description}`);
    this.emit('cashflow:recorded', cashFlow);

    return cashFlow;
  }

  /**
   * حساب الموقف النقدي
   */
  calculateCashPosition(asOfDate = new Date()) {
    const position = {
      date: asOfDate,
      operatingCash: 0,
      investingCash: 0,
      financingCash: 0,
      netCashFlow: 0,
      beginningBalance: 0,
      endingBalance: 0,
    };

    // جمع التدفقات النقدية
    for (const flows of this.cashFlows.values()) {
      const relevantFlows = flows.filter(f => f.date <= asOfDate);

      for (const flow of relevantFlows) {
        position[`${flow.category}Cash`] += flow.balance;
      }
    }

    position.netCashFlow = position.operatingCash + position.investingCash + position.financingCash;
    position.endingBalance = this.getAccountBalance(1000) || 0; // رصيد حساب النقد

    return position;
  }

  // ===================================================================
  // 7. التحليل المالي - Financial Analysis
  // ===================================================================

  /**
   * حساب النسب المالية
   */
  calculateFinancialRatios(asOfDate = new Date()) {
    // هنا يتم حساب النسب المختلفة
    const balanceSheet = this.generateBalanceSheet(asOfDate);
    const incomeStatement = this.generateIncomeStatement(asOfDate);

    return {
      liquidity: this.calculateLiquidityRatios(balanceSheet),
      profitability: this.calculateProfitabilityRatios(balanceSheet, incomeStatement),
      efficiency: this.calculateEfficiencyRatios(balanceSheet, incomeStatement),
      leverage: this.calculateLeverageRatios(balanceSheet),
    };
  }

  /**
   * نسب السيولة
   */
  calculateLiquidityRatios(balanceSheet) {
    const currentAssets = balanceSheet.currentAssets || 0;
    const currentLiabilities = balanceSheet.currentLiabilities || 0;

    return {
      currentRatio:
        currentLiabilities > 0 ? this.roundNumber(currentAssets / currentLiabilities) : 0,
      quickRatio:
        currentLiabilities > 0
          ? this.roundNumber((currentAssets - (balanceSheet.inventory || 0)) / currentLiabilities)
          : 0,
      cashRatio:
        currentLiabilities > 0
          ? this.roundNumber((balanceSheet.cash || 0) / currentLiabilities)
          : 0,
    };
  }

  /**
   * نسب الربحية
   */
  calculateProfitabilityRatios(balanceSheet, incomeStatement) {
    const totalAssets = balanceSheet.totalAssets || 1;
    const totalEquity = balanceSheet.totalEquity || 1;
    const netIncome = incomeStatement.netIncome || 0;
    const revenue = incomeStatement.totalRevenue || 1;

    return {
      roa: this.roundNumber((netIncome / totalAssets) * 100), // العائد على الأصول
      roe: this.roundNumber((netIncome / totalEquity) * 100), // العائد على حقوق الملكية
      netProfitMargin: this.roundNumber((netIncome / revenue) * 100), // هامش الربح الصافي
      grossProfitMargin: 0, // سيتم حسابها من بيانات تفصيلية
    };
  }

  /**
   * نسب الكفاءة
   */
  calculateEfficiencyRatios(balanceSheet, incomeStatement) {
    const totalAssets = balanceSheet.totalAssets || 1;
    const inventory = balanceSheet.inventory || 1;
    const revenue = incomeStatement.totalRevenue || 0;
    const costOfGoodsSold = incomeStatement.costOfGoodsSold || 0;

    return {
      assetTurnover: this.roundNumber(revenue / totalAssets), // دوران الأصول
      inventoryTurnover: inventory > 0 ? this.roundNumber(costOfGoodsSold / inventory) : 0, // دوران المخزون
      receivablesTurnover: 0, // سيتم حسابها من بيانات تفصيلية
    };
  }

  /**
   * نسب الرافعة المالية
   */
  calculateLeverageRatios(balanceSheet) {
    const totalAssets = balanceSheet.totalAssets || 1;
    const totalLiabilities = balanceSheet.totalLiabilities || 0;
    const totalEquity = balanceSheet.totalEquity || 1;

    return {
      debtRatio: this.roundNumber((totalLiabilities / totalAssets) * 100), // نسبة الديون
      equityRatio: this.roundNumber((totalEquity / totalAssets) * 100), // نسبة حقوق الملكية
      debtToEquity: this.roundNumber(totalLiabilities / totalEquity), // الديون إلى حقوق الملكية
      debtServiceCoverage: 0, // سيتم حسابها من بيانات إضافية
    };
  }

  // ===================================================================
  // 8. التنبؤ المالي - Financial Forecasting
  // ===================================================================

  /**
   * إنشاء توقعات مالية
   */
  createForecast(forecastData) {
    const {
      name,
      description,
      baseAccountId,
      period, // months, quarters, years
      numberOfPeriods,
      growthRate = 0.05, // 5% افتراضي
      method = 'linear', // linear, exponential, seasonal
    } = forecastData;

    const forecast = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      description,
      baseAccountId,
      period,
      numberOfPeriods,
      growthRate,
      method,
      projections: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // حساب الإسقاطات
    const baseBalance = this.getAccountBalance(baseAccountId);
    let projectedValue = baseBalance;

    for (let i = 1; i <= numberOfPeriods; i++) {
      if (method === 'linear') {
        projectedValue = baseBalance + baseBalance * growthRate * i;
      } else if (method === 'exponential') {
        projectedValue = baseBalance * Math.pow(1 + growthRate, i);
      }

      forecast.projections.push({
        period: i,
        projectedValue: this.roundNumber(projectedValue),
        growthPercentage: this.roundNumber(((projectedValue - baseBalance) / baseBalance) * 100),
      });
    }

    this.forecasts.set(forecast.id, forecast);
    this.logAudit('FORECAST_CREATED', forecast.id, `تم إنشاء توقع: ${name}`);

    return forecast;
  }

  // ===================================================================
  // 9. الضرائب والامتثال - Tax & Compliance
  // ===================================================================

  /**
   * حساب الضريبة المستحقة
   */
  calculateTax(period, taxableIncome, taxRate = this.config.defaultTaxRate) {
    const taxAmount = taxableIncome * taxRate;
    const taxRecord = {
      id: Math.random().toString(36).substr(2, 9),
      period,
      taxableIncome: this.roundNumber(taxableIncome),
      taxRate,
      taxAmount: this.roundNumber(taxAmount),
      paid: 0,
      due: this.roundNumber(taxAmount),
      status: 'pending', // pending, partial, paid
      createdAt: new Date(),
      dueDate: new Date(),
    };

    this.taxRecords.set(taxRecord.id, taxRecord);
    this.logAudit('TAX_CALCULATED', taxRecord.id, `تم حساب الضريبة للفترة: ${period}`);

    return taxRecord;
  }

  /**
   * تسجيل دفع الضريبة
   */
  payTax(taxRecordId, amount, paymentMethod) {
    const taxRecord = this.taxRecords.get(taxRecordId);
    if (!taxRecord) throw new Error('سجل الضريبة غير موجود');

    if (amount > taxRecord.due) {
      throw new Error('مبلغ الدفع يزيد عن المستحق');
    }

    taxRecord.paid = this.roundNumber(taxRecord.paid + amount);
    taxRecord.due = this.roundNumber(taxRecord.taxAmount - taxRecord.paid);

    if (taxRecord.due <= 0.01) {
      taxRecord.status = 'paid';
    } else if (taxRecord.paid > 0) {
      taxRecord.status = 'partial';
    }

    this.logAudit('TAX_PAID', taxRecordId, `تم دفع ضريبة: ${amount}`);
    this.emit('tax:paid', taxRecord);

    return taxRecord;
  }

  // ===================================================================
  // 10. التقارير المالية - Financial Reports
  // ===================================================================

  /**
   * إنشاء الميزانية العمومية
   */
  generateBalanceSheet(asOfDate = new Date()) {
    const assets = {
      currentAssets: [],
      fixedAssets: [],
      totalCurrentAssets: 0,
      totalFixedAssets: 0,
      totalAssets: 0,
    };

    const liabilities = {
      currentLiabilities: [],
      longTermLiabilities: [],
      totalCurrentLiabilities: 0,
      totalLongTermLiabilities: 0,
      totalLiabilities: 0,
    };

    const equity = {
      capitalAccounts: [],
      retainedEarnings: 0,
      currentYearEarnings: 0,
      totalEquity: 0,
    };

    // تجميع الحسابات حسب النوع
    for (const account of this.accounts.values()) {
      const balance = this.getAccountBalance(account.id);
      if (Math.abs(balance) < 0.01) continue;

      const entry = {
        code: account.code,
        name: account.name,
        balance,
      };

      if (account.type === 'asset') {
        if (account.subType === 'current') {
          assets.currentAssets.push(entry);
          assets.totalCurrentAssets += balance;
        } else {
          assets.fixedAssets.push(entry);
          assets.totalFixedAssets += balance;
        }
      } else if (account.type === 'liability') {
        if (account.subType === 'current') {
          liabilities.currentLiabilities.push(entry);
          liabilities.totalCurrentLiabilities += balance;
        } else {
          liabilities.longTermLiabilities.push(entry);
          liabilities.totalLongTermLiabilities += balance;
        }
      } else if (account.type === 'equity') {
        equity.capitalAccounts.push(entry);
      }
    }

    assets.totalAssets = assets.totalCurrentAssets + assets.totalFixedAssets;
    liabilities.totalLiabilities =
      liabilities.totalCurrentLiabilities + liabilities.totalLongTermLiabilities;
    equity.totalEquity =
      equity.capitalAccounts.reduce((sum, acc) => sum + acc.balance, 0) +
      equity.currentYearEarnings;

    return {
      asOfDate,
      assets,
      liabilities,
      equity,
      isBalanced:
        Math.abs(assets.totalAssets - (liabilities.totalLiabilities + equity.totalEquity)) < 0.01,
      generatedAt: new Date(),
    };
  }

  /**
   * إنشاء قائمة الدخل
   */
  generateIncomeStatement(startDate, endDate) {
    const revenue = {
      operatingRevenue: [],
      otherRevenue: [],
      totalOperatingRevenue: 0,
      totalOtherRevenue: 0,
      totalRevenue: 0,
    };

    const expenses = {
      costOfGoodsSold: [],
      operatingExpenses: [],
      otherExpenses: [],
      totalCOGS: 0,
      totalOperatingExpenses: 0,
      totalOtherExpenses: 0,
      totalExpenses: 0,
    };

    // جمع بيانات الفترة
    for (const account of this.accounts.values()) {
      if (account.type === 'revenue') {
        // جمع الإيرادات الفترة المحددة
        const balance = this.getAccountBalance(account.id);
        if (Math.abs(balance) > 0.01) {
          const revenueEntry = {
            code: account.code,
            name: account.name,
            amount: balance,
          };

          if (account.category === 'operating') {
            revenue.operatingRevenue.push(revenueEntry);
            revenue.totalOperatingRevenue += balance;
          } else {
            revenue.otherRevenue.push(revenueEntry);
            revenue.totalOtherRevenue += balance;
          }
        }
      } else if (account.type === 'expense') {
        const balance = Math.abs(this.getAccountBalance(account.id));
        if (balance > 0.01) {
          const expenseEntry = {
            code: account.code,
            name: account.name,
            amount: balance,
          };

          if (account.category === 'cogs') {
            expenses.costOfGoodsSold.push(expenseEntry);
            expenses.totalCOGS += balance;
          } else if (account.category === 'operating') {
            expenses.operatingExpenses.push(expenseEntry);
            expenses.totalOperatingExpenses += balance;
          } else {
            expenses.otherExpenses.push(expenseEntry);
            expenses.totalOtherExpenses += balance;
          }
        }
      }
    }

    revenue.totalRevenue = revenue.totalOperatingRevenue + revenue.totalOtherRevenue;
    expenses.totalExpenses =
      expenses.totalCOGS + expenses.totalOperatingExpenses + expenses.totalOtherExpenses;

    const grossProfit = revenue.totalRevenue - expenses.totalCOGS;
    const operatingIncome = grossProfit - expenses.totalOperatingExpenses;
    const netIncome = operatingIncome - expenses.totalOtherExpenses;

    return {
      period: { startDate, endDate },
      revenue,
      expenses,
      grossProfit: this.roundNumber(grossProfit),
      operatingIncome: this.roundNumber(operatingIncome),
      netIncome: this.roundNumber(netIncome),
      generatedAt: new Date(),
    };
  }

  // ===================================================================
  // 11. السجلات والتدقيق - Audit & Logging
  // ===================================================================

  /**
   * تسجيل في دفتر التدقيق
   */
  logAudit(action, entityId, description, details = {}) {
    const auditEntry = {
      id: Math.random().toString(36).substr(2, 9),
      action,
      entityId,
      description,
      details,
      timestamp: new Date(),
      user: details.user || 'system',
    };

    this.auditLog.push(auditEntry);

    // الاحتفاظ بآخر 10000 سجل فقط
    if (this.auditLog.length > 10000) {
      this.auditLog.shift();
    }

    return auditEntry;
  }

  /**
   * الحصول على سجلات التدقيق
   */
  getAuditLog(filters = {}) {
    let results = this.auditLog;

    if (filters.action) {
      results = results.filter(log => log.action === filters.action);
    }
    if (filters.entityId) {
      results = results.filter(log => log.entityId === filters.entityId);
    }
    if (filters.startDate && filters.endDate) {
      results = results.filter(
        log => log.timestamp >= filters.startDate && log.timestamp <= filters.endDate
      );
    }

    return results.sort((a, b) => b.timestamp - a.timestamp);
  }

  // ===================================================================
  // 12. أدوات مساعدة - Helper Methods
  // ===================================================================

  /**
   * تقريب الأرقام
   */
  roundNumber(value) {
    const factor = Math.pow(10, this.config.decimalPlaces);
    return Math.round(value * factor) / factor;
  }

  /**
   * التحقق من توازن المعادلة المحاسبية
   */
  verifyAccountingEquation() {
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    for (const account of this.accounts.values()) {
      const balance = this.getAccountBalance(account.id);

      if (account.type === 'asset') {
        totalAssets += balance;
      } else if (account.type === 'liability') {
        totalLiabilities += balance;
      } else if (account.type === 'equity') {
        totalEquity += balance;
      }
    }

    const isBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01;

    return {
      totalAssets: this.roundNumber(totalAssets),
      totalLiabilities: this.roundNumber(totalLiabilities),
      totalEquity: this.roundNumber(totalEquity),
      isBalanced,
      variance: this.roundNumber(totalAssets - (totalLiabilities + totalEquity)),
    };
  }

  /**
   * الحصول على إحصائيات النظام
   */
  getSystemStatistics() {
    return {
      totalAccounts: this.accounts.size,
      totalJournals: this.journals.size,
      totalInvoices: this.invoices.size,
      totalExpenses: this.expenses.size,
      totalBudgets: this.budgets.size,
      totalForecasts: this.forecasts.size,
      totalTaxRecords: this.taxRecords.size,
      totalAuditLogs: this.auditLog.length,
      currency: this.config.currency,
      lastUpdate: new Date(),
    };
  }

  /**
   * تصدير البيانات
   */
  exportDatabase() {
    return {
      accounts: Array.from(this.accounts.values()),
      journals: Array.from(this.journals.values()),
      invoices: Array.from(this.invoices.values()),
      expenses: Array.from(this.expenses.values()),
      budgets: Array.from(this.budgets.values()),
      forecasts: Array.from(this.forecasts.values()),
      taxRecords: Array.from(this.taxRecords.values()),
      auditLog: this.auditLog,
      exportedAt: new Date(),
    };
  }
}

module.exports = EnterpriseFinancialSystem;
