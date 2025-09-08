#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
واجهات برمجة التطبيقات لنظام المالية والمحاسبة
Finance and Accounting API Endpoints
"""

from flask import request, jsonify, render_template
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.orm import joinedload
from sqlalchemy import desc, func, and_, or_
from datetime import datetime, date, timedelta
from decimal import Decimal
import json

from app import app, db
from finance_models import (
    ChartOfAccounts, JournalEntry, JournalEntryLine, Invoice, InvoiceItem,
    Payment, BankAccount, BankTransaction, Expense, ExpenseCategory,
    Budget, BudgetItem, FixedAsset, AssetCategory, TaxReturn,
    FinancialReport, FinanceSettings, FinanceAuditLog
)

# ===== دليل الحسابات =====

@app.route('/api/finance/chart-of-accounts', methods=['GET'])
@jwt_required()
def get_chart_of_accounts():
    """عرض دليل الحسابات"""
    try:
        account_type = request.args.get('account_type')
        is_active = request.args.get('is_active', type=bool)
        
        query = ChartOfAccounts.query
        
        if account_type:
            query = query.filter(ChartOfAccounts.account_type == account_type)
        
        if is_active is not None:
            query = query.filter(ChartOfAccounts.is_active == is_active)
        
        accounts = query.order_by(ChartOfAccounts.account_code).all()
        
        return jsonify({
            'success': True,
            'accounts': [{
                'id': account.id,
                'account_code': account.account_code,
                'account_name': account.account_name,
                'account_type': account.account_type,
                'parent_id': account.parent_id,
                'level': account.level,
                'is_header': account.is_header,
                'normal_balance': account.normal_balance,
                'balance': float(account.balance),
                'is_active': account.is_active
            } for account in accounts]
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/finance/chart-of-accounts', methods=['POST'])
@jwt_required()
def create_account():
    """إنشاء حساب جديد"""
    try:
        data = request.get_json()
        
        required_fields = ['account_code', 'account_name', 'account_type']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'error': f'الحقل {field} مطلوب'}), 400
        
        # التحقق من عدم تكرار رمز الحساب
        existing_account = ChartOfAccounts.query.filter_by(
            account_code=data['account_code']
        ).first()
        
        if existing_account:
            return jsonify({'success': False, 'error': 'رمز الحساب موجود مسبقاً'}), 400
        
        account = ChartOfAccounts(
            account_code=data['account_code'],
            account_name=data['account_name'],
            account_name_en=data.get('account_name_en'),
            account_type=data['account_type'],
            parent_id=data.get('parent_id'),
            level=data.get('level', 1),
            is_header=data.get('is_header', False),
            normal_balance=data.get('normal_balance', 'debit'),
            description=data.get('description')
        )
        
        db.session.add(account)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء الحساب بنجاح',
            'account_id': account.id
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

# ===== القيود اليومية =====

@app.route('/api/finance/journal-entries', methods=['GET'])
@jwt_required()
def get_journal_entries():
    """عرض القيود اليومية"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status')
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        
        query = JournalEntry.query
        
        if status:
            query = query.filter(JournalEntry.status == status)
        
        if date_from:
            query = query.filter(JournalEntry.entry_date >= datetime.strptime(date_from, '%Y-%m-%d').date())
        
        if date_to:
            query = query.filter(JournalEntry.entry_date <= datetime.strptime(date_to, '%Y-%m-%d').date())
        
        entries = query.options(joinedload(JournalEntry.lines)).order_by(
            desc(JournalEntry.entry_date), desc(JournalEntry.id)
        ).paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'success': True,
            'entries': [{
                'id': entry.id,
                'entry_number': entry.entry_number,
                'entry_date': entry.entry_date.isoformat(),
                'description': entry.description,
                'total_amount': float(entry.total_amount),
                'status': entry.status,
                'entry_type': entry.entry_type,
                'is_balanced': entry.is_balanced,
                'lines_count': len(entry.lines)
            } for entry in entries.items],
            'pagination': {
                'page': entries.page,
                'pages': entries.pages,
                'per_page': entries.per_page,
                'total': entries.total
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/finance/journal-entries', methods=['POST'])
@jwt_required()
def create_journal_entry():
    """إنشاء قيد يومي جديد"""
    try:
        data = request.get_json()
        
        required_fields = ['entry_date', 'description', 'lines']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'error': f'الحقل {field} مطلوب'}), 400
        
        # التحقق من توازن القيد
        total_debit = sum([line.get('debit_amount', 0) for line in data['lines']])
        total_credit = sum([line.get('credit_amount', 0) for line in data['lines']])
        
        if abs(total_debit - total_credit) > 0.01:
            return jsonify({'success': False, 'error': 'القيد غير متوازن'}), 400
        
        # إنشاء رقم القيد
        entry_number = f"JE{datetime.now().strftime('%Y%m%d')}{JournalEntry.query.count() + 1:04d}"
        
        entry = JournalEntry(
            entry_number=entry_number,
            entry_date=datetime.strptime(data['entry_date'], '%Y-%m-%d').date(),
            description=data['description'],
            total_amount=total_debit,
            entry_type=data.get('entry_type', 'manual'),
            reference=data.get('reference'),
            source_document=data.get('source_document'),
            created_by=get_jwt_identity()
        )
        
        db.session.add(entry)
        db.session.flush()  # للحصول على ID
        
        # إضافة تفاصيل القيد
        for i, line_data in enumerate(data['lines'], 1):
            line = JournalEntryLine(
                journal_entry_id=entry.id,
                account_id=line_data['account_id'],
                description=line_data.get('description', ''),
                debit_amount=line_data.get('debit_amount', 0),
                credit_amount=line_data.get('credit_amount', 0),
                line_number=i
            )
            db.session.add(line)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء القيد بنجاح',
            'entry_id': entry.id,
            'entry_number': entry.entry_number
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

