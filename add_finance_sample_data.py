#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
إضافة بيانات تجريبية شاملة لنظام المالية والمحاسبة
Add comprehensive sample data for Finance and Accounting System
"""

import sys
import os
from datetime import datetime, timedelta
from decimal import Decimal
import random

# إضافة مسار المشروع
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from finance_models import *

def add_sample_chart_of_accounts():
    """إضافة دليل حسابات تجريبي"""
    print("إضافة دليل الحسابات...")
    
    accounts = [
        # الأصول
        {'code': '1000', 'name': 'الأصول', 'type': 'asset', 'parent': None},
        {'code': '1100', 'name': 'الأصول المتداولة', 'type': 'asset', 'parent': '1000'},
        {'code': '1110', 'name': 'النقدية والبنوك', 'type': 'asset', 'parent': '1100'},
        {'code': '1111', 'name': 'الصندوق', 'type': 'asset', 'parent': '1110'},
        {'code': '1112', 'name': 'البنك الأهلي', 'type': 'asset', 'parent': '1110'},
        {'code': '1113', 'name': 'بنك الراجحي', 'type': 'asset', 'parent': '1110'},
        {'code': '1120', 'name': 'المدينون', 'type': 'asset', 'parent': '1100'},
        {'code': '1130', 'name': 'المخزون', 'type': 'asset', 'parent': '1100'},
        
        # الأصول الثابتة
        {'code': '1200', 'name': 'الأصول الثابتة', 'type': 'asset', 'parent': '1000'},
        {'code': '1210', 'name': 'الأراضي والمباني', 'type': 'asset', 'parent': '1200'},
        {'code': '1220', 'name': 'الأثاث والمعدات', 'type': 'asset', 'parent': '1200'},
        {'code': '1230', 'name': 'السيارات', 'type': 'asset', 'parent': '1200'},
        
        # الخصوم
        {'code': '2000', 'name': 'الخصوم', 'type': 'liability', 'parent': None},
        {'code': '2100', 'name': 'الخصوم المتداولة', 'type': 'liability', 'parent': '2000'},
        {'code': '2110', 'name': 'الدائنون', 'type': 'liability', 'parent': '2100'},
        {'code': '2120', 'name': 'المصروفات المستحقة', 'type': 'liability', 'parent': '2100'},
        {'code': '2130', 'name': 'الضرائب المستحقة', 'type': 'liability', 'parent': '2100'},
        
        # حقوق الملكية
        {'code': '3000', 'name': 'حقوق الملكية', 'type': 'equity', 'parent': None},
        {'code': '3100', 'name': 'رأس المال', 'type': 'equity', 'parent': '3000'},
        {'code': '3200', 'name': 'الأرباح المحتجزة', 'type': 'equity', 'parent': '3000'},
        
        # الإيرادات
        {'code': '4000', 'name': 'الإيرادات', 'type': 'revenue', 'parent': None},
        {'code': '4100', 'name': 'إيرادات الخدمات', 'type': 'revenue', 'parent': '4000'},
        {'code': '4200', 'name': 'إيرادات أخرى', 'type': 'revenue', 'parent': '4000'},
        
        # المصروفات
        {'code': '5000', 'name': 'المصروفات', 'type': 'expense', 'parent': None},
        {'code': '5100', 'name': 'مصروفات التشغيل', 'type': 'expense', 'parent': '5000'},
        {'code': '5110', 'name': 'الرواتب والأجور', 'type': 'expense', 'parent': '5100'},
        {'code': '5120', 'name': 'الإيجار', 'type': 'expense', 'parent': '5100'},
        {'code': '5130', 'name': 'الكهرباء والماء', 'type': 'expense', 'parent': '5100'},
        {'code': '5140', 'name': 'الاتصالات', 'type': 'expense', 'parent': '5100'},
        {'code': '5200', 'name': 'مصروفات إدارية', 'type': 'expense', 'parent': '5000'},
    ]
    
    account_objects = {}
    
    for acc_data in accounts:
        parent_id = None
        if acc_data['parent']:
            parent_account = ChartOfAccounts.query.filter_by(account_code=acc_data['parent']).first()
            if parent_account:
                parent_id = parent_account.id
        
        account = ChartOfAccounts(
            account_code=acc_data['code'],
            account_name=acc_data['name'],
            account_type=acc_data['type'],
            parent_account_id=parent_id,
            balance=Decimal(random.randint(0, 100000)),
            is_active=True
        )
        
        db.session.add(account)
        account_objects[acc_data['code']] = account
    
    db.session.commit()
    print(f"تم إضافة {len(accounts)} حساب")
    return account_objects

def add_sample_journal_entries():
    """إضافة قيود يومية تجريبية"""
    print("إضافة القيود اليومية...")
    
    accounts = ChartOfAccounts.query.all()
    if not accounts:
        print("لا توجد حسابات، يرجى إضافة دليل الحسابات أولاً")
        return
    
    entries_data = [
        {
            'description': 'قيد افتتاحي - رأس المال',
            'lines': [
                {'account_code': '1111', 'debit': 500000, 'credit': 0},
                {'account_code': '3100', 'debit': 0, 'credit': 500000}
            ]
        },
        {
            'description': 'دفع إيجار الشهر الحالي',
            'lines': [
                {'account_code': '5120', 'debit': 15000, 'credit': 0},
                {'account_code': '1111', 'debit': 0, 'credit': 15000}
            ]
        },
        {
            'description': 'تحصيل إيرادات خدمات',
            'lines': [
                {'account_code': '1111', 'debit': 25000, 'credit': 0},
                {'account_code': '4100', 'debit': 0, 'credit': 25000}
            ]
        }
    ]
    
    for i, entry_data in enumerate(entries_data, 1):
        entry = JournalEntry(
            entry_number=f"JE-{datetime.now().year}-{i:04d}",
            entry_date=datetime.now().date() - timedelta(days=random.randint(1, 30)),
            description=entry_data['description'],
            status='posted'
        )
        db.session.add(entry)
        db.session.flush()
        
        total_debit = total_credit = Decimal('0')
        
        for line_data in entry_data['lines']:
            account = ChartOfAccounts.query.filter_by(account_code=line_data['account_code']).first()
            if account:
                line = JournalEntryLine(
                    journal_entry_id=entry.id,
                    account_id=account.id,
                    debit_amount=Decimal(str(line_data['debit'])),
                    credit_amount=Decimal(str(line_data['credit']))
                )
                db.session.add(line)
                total_debit += line.debit_amount
                total_credit += line.credit_amount
        
        entry.total_amount = total_debit
        entry.is_balanced = (total_debit == total_credit)
    
    db.session.commit()
    print(f"تم إضافة {len(entries_data)} قيد يومي")

def add_sample_invoices():
    """إضافة فواتير تجريبية"""
    print("إضافة الفواتير...")
    
    invoices_data = [
        {
            'type': 'sales',
            'customer_name': 'مركز الأوائل - الرياض',
            'items': [
                {'description': 'خدمات تأهيل شهرية', 'quantity': 1, 'unit_price': 5000},
                {'description': 'جلسات علاج طبيعي', 'quantity': 10, 'unit_price': 200}
            ]
        },
        {
            'type': 'purchase',
            'customer_name': 'شركة المعدات الطبية',
            'items': [
                {'description': 'أجهزة علاج طبيعي', 'quantity': 2, 'unit_price': 15000},
                {'description': 'مستلزمات طبية', 'quantity': 50, 'unit_price': 100}
            ]
        }
    ]
    
    for i, inv_data in enumerate(invoices_data, 1):
        invoice = Invoice(
            invoice_number=f"INV-{datetime.now().year}-{i:04d}",
            invoice_type=inv_data['type'],
            invoice_date=datetime.now().date(),
            due_date=datetime.now().date() + timedelta(days=30),
            customer_name=inv_data['customer_name'],
            status='sent'
        )
        db.session.add(invoice)
        db.session.flush()
        
        subtotal = Decimal('0')
        
        for item_data in inv_data['items']:
            item = InvoiceItem(
                invoice_id=invoice.id,
                description=item_data['description'],
                quantity=Decimal(str(item_data['quantity'])),
                unit_price=Decimal(str(item_data['unit_price'])),
                total_price=Decimal(str(item_data['quantity'] * item_data['unit_price']))
            )
            db.session.add(item)
            subtotal += item.total_price
        
        invoice.subtotal = subtotal
        invoice.tax_amount = subtotal * Decimal('0.15')  # 15% VAT
        invoice.total_amount = subtotal + invoice.tax_amount
        invoice.paid_amount = Decimal('0')
        invoice.remaining_amount = invoice.total_amount
    
    db.session.commit()
    print(f"تم إضافة {len(invoices_data)} فاتورة")

def add_sample_bank_accounts():
    """إضافة حسابات بنكية تجريبية"""
    print("إضافة الحسابات البنكية...")
    
    banks_data = [
        {
            'name': 'الحساب الجاري - البنك الأهلي',
            'bank_name': 'البنك الأهلي السعودي',
            'account_number': 'SA1234567890123456789012',
            'balance': 250000
        },
        {
            'name': 'حساب التوفير - الراجحي',
            'bank_name': 'مصرف الراجحي',
            'account_number': 'SA9876543210987654321098',
            'balance': 150000
        }
    ]
    
    for bank_data in banks_data:
        account = BankAccount(
            account_name=bank_data['name'],
            bank_name=bank_data['bank_name'],
            account_number=bank_data['account_number'],
            account_type='checking',
            currency='SAR',
            current_balance=Decimal(str(bank_data['balance'])),
            is_active=True
        )
        db.session.add(account)
    
    db.session.commit()
    print(f"تم إضافة {len(banks_data)} حساب بنكي")

def add_sample_expenses():
    """إضافة مصروفات تجريبية"""
    print("إضافة المصروفات...")
    
    # إضافة فئات المصروفات
    categories = [
        'مصروفات تشغيلية',
        'مصروفات إدارية',
        'مصروفات تسويقية',
        'مصروفات صيانة'
    ]
    
    category_objects = []
    for cat_name in categories:
        category = ExpenseCategory(
            category_name=cat_name,
            description=f'فئة {cat_name}',
            is_active=True
        )
        db.session.add(category)
        category_objects.append(category)
    
    db.session.flush()
    
    # إضافة مصروفات
    expenses_data = [
        {'description': 'فاتورة كهرباء', 'amount': 3500, 'category': 0},
        {'description': 'مصروفات اتصالات', 'amount': 1200, 'category': 0},
        {'description': 'مكافآت موظفين', 'amount': 5000, 'category': 1},
        {'description': 'صيانة أجهزة', 'amount': 2800, 'category': 3}
    ]
    
    for exp_data in expenses_data:
        expense = Expense(
            expense_date=datetime.now().date() - timedelta(days=random.randint(1, 15)),
            description=exp_data['description'],
            amount=Decimal(str(exp_data['amount'])),
            category_id=category_objects[exp_data['category']].id,
            status='approved'
        )
        db.session.add(expense)
    
    db.session.commit()
    print(f"تم إضافة {len(categories)} فئة مصروفات و {len(expenses_data)} مصروف")

def main():
    """الدالة الرئيسية لإضافة البيانات التجريبية"""
    with app.app_context():
        try:
            print("بدء إضافة البيانات التجريبية للنظام المالي...")
            
            # إنشاء الجداول إذا لم تكن موجودة
            db.create_all()
            
            # إضافة البيانات
            add_sample_chart_of_accounts()
            add_sample_journal_entries()
            add_sample_invoices()
            add_sample_bank_accounts()
            add_sample_expenses()
            
            print("\n✅ تم إضافة جميع البيانات التجريبية بنجاح!")
            print("يمكنك الآن استخدام النظام المالي مع البيانات التجريبية")
            
        except Exception as e:
            print(f"❌ حدث خطأ: {str(e)}")
            db.session.rollback()
            return False
        
        return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
