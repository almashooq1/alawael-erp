#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
إضافة بيانات تجريبية لنظام السجلات التجارية والرخص والإقامات والوثائق
Adding sample data for business records, licenses, residencies and documents system
"""

import sys
import os
from datetime import datetime, timedelta, date
import json
import random

# إضافة مسار المشروع لـ Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from documents_licenses_models import (
    DocumentCategory, Document, DocumentReminder, DocumentRenewal,
    DocumentAttachment, BusinessEntity, VehicleDocument, EmployeeDocument,
    DocumentAlert, DocumentAuditLog, DocumentType, DocumentStatus,
    ReminderType, ReminderStatus, EntityType
)
from models import User

def add_documents_sample_data():
    """إضافة بيانات تجريبية شاملة لنظام الوثائق والرخص"""
    
    print("🚀 بدء إضافة البيانات التجريبية لنظام الوثائق والرخص...")
    
    try:
        with app.app_context():
            # التأكد من وجود المستخدمين
            users = User.query.limit(5).all()
            if not users:
                print("⚠️ لا توجد مستخدمين في النظام. يرجى إضافة مستخدمين أولاً.")
                return
            
            admin_user = users[0]
            
            # 1. إنشاء فئات الوثائق
            print("📁 إضافة فئات الوثائق...")
            
            categories_data = [
                {
                    'name': 'السجلات التجارية',
                    'name_en': 'Commercial Records',
                    'description': 'السجلات التجارية والرخص التجارية',
                    'icon': 'fas fa-store',
                    'color': '#007bff',
                    'sort_order': 1
                },
                {
                    'name': 'رخص البلدية والدفاع المدني',
                    'name_en': 'Municipal & Civil Defense Licenses',
                    'description': 'رخص البلدية والدفاع المدني والصحة',
                    'icon': 'fas fa-building',
                    'color': '#28a745',
                    'sort_order': 2
                },
                {
                    'name': 'وثائق الهوية والإقامة',
                    'name_en': 'Identity & Residence Documents',
                    'description': 'بطاقات الأحوال والإقامات وجوازات السفر',
                    'icon': 'fas fa-id-card',
                    'color': '#17a2b8',
                    'sort_order': 3
                },
                {
                    'name': 'رخص القيادة والمركبات',
                    'name_en': 'Driving & Vehicle Licenses',
                    'description': 'رخص القيادة واستمارات المركبات والتأمين',
                    'icon': 'fas fa-car',
                    'color': '#ffc107',
                    'sort_order': 4
                },
                {
                    'name': 'الرخص المهنية',
                    'name_en': 'Professional Licenses',
                    'description': 'الرخص المهنية وشهادات الزكاة والضريبة',
                    'icon': 'fas fa-briefcase',
                    'color': '#6f42c1',
                    'sort_order': 5
                }
            ]
            
            category_objects = []
            for cat_data in categories_data:
                category = DocumentCategory(
                    name=cat_data['name'],
                    name_en=cat_data['name_en'],
                    description=cat_data['description'],
                    icon=cat_data['icon'],
                    color=cat_data['color'],
                    sort_order=cat_data['sort_order'],
                    created_by=admin_user.id
                )
                db.session.add(category)
                category_objects.append(category)
            
            db.session.flush()
            
            # 2. إنشاء الكيانات التجارية
            print("🏢 إضافة الكيانات التجارية...")
            
            business_entities = [
                {
                    'business_name': 'مراكز الأوائل للرعاية النهارية',
                    'business_name_en': 'Al-Awael Day Care Centers',
                    'commercial_registration': '1010123456',
                    'tax_number': '300123456789003',
                    'business_type': 'مؤسسة فردية',
                    'business_activity': 'خدمات الرعاية النهارية والتأهيل',
                    'industry_sector': 'الصحة والخدمات الاجتماعية',
                    'address': 'الرياض، حي النرجس، شارع الأمير محمد بن عبدالعزيز',
                    'city': 'الرياض',
                    'region': 'منطقة الرياض',
                    'postal_code': '11564',
                    'phone': '+966112345678',
                    'email': 'info@alawael.com',
                    'legal_form': 'مؤسسة',
                    'capital': 500000.00,
                    'establishment_date': date(2020, 1, 15)
                },
                {
                    'business_name': 'فرع مراكز الأوائل - جدة',
                    'business_name_en': 'Al-Awael Centers - Jeddah Branch',
                    'commercial_registration': '4030987654',
                    'tax_number': '300987654321003',
                    'business_type': 'فرع',
                    'business_activity': 'خدمات الرعاية النهارية والتأهيل',
                    'industry_sector': 'الصحة والخدمات الاجتماعية',
                    'address': 'جدة، حي الزهراء، طريق الأمير سلطان',
                    'city': 'جدة',
                    'region': 'منطقة مكة المكرمة',
                    'postal_code': '21589',
                    'phone': '+966126789012',
                    'email': 'jeddah@alawael.com',
                    'legal_form': 'فرع',
                    'capital': 300000.00,
                    'establishment_date': date(2021, 6, 1)
                }
            ]
            
            business_objects = []
            for business_data in business_entities:
                business = BusinessEntity(
                    business_name=business_data['business_name'],
                    business_name_en=business_data['business_name_en'],
                    commercial_registration=business_data['commercial_registration'],
                    tax_number=business_data['tax_number'],
                    business_type=business_data['business_type'],
                    business_activity=business_data['business_activity'],
                    industry_sector=business_data['industry_sector'],
                    address=business_data['address'],
                    city=business_data['city'],
                    region=business_data['region'],
                    postal_code=business_data['postal_code'],
                    phone=business_data['phone'],
                    email=business_data['email'],
                    legal_form=business_data['legal_form'],
                    capital=business_data['capital'],
                    establishment_date=business_data['establishment_date'],
                    created_by=admin_user.id
                )
                db.session.add(business)
                business_objects.append(business)
            
            db.session.flush()
            
            # 3. إنشاء الوثائق الأساسية
            print("📄 إضافة الوثائق الأساسية...")
            
            # وثائق تجارية
            documents_data = [
                # السجلات التجارية
                {
                    'document_number': 'CR-1010123456',
                    'document_type': DocumentType.BUSINESS_REGISTRATION,
                    'title': 'السجل التجاري - مراكز الأوائل الرئيسي',
                    'description': 'السجل التجاري للمقر الرئيسي في الرياض',
                    'entity_type': EntityType.BUSINESS,
                    'entity_id': 1,
                    'entity_name': 'مراكز الأوائل للرعاية النهارية',
                    'category_id': 1,
                    'issue_date': date(2020, 1, 15),
                    'expiry_date': date(2025, 1, 14),
                    'issuing_authority': 'وزارة التجارة',
                    'issuing_location': 'الرياض',
                    'cost': 200.00,
                    'priority': 3,
                    'status': DocumentStatus.ACTIVE
                },
                {
                    'document_number': 'CL-2020-001',
                    'document_type': DocumentType.COMMERCIAL_LICENSE,
                    'title': 'الرخصة التجارية - خدمات الرعاية النهارية',
                    'description': 'رخصة مزاولة نشاط الرعاية النهارية والتأهيل',
                    'entity_type': EntityType.BUSINESS,
                    'entity_id': 1,
                    'entity_name': 'مراكز الأوائل للرعاية النهارية',
                    'category_id': 1,
                    'issue_date': date(2020, 2, 1),
                    'expiry_date': date(2024, 12, 31),
                    'issuing_authority': 'وزارة الموارد البشرية والتنمية الاجتماعية',
                    'cost': 1500.00,
                    'priority': 3,
                    'status': DocumentStatus.RENEWAL_REQUIRED
                },
                # رخص البلدية
                {
                    'document_number': 'ML-RYD-2020-456',
                    'document_type': DocumentType.MUNICIPAL_LICENSE,
                    'title': 'رخصة البلدية - المقر الرئيسي',
                    'description': 'رخصة البلدية لمزاولة النشاط في المقر الرئيسي',
                    'entity_type': EntityType.BUSINESS,
                    'entity_id': 1,
                    'entity_name': 'مراكز الأوائل للرعاية النهارية',
                    'category_id': 2,
                    'issue_date': date(2020, 3, 15),
                    'expiry_date': date(2025, 3, 14),
                    'issuing_authority': 'أمانة منطقة الرياض',
                    'cost': 800.00,
                    'priority': 2,
                    'status': DocumentStatus.ACTIVE
                },
                {
                    'document_number': 'CD-2020-789',
                    'document_type': DocumentType.CIVIL_DEFENSE_LICENSE,
                    'title': 'رخصة الدفاع المدني - السلامة',
                    'description': 'شهادة السلامة من الدفاع المدني',
                    'entity_type': EntityType.BUSINESS,
                    'entity_id': 1,
                    'entity_name': 'مراكز الأوائل للرعاية النهارية',
                    'category_id': 2,
                    'issue_date': date(2020, 4, 1),
                    'expiry_date': date(2025, 3, 31),
                    'issuing_authority': 'المديرية العامة للدفاع المدني',
                    'cost': 300.00,
                    'priority': 2,
                    'status': DocumentStatus.ACTIVE
                },
                # وثائق الموظفين
                {
                    'document_number': 'ID-1234567890',
                    'document_type': DocumentType.NATIONAL_ID,
                    'title': 'بطاقة الأحوال المدنية - أحمد محمد',
                    'description': 'بطاقة الأحوال المدنية للموظف أحمد محمد',
                    'entity_type': EntityType.EMPLOYEE,
                    'entity_id': 1,
                    'entity_name': 'أحمد محمد علي',
                    'category_id': 3,
                    'issue_date': date(2015, 6, 15),
                    'expiry_date': date(2025, 6, 14),
                    'issuing_authority': 'الأحوال المدنية',
                    'priority': 1,
                    'status': DocumentStatus.ACTIVE
                },
                {
                    'document_number': 'RP-9876543210',
                    'document_type': DocumentType.RESIDENCE_PERMIT,
                    'title': 'الإقامة - سارة أحمد (أخصائية نفسية)',
                    'description': 'إقامة الأخصائية النفسية سارة أحمد',
                    'entity_type': EntityType.EMPLOYEE,
                    'entity_id': 2,
                    'entity_name': 'سارة أحمد محمود',
                    'category_id': 3,
                    'issue_date': date(2022, 1, 10),
                    'expiry_date': date(2025, 1, 9),
                    'issuing_authority': 'الجوازات',
                    'cost': 2000.00,
                    'priority': 3,
                    'status': DocumentStatus.ACTIVE
                },
                # رخص القيادة والمركبات
                {
                    'document_number': 'DL-567890123',
                    'document_type': DocumentType.DRIVING_LICENSE,
                    'title': 'رخصة القيادة - محمد السائق',
                    'description': 'رخصة قيادة السائق محمد',
                    'entity_type': EntityType.EMPLOYEE,
                    'entity_id': 3,
                    'entity_name': 'محمد عبدالله السائق',
                    'category_id': 4,
                    'issue_date': date(2020, 8, 20),
                    'expiry_date': date(2025, 8, 19),
                    'issuing_authority': 'إدارة المرور',
                    'cost': 40.00,
                    'priority': 2,
                    'status': DocumentStatus.ACTIVE
                },
                {
                    'document_number': 'VR-ABC123',
                    'document_type': DocumentType.VEHICLE_REGISTRATION,
                    'title': 'استمارة المركبة - حافلة النقل الأولى',
                    'description': 'استمارة حافلة نقل الطلاب رقم 1',
                    'entity_type': EntityType.VEHICLE,
                    'entity_id': 1,
                    'entity_name': 'حافلة النقل - ABC 123',
                    'category_id': 4,
                    'issue_date': date(2021, 3, 1),
                    'expiry_date': date(2025, 2, 28),
                    'issuing_authority': 'إدارة المرور',
                    'cost': 400.00,
                    'priority': 2,
                    'status': DocumentStatus.ACTIVE
                },
                {
                    'document_number': 'INS-2024-001',
                    'document_type': DocumentType.VEHICLE_INSURANCE,
                    'title': 'تأمين المركبة - حافلة النقل الأولى',
                    'description': 'بوليصة تأمين شاملة للحافلة',
                    'entity_type': EntityType.VEHICLE,
                    'entity_id': 1,
                    'entity_name': 'حافلة النقل - ABC 123',
                    'category_id': 4,
                    'issue_date': date(2024, 1, 1),
                    'expiry_date': date(2024, 12, 31),
                    'issuing_authority': 'شركة التأمين الوطنية',
                    'cost': 2500.00,
                    'priority': 3,
                    'status': DocumentStatus.EXPIRING_SOON
                },
                # الرخص المهنية
                {
                    'document_number': 'TC-2024-789',
                    'document_type': DocumentType.TAX_CERTIFICATE,
                    'title': 'شهادة الزكاة والضريبة - 2024',
                    'description': 'شهادة الزكاة والضريبة للعام 2024',
                    'entity_type': EntityType.BUSINESS,
                    'entity_id': 1,
                    'entity_name': 'مراكز الأوائل للرعاية النهارية',
                    'category_id': 5,
                    'issue_date': date(2024, 2, 15),
                    'expiry_date': date(2025, 2, 14),
                    'issuing_authority': 'هيئة الزكاة والضريبة والجمارك',
                    'cost': 0.00,
                    'priority': 2,
                    'status': DocumentStatus.ACTIVE
                }
            ]
            
            document_objects = []
            for doc_data in documents_data:
                document = Document(
                    document_number=doc_data['document_number'],
                    document_type=doc_data['document_type'],
                    title=doc_data['title'],
                    description=doc_data['description'],
                    entity_type=doc_data['entity_type'],
                    entity_id=doc_data['entity_id'],
                    entity_name=doc_data['entity_name'],
                    category_id=doc_data['category_id'],
                    issue_date=doc_data['issue_date'],
                    expiry_date=doc_data['expiry_date'],
                    issuing_authority=doc_data['issuing_authority'],
                    issuing_location=doc_data.get('issuing_location'),
                    cost=doc_data['cost'],
                    priority=doc_data['priority'],
                    status=doc_data['status'],
                    reminder_enabled=True,
                    reminder_days_before=[30, 15, 7, 1],
                    created_by=admin_user.id
                )
                db.session.add(document)
                document_objects.append(document)
            
            db.session.flush()
            
            # 4. إضافة التذكيرات
            print("🔔 إضافة التذكيرات...")
            
            for doc in document_objects:
                if doc.reminder_enabled and doc.expiry_date:
                    for days_before in [30, 15, 7, 1]:
                        reminder_date = doc.expiry_date - timedelta(days=days_before)
                        
                        # إنشاء تذكير فقط إذا كان التاريخ في المستقبل
                        if reminder_date >= datetime.now().date():
                            reminder = DocumentReminder(
                                document_id=doc.id,
                                reminder_type=ReminderType.EMAIL,
                                days_before=days_before,
                                reminder_date=datetime.combine(reminder_date, datetime.min.time()),
                                recipient_emails=['admin@alawael.com', 'manager@alawael.com'],
                                subject=f'تذكير: انتهاء صلاحية {doc.title}',
                                message=f'ستنتهي صلاحية الوثيقة "{doc.title}" خلال {days_before} يوم في تاريخ {doc.expiry_date}',
                                status=ReminderStatus.PENDING,
                                created_by=admin_user.id
                            )
                            db.session.add(reminder)
            
            # 5. إضافة التجديدات
            print("🔄 إضافة سجلات التجديدات...")
            
            renewals_data = [
                {
                    'document': document_objects[0],  # السجل التجاري
                    'renewal_date': date(2023, 1, 10),
                    'previous_expiry_date': date(2023, 1, 14),
                    'new_expiry_date': date(2025, 1, 14),
                    'renewal_cost': 200.00,
                    'renewed_by_authority': 'وزارة التجارة',
                    'processing_time_days': 3
                },
                {
                    'document': document_objects[2],  # رخصة البلدية
                    'renewal_date': date(2023, 3, 10),
                    'previous_expiry_date': date(2023, 3, 14),
                    'new_expiry_date': date(2025, 3, 14),
                    'renewal_cost': 800.00,
                    'renewed_by_authority': 'أمانة منطقة الرياض',
                    'processing_time_days': 7
                }
            ]
            
            for renewal_data in renewals_data:
                renewal = DocumentRenewal(
                    document_id=renewal_data['document'].id,
                    renewal_date=renewal_data['renewal_date'],
                    previous_expiry_date=renewal_data['previous_expiry_date'],
                    new_expiry_date=renewal_data['new_expiry_date'],
                    renewal_cost=renewal_data['renewal_cost'],
                    renewed_by_authority=renewal_data['renewed_by_authority'],
                    processing_time_days=renewal_data['processing_time_days'],
                    created_by=admin_user.id
                )
                db.session.add(renewal)
            
            # 6. إضافة التنبيهات
            print("⚠️ إضافة التنبيهات...")
            
            alerts_data = [
                {
                    'alert_type': 'expiry_warning',
                    'severity': 'high',
                    'document': document_objects[1],  # الرخصة التجارية
                    'title': 'تحتاج الرخصة التجارية للتجديد',
                    'message': 'الرخصة التجارية لخدمات الرعاية النهارية تحتاج للتجديد قبل نهاية العام',
                    'action_required': 'مراجعة وزارة الموارد البشرية لتجديد الرخصة',
                    'due_date': datetime.now() + timedelta(days=30),
                    'assigned_to': [admin_user.id]
                },
                {
                    'alert_type': 'expiry_critical',
                    'severity': 'critical',
                    'document': document_objects[8],  # تأمين المركبة
                    'title': 'تأمين المركبة ينتهي قريباً',
                    'message': 'تأمين حافلة النقل الأولى ينتهي في نهاية العام الحالي',
                    'action_required': 'تجديد بوليصة التأمين فوراً',
                    'due_date': datetime.now() + timedelta(days=7),
                    'assigned_to': [admin_user.id]
                }
            ]
            
            for alert_data in alerts_data:
                alert = DocumentAlert(
                    alert_type=alert_data['alert_type'],
                    severity=alert_data['severity'],
                    document_id=alert_data['document'].id,
                    title=alert_data['title'],
                    message=alert_data['message'],
                    action_required=alert_data['action_required'],
                    due_date=alert_data['due_date'],
                    assigned_to=alert_data['assigned_to'],
                    created_by=admin_user.id
                )
                db.session.add(alert)
            
            # 7. إضافة سجلات المراجعة
            print("📋 إضافة سجلات المراجعة...")
            
            for i, doc in enumerate(document_objects[:5]):
                # سجل إنشاء
                audit_log = DocumentAuditLog(
                    document_id=doc.id,
                    action='create',
                    description=f'تم إنشاء الوثيقة: {doc.title}',
                    new_values={
                        'document_number': doc.document_number,
                        'title': doc.title,
                        'status': doc.status.value
                    },
                    user_id=admin_user.id,
                    ip_address='192.168.1.100',
                    timestamp=datetime.now() - timedelta(days=random.randint(1, 30))
                )
                db.session.add(audit_log)
                
                # سجل عرض
                view_log = DocumentAuditLog(
                    document_id=doc.id,
                    action='view',
                    description=f'تم عرض الوثيقة: {doc.title}',
                    user_id=admin_user.id,
                    ip_address='192.168.1.101',
                    timestamp=datetime.now() - timedelta(hours=random.randint(1, 48))
                )
                db.session.add(view_log)
            
            # حفظ جميع البيانات
            db.session.commit()
            
            # طباعة الإحصائيات
            print("\n" + "="*60)
            print("📊 إحصائيات البيانات التجريبية المضافة:")
            print("="*60)
            print(f"📁 فئات الوثائق: {DocumentCategory.query.count()}")
            print(f"🏢 الكيانات التجارية: {BusinessEntity.query.count()}")
            print(f"📄 الوثائق: {Document.query.count()}")
            print(f"🔔 التذكيرات: {DocumentReminder.query.count()}")
            print(f"🔄 التجديدات: {DocumentRenewal.query.count()}")
            print(f"⚠️ التنبيهات: {DocumentAlert.query.count()}")
            print(f"📋 سجلات المراجعة: {DocumentAuditLog.query.count()}")
            print("="*60)
            
            # إحصائيات حسب النوع
            print("\n📈 إحصائيات الوثائق حسب النوع:")
            for doc_type in DocumentType:
                count = Document.query.filter_by(document_type=doc_type).count()
                if count > 0:
                    print(f"   • {Document(document_type=doc_type).get_type_display()}: {count}")
            
            # إحصائيات حسب الحالة
            print("\n📊 إحصائيات الوثائق حسب الحالة:")
            for status in DocumentStatus:
                count = Document.query.filter_by(status=status).count()
                if count > 0:
                    print(f"   • {Document(status=status).get_status_display()}: {count}")
            
            print("\n✅ تم إضافة جميع البيانات التجريبية بنجاح!")
            print("🎯 يمكنك الآن اختبار نظام إدارة الوثائق والرخص")
            
    except Exception as e:
        print(f"❌ خطأ في إضافة البيانات التجريبية: {str(e)}")
        db.session.rollback()
        raise e

if __name__ == '__main__':
    add_documents_sample_data()
