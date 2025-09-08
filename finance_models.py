#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
نماذج قاعدة البيانات لنظام المالية والمحاسبة
Finance and Accounting Database Models
"""

# SQLAlchemy import removed - using centralized db instance
from datetime import datetime, date
from decimal import Decimal
import json

# Import db from database module to avoid conflicts
from database import db

class ChartOfAccounts(db.Model):
    """دليل الحسابات - Chart of Accounts"""
    __tablename__ = 'chart_of_accounts'
    
    id = db.Column(db.Integer, primary_key=True)
    account_code = db.Column(db.String(20), unique=True, nullable=False, index=True)
    account_name = db.Column(db.String(200), nullable=False)
    account_name_en = db.Column(db.String(200))
    account_type = db.Column(db.String(50), nullable=False)  # asset, liability, equity, revenue, expense
    parent_id = db.Column(db.Integer, db.ForeignKey('chart_of_accounts.id'))
    level = db.Column(db.Integer, default=1)
    is_active = db.Column(db.Boolean, default=True)
    is_header = db.Column(db.Boolean, default=False)  # حساب رئيسي أم فرعي
    normal_balance = db.Column(db.String(10), default='debit')  # debit or credit
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    parent = db.relationship('ChartOfAccounts', remote_side=[id], backref='children')
    journal_entries = db.relationship('JournalEntryLine', backref='account', lazy='dynamic')
    
    def __repr__(self):
        return f'<Account {self.account_code}: {self.account_name}>'
    
    @property
    def balance(self):
        """حساب رصيد الحساب"""
        total_debit = sum([line.debit_amount for line in self.journal_entries if line.debit_amount])
        total_credit = sum([line.credit_amount for line in self.journal_entries if line.credit_amount])
        
        if self.normal_balance == 'debit':
            return total_debit - total_credit
        else:
            return total_credit - total_debit

class JournalEntry(db.Model):
    """القيود اليومية - Journal Entries"""
    __tablename__ = 'journal_entries'
    
    id = db.Column(db.Integer, primary_key=True)
    entry_number = db.Column(db.String(50), unique=True, nullable=False)
    entry_date = db.Column(db.Date, nullable=False, index=True)
    reference = db.Column(db.String(100))  # مرجع القيد
    description = db.Column(db.Text, nullable=False)
    total_amount = db.Column(db.Numeric(15, 2), nullable=False)
    status = db.Column(db.String(20), default='draft')  # draft, posted, cancelled
    entry_type = db.Column(db.String(50))  # manual, automatic, adjustment
    source_document = db.Column(db.String(100))  # مصدر القيد
    created_by = db.Column(db.Integer, nullable=False)
    approved_by = db.Column(db.Integer)
    posted_by = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    posted_at = db.Column(db.DateTime)
    
    # العلاقات
    lines = db.relationship('JournalEntryLine', backref='journal_entry', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<JournalEntry {self.entry_number}>'
    
    @property
    def is_balanced(self):
        """التحقق من توازن القيد"""
        total_debit = sum([line.debit_amount or 0 for line in self.lines])
        total_credit = sum([line.credit_amount or 0 for line in self.lines])
        return abs(total_debit - total_credit) < 0.01

class JournalEntryLine(db.Model):
    """تفاصيل القيود اليومية - Journal Entry Lines"""
    __tablename__ = 'journal_entry_lines'
    
    id = db.Column(db.Integer, primary_key=True)
    journal_entry_id = db.Column(db.Integer, db.ForeignKey('journal_entries.id'), nullable=False)
    account_id = db.Column(db.Integer, db.ForeignKey('chart_of_accounts.id'), nullable=False)
    description = db.Column(db.String(500))
    debit_amount = db.Column(db.Numeric(15, 2), default=0)
    credit_amount = db.Column(db.Numeric(15, 2), default=0)
    line_number = db.Column(db.Integer, nullable=False)
    
    def __repr__(self):
        return f'<JournalEntryLine {self.journal_entry_id}-{self.line_number}>'

class Invoice(db.Model):
    """الفواتير - Invoices"""
    __tablename__ = 'invoices'
    
    id = db.Column(db.Integer, primary_key=True)
    invoice_number = db.Column(db.String(50), unique=True, nullable=False)
    invoice_type = db.Column(db.String(20), nullable=False)  # sales, purchase, service
    customer_id = db.Column(db.Integer)  # ربط بجدول العملاء
    supplier_id = db.Column(db.Integer)  # ربط بجدول الموردين
    invoice_date = db.Column(db.Date, nullable=False)
    due_date = db.Column(db.Date)
    subtotal = db.Column(db.Numeric(15, 2), nullable=False)
    tax_amount = db.Column(db.Numeric(15, 2), default=0)
    discount_amount = db.Column(db.Numeric(15, 2), default=0)
    total_amount = db.Column(db.Numeric(15, 2), nullable=False)
    paid_amount = db.Column(db.Numeric(15, 2), default=0)
    status = db.Column(db.String(20), default='draft')  # draft, sent, paid, overdue, cancelled
    payment_terms = db.Column(db.String(100))
    notes = db.Column(db.Text)
    created_by = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # العلاقات
    items = db.relationship('InvoiceItem', backref='invoice', cascade='all, delete-orphan')
    payments = db.relationship('Payment', backref='invoice', lazy='dynamic')
    
    def __repr__(self):
        return f'<Invoice {self.invoice_number}>'
    
    @property
    def balance_due(self):
        """المبلغ المستحق"""
        return self.total_amount - self.paid_amount
    
    @property
    def is_paid(self):
        """هل تم دفع الفاتورة بالكامل"""
        return self.balance_due <= 0

class InvoiceItem(db.Model):
    """عناصر الفاتورة - Invoice Items"""
    __tablename__ = 'invoice_items'
    
    id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey('invoices.id'), nullable=False)
    item_name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    quantity = db.Column(db.Numeric(10, 2), default=1)
    unit_price = db.Column(db.Numeric(15, 2), nullable=False)
    discount_percentage = db.Column(db.Numeric(5, 2), default=0)
    tax_percentage = db.Column(db.Numeric(5, 2), default=15)  # ضريبة القيمة المضافة
    line_total = db.Column(db.Numeric(15, 2), nullable=False)
    
    def __repr__(self):
        return f'<InvoiceItem {self.item_name}>'

class Payment(db.Model):
    """المدفوعات - Payments"""
    __tablename__ = 'payments'
    
    id = db.Column(db.Integer, primary_key=True)
    payment_number = db.Column(db.String(50), unique=True, nullable=False)
    payment_type = db.Column(db.String(20), nullable=False)  # received, paid
    invoice_id = db.Column(db.Integer, db.ForeignKey('invoices.id'))
    customer_id = db.Column(db.Integer)
    supplier_id = db.Column(db.Integer)
    payment_date = db.Column(db.Date, nullable=False)
    amount = db.Column(db.Numeric(15, 2), nullable=False)
    payment_method = db.Column(db.String(50), nullable=False)  # cash, bank_transfer, check, card
    bank_account_id = db.Column(db.Integer, db.ForeignKey('bank_accounts.id'))
    reference_number = db.Column(db.String(100))
    notes = db.Column(db.Text)
    status = db.Column(db.String(20), default='completed')  # pending, completed, cancelled
    created_by = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Payment {self.payment_number}>'

class BankAccount(db.Model):
    """الحسابات البنكية - Bank Accounts"""
    __tablename__ = 'bank_accounts'
    
    id = db.Column(db.Integer, primary_key=True)
    account_name = db.Column(db.String(200), nullable=False)
    bank_name = db.Column(db.String(200), nullable=False)
    account_number = db.Column(db.String(50), nullable=False)
    iban = db.Column(db.String(34))
    swift_code = db.Column(db.String(11))
    currency = db.Column(db.String(3), default='SAR')
    opening_balance = db.Column(db.Numeric(15, 2), default=0)
    current_balance = db.Column(db.Numeric(15, 2), default=0)
    is_active = db.Column(db.Boolean, default=True)
    account_type = db.Column(db.String(50), default='checking')  # checking, savings, credit
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    transactions = db.relationship('BankTransaction', backref='bank_account', lazy='dynamic')
    payments = db.relationship('Payment', backref='bank_account', lazy='dynamic')
    
    def __repr__(self):
        return f'<BankAccount {self.account_name}>'

class BankTransaction(db.Model):
    """المعاملات البنكية - Bank Transactions"""
    __tablename__ = 'bank_transactions'
    
    id = db.Column(db.Integer, primary_key=True)
    bank_account_id = db.Column(db.Integer, db.ForeignKey('bank_accounts.id'), nullable=False)
    transaction_date = db.Column(db.Date, nullable=False)
    transaction_type = db.Column(db.String(20), nullable=False)  # deposit, withdrawal, transfer
    amount = db.Column(db.Numeric(15, 2), nullable=False)
    balance_after = db.Column(db.Numeric(15, 2), nullable=False)
    description = db.Column(db.String(500))
    reference_number = db.Column(db.String(100))
    category = db.Column(db.String(100))
    is_reconciled = db.Column(db.Boolean, default=False)
    reconciled_date = db.Column(db.Date)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<BankTransaction {self.reference_number}>'

class Expense(db.Model):
    """المصروفات - Expenses"""
    __tablename__ = 'expenses'
    
    id = db.Column(db.Integer, primary_key=True)
    expense_number = db.Column(db.String(50), unique=True, nullable=False)
    expense_date = db.Column(db.Date, nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('expense_categories.id'), nullable=False)
    supplier_id = db.Column(db.Integer)
    employee_id = db.Column(db.Integer)  # في حالة المصروفات الشخصية للموظفين
    description = db.Column(db.String(500), nullable=False)
    amount = db.Column(db.Numeric(15, 2), nullable=False)
    tax_amount = db.Column(db.Numeric(15, 2), default=0)
    payment_method = db.Column(db.String(50))
    receipt_number = db.Column(db.String(100))
    is_reimbursable = db.Column(db.Boolean, default=False)  # قابل للاسترداد
    status = db.Column(db.String(20), default='pending')  # pending, approved, paid, rejected
    approved_by = db.Column(db.Integer)
    approved_date = db.Column(db.Date)
    created_by = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Expense {self.expense_number}>'

class ExpenseCategory(db.Model):
    """فئات المصروفات - Expense Categories"""
    __tablename__ = 'expense_categories'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    name_en = db.Column(db.String(200))
    description = db.Column(db.Text)
    parent_id = db.Column(db.Integer, db.ForeignKey('expense_categories.id'))
    account_id = db.Column(db.Integer, db.ForeignKey('chart_of_accounts.id'))  # ربط بدليل الحسابات
    is_active = db.Column(db.Boolean, default=True)
    budget_limit = db.Column(db.Numeric(15, 2))  # حد الميزانية الشهرية
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    parent = db.relationship('ExpenseCategory', remote_side=[id], backref='children')
    expenses = db.relationship('Expense', backref='category', lazy='dynamic')
    
    def __repr__(self):
        return f'<ExpenseCategory {self.name}>'

class Budget(db.Model):
    """الميزانيات - Budgets"""
    __tablename__ = 'budgets'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    budget_year = db.Column(db.Integer, nullable=False)
    budget_type = db.Column(db.String(50), default='annual')  # annual, quarterly, monthly
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    total_revenue_budget = db.Column(db.Numeric(15, 2), default=0)
    total_expense_budget = db.Column(db.Numeric(15, 2), default=0)
    status = db.Column(db.String(20), default='draft')  # draft, approved, active, closed
    notes = db.Column(db.Text)
    created_by = db.Column(db.Integer, nullable=False)
    approved_by = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    approved_at = db.Column(db.DateTime)
    
    # العلاقات
    items = db.relationship('BudgetItem', backref='budget', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Budget {self.name} - {self.budget_year}>'

class BudgetItem(db.Model):
    """عناصر الميزانية - Budget Items"""
    __tablename__ = 'budget_items'
    
    id = db.Column(db.Integer, primary_key=True)
    budget_id = db.Column(db.Integer, db.ForeignKey('budgets.id'), nullable=False)
    account_id = db.Column(db.Integer, db.ForeignKey('chart_of_accounts.id'), nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('expense_categories.id'))
    budgeted_amount = db.Column(db.Numeric(15, 2), nullable=False)
    actual_amount = db.Column(db.Numeric(15, 2), default=0)
    variance_amount = db.Column(db.Numeric(15, 2), default=0)
    variance_percentage = db.Column(db.Numeric(5, 2), default=0)
    notes = db.Column(db.Text)
    
    def __repr__(self):
        return f'<BudgetItem {self.budget_id}-{self.account_id}>'
    
    def calculate_variance(self):
        """حساب الانحراف عن الميزانية"""
        self.variance_amount = self.actual_amount - self.budgeted_amount
        if self.budgeted_amount != 0:
            self.variance_percentage = (self.variance_amount / self.budgeted_amount) * 100

class FixedAsset(db.Model):
    """الأصول الثابتة - Fixed Assets"""
    __tablename__ = 'fixed_assets'
    
    id = db.Column(db.Integer, primary_key=True)
    asset_code = db.Column(db.String(50), unique=True, nullable=False)
    asset_name = db.Column(db.String(200), nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('asset_categories.id'), nullable=False)
    purchase_date = db.Column(db.Date, nullable=False)
    purchase_cost = db.Column(db.Numeric(15, 2), nullable=False)
    useful_life_years = db.Column(db.Integer, nullable=False)
    salvage_value = db.Column(db.Numeric(15, 2), default=0)
    depreciation_method = db.Column(db.String(50), default='straight_line')  # straight_line, declining_balance
    annual_depreciation = db.Column(db.Numeric(15, 2), nullable=False)
    accumulated_depreciation = db.Column(db.Numeric(15, 2), default=0)
    book_value = db.Column(db.Numeric(15, 2), nullable=False)
    location = db.Column(db.String(200))
    condition = db.Column(db.String(50), default='good')  # excellent, good, fair, poor
    status = db.Column(db.String(20), default='active')  # active, disposed, sold
    supplier_id = db.Column(db.Integer)
    warranty_expiry = db.Column(db.Date)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<FixedAsset {self.asset_code}: {self.asset_name}>'
    
    def calculate_depreciation(self, as_of_date=None):
        """حساب الاستهلاك"""
        if not as_of_date:
            as_of_date = date.today()
        
        years_elapsed = (as_of_date - self.purchase_date).days / 365.25
        
        if self.depreciation_method == 'straight_line':
            total_depreciation = min(
                self.annual_depreciation * years_elapsed,
                self.purchase_cost - self.salvage_value
            )
        else:  # declining_balance
            rate = 2 / self.useful_life_years  # Double declining balance
            total_depreciation = 0
            remaining_value = self.purchase_cost
            
            for year in range(int(years_elapsed) + 1):
                year_depreciation = remaining_value * rate
                if year < int(years_elapsed):
                    total_depreciation += year_depreciation
                    remaining_value -= year_depreciation
                else:  # Partial year
                    partial_year = years_elapsed - int(years_elapsed)
                    total_depreciation += year_depreciation * partial_year
        
        self.accumulated_depreciation = min(total_depreciation, self.purchase_cost - self.salvage_value)
        self.book_value = self.purchase_cost - self.accumulated_depreciation

class AssetCategory(db.Model):
    """فئات الأصول - Asset Categories"""
    __tablename__ = 'asset_categories'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    name_en = db.Column(db.String(200))
    description = db.Column(db.Text)
    default_useful_life = db.Column(db.Integer, default=5)
    default_depreciation_method = db.Column(db.String(50), default='straight_line')
    account_id = db.Column(db.Integer, db.ForeignKey('chart_of_accounts.id'))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    assets = db.relationship('FixedAsset', backref='category', lazy='dynamic')
    
    def __repr__(self):
        return f'<AssetCategory {self.name}>'

class TaxReturn(db.Model):
    """الإقرارات الضريبية - Tax Returns"""
    __tablename__ = 'tax_returns'
    
    id = db.Column(db.Integer, primary_key=True)
    return_type = db.Column(db.String(50), nullable=False)  # vat, income_tax, withholding_tax
    period_start = db.Column(db.Date, nullable=False)
    period_end = db.Column(db.Date, nullable=False)
    filing_date = db.Column(db.Date)
    due_date = db.Column(db.Date, nullable=False)
    total_sales = db.Column(db.Numeric(15, 2), default=0)
    total_purchases = db.Column(db.Numeric(15, 2), default=0)
    output_tax = db.Column(db.Numeric(15, 2), default=0)  # ضريبة المخرجات
    input_tax = db.Column(db.Numeric(15, 2), default=0)   # ضريبة المدخلات
    net_tax_due = db.Column(db.Numeric(15, 2), default=0)
    status = db.Column(db.String(20), default='draft')  # draft, filed, paid, overdue
    reference_number = db.Column(db.String(100))
    notes = db.Column(db.Text)
    created_by = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    filed_at = db.Column(db.DateTime)
    
    def __repr__(self):
        return f'<TaxReturn {self.return_type} - {self.period_start} to {self.period_end}>'

class FinancialReport(db.Model):
    """التقارير المالية - Financial Reports"""
    __tablename__ = 'financial_reports'
    
    id = db.Column(db.Integer, primary_key=True)
    report_name = db.Column(db.String(200), nullable=False)
    report_type = db.Column(db.String(50), nullable=False)  # balance_sheet, income_statement, cash_flow
    period_start = db.Column(db.Date, nullable=False)
    period_end = db.Column(db.Date, nullable=False)
    report_data = db.Column(db.JSON)  # بيانات التقرير بصيغة JSON
    generated_by = db.Column(db.Integer, nullable=False)
    generated_at = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default='generated')  # generated, approved, published
    
    def __repr__(self):
        return f'<FinancialReport {self.report_name}>'

class FinanceSettings(db.Model):
    """إعدادات النظام المالي - Finance Settings"""
    __tablename__ = 'finance_settings'
    
    id = db.Column(db.Integer, primary_key=True)
    setting_key = db.Column(db.String(100), unique=True, nullable=False)
    setting_value = db.Column(db.Text)
    setting_type = db.Column(db.String(50), default='string')  # string, number, boolean, json
    description = db.Column(db.Text)
    is_system = db.Column(db.Boolean, default=False)  # إعداد نظام أم قابل للتعديل
    updated_by = db.Column(db.Integer)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<FinanceSetting {self.setting_key}>'

class FinanceAuditLog(db.Model):
    """سجل مراجعة النظام المالي - Finance Audit Log"""
    __tablename__ = 'finance_audit_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False)
    action = db.Column(db.String(100), nullable=False)
    table_name = db.Column(db.String(100))
    record_id = db.Column(db.Integer)
    old_values = db.Column(db.JSON)
    new_values = db.Column(db.JSON)
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.String(500))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    def __repr__(self):
        return f'<FinanceAuditLog {self.action} by {self.user_id}>'
