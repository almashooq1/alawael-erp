from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from models import db, User
from security_models import (
    SecurityConfig, MultiFactorAuth, MFAAttempt, AuditLog, DataEncryption,
    BackupSchedule, BackupHistory, PrivacyConsent, DataRetention,
    SecurityIncident, SecurityAlert, PermissionRole, UserPermission,
    SessionSecurity, EncryptionHelper
)
from datetime import datetime, timedelta
import json
import pyotp
import qrcode
import io
import base64
from functools import wraps
import ipaddress
import requests

security_bp = Blueprint('security', __name__)

# ==================== Security Decorators ====================

def audit_action(action_type, resource_type=None):
    """ديكوريتر لتسجيل العمليات في سجل المراجعة"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user_id = get_jwt_identity()
            ip_address = request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr)
            user_agent = request.headers.get('User-Agent', '')
            
            # تنفيذ الدالة
            result = f(*args, **kwargs)
            
            # تسجيل العملية
            try:
                audit_log = AuditLog(
                    user_id=user_id,
                    action_type=action_type,
                    resource_type=resource_type,
                    action_description=f"{action_type} on {resource_type or 'system'}",
                    ip_address=ip_address,
                    user_agent=user_agent,
                    metadata=json.dumps({
                        'endpoint': request.endpoint,
                        'method': request.method,
                        'args': str(args),
                        'kwargs': str(kwargs)
                    })
                )
                db.session.add(audit_log)
                db.session.commit()
            except Exception as e:
                current_app.logger.error(f"Failed to log audit: {e}")
            
            return result
        return decorated_function
    return decorator

def require_permission(permission_name, resource_type=None):
    """ديكوريتر للتحقق من الصلاحيات"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user_id = get_jwt_identity()
            
            # التحقق من الصلاحية
            has_permission = check_user_permission(user_id, permission_name, resource_type)
            
            if not has_permission:
                return jsonify({
                    'success': False,
                    'message': 'ليس لديك صلاحية للوصول لهذا المورد'
                }), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def check_user_permission(user_id, permission_name, resource_type=None):
    """التحقق من صلاحية المستخدم"""
    try:
        permission = UserPermission.query.filter_by(
            user_id=user_id,
            permission_name=permission_name,
            is_active=True
        ).first()
        
        if permission:
            # التحقق من انتهاء الصلاحية
            if permission.expires_at and permission.expires_at < datetime.utcnow():
                return False
            
            # التحقق من نوع المورد
            if resource_type and permission.resource_type != resource_type:
                return False
            
            return True
        
        return False
    except Exception:
        return False

# ==================== Multi-Factor Authentication API ====================

