#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
إضافة بيانات تجريبية شاملة لنظام الأمان والامتثال المتقدم
مراكز الأوائل للتأهيل الطبي
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app
from models import db, User
from security_models import (
    SecurityConfig, MultiFactorAuth, MFAAttempt, AuditLog, DataEncryption,
    BackupSchedule, BackupHistory, PrivacyConsent, DataRetention,
    SecurityIncident, SecurityAlert, PermissionRole, UserPermission,
    SessionSecurity, EncryptionHelper
)
from datetime import datetime, timedelta
import json
import random
import secrets

def add_comprehensive_security_data():
    """إضافة بيانات تجريبية شاملة لنظام الأمان المتقدم"""
    
    print("🔐 بدء إضافة البيانات التجريبية الشاملة لنظام الأمان المتقدم...")
    
    try:
        with app.app_context():
            # 1. إعدادات الأمان المتقدمة
            print("📋 إضافة إعدادات الأمان المتقدمة...")
            security_configs = [
                SecurityConfig(
                    config_key='advanced_password_policy',
                    config_value=json.dumps({
                        'min_length': 12,
                        'require_uppercase': True,
                        'require_lowercase': True,
                        'require_numbers': True,
                        'require_special_chars': True,
                        'max_age_days': 60,
                        'history_count': 12,
                        'lockout_attempts': 5,
                        'lockout_duration': 30,
                        'complexity_score': 80
                    }),
                    description='سياسة كلمات المرور المتقدمة مع تعقيد عالي',
                    is_encrypted=False
                ),
                SecurityConfig(
                    config_key='session_security_policy',
                    config_value=json.dumps({
                        'timeout_minutes': 60,
                        'max_concurrent_sessions': 3,
                        'require_device_verification': True,
                        'track_location_changes': True,
                        'force_logout_on_suspicious': True,
                        'session_encryption': True
                    }),
                    description='سياسة أمان الجلسات المتقدمة'
                ),
                SecurityConfig(
                    config_key='mfa_enforcement_policy',
                    config_value=json.dumps({
                        'required_for_admin': True,
                        'required_for_finance': True,
                        'required_for_medical': True,
                        'grace_period_days': 7,
                        'backup_codes_count': 10,
                        'totp_window': 2,
                        'sms_rate_limit': 5
                    }),
                    description='سياسة إنفاذ المصادقة الثنائية'
                ),
                SecurityConfig(
                    config_key='data_encryption_policy',
                    config_value=json.dumps({
                        'encrypt_pii': True,
                        'encrypt_medical_records': True,
                        'encrypt_financial_data': True,
                        'encryption_algorithm': 'AES-256-GCM',
                        'key_rotation_days': 90,
                        'backup_encryption': True
                    }),
                    description='سياسة تشفير البيانات الحساسة',
                    is_encrypted=True
                ),
                SecurityConfig(
                    config_key='attack_protection_settings',
                    config_value=json.dumps({
                        'rate_limit_per_minute': 60,
                        'rate_limit_per_hour': 1000,
                        'block_suspicious_ips': True,
                        'sql_injection_protection': True,
                        'xss_protection': True,
                        'csrf_protection': True,
                        'brute_force_threshold': 5
                    }),
                    description='إعدادات الحماية من الهجمات'
                    description='انتهاء صلاحية الجلسة (بالثواني)',
                    is_active=True
                ),
                SecurityConfig(
                    config_key='max_login_attempts',
                    config_value='5',
                    description='الحد الأقصى لمحاولات تسجيل الدخول',
                    is_active=True
                ),
                SecurityConfig(
                    config_key='mfa_required_roles',
                    config_value=json.dumps(['admin', 'manager']),
                    description='الأدوار التي تتطلب مصادقة متعددة العوامل',
                    is_active=True
                )
            ]
            
            for config in security_configs:
                existing = SecurityConfig.query.filter_by(config_key=config.config_key).first()
                if not existing:
                    db.session.add(config)
            
            # 2. إعداد المصادقة متعددة العوامل للمستخدمين
            print("🔑 إضافة إعدادات المصادقة متعددة العوامل...")
            users = User.query.limit(5).all()
            
            for i, user in enumerate(users):
                # TOTP للمدراء
                if i < 2:
                    mfa_totp = MultiFactorAuth(
                        user_id=user.id,
                        method_type='totp',
                        secret_key=EncryptionHelper.encrypt_data(
                            'JBSWY3DPEHPK3PXP',
                            app.config['SECRET_KEY'].encode()
                        ).decode('latin-1'),
                        is_active=True,
                        is_verified=True,
                        last_used=datetime.utcnow() - timedelta(hours=random.randint(1, 24))
                    )
                    db.session.add(mfa_totp)
                
                # SMS للموظفين
                elif i < 4:
                    mfa_sms = MultiFactorAuth(
                        user_id=user.id,
                        method_type='sms',
                        phone_number=f'+966{random.randint(500000000, 599999999)}',
                        is_active=True,
                        is_verified=True,
                        last_used=datetime.utcnow() - timedelta(hours=random.randint(1, 48))
                    )
                    db.session.add(mfa_sms)
                
                # Email للباقي
                else:
                    mfa_email = MultiFactorAuth(
                        user_id=user.id,
                        method_type='email',
                        email=user.email,
                        is_active=True,
                        is_verified=True,
                        last_used=datetime.utcnow() - timedelta(hours=random.randint(1, 72))
                    )
                    db.session.add(mfa_email)
            
            # 3. محاولات المصادقة
            print("📱 إضافة محاولات المصادقة...")
            for user in users[:3]:
                for j in range(random.randint(5, 15)):
                    attempt = MFAAttempt(
                        user_id=user.id,
                        method_type=random.choice(['totp', 'sms', 'email']),
                        code_entered=f"{random.randint(100000, 999999)}",
                        is_successful=random.choice([True, True, True, False]),  # 75% نجاح
                        ip_address=f"192.168.1.{random.randint(1, 254)}",
                        user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        expires_at=datetime.utcnow() + timedelta(minutes=5),
                        created_at=datetime.utcnow() - timedelta(days=random.randint(0, 30))
                    )
                    if not attempt.is_successful:
                        attempt.failure_reason = random.choice([
                            'Invalid code', 'Expired code', 'Too many attempts'
                        ])
                    db.session.add(attempt)
            
            # 4. سجلات المراجعة
            print("📋 إضافة سجلات المراجعة...")
            action_types = ['login', 'logout', 'create', 'update', 'delete', 'view', 'mfa_setup', 'mfa_verify']
            resource_types = ['user', 'student', 'assessment', 'program', 'security', 'system']
            
            for i in range(100):
                user = random.choice(users)
                action_type = random.choice(action_types)
                resource_type = random.choice(resource_types)
                
                audit_log = AuditLog(
                    user_id=user.id,
                    action_type=action_type,
                    resource_type=resource_type,
                    resource_id=random.randint(1, 100),
                    action_description=f"{action_type} performed on {resource_type}",
                    old_values=json.dumps({'status': 'active'}) if action_type == 'update' else None,
                    new_values=json.dumps({'status': 'inactive'}) if action_type == 'update' else None,
                    ip_address=f"192.168.1.{random.randint(1, 254)}",
                    user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    risk_level=random.choice(['low', 'medium', 'high']),
                    is_suspicious=random.choice([False, False, False, True]),  # 25% مشبوه
                    metadata=json.dumps({
                        'session_id': f"sess_{random.randint(1000, 9999)}",
                        'duration': random.randint(1, 300)
                    }),
                    created_at=datetime.utcnow() - timedelta(days=random.randint(0, 30))
                )
                db.session.add(audit_log)
            
            # 5. تشفير البيانات
            print("🔒 إضافة إعدادات تشفير البيانات...")
            encryption_configs = [
                DataEncryption(
                    table_name='users',
                    column_name='password',
                    encryption_algorithm='bcrypt',
                    key_id='user_password_key',
                    is_active=True
                ),
                DataEncryption(
                    table_name='students',
                    column_name='medical_history',
                    encryption_algorithm='AES-256',
                    key_id='medical_data_key',
                    is_active=True
                ),
                DataEncryption(
                    table_name='assessments',
                    column_name='results',
                    encryption_algorithm='AES-256',
                    key_id='assessment_data_key',
                    is_active=True
                )
            ]
            
            for config in encryption_configs:
                existing = DataEncryption.query.filter_by(
                    table_name=config.table_name,
                    column_name=config.column_name
                ).first()
                if not existing:
                    db.session.add(config)
            
            # 6. جداول النسخ الاحتياطي
            print("💾 إضافة جداول النسخ الاحتياطي...")
            backup_schedules = [
                BackupSchedule(
                    name='نسخة احتياطية يومية كاملة',
                    backup_type='full',
                    frequency='daily',
                    schedule_time=datetime.strptime('02:00', '%H:%M').time(),
                    backup_path='/backups/daily/',
                    retention_days=30,
                    tables_to_backup=json.dumps(['users', 'students', 'assessments', 'programs']),
                    compression_enabled=True,
                    encryption_enabled=True,
                    is_active=True,
                    last_run=datetime.utcnow() - timedelta(days=1),
                    next_run=datetime.utcnow() + timedelta(days=1)
                ),
                BackupSchedule(
                    name='نسخة احتياطية أسبوعية تزايدية',
                    backup_type='incremental',
                    frequency='weekly',
                    schedule_time=datetime.strptime('01:00', '%H:%M').time(),
                    backup_path='/backups/weekly/',
                    retention_days=90,
                    tables_to_backup=json.dumps(['audit_logs', 'security_incidents', 'backup_history']),
                    compression_enabled=True,
                    encryption_enabled=True,
                    is_active=True,
                    last_run=datetime.utcnow() - timedelta(weeks=1),
                    next_run=datetime.utcnow() + timedelta(weeks=1)
                ),
                BackupSchedule(
                    name='نسخة احتياطية شهرية أرشيفية',
                    backup_type='full',
                    frequency='monthly',
                    schedule_time=datetime.strptime('00:00', '%H:%M').time(),
                    backup_path='/backups/monthly/',
                    retention_days=365,
                    tables_to_backup=json.dumps(['*']),  # جميع الجداول
                    compression_enabled=True,
                    encryption_enabled=True,
                    is_active=True,
                    last_run=datetime.utcnow() - timedelta(days=30),
                    next_run=datetime.utcnow() + timedelta(days=30)
                )
            ]
            
            for schedule in backup_schedules:
                existing = BackupSchedule.query.filter_by(name=schedule.name).first()
                if not existing:
                    db.session.add(schedule)
            
            # 7. تاريخ النسخ الاحتياطي
            print("📅 إضافة تاريخ النسخ الاحتياطي...")
            for i in range(30):
                backup_history = BackupHistory(
                    schedule_id=1,  # النسخة اليومية
                    backup_name=f"daily_backup_{datetime.utcnow().strftime('%Y%m%d')}_{i}",
                    backup_type='full',
                    file_path=f"/backups/daily/backup_{i}.sql.gz",
                    file_size=random.randint(100000000, 500000000),  # 100MB - 500MB
                    status=random.choice(['completed', 'completed', 'completed', 'failed']),  # 75% نجاح
                    start_time=datetime.utcnow() - timedelta(days=i, hours=2),
                    end_time=datetime.utcnow() - timedelta(days=i, hours=1, minutes=30),
                    duration_seconds=random.randint(1800, 3600),  # 30-60 دقيقة
                    records_count=random.randint(10000, 50000),
                    compression_ratio=random.uniform(0.3, 0.7),
                    checksum=EncryptionHelper.calculate_checksum(f"backup_data_{i}")
                )
                if backup_history.status == 'failed':
                    backup_history.error_message = random.choice([
                        'Disk space insufficient',
                        'Database connection timeout',
                        'Permission denied'
                    ])
                db.session.add(backup_history)
            
            # 8. موافقات الخصوصية
            print("🔐 إضافة موافقات الخصوصية...")
            for user in users:
                consent = PrivacyConsent(
                    user_id=user.id,
                    consent_type='data_processing',
                    purpose='تقديم الخدمات التأهيلية والطبية',
                    legal_basis='legitimate_interest',
                    data_categories=json.dumps([
                        'personal_info', 'medical_data', 'assessment_results'
                    ]),
                    retention_period=json.dumps({
                        'years': 7,
                        'reason': 'متطلبات قانونية'
                    }),
                    third_parties=json.dumps([
                        'وزارة الصحة', 'شركات التأمين المعتمدة'
                    ]),
                    is_given=True,
                    consent_date=datetime.utcnow() - timedelta(days=random.randint(1, 365)),
                    expiry_date=datetime.utcnow() + timedelta(days=365),
                    withdrawal_date=None,
                    consent_method='electronic_signature',
                    ip_address=f"192.168.1.{random.randint(1, 254)}",
                    user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                )
                db.session.add(consent)
            
            # 9. حوادث الأمان
            print("⚠️ إضافة حوادث الأمان...")
            incident_types = ['unauthorized_access', 'data_breach', 'malware', 'phishing', 'ddos']
            severities = ['low', 'medium', 'high', 'critical']
            statuses = ['open', 'investigating', 'resolved', 'closed']
            
            for i in range(15):
                incident = SecurityIncident(
                    incident_type=random.choice(incident_types),
                    severity=random.choice(severities),
                    status=random.choice(statuses),
                    title=f"حادث أمان #{i+1}",
                    description=f"وصف تفصيلي للحادث رقم {i+1}",
                    affected_systems=json.dumps(['web_server', 'database', 'user_portal']),
                    affected_users=json.dumps([1, 2, 3]),
                    detection_method=random.choice(['automated', 'manual', 'user_report']),
                    source_ip=f"192.168.1.{random.randint(1, 254)}",
                    user_agent='Suspicious User Agent',
                    attack_vector=random.choice(['web', 'email', 'network', 'physical']),
                    impact_assessment=f"تقييم التأثير للحادث {i+1}",
                    containment_actions=f"إجراءات الاحتواء للحادث {i+1}",
                    resolution_steps=f"خطوات الحل للحادث {i+1}" if random.choice([True, False]) else None,
                    lessons_learned=f"الدروس المستفادة من الحادث {i+1}" if random.choice([True, False]) else None,
                    detected_at=datetime.utcnow() - timedelta(days=random.randint(0, 30)),
                    reported_by=random.choice(users).id,
                    assigned_to=random.choice(users).id if random.choice([True, False]) else None,
                    resolved_at=datetime.utcnow() - timedelta(days=random.randint(0, 15)) if random.choice([True, False]) else None
                )
                db.session.add(incident)
            
            # 10. تنبيهات الأمان
            print("🔔 إضافة تنبيهات الأمان...")
            alert_types = ['security_incident', 'login_failure', 'suspicious_activity', 'system_alert']
            
            for i in range(25):
                alert = SecurityAlert(
                    alert_type=random.choice(alert_types),
                    severity=random.choice(severities),
                    title=f"تنبيه أمان #{i+1}",
                    message=f"رسالة التنبيه رقم {i+1}",
                    user_id=random.choice(users).id if random.choice([True, False]) else None,
                    ip_address=f"192.168.1.{random.randint(1, 254)}",
                    is_acknowledged=random.choice([True, False]),
                    acknowledged_by=random.choice(users).id if random.choice([True, False]) else None,
                    acknowledged_at=datetime.utcnow() - timedelta(hours=random.randint(1, 24)) if random.choice([True, False]) else None,
                    is_resolved=random.choice([True, False]),
                    resolved_by=random.choice(users).id if random.choice([True, False]) else None,
                    resolved_at=datetime.utcnow() - timedelta(hours=random.randint(1, 48)) if random.choice([True, False]) else None,
                    metadata=json.dumps({
                        'source': 'security_monitor',
                        'confidence': random.uniform(0.5, 1.0)
                    }),
                    created_at=datetime.utcnow() - timedelta(days=random.randint(0, 7))
                )
                db.session.add(alert)
            
            # 11. أدوار الصلاحيات
            print("👥 إضافة أدوار الصلاحيات...")
            permission_roles = [
                PermissionRole(
                    role_name='security_admin',
                    role_description='مدير الأمان الرئيسي',
                    permissions=json.dumps([
                        'view_security_dashboard', 'manage_mfa', 'view_audit_logs',
                        'manage_security_incidents', 'manage_backups', 'manage_permissions'
                    ]),
                    restrictions=json.dumps([]),
                    is_active=True
                ),
                PermissionRole(
                    role_name='security_analyst',
                    role_description='محلل الأمان',
                    permissions=json.dumps([
                        'view_security_dashboard', 'view_audit_logs',
                        'view_security_incidents', 'create_security_incidents'
                    ]),
                    restrictions=json.dumps(['cannot_delete_incidents']),
                    is_active=True
                ),
                PermissionRole(
                    role_name='backup_operator',
                    role_description='مشغل النسخ الاحتياطي',
                    permissions=json.dumps([
                        'view_backups', 'manage_backup_schedules', 'restore_backups'
                    ]),
                    restrictions=json.dumps(['cannot_delete_backups']),
                    is_active=True
                )
            ]
            
            for role in permission_roles:
                existing = PermissionRole.query.filter_by(role_name=role.role_name).first()
                if not existing:
                    db.session.add(role)
            
            # 12. صلاحيات المستخدمين
            print("🔑 إضافة صلاحيات المستخدمين...")
            for i, user in enumerate(users[:3]):
                if i == 0:  # مدير أمان رئيسي
                    permissions = [
                        'view_security_dashboard', 'manage_mfa', 'view_audit_logs',
                        'manage_security_incidents', 'view_security_incidents',
                        'create_security_incidents', 'manage_backups', 'view_backups'
                    ]
                elif i == 1:  # محلل أمان
                    permissions = [
                        'view_security_dashboard', 'view_audit_logs',
                        'view_security_incidents', 'create_security_incidents'
                    ]
                else:  # مشغل نسخ احتياطي
                    permissions = ['view_backups', 'manage_backup_schedules']
                
                for permission in permissions:
                    user_permission = UserPermission(
                        user_id=user.id,
                        permission_name=permission,
                        resource_type='security',
                        granted_by=1,  # المدير الأول
                        granted_at=datetime.utcnow() - timedelta(days=random.randint(1, 30)),
                        expires_at=datetime.utcnow() + timedelta(days=365),
                        conditions=json.dumps({
                            'ip_restrictions': [],
                            'time_restrictions': []
                        }),
                        is_active=True
                    )
                    db.session.add(user_permission)
            
            # 13. أمان الجلسات
            print("🔐 إضافة بيانات أمان الجلسات...")
            for user in users:
                for j in range(random.randint(1, 5)):
                    session = SessionSecurity(
                        user_id=user.id,
                        session_token=EncryptionHelper.generate_secure_token(32),
                        ip_address=f"192.168.1.{random.randint(1, 254)}",
                        user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        device_fingerprint=EncryptionHelper.generate_secure_token(16),
                        location_data=json.dumps({
                            'country': 'Saudi Arabia',
                            'city': 'Riyadh',
                            'latitude': 24.7136,
                            'longitude': 46.6753
                        }),
                        is_active=random.choice([True, False]),
                        is_suspicious=random.choice([False, False, False, True]),  # 25% مشبوه
                        risk_score=random.uniform(0.1, 0.9),
                        last_activity=datetime.utcnow() - timedelta(minutes=random.randint(1, 1440)),
                        expires_at=datetime.utcnow() + timedelta(hours=random.randint(1, 24)),
                        created_at=datetime.utcnow() - timedelta(days=random.randint(0, 7))
                    )
                    if session.is_suspicious:
                        session.suspicious_flags = json.dumps([
                            'unusual_location', 'multiple_devices', 'rapid_requests'
                        ])
                    db.session.add(session)
            
            # حفظ جميع البيانات
            db.session.commit()
            print("✅ تم إضافة جميع البيانات التجريبية بنجاح!")
            
            # طباعة ملخص البيانات المضافة
            print("\n📊 ملخص البيانات المضافة:")
            print(f"   • إعدادات الأمان: {SecurityConfig.query.count()}")
            print(f"   • إعدادات MFA: {MultiFactorAuth.query.count()}")
            print(f"   • محاولات MFA: {MFAAttempt.query.count()}")
            print(f"   • سجلات المراجعة: {AuditLog.query.count()}")
            print(f"   • إعدادات التشفير: {DataEncryption.query.count()}")
            print(f"   • جداول النسخ الاحتياطي: {BackupSchedule.query.count()}")
            print(f"   • تاريخ النسخ الاحتياطي: {BackupHistory.query.count()}")
            print(f"   • موافقات الخصوصية: {PrivacyConsent.query.count()}")
            print(f"   • حوادث الأمان: {SecurityIncident.query.count()}")
            print(f"   • تنبيهات الأمان: {SecurityAlert.query.count()}")
            print(f"   • أدوار الصلاحيات: {PermissionRole.query.count()}")
            print(f"   • صلاحيات المستخدمين: {UserPermission.query.count()}")
            print(f"   • جلسات الأمان: {SessionSecurity.query.count()}")
            
    except Exception as e:
        print(f"❌ خطأ في إضافة البيانات التجريبية: {e}")
        db.session.rollback()
        raise e

if __name__ == '__main__':
    add_security_sample_data()
