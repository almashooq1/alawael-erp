#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
نظام اختبار شامل للنظام المالي والمحاسبي
Comprehensive Finance System Testing Suite
"""

import sys
import os
import unittest
import json
from datetime import datetime, timedelta
from decimal import Decimal

# إضافة مسار المشروع
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from finance_models import *

class FinanceSystemTest(unittest.TestCase):
    """فئة اختبار النظام المالي"""
    
    def setUp(self):
        """إعداد البيئة للاختبار"""
        self.app = app
        self.app.config['TESTING'] = True
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        self.client = self.app.test_client()
        
        with self.app.app_context():
            db.create_all()
            self.create_test_data()
    
    def tearDown(self):
        """تنظيف البيئة بعد الاختبار"""
        with self.app.app_context():
            db.session.remove()
            db.drop_all()
    
    def create_test_data(self):
        """إنشاء بيانات اختبار"""
        # إنشاء حساب تجريبي
        account = ChartOfAccounts(
            account_code='1111',
            account_name='الصندوق',
            account_type='asset',
            balance=Decimal('10000'),
            is_active=True
        )
        db.session.add(account)
        
        # إنشاء فئة مصروفات
        category = ExpenseCategory(
            category_name='مصروفات تشغيلية',
            description='المصروفات التشغيلية اليومية',
            is_active=True
        )
        db.session.add(category)
        
        db.session.commit()
        self.test_account = account
        self.test_category = category

class TestChartOfAccounts(FinanceSystemTest):
    """اختبار دليل الحسابات"""
    
    def test_create_account(self):
        """اختبار إنشاء حساب جديد"""
        account = ChartOfAccounts(
            account_code='1112',
            account_name='البنك الأهلي',
            account_type='asset',
            balance=Decimal('50000'),
            is_active=True
        )
        db.session.add(account)
        db.session.commit()
        
        self.assertIsNotNone(account.id)
        self.assertEqual(account.account_code, '1112')
        self.assertEqual(account.balance, Decimal('50000'))
    
    def test_account_hierarchy(self):
        """اختبار التسلسل الهرمي للحسابات"""
        parent_account = ChartOfAccounts(
            account_code='1000',
            account_name='الأصول',
            account_type='asset',
            is_active=True
        )
        db.session.add(parent_account)
        db.session.flush()
        
        child_account = ChartOfAccounts(
            account_code='1100',
            account_name='الأصول المتداولة',
            account_type='asset',
            parent_account_id=parent_account.id,
            is_active=True
        )
        db.session.add(child_account)
        db.session.commit()
        
        self.assertEqual(child_account.parent_account_id, parent_account.id)

class TestJournalEntries(FinanceSystemTest):
    """اختبار القيود اليومية"""
    
    def test_create_journal_entry(self):
        """اختبار إنشاء قيد يومي"""
        entry = JournalEntry(
            entry_number='JE-2024-0001',
            entry_date=datetime.now().date(),
            description='قيد اختبار',
            status='draft'
        )
        db.session.add(entry)
        db.session.flush()
        
        # إضافة خطوط القيد
        line1 = JournalEntryLine(
            journal_entry_id=entry.id,
            account_id=self.test_account.id,
            debit_amount=Decimal('1000'),
            credit_amount=Decimal('0')
        )
        
        line2 = JournalEntryLine(
            journal_entry_id=entry.id,
            account_id=self.test_account.id,
            debit_amount=Decimal('0'),
            credit_amount=Decimal('1000')
        )
        
        db.session.add_all([line1, line2])
        db.session.commit()
        
        self.assertEqual(len(entry.lines), 2)
        self.assertTrue(entry.is_balanced)
    
    def test_journal_entry_balance(self):
        """اختبار توازن القيد اليومي"""
        entry = JournalEntry(
            entry_number='JE-2024-0002',
            entry_date=datetime.now().date(),
            description='قيد غير متوازن',
            status='draft'
        )
        db.session.add(entry)
        db.session.flush()
        
        # قيد غير متوازن
        line1 = JournalEntryLine(
            journal_entry_id=entry.id,
            account_id=self.test_account.id,
            debit_amount=Decimal('1000'),
            credit_amount=Decimal('0')
        )
        
        line2 = JournalEntryLine(
            journal_entry_id=entry.id,
            account_id=self.test_account.id,
            debit_amount=Decimal('0'),
            credit_amount=Decimal('500')  # مبلغ مختلف
        )
        
        db.session.add_all([line1, line2])
        db.session.commit()
        
        self.assertFalse(entry.is_balanced)

class TestInvoices(FinanceSystemTest):
    """اختبار الفواتير"""
    
    def test_create_invoice(self):
        """اختبار إنشاء فاتورة"""
        invoice = Invoice(
            invoice_number='INV-2024-0001',
            invoice_type='sales',
            invoice_date=datetime.now().date(),
            due_date=datetime.now().date() + timedelta(days=30),
            customer_name='عميل تجريبي',
            subtotal=Decimal('1000'),
            tax_amount=Decimal('150'),
            total_amount=Decimal('1150'),
            status='draft'
        )
        db.session.add(invoice)
        db.session.commit()
        
        self.assertIsNotNone(invoice.id)
        self.assertEqual(invoice.remaining_amount, Decimal('1150'))
    
    def test_invoice_items(self):
        """اختبار عناصر الفاتورة"""
        invoice = Invoice(
            invoice_number='INV-2024-0002',
            invoice_type='sales',
            invoice_date=datetime.now().date(),
            customer_name='عميل تجريبي',
            status='draft'
        )
        db.session.add(invoice)
        db.session.flush()
        
        item = InvoiceItem(
            invoice_id=invoice.id,
            description='خدمة تجريبية',
            quantity=Decimal('2'),
            unit_price=Decimal('500'),
            total_price=Decimal('1000')
        )
        db.session.add(item)
        db.session.commit()
        
        self.assertEqual(len(invoice.items), 1)
        self.assertEqual(item.total_price, Decimal('1000'))

class TestExpenses(FinanceSystemTest):
    """اختبار المصروفات"""
    
    def test_create_expense(self):
        """اختبار إنشاء مصروف"""
        expense = Expense(
            expense_date=datetime.now().date(),
            description='مصروف تجريبي',
            amount=Decimal('500'),
            category_id=self.test_category.id,
            status='pending'
        )
        db.session.add(expense)
        db.session.commit()
        
        self.assertIsNotNone(expense.id)
        self.assertEqual(expense.amount, Decimal('500'))

class TestBankAccounts(FinanceSystemTest):
    """اختبار الحسابات البنكية"""
    
    def test_create_bank_account(self):
        """اختبار إنشاء حساب بنكي"""
        account = BankAccount(
            account_name='حساب تجريبي',
            bank_name='بنك تجريبي',
            account_number='123456789',
            account_type='checking',
            currency='SAR',
            current_balance=Decimal('10000'),
            is_active=True
        )
        db.session.add(account)
        db.session.commit()
        
        self.assertIsNotNone(account.id)
        self.assertEqual(account.current_balance, Decimal('10000'))
    
    def test_bank_transaction(self):
        """اختبار المعاملات البنكية"""
        account = BankAccount(
            account_name='حساب تجريبي',
            bank_name='بنك تجريبي',
            account_number='123456789',
            account_type='checking',
            currency='SAR',
            current_balance=Decimal('10000'),
            is_active=True
        )
        db.session.add(account)
        db.session.flush()
        
        transaction = BankTransaction(
            bank_account_id=account.id,
            transaction_date=datetime.now().date(),
            transaction_type='debit',
            amount=Decimal('1000'),
            balance_after=Decimal('9000'),
            description='معاملة تجريبية',
            is_reconciled=False
        )
        db.session.add(transaction)
        db.session.commit()
        
        self.assertEqual(len(account.transactions), 1)
        self.assertEqual(transaction.amount, Decimal('1000'))

def run_api_tests():
    """اختبار API endpoints"""
    print("\n🔍 اختبار API Endpoints...")
    
    with app.test_client() as client:
        # اختبار الحصول على لوحة التحكم المالية
        response = client.get('/api/finance/dashboard')
        print(f"Dashboard API: {response.status_code}")
        
        # اختبار الحصول على دليل الحسابات
        response = client.get('/api/finance/accounts')
        print(f"Accounts API: {response.status_code}")
        
        # اختبار الحصول على القيود اليومية
        response = client.get('/api/finance/journal-entries')
        print(f"Journal Entries API: {response.status_code}")
        
        # اختبار الحصول على الفواتير
        response = client.get('/api/finance/invoices')
        print(f"Invoices API: {response.status_code}")

def run_ui_tests():
    """اختبار واجهة المستخدم"""
    print("\n🎨 اختبار واجهة المستخدم...")
    
    # فحص وجود الملفات
    files_to_check = [
        'templates/finance_management.html',
        'static/js/finance_management.js'
    ]
    
    for file_path in files_to_check:
        if os.path.exists(file_path):
            print(f"✅ {file_path} موجود")
        else:
            print(f"❌ {file_path} غير موجود")

def run_performance_tests():
    """اختبار الأداء"""
    print("\n⚡ اختبار الأداء...")
    
    with app.app_context():
        db.create_all()
        
        # اختبار إنشاء عدد كبير من الحسابات
        start_time = datetime.now()
        
        for i in range(100):
            account = ChartOfAccounts(
                account_code=f'TEST{i:04d}',
                account_name=f'حساب اختبار {i}',
                account_type='asset',
                balance=Decimal('1000'),
                is_active=True
            )
            db.session.add(account)
        
        db.session.commit()
        end_time = datetime.now()
        
        duration = (end_time - start_time).total_seconds()
        print(f"إنشاء 100 حساب: {duration:.2f} ثانية")

def main():
    """الدالة الرئيسية للاختبار"""
    print("🧪 بدء اختبار النظام المالي والمحاسبي الشامل")
    print("=" * 50)
    
    # اختبار نماذج قاعدة البيانات
    print("\n📊 اختبار نماذج قاعدة البيانات...")
    suite = unittest.TestLoader().loadTestsFromModule(sys.modules[__name__])
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # اختبار API endpoints
    run_api_tests()
    
    # اختبار واجهة المستخدم
    run_ui_tests()
    
    # اختبار الأداء
    run_performance_tests()
    
    # تقرير النتائج
    print("\n📋 تقرير الاختبار النهائي:")
    print("=" * 30)
    
    if result.wasSuccessful():
        print("✅ جميع اختبارات قاعدة البيانات نجحت")
    else:
        print(f"❌ فشل {len(result.failures)} اختبار")
        print(f"❌ خطأ في {len(result.errors)} اختبار")
    
    print(f"📊 إجمالي الاختبارات: {result.testsRun}")
    
    # توصيات
    print("\n💡 التوصيات:")
    print("- تأكد من تشغيل add_finance_sample_data.py لإضافة بيانات تجريبية")
    print("- راجع ملفات واجهة المستخدم للتأكد من اكتمالها")
    print("- اختبر النظام مع بيانات حقيقية قبل الإنتاج")
    
    return result.wasSuccessful()

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