@security_bp.route('/api/mfa/setup', methods=['POST'])
@jwt_required()
@audit_action('mfa_setup', 'authentication')
def setup_mfa():
    """إعداد المصادقة متعددة العوامل"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        method_type = data.get('method_type', 'totp')
        
        if method_type == 'totp':
            # إنشاء مفتاح TOTP
            secret = pyotp.random_base32()
            user = User.query.get(user_id)
            
            # إنشاء QR Code
            totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
                name=user.email,
                issuer_name="مراكز الأوائل"
            )
            
            qr = qrcode.QRCode(version=1, box_size=10, border=5)
            qr.add_data(totp_uri)
            qr.make(fit=True)
            
            img = qr.make_image(fill_color="black", back_color="white")
            buffer = io.BytesIO()
            img.save(buffer, format='PNG')
            qr_code = base64.b64encode(buffer.getvalue()).decode()
            
            # حفظ إعدادات MFA
            mfa = MultiFactorAuth(
                user_id=user_id,
                method_type=method_type,
                secret_key=EncryptionHelper.encrypt_data(secret, current_app.config['SECRET_KEY'].encode()).decode('latin-1')
            )
            db.session.add(mfa)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'secret': secret,
                'qr_code': f"data:image/png;base64,{qr_code}",
                'backup_codes': generate_backup_codes(user_id)
            })
        
        elif method_type == 'sms':
            phone_number = data.get('phone_number')
            if not phone_number:
                return jsonify({'success': False, 'message': 'رقم الهاتف مطلوب'}), 400
            
            mfa = MultiFactorAuth(
                user_id=user_id,
                method_type=method_type,
                phone_number=phone_number
            )
            db.session.add(mfa)
            db.session.commit()
            
            return jsonify({'success': True, 'message': 'تم إعداد المصادقة عبر الرسائل النصية'})
        
        elif method_type == 'email':
            email = data.get('email')
            if not email:
                return jsonify({'success': False, 'message': 'البريد الإلكتروني مطلوب'}), 400
            
            mfa = MultiFactorAuth(
                user_id=user_id,
                method_type=method_type,
                email=email
            )
            db.session.add(mfa)
            db.session.commit()
            
            return jsonify({'success': True, 'message': 'تم إعداد المصادقة عبر البريد الإلكتروني'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@security_bp.route('/api/mfa/verify', methods=['POST'])
@jwt_required()
@audit_action('mfa_verify', 'authentication')
def verify_mfa():
    """التحقق من رمز المصادقة متعددة العوامل"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        code = data.get('code')
        method_type = data.get('method_type', 'totp')
        
        # تسجيل محاولة المصادقة
        attempt = MFAAttempt(
            user_id=user_id,
            method_type=method_type,
            code_entered=code,
            ip_address=request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr),
            user_agent=request.headers.get('User-Agent', ''),
            expires_at=datetime.utcnow() + timedelta(minutes=5)
        )
        
        mfa = MultiFactorAuth.query.filter_by(
            user_id=user_id,
            method_type=method_type,
            is_active=True
        ).first()
        
        if not mfa:
            attempt.is_successful = False
            attempt.failure_reason = 'MFA not configured'
            db.session.add(attempt)
            db.session.commit()
            return jsonify({'success': False, 'message': 'المصادقة متعددة العوامل غير مفعلة'}), 400
        
        if method_type == 'totp':
            # فك تشفير المفتاح السري
            secret = EncryptionHelper.decrypt_data(
                mfa.secret_key.encode('latin-1'),
                current_app.config['SECRET_KEY'].encode()
            )
            
            totp = pyotp.TOTP(secret)
            if totp.verify(code, valid_window=1):
                attempt.is_successful = True
                mfa.last_used = datetime.utcnow()
                mfa.is_verified = True
            else:
                attempt.is_successful = False
                attempt.failure_reason = 'Invalid TOTP code'
        
        elif method_type in ['sms', 'email']:
            # التحقق من الرمز المرسل (يجب تنفيذ إرسال الرمز أولاً)
            # هذا مثال مبسط
            stored_code = get_stored_verification_code(user_id, method_type)
            if code == stored_code:
                attempt.is_successful = True
                mfa.last_used = datetime.utcnow()
                mfa.is_verified = True
            else:
                attempt.is_successful = False
                attempt.failure_reason = 'Invalid verification code'
        
        db.session.add(attempt)
        db.session.commit()
        
        if attempt.is_successful:
            return jsonify({'success': True, 'message': 'تم التحقق بنجاح'})
        else:
            return jsonify({'success': False, 'message': 'رمز التحقق غير صحيح'}), 400
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

def generate_backup_codes(user_id, count=10):
    """توليد رموز احتياطية للمصادقة"""
    codes = []
    for _ in range(count):
        codes.append(EncryptionHelper.generate_secure_token(8))
    
    # تشفير وحفظ الرموز
    encrypted_codes = EncryptionHelper.encrypt_data(
        json.dumps(codes),
        current_app.config['SECRET_KEY'].encode()
    )
    
    mfa = MultiFactorAuth.query.filter_by(
        user_id=user_id,
        method_type='backup_codes'
    ).first()
    
    if mfa:
        mfa.backup_codes = encrypted_codes.decode('latin-1')
    else:
        mfa = MultiFactorAuth(
            user_id=user_id,
            method_type='backup_codes',
            backup_codes=encrypted_codes.decode('latin-1')
        )
        db.session.add(mfa)
    
    db.session.commit()
    return codes

def get_stored_verification_code(user_id, method_type):
    """الحصول على رمز التحقق المخزن (مثال مبسط)"""
    # في التطبيق الحقيقي، يجب تخزين الرمز مؤقتاً في Redis أو قاعدة البيانات
    return "123456"  # مثال

# ==================== Audit Logs API ====================

