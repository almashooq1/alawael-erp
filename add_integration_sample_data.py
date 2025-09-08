#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
إضافة بيانات تجريبية لنظام التكامل والاتصالات
"""

import sys
import os
from datetime import datetime, timedelta
import random

# إضافة مسار المشروع
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from integration_models import *

def add_sample_data():
    """إضافة بيانات تجريبية شاملة لنظام التكامل والاتصالات"""
    
    with app.app_context():
        try:
            print("🚀 بدء إضافة البيانات التجريبية لنظام التكامل والاتصالات...")
            
            # 1. إضافة الأنظمة الخارجية
            external_systems = [
                {
                    'name': 'مستشفى الملك فهد',
                    'system_type': 'hospital',
                    'api_url': 'https://api.kfh.med.sa',
                    'description': 'نظام إدارة المرضى والملفات الطبية',
                    'is_active': True,
                    'auth_type': 'oauth',
                    'config_data': {'client_id': 'kfh_client', 'scope': 'patient_data'}
                },
                {
                    'name': 'شركة التأمين الطبي الشامل',
                    'system_type': 'insurance',
                    'api_url': 'https://api.comprehensive-insurance.com',
                    'description': 'نظام معالجة مطالبات التأمين الطبي',
                    'is_active': True,
                    'auth_type': 'api_key',
                    'config_data': {'api_key': 'ins_key_123', 'region': 'saudi'}
                },
                {
                    'name': 'بوابة مدى للدفع',
                    'system_type': 'payment',
                    'api_url': 'https://api.mada.gov.sa',
                    'description': 'نظام الدفع الإلكتروني الحكومي',
                    'is_active': True,
                    'auth_type': 'api_key',
                    'config_data': {'merchant_id': 'mada_123', 'terminal_id': 'term_456'}
                },
                {
                    'name': 'وزارة الصحة - نظام التراخيص',
                    'system_type': 'government',
                    'api_url': 'https://api.moh.gov.sa',
                    'description': 'نظام إدارة تراخيص المراكز الطبية',
                    'is_active': False,
                    'auth_type': 'oauth',
                    'config_data': {'client_id': 'moh_client', 'redirect_uri': 'https://awail.com/callback'}
                }
            ]
            
            for system_data in external_systems:
                system = ExternalSystem(**system_data)
                db.session.add(system)
            
            db.session.commit()
            print("✅ تم إضافة الأنظمة الخارجية")
            
            # 2. إضافة قنوات الاتصال
            channels = [
                {'name': 'SMS - STC', 'channel_type': 'sms', 'is_active': True, 'config': {'provider': 'stc', 'username': 'awail_sms'}},
                {'name': 'Email - Gmail', 'channel_type': 'email', 'is_active': True, 'config': {'smtp_server': 'smtp.gmail.com', 'port': 587}},
                {'name': 'Push Notifications', 'channel_type': 'push', 'is_active': True, 'config': {'firebase_key': 'fcm_key_123'}},
                {'name': 'WhatsApp Business', 'channel_type': 'whatsapp', 'is_active': False, 'config': {'api_key': 'wa_key_456'}}
            ]
            
            for channel_data in channels:
                channel = CommunicationChannel(**channel_data)
                db.session.add(channel)
            
            db.session.commit()
            print("✅ تم إضافة قنوات الاتصال")
            
            # 3. إضافة قوالب الرسائل
            templates = [
                {
                    'name': 'ترحيب بالمستفيد الجديد',
                    'message_type': 'sms',
                    'subject': 'مرحباً بك في مراكز الأوائل',
                    'content': 'مرحباً {name}، نرحب بك في مراكز الأوائل للرعاية النهارية. رقم ملفك: {file_number}',
                    'variables': ['name', 'file_number']
                },
                {
                    'name': 'تذكير بالموعد',
                    'message_type': 'sms',
                    'subject': 'تذكير بموعدك',
                    'content': 'تذكير: لديك موعد غداً في {time} بمركز {center_name}. للاستفسار: {phone}',
                    'variables': ['time', 'center_name', 'phone']
                },
                {
                    'name': 'تقرير التقدم الشهري',
                    'message_type': 'email',
                    'subject': 'تقرير التقدم الشهري لـ {student_name}',
                    'content': 'عزيزي ولي الأمر، نرسل لك تقرير التقدم الشهري لطفلك {student_name}...',
                    'variables': ['student_name', 'progress_details']
                }
            ]
            
            for template_data in templates:
                template = MessageTemplate(**template_data)
                db.session.add(template)
            
            db.session.commit()
            print("✅ تم إضافة قوالب الرسائل")
            
            # 4. إضافة رسائل تجريبية
            messages = []
            for i in range(20):
                message = CommunicationMessage(
                    message_type=random.choice(['sms', 'email']),
                    recipient=f"966501234{str(i).zfill(3)}" if random.choice([True, False]) else f"user{i}@example.com",
                    subject=f"رسالة تجريبية {i+1}",
                    content=f"هذه رسالة تجريبية رقم {i+1} لاختبار النظام",
                    status=random.choice(['sent', 'delivered', 'failed', 'pending']),
                    sent_at=datetime.now() - timedelta(days=random.randint(0, 30)),
                    delivered_at=datetime.now() - timedelta(days=random.randint(0, 30)) if random.choice([True, False]) else None
                )
                messages.append(message)
            
            db.session.add_all(messages)
            db.session.commit()
            print("✅ تم إضافة الرسائل التجريبية")
            
            # 5. إضافة مقدمي خدمة الدفع
            payment_providers = [
                {
                    'name': 'مدى',
                    'provider_type': 'mada',
                    'is_active': True,
                    'config': {'merchant_id': 'mada_123', 'terminal_id': 'term_456'},
                    'fees_percentage': 2.5
                },
                {
                    'name': 'فيزا',
                    'provider_type': 'visa',
                    'is_active': True,
                    'config': {'merchant_id': 'visa_789', 'api_key': 'visa_key_123'},
                    'fees_percentage': 3.0
                },
                {
                    'name': 'ماستركارد',
                    'provider_type': 'mastercard',
                    'is_active': True,
                    'config': {'merchant_id': 'mc_456', 'secret_key': 'mc_secret_789'},
                    'fees_percentage': 3.2
                }
            ]
            
            for provider_data in payment_providers:
                provider = PaymentProvider(**provider_data)
                db.session.add(provider)
            
            db.session.commit()
            print("✅ تم إضافة مقدمي خدمة الدفع")
            
            # 6. إضافة معاملات دفع تجريبية
            transactions = []
            for i in range(15):
                transaction = PaymentTransaction(
                    payment_provider_id=random.randint(1, 3),
                    amount=random.uniform(100, 2000),
                    currency='SAR',
                    status=random.choice(['completed', 'pending', 'failed', 'cancelled']),
                    reference_id=f"TXN{str(i+1).zfill(6)}",
                    external_transaction_id=f"EXT{str(i+1).zfill(8)}",
                    transaction_date=datetime.now() - timedelta(days=random.randint(0, 60)),
                    description=f"دفع رسوم الخدمة - معاملة {i+1}",
                    metadata={'customer_id': f'cust_{i+1}', 'service_type': 'rehabilitation'}
                )
                transactions.append(transaction)
            
            db.session.add_all(transactions)
            db.session.commit()
            print("✅ تم إضافة معاملات الدفع التجريبية")
            
            # 7. إضافة شركات التأمين
            insurance_providers = [
                {
                    'name': 'شركة التأمين الطبي الشامل',
                    'provider_code': 'COMP001',
                    'contact_email': 'claims@comprehensive.com',
                    'contact_phone': '966112345678',
                    'is_active': True,
                    'api_config': {'base_url': 'https://api.comprehensive.com', 'api_key': 'comp_key_123'}
                },
                {
                    'name': 'التأمين الطبي المتقدم',
                    'provider_code': 'ADV002',
                    'contact_email': 'support@advanced-insurance.com',
                    'contact_phone': '966112345679',
                    'is_active': True,
                    'api_config': {'base_url': 'https://api.advanced-insurance.com', 'token': 'adv_token_456'}
                }
            ]
            
            for provider_data in insurance_providers:
                provider = InsuranceProvider(**provider_data)
                db.session.add(provider)
            
            db.session.commit()
            print("✅ تم إضافة شركات التأمين")
            
            # 8. إضافة مطالبات التأمين
            claims = []
            for i in range(12):
                claim = InsuranceClaim(
                    insurance_provider_id=random.randint(1, 2),
                    claim_number=f"CLM{datetime.now().year}{str(i+1).zfill(4)}",
                    patient_name=f"المريض {i+1}",
                    patient_id=f"ID{str(i+1).zfill(6)}",
                    service_date=datetime.now() - timedelta(days=random.randint(1, 90)),
                    amount=random.uniform(500, 5000),
                    status=random.choice(['submitted', 'processing', 'approved', 'rejected', 'paid']),
                    diagnosis_code=f"ICD{random.randint(100, 999)}",
                    treatment_details=f"علاج تأهيلي متخصص - جلسة {i+1}",
                    submitted_date=datetime.now() - timedelta(days=random.randint(0, 30)),
                    response_date=datetime.now() - timedelta(days=random.randint(0, 15)) if random.choice([True, False]) else None
                )
                claims.append(claim)
            
            db.session.add_all(claims)
            db.session.commit()
            print("✅ تم إضافة مطالبات التأمين")
            
            # 9. إضافة سجلات المزامنة
            sync_logs = []
            systems = db.session.query(ExternalSystem).all()
            
            for i in range(25):
                system = random.choice(systems)
                log = DataSyncLog(
                    external_system_id=system.id,
                    sync_type=random.choice(['patient_data', 'appointment', 'billing', 'insurance_claim']),
                    sync_date=datetime.now() - timedelta(days=random.randint(0, 30)),
                    status=random.choice(['success', 'failed', 'partial']),
                    records_processed=random.randint(1, 100),
                    records_successful=random.randint(1, 100),
                    records_failed=random.randint(0, 10),
                    message=f"مزامنة {random.choice(['ناجحة', 'فاشلة', 'جزئية'])} - {random.randint(1, 100)} سجل",
                    error_details={'error_code': f'ERR{random.randint(100, 999)}'} if random.choice([True, False]) else None
                )
                sync_logs.append(log)
            
            db.session.add_all(sync_logs)
            db.session.commit()
            print("✅ تم إضافة سجلات المزامنة")
            
            # 10. إضافة قواعد الإشعارات
            notification_rules = [
                {
                    'name': 'إشعار موعد قريب',
                    'event_type': 'appointment_reminder',
                    'is_active': True,
                    'conditions': {'hours_before': 24},
                    'actions': {'send_sms': True, 'send_email': False},
                    'message_template': 'تذكير: لديك موعد غداً في {time}'
                },
                {
                    'name': 'إشعار دفع مستحق',
                    'event_type': 'payment_due',
                    'is_active': True,
                    'conditions': {'days_overdue': 3},
                    'actions': {'send_sms': True, 'send_email': True},
                    'message_template': 'تذكير: لديك دفعة مستحقة بقيمة {amount} ريال'
                }
            ]
            
            for rule_data in notification_rules:
                rule = NotificationRule(**rule_data)
                db.session.add(rule)
            
            db.session.commit()
            print("✅ تم إضافة قواعد الإشعارات")
            
            print("\n🎉 تم إكمال إضافة جميع البيانات التجريبية بنجاح!")
            print("\n📊 ملخص البيانات المضافة:")
            print(f"   • الأنظمة الخارجية: {len(external_systems)}")
            print(f"   • قنوات الاتصال: {len(channels)}")
            print(f"   • قوالب الرسائل: {len(templates)}")
            print(f"   • الرسائل: {len(messages)}")
            print(f"   • مقدمي خدمة الدفع: {len(payment_providers)}")
            print(f"   • معاملات الدفع: {len(transactions)}")
            print(f"   • شركات التأمين: {len(insurance_providers)}")
            print(f"   • مطالبات التأمين: {len(claims)}")
            print(f"   • سجلات المزامنة: {len(sync_logs)}")
            print(f"   • قواعد الإشعارات: {len(notification_rules)}")
            
        except Exception as e:
            print(f"❌ خطأ في إضافة البيانات: {str(e)}")
            db.session.rollback()
            raise e

if __name__ == '__main__':
    add_sample_data()