# ===== الفواتير =====

@app.route('/api/finance/invoices', methods=['GET'])
@jwt_required()
def get_invoices():
    """عرض الفواتير"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        invoice_type = request.args.get('invoice_type')
        status = request.args.get('status')
        
        query = Invoice.query
        
        if invoice_type:
            query = query.filter(Invoice.invoice_type == invoice_type)
        
        if status:
            query = query.filter(Invoice.status == status)
        
        invoices = query.order_by(desc(Invoice.invoice_date)).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'invoices': [{
                'id': invoice.id,
                'invoice_number': invoice.invoice_number,
                'invoice_type': invoice.invoice_type,
                'invoice_date': invoice.invoice_date.isoformat(),
                'due_date': invoice.due_date.isoformat() if invoice.due_date else None,
                'total_amount': float(invoice.total_amount),
                'paid_amount': float(invoice.paid_amount),
                'balance_due': float(invoice.balance_due),
                'status': invoice.status,
                'is_paid': invoice.is_paid
            } for invoice in invoices.items],
            'pagination': {
                'page': invoices.page,
                'pages': invoices.pages,
                'per_page': invoices.per_page,
                'total': invoices.total
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ===== المدفوعات =====

@app.route('/api/finance/payments', methods=['GET'])
@jwt_required()
def get_payments():
    """عرض المدفوعات"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        payment_type = request.args.get('payment_type')
        
        query = Payment.query
        
        if payment_type:
            query = query.filter(Payment.payment_type == payment_type)
        
        payments = query.order_by(desc(Payment.payment_date)).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'payments': [{
                'id': payment.id,
                'payment_number': payment.payment_number,
                'payment_type': payment.payment_type,
                'payment_date': payment.payment_date.isoformat(),
                'amount': float(payment.amount),
                'payment_method': payment.payment_method,
                'status': payment.status
            } for payment in payments.items],
            'pagination': {
                'page': payments.page,
                'pages': payments.pages,
                'per_page': payments.per_page,
                'total': payments.total
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ===== المصروفات =====

@app.route('/api/finance/expenses', methods=['GET'])
@jwt_required()
def get_expenses():
    """عرض المصروفات"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        category_id = request.args.get('category_id', type=int)
        status = request.args.get('status')
        
        query = Expense.query.options(joinedload(Expense.category))
        
        if category_id:
            query = query.filter(Expense.category_id == category_id)
        
        if status:
            query = query.filter(Expense.status == status)
        
        expenses = query.order_by(desc(Expense.expense_date)).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'expenses': [{
                'id': expense.id,
                'expense_number': expense.expense_number,
                'expense_date': expense.expense_date.isoformat(),
                'category': expense.category.name if expense.category else None,
                'description': expense.description,
                'amount': float(expense.amount),
                'status': expense.status
            } for expense in expenses.items],
            'pagination': {
                'page': expenses.page,
                'pages': expenses.pages,
                'per_page': expenses.per_page,
                'total': expenses.total
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ===== لوحة التحكم المالية =====

@app.route('/api/finance/dashboard', methods=['GET'])
@jwt_required()
def finance_dashboard():
    """لوحة التحكم المالية"""
    try:
        # الإحصائيات الأساسية
        total_assets = db.session.query(func.sum(ChartOfAccounts.balance)).filter(
            ChartOfAccounts.account_type == 'asset'
        ).scalar() or 0
        
        total_liabilities = db.session.query(func.sum(ChartOfAccounts.balance)).filter(
            ChartOfAccounts.account_type == 'liability'
        ).scalar() or 0
        
        total_revenue = db.session.query(func.sum(ChartOfAccounts.balance)).filter(
            ChartOfAccounts.account_type == 'revenue'
        ).scalar() or 0
        
        total_expenses = db.session.query(func.sum(ChartOfAccounts.balance)).filter(
            ChartOfAccounts.account_type == 'expense'
        ).scalar() or 0
        
        # الفواتير المعلقة
        pending_invoices = Invoice.query.filter(
            Invoice.status.in_(['sent', 'overdue'])
        ).count()
        
        # المدفوعات اليوم
        today_payments = Payment.query.filter(
            Payment.payment_date == date.today()
        ).count()
        
        # المصروفات المعلقة
        pending_expenses = Expense.query.filter(
            Expense.status == 'pending'
        ).count()
        
        return jsonify({
            'success': True,
            'stats': {
                'total_assets': float(total_assets),
                'total_liabilities': float(total_liabilities),
                'total_revenue': float(total_revenue),
                'total_expenses': float(total_expenses),
                'net_income': float(total_revenue - total_expenses),
                'pending_invoices': pending_invoices,
                'today_payments': today_payments,
                'pending_expenses': pending_expenses
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ===== التقارير المالية =====

@app.route('/api/finance/reports/balance-sheet', methods=['GET'])
@jwt_required()
def generate_balance_sheet():
    """إنشاء تقرير الميزانية العمومية"""
    try:
        as_of_date = request.args.get('as_of_date', date.today().isoformat())
        as_of_date = datetime.strptime(as_of_date, '%Y-%m-%d').date()
        
        # الأصول
        assets = ChartOfAccounts.query.filter(
            ChartOfAccounts.account_type == 'asset',
            ChartOfAccounts.is_active == True
        ).all()
        
        # الخصوم
        liabilities = ChartOfAccounts.query.filter(
            ChartOfAccounts.account_type == 'liability',
            ChartOfAccounts.is_active == True
        ).all()
        
        # حقوق الملكية
        equity = ChartOfAccounts.query.filter(
            ChartOfAccounts.account_type == 'equity',
            ChartOfAccounts.is_active == True
        ).all()
        
        total_assets = sum([account.balance for account in assets])
        total_liabilities = sum([account.balance for account in liabilities])
        total_equity = sum([account.balance for account in equity])
        
        balance_sheet = {
            'as_of_date': as_of_date.isoformat(),
            'assets': [{
                'account_code': account.account_code,
                'account_name': account.account_name,
                'balance': float(account.balance)
            } for account in assets],
            'liabilities': [{
                'account_code': account.account_code,
                'account_name': account.account_name,
                'balance': float(account.balance)
            } for account in liabilities],
            'equity': [{
                'account_code': account.account_code,
                'account_name': account.account_name,
                'balance': float(account.balance)
            } for account in equity],
            'totals': {
                'total_assets': float(total_assets),
                'total_liabilities': float(total_liabilities),
                'total_equity': float(total_equity),
                'balance_check': float(total_assets - (total_liabilities + total_equity))
            }
        }
        
        return jsonify({
            'success': True,
            'balance_sheet': balance_sheet
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/finance/reports/income-statement', methods=['GET'])
@jwt_required()
def generate_income_statement():
    """إنشاء تقرير قائمة الدخل"""
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if not start_date or not end_date:
            return jsonify({'success': False, 'error': 'تواريخ البداية والنهاية مطلوبة'}), 400
        
        start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        
        # الإيرادات
        revenue_accounts = ChartOfAccounts.query.filter(
            ChartOfAccounts.account_type == 'revenue',
            ChartOfAccounts.is_active == True
        ).all()
        
        # المصروفات
        expense_accounts = ChartOfAccounts.query.filter(
            ChartOfAccounts.account_type == 'expense',
            ChartOfAccounts.is_active == True
        ).all()
        
        total_revenue = sum([account.balance for account in revenue_accounts])
        total_expenses = sum([account.balance for account in expense_accounts])
        net_income = total_revenue - total_expenses
        
        income_statement = {
            'period_start': start_date.isoformat(),
            'period_end': end_date.isoformat(),
            'revenue': [{
                'account_code': account.account_code,
                'account_name': account.account_name,
                'balance': float(account.balance)
            } for account in revenue_accounts],
            'expenses': [{
                'account_code': account.account_code,
                'account_name': account.account_name,
                'balance': float(account.balance)
            } for account in expense_accounts],
            'totals': {
                'total_revenue': float(total_revenue),
                'total_expenses': float(total_expenses),
                'net_income': float(net_income),
                'profit_margin': float((net_income / total_revenue * 100) if total_revenue > 0 else 0)
            }
        }
        
        return jsonify({
            'success': True,
            'income_statement': income_statement
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/finance/reports/cash-flow', methods=['GET'])
@jwt_required()
def generate_cash_flow():
    """إنشاء تقرير التدفق النقدي"""
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if not start_date or not end_date:
            return jsonify({'success': False, 'error': 'تواريخ البداية والنهاية مطلوبة'}), 400
        
        start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        
        # التدفقات النقدية من العمليات التشغيلية
        operating_receipts = Payment.query.filter(
            Payment.payment_type == 'received',
            Payment.payment_date.between(start_date, end_date)
        ).all()
        
        operating_payments = Payment.query.filter(
            Payment.payment_type == 'paid',
            Payment.payment_date.between(start_date, end_date)
        ).all()
        
        total_receipts = sum([payment.amount for payment in operating_receipts])
        total_payments = sum([payment.amount for payment in operating_payments])
        net_operating_cash = total_receipts - total_payments
        
        # رصيد البنوك
        bank_accounts = BankAccount.query.filter(BankAccount.is_active == True).all()
        total_cash = sum([account.current_balance for account in bank_accounts])
        
        cash_flow = {
            'period_start': start_date.isoformat(),
            'period_end': end_date.isoformat(),
            'operating_activities': {
                'cash_receipts': float(total_receipts),
                'cash_payments': float(total_payments),
                'net_operating_cash': float(net_operating_cash)
            },
            'cash_position': {
                'total_cash_and_equivalents': float(total_cash),
                'bank_accounts': [{
                    'account_name': account.account_name,
                    'bank_name': account.bank_name,
                    'balance': float(account.current_balance)
                } for account in bank_accounts]
            }
        }
        
        return jsonify({
            'success': True,
            'cash_flow': cash_flow
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/finance/reports/tax-summary', methods=['GET'])
@jwt_required()
def generate_tax_summary():
    """إنشاء ملخص ضريبي"""
    try:
        year = request.args.get('year', date.today().year, type=int)
        quarter = request.args.get('quarter', type=int)
        
        # تحديد فترة التقرير
        if quarter:
            start_month = (quarter - 1) * 3 + 1
            end_month = quarter * 3
            start_date = date(year, start_month, 1)
            if end_month == 12:
                end_date = date(year, 12, 31)
            else:
                end_date = date(year, end_month + 1, 1) - timedelta(days=1)
        else:
            start_date = date(year, 1, 1)
            end_date = date(year, 12, 31)
        
        # الفواتير الخاضعة للضريبة
        taxable_invoices = Invoice.query.filter(
            Invoice.invoice_date.between(start_date, end_date),
            Invoice.tax_amount > 0
        ).all()
        
        total_sales = sum([invoice.subtotal for invoice in taxable_invoices])
        total_tax_collected = sum([invoice.tax_amount for invoice in taxable_invoices])
        
        # المصروفات الخاضعة للضريبة
        taxable_expenses = Expense.query.filter(
            Expense.expense_date.between(start_date, end_date),
            Expense.tax_amount > 0
        ).all()
        
        total_purchases = sum([expense.amount for expense in taxable_expenses])
        total_tax_paid = sum([expense.tax_amount for expense in taxable_expenses])
        
        net_tax_due = total_tax_collected - total_tax_paid
        
        tax_summary = {
            'period_start': start_date.isoformat(),
            'period_end': end_date.isoformat(),
            'year': year,
            'quarter': quarter,
            'sales_summary': {
                'total_taxable_sales': float(total_sales),
                'total_tax_collected': float(total_tax_collected),
                'tax_rate': 15.0  # ضريبة القيمة المضافة في السعودية
            },
            'purchase_summary': {
                'total_taxable_purchases': float(total_purchases),
                'total_tax_paid': float(total_tax_paid)
            },
            'net_position': {
                'net_tax_due': float(net_tax_due),
                'status': 'due' if net_tax_due > 0 else 'refund' if net_tax_due < 0 else 'zero'
            }
        }
        
        return jsonify({
            'success': True,
            'tax_summary': tax_summary
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ===== الأصول الثابتة =====

@app.route('/api/finance/fixed-assets', methods=['GET'])
@jwt_required()
def get_fixed_assets():
    """عرض الأصول الثابتة"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        category_id = request.args.get('category_id', type=int)
        status = request.args.get('status')
        
        query = FixedAsset.query.options(joinedload(FixedAsset.category))
        
        if category_id:
            query = query.filter(FixedAsset.category_id == category_id)
        
        if status:
            query = query.filter(FixedAsset.status == status)
        
        assets = query.order_by(FixedAsset.asset_code).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'assets': [{
                'id': asset.id,
                'asset_code': asset.asset_code,
                'asset_name': asset.asset_name,
                'category': asset.category.name if asset.category else None,
                'purchase_date': asset.purchase_date.isoformat(),
                'purchase_cost': float(asset.purchase_cost),
                'book_value': float(asset.book_value),
                'accumulated_depreciation': float(asset.accumulated_depreciation),
                'status': asset.status,
                'condition': asset.condition
            } for asset in assets.items],
            'pagination': {
                'page': assets.page,
                'pages': assets.pages,
                'per_page': assets.per_page,
                'total': assets.total
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/finance/fixed-assets/depreciation', methods=['POST'])
@jwt_required()
def calculate_depreciation():
    """حساب الاستهلاك للأصول الثابتة"""
    try:
        as_of_date = request.json.get('as_of_date')
        if as_of_date:
            as_of_date = datetime.strptime(as_of_date, '%Y-%m-%d').date()
        else:
            as_of_date = date.today()
        
        assets = FixedAsset.query.filter(FixedAsset.status == 'active').all()
        
        depreciation_entries = []
        total_depreciation = 0
        
        for asset in assets:
            old_accumulated = asset.accumulated_depreciation
            asset.calculate_depreciation(as_of_date)
            
            if asset.accumulated_depreciation != old_accumulated:
                depreciation_amount = asset.accumulated_depreciation - old_accumulated
                depreciation_entries.append({
                    'asset_id': asset.id,
                    'asset_name': asset.asset_name,
                    'depreciation_amount': float(depreciation_amount),
                    'accumulated_depreciation': float(asset.accumulated_depreciation),
                    'book_value': float(asset.book_value)
                })
                total_depreciation += depreciation_amount
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'تم حساب الاستهلاك لـ {len(depreciation_entries)} أصل',
            'total_depreciation': float(total_depreciation),
            'depreciation_entries': depreciation_entries
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

# ===== الموازنة والتخطيط المالي =====

@app.route('/api/finance/budgets', methods=['GET'])
@jwt_required()
def get_budgets():
    """عرض الموازنات"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        budget_year = request.args.get('budget_year', type=int)
        status = request.args.get('status')
        
        query = Budget.query
        
        if budget_year:
            query = query.filter(Budget.budget_year == budget_year)
        
        if status:
            query = query.filter(Budget.status == status)
        
        budgets = query.order_by(desc(Budget.budget_year), desc(Budget.created_at)).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'budgets': [{
                'id': budget.id,
                'name': budget.name,
                'budget_year': budget.budget_year,
                'budget_type': budget.budget_type,
                'start_date': budget.start_date.isoformat(),
                'end_date': budget.end_date.isoformat(),
                'total_revenue_budget': float(budget.total_revenue_budget),
                'total_expense_budget': float(budget.total_expense_budget),
                'status': budget.status
            } for budget in budgets.items],
            'pagination': {
                'page': budgets.page,
                'pages': budgets.pages,
                'per_page': budgets.per_page,
                'total': budgets.total
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/finance/budgets/<int:budget_id>/variance', methods=['GET'])
@jwt_required()
def budget_variance_analysis(budget_id):
    """تحليل انحراف الموازنة"""
    try:
        budget = Budget.query.get_or_404(budget_id)
        
        # تحديث الأرقام الفعلية
        for item in budget.items:
            # حساب الإنفاق الفعلي للحساب
            actual_expenses = db.session.query(func.sum(Expense.amount)).filter(
                Expense.expense_date.between(budget.start_date, budget.end_date),
                Expense.category_id == item.category_id
            ).scalar() or 0
            
            item.actual_amount = actual_expenses
            item.calculate_variance()
        
        db.session.commit()
        
        # إعداد تقرير التحليل
        variance_report = {
            'budget_id': budget.id,
            'budget_name': budget.name,
            'period': f"{budget.start_date.isoformat()} إلى {budget.end_date.isoformat()}",
            'items': [{
                'account_name': item.account.account_name if item.account else 'غير محدد',
                'category_name': item.category.name if item.category else 'غير محدد',
                'budgeted_amount': float(item.budgeted_amount),
                'actual_amount': float(item.actual_amount),
                'variance_amount': float(item.variance_amount),
                'variance_percentage': float(item.variance_percentage),
                'status': 'over_budget' if item.variance_amount > 0 else 'under_budget' if item.variance_amount < 0 else 'on_budget'
            } for item in budget.items],
            'summary': {
                'total_budgeted': float(budget.total_expense_budget),
                'total_actual': float(sum([item.actual_amount for item in budget.items])),
                'total_variance': float(sum([item.variance_amount for item in budget.items])),
                'variance_percentage': float((sum([item.variance_amount for item in budget.items]) / budget.total_expense_budget * 100) if budget.total_expense_budget > 0 else 0)
            }
        }
        
        return jsonify({
            'success': True,
            'variance_report': variance_report
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ===== إدارة البنوك والخزينة =====

@app.route('/api/finance/bank-accounts', methods=['GET'])
@jwt_required()
def get_bank_accounts():
    """عرض الحسابات البنكية"""
    try:
        is_active = request.args.get('is_active', type=bool)
        
        query = BankAccount.query
        
        if is_active is not None:
            query = query.filter(BankAccount.is_active == is_active)
        
        accounts = query.order_by(BankAccount.account_name).all()
        
        return jsonify({
            'success': True,
            'accounts': [{
                'id': account.id,
                'account_name': account.account_name,
                'bank_name': account.bank_name,
                'account_number': account.account_number,
                'iban': account.iban,
                'currency': account.currency,
                'current_balance': float(account.current_balance),
                'account_type': account.account_type,
                'is_active': account.is_active
            } for account in accounts]
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/finance/bank-transactions', methods=['GET'])
@jwt_required()
def get_bank_transactions():
    """عرض المعاملات البنكية"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        bank_account_id = request.args.get('bank_account_id', type=int)
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        
        query = BankTransaction.query.options(joinedload(BankTransaction.bank_account))
        
        if bank_account_id:
            query = query.filter(BankTransaction.bank_account_id == bank_account_id)
        
        if date_from:
            query = query.filter(BankTransaction.transaction_date >= datetime.strptime(date_from, '%Y-%m-%d').date())
        
        if date_to:
            query = query.filter(BankTransaction.transaction_date <= datetime.strptime(date_to, '%Y-%m-%d').date())
        
        transactions = query.order_by(desc(BankTransaction.transaction_date)).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'transactions': [{
                'id': transaction.id,
                'bank_account': transaction.bank_account.account_name,
                'transaction_date': transaction.transaction_date.isoformat(),
                'transaction_type': transaction.transaction_type,
                'amount': float(transaction.amount),
                'balance_after': float(transaction.balance_after),
                'description': transaction.description,
                'reference_number': transaction.reference_number,
                'is_reconciled': transaction.is_reconciled
            } for transaction in transactions.items],
            'pagination': {
                'page': transactions.page,
                'pages': transactions.pages,
                'per_page': transactions.per_page,
                'total': transactions.total
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/finance/bank-reconciliation', methods=['POST'])
@jwt_required()
def bank_reconciliation():
    """تسوية البنك"""
    try:
        data = request.get_json()
        bank_account_id = data.get('bank_account_id')
        transaction_ids = data.get('transaction_ids', [])
        
        if not bank_account_id:
            return jsonify({'success': False, 'error': 'معرف الحساب البنكي مطلوب'}), 400
        
        # تحديث حالة التسوية للمعاملات المحددة
        reconciled_count = 0
        for transaction_id in transaction_ids:
            transaction = BankTransaction.query.get(transaction_id)
            if transaction and transaction.bank_account_id == bank_account_id:
                transaction.is_reconciled = True
                transaction.reconciled_date = date.today()
                reconciled_count += 1
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'تم تسوية {reconciled_count} معاملة بنكية',
            'reconciled_count': reconciled_count
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

# Route لصفحة إدارة المالية والمحاسبة
@app.route('/finance-management')
@jwt_required()
def finance_management():
    return render_template('finance_management.html')