@security_bp.route('/api/audit-logs', methods=['GET'])
@jwt_required()
@require_permission('view_audit_logs', 'security')
def get_audit_logs():
    """استرجاع سجلات المراجعة"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        user_id = request.args.get('user_id', type=int)
        action_type = request.args.get('action_type', '')
        resource_type = request.args.get('resource_type', '')
        date_from = request.args.get('date_from', '')
        date_to = request.args.get('date_to', '')
        
        query = AuditLog.query
        
        if user_id:
            query = query.filter(AuditLog.user_id == user_id)
        if action_type:
            query = query.filter(AuditLog.action_type == action_type)
        if resource_type:
            query = query.filter(AuditLog.resource_type == resource_type)
        if date_from:
            query = query.filter(AuditLog.created_at >= datetime.strptime(date_from, '%Y-%m-%d'))
        if date_to:
            query = query.filter(AuditLog.created_at <= datetime.strptime(date_to, '%Y-%m-%d'))
        
        logs = query.order_by(AuditLog.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'logs': [{
                'id': log.id,
                'user_name': log.user.name if log.user else 'نظام',
                'action_type': log.action_type,
                'resource_type': log.resource_type,
                'resource_id': log.resource_id,
                'action_description': log.action_description,
                'ip_address': log.ip_address,
                'risk_level': log.risk_level,
                'is_suspicious': log.is_suspicious,
                'created_at': log.created_at.isoformat()
            } for log in logs.items],
            'pagination': {
                'page': logs.page,
                'pages': logs.pages,
                'per_page': logs.per_page,
                'total': logs.total
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ==================== Security Incidents API ====================

@security_bp.route('/api/security-incidents', methods=['GET'])
@jwt_required()
@require_permission('view_security_incidents', 'security')
def get_security_incidents():
    """استرجاع حوادث الأمان"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        severity = request.args.get('severity', '')
        status = request.args.get('status', '')
        
        query = SecurityIncident.query
        
        if severity:
            query = query.filter(SecurityIncident.severity == severity)
        if status:
            query = query.filter(SecurityIncident.status == status)
        
        incidents = query.order_by(SecurityIncident.detected_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'incidents': [{
                'id': incident.id,
                'incident_type': incident.incident_type,
                'severity': incident.severity,
                'status': incident.status,
                'title': incident.title,
                'description': incident.description,
                'source_ip': incident.source_ip,
                'detected_at': incident.detected_at.isoformat(),
                'resolved_at': incident.resolved_at.isoformat() if incident.resolved_at else None
            } for incident in incidents.items],
            'pagination': {
                'page': incidents.page,
                'pages': incidents.pages,
                'per_page': incidents.per_page,
                'total': incidents.total
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@security_bp.route('/api/security-incidents', methods=['POST'])
@jwt_required()
@require_permission('create_security_incidents', 'security')
@audit_action('create', 'security_incident')
def create_security_incident():
    """إنشاء حادث أمان جديد"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        incident = SecurityIncident(
            incident_type=data['incident_type'],
            severity=data['severity'],
            title=data['title'],
            description=data.get('description'),
            affected_systems=json.dumps(data.get('affected_systems', [])),
            affected_users=json.dumps(data.get('affected_users', [])),
            detection_method=data.get('detection_method'),
            source_ip=data.get('source_ip'),
            user_agent=data.get('user_agent'),
            attack_vector=data.get('attack_vector'),
            impact_assessment=data.get('impact_assessment'),
            reported_by=user_id
        )
        
        db.session.add(incident)
        db.session.commit()
        
        # إنشاء تنبيه أمان
        create_security_alert(
            alert_type='security_incident',
            severity=data['severity'],
            title=f"حادث أمان جديد: {data['title']}",
            message=data.get('description', ''),
            metadata={'incident_id': incident.id}
        )
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء حادث الأمان بنجاح',
            'incident_id': incident.id
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# ==================== Security Alerts API ====================

@security_bp.route('/api/security-alerts', methods=['GET'])
@jwt_required()
def get_security_alerts():
    """استرجاع تنبيهات الأمان"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        severity = request.args.get('severity', '')
        is_acknowledged = request.args.get('is_acknowledged', '')
        
        query = SecurityAlert.query
        
        if severity:
            query = query.filter(SecurityAlert.severity == severity)
        if is_acknowledged:
            query = query.filter(SecurityAlert.is_acknowledged == (is_acknowledged.lower() == 'true'))
        
        alerts = query.order_by(SecurityAlert.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'alerts': [{
                'id': alert.id,
                'alert_type': alert.alert_type,
                'severity': alert.severity,
                'title': alert.title,
                'message': alert.message,
                'is_acknowledged': alert.is_acknowledged,
                'is_resolved': alert.is_resolved,
                'created_at': alert.created_at.isoformat()
            } for alert in alerts.items],
            'pagination': {
                'page': alerts.page,
                'pages': alerts.pages,
                'per_page': alerts.per_page,
                'total': alerts.total
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

def create_security_alert(alert_type, severity, title, message, user_id=None, metadata=None):
    """إنشاء تنبيه أمان"""
    try:
        alert = SecurityAlert(
            alert_type=alert_type,
            severity=severity,
            title=title,
            message=message,
            user_id=user_id,
            ip_address=request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr) if request else None,
            metadata=json.dumps(metadata) if metadata else None
        )
        
        db.session.add(alert)
        db.session.commit()
        return alert.id
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Failed to create security alert: {e}")
        return None

# ==================== Backup Management API ====================

@security_bp.route('/api/backup-schedules', methods=['GET'])
@jwt_required()
@require_permission('view_backups', 'security')
def get_backup_schedules():
    """استرجاع جداول النسخ الاحتياطي"""
    try:
        schedules = BackupSchedule.query.filter_by(is_active=True).all()
        
        return jsonify({
            'success': True,
            'schedules': [{
                'id': schedule.id,
                'name': schedule.name,
                'backup_type': schedule.backup_type,
                'frequency': schedule.frequency,
                'schedule_time': schedule.schedule_time.strftime('%H:%M') if schedule.schedule_time else None,
                'last_run': schedule.last_run.isoformat() if schedule.last_run else None,
                'next_run': schedule.next_run.isoformat() if schedule.next_run else None,
                'retention_days': schedule.retention_days
            } for schedule in schedules]
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@security_bp.route('/api/backup-history', methods=['GET'])
@jwt_required()
@require_permission('view_backups', 'security')
def get_backup_history():
    """استرجاع تاريخ النسخ الاحتياطي"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        history = BackupHistory.query.order_by(BackupHistory.start_time.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'history': [{
                'id': backup.id,
                'backup_name': backup.backup_name,
                'backup_type': backup.backup_type,
                'file_size': backup.file_size,
                'status': backup.status,
                'start_time': backup.start_time.isoformat(),
                'end_time': backup.end_time.isoformat() if backup.end_time else None,
                'duration_seconds': backup.duration_seconds,
                'records_count': backup.records_count
            } for backup in history.items],
            'pagination': {
                'page': history.page,
                'pages': history.pages,
                'per_page': history.per_page,
                'total': history.total
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ==================== Dashboard API ====================

@security_bp.route('/api/security-dashboard', methods=['GET'])
@jwt_required()
@require_permission('view_security_dashboard', 'security')
def get_security_dashboard():
    """استرجاع بيانات لوحة تحكم الأمان"""
    try:
        # إحصائيات عامة
        total_users = User.query.count()
        active_sessions = SessionSecurity.query.filter_by(is_active=True).count()
        mfa_enabled_users = MultiFactorAuth.query.filter_by(is_active=True).distinct(MultiFactorAuth.user_id).count()
        
        # حوادث الأمان
        total_incidents = SecurityIncident.query.count()
        open_incidents = SecurityIncident.query.filter(SecurityIncident.status.in_(['open', 'investigating'])).count()
        critical_incidents = SecurityIncident.query.filter_by(severity='critical').count()
        
        # تنبيهات الأمان
        total_alerts = SecurityAlert.query.count()
        unacknowledged_alerts = SecurityAlert.query.filter_by(is_acknowledged=False).count()
        high_severity_alerts = SecurityAlert.query.filter(SecurityAlert.severity.in_(['high', 'critical'])).count()
        
        # سجلات المراجعة (آخر 24 ساعة)
        last_24h = datetime.utcnow() - timedelta(hours=24)
        recent_audit_logs = AuditLog.query.filter(AuditLog.created_at >= last_24h).count()
        suspicious_activities = AuditLog.query.filter(
            AuditLog.created_at >= last_24h,
            AuditLog.is_suspicious == True
        ).count()
        
        # النسخ الاحتياطي
        total_backups = BackupHistory.query.count()
        successful_backups = BackupHistory.query.filter_by(status='completed').count()
        failed_backups = BackupHistory.query.filter_by(status='failed').count()
        
        return jsonify({
            'success': True,
            'statistics': {
                'users': {
                    'total': total_users,
                    'active_sessions': active_sessions,
                    'mfa_enabled': mfa_enabled_users,
                    'mfa_percentage': round((mfa_enabled_users / total_users * 100) if total_users > 0 else 0, 1)
                },
                'incidents': {
                    'total': total_incidents,
                    'open': open_incidents,
                    'critical': critical_incidents
                },
                'alerts': {
                    'total': total_alerts,
                    'unacknowledged': unacknowledged_alerts,
                    'high_severity': high_severity_alerts
                },
                'audit': {
                    'recent_logs': recent_audit_logs,
                    'suspicious_activities': suspicious_activities
                },
                'backups': {
                    'total': total_backups,
                    'successful': successful_backups,
                    'failed': failed_backups,
                    'success_rate': round((successful_backups / total_backups * 100) if total_backups > 0 else 0, 1)
                }
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
