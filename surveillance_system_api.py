"""
API endpoints لنظام كاميرات المراقبة المترابطة
Surveillance System API
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
import json
from typing import Dict, List

from surveillance_system_services import (
    CameraManagementService, CameraAccessService, LiveViewService,
    RecordingManagementService, AlertManagementService, CameraMonitoringService,
    SurveillanceReportingService
)
from enhanced_surveillance_services import enhanced_recording_service
from hikvision_integration import hikvision_manager
from claude_ai_integration import get_claude_manager, initialize_claude_manager
from surveillance_system_models import (
    Camera, CameraAccess, Recording, SurveillanceAlert, LiveViewSession,
    CameraGroup, SurveillanceReport, CameraStatus, CameraType, RecordingQuality,
    AlertType, AlertSeverity, AccessLevel
)
from database import db

# إنشاء Blueprint
surveillance_bp = Blueprint('surveillance', __name__, url_prefix='/api/surveillance')

# ===== إدارة الكاميرات =====

@surveillance_bp.route('/cameras', methods=['GET'])
@jwt_required()
def get_cameras():
    """الحصول على قائمة الكاميرات"""
    try:
        branch_id = request.args.get('branch_id', type=int)
        include_shared = request.args.get('include_shared', 'true').lower() == 'true'
        status = request.args.get('status')
        camera_type = request.args.get('type')
        
        if branch_id:
            cameras = CameraManagementService.get_branch_cameras(branch_id, include_shared)
        else:
            cameras = Camera.query.all()
        
        # فلترة حسب الحالة
        if status:
            cameras = [c for c in cameras if c.status.value == status]
        
        # فلترة حسب النوع
        if camera_type:
            cameras = [c for c in cameras if c.camera_type.value == camera_type]
        
        return jsonify({
            'success': True,
            'cameras': [camera.to_dict() for camera in cameras],
            'total': len(cameras)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@surveillance_bp.route('/cameras', methods=['POST'])
@jwt_required()
def register_camera():
    """تسجيل كاميرا جديدة"""
    try:
        data = request.get_json()
        branch_id = data.get('branch_id')
        
        if not branch_id:
            return jsonify({'success': False, 'error': 'معرف الفرع مطلوب'}), 400
        
        camera = CameraManagementService.register_camera(data, branch_id)
        
        return jsonify({
            'success': True,
            'message': 'تم تسجيل الكاميرا بنجاح',
            'camera': camera.to_dict()
        }), 201
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@surveillance_bp.route('/cameras/<int:camera_id>', methods=['PUT'])
@jwt_required()
def update_camera(camera_id):
    """تحديث بيانات الكاميرا"""
    try:
        data = request.get_json()
        camera = Camera.query.get_or_404(camera_id)
        
        # تحديث البيانات
        for key, value in data.items():
            if hasattr(camera, key) and key not in ['id', 'created_at']:
                setattr(camera, key, value)
        
        camera.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم تحديث الكاميرا بنجاح',
            'camera': camera.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@surveillance_bp.route('/cameras/<int:camera_id>/status', methods=['PUT'])
@jwt_required()
def update_camera_status(camera_id):
    """تحديث حالة الكاميرا"""
    try:
        data = request.get_json()
        status = data.get('status')
        
        if not status:
            return jsonify({'success': False, 'error': 'الحالة مطلوبة'}), 400
        
        success = CameraManagementService.update_camera_status(camera_id, status)
        
        if success:
            return jsonify({'success': True, 'message': 'تم تحديث حالة الكاميرا'})
        else:
            return jsonify({'success': False, 'error': 'فشل في تحديث الحالة'}), 400
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@surveillance_bp.route('/cameras/<int:camera_id>/share', methods=['POST'])
@jwt_required()
def share_camera(camera_id):
    """مشاركة كاميرا مع فروع أخرى"""
    try:
        data = request.get_json()
        target_branches = data.get('target_branches', [])
        
        success = CameraManagementService.share_camera(camera_id, target_branches)
        
        if success:
            return jsonify({'success': True, 'message': 'تم مشاركة الكاميرا بنجاح'})
        else:
            return jsonify({'success': False, 'error': 'فشل في مشاركة الكاميرا'}), 400
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ===== إدارة صلاحيات الوصول =====

@surveillance_bp.route('/access', methods=['POST'])
@jwt_required()
def grant_access():
    """منح صلاحية وصول للكاميرا"""
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        
        access = CameraAccessService.grant_access(data, user_id)
        
        return jsonify({
            'success': True,
            'message': 'تم منح الصلاحية بنجاح',
            'access': access.to_dict()
        }), 201
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@surveillance_bp.route('/access/<int:access_id>', methods=['DELETE'])
@jwt_required()
def revoke_access(access_id):
    """إلغاء صلاحية الوصول"""
    try:
        success = CameraAccessService.revoke_access(access_id)
        
        if success:
            return jsonify({'success': True, 'message': 'تم إلغاء الصلاحية'})
        else:
            return jsonify({'success': False, 'error': 'فشل في إلغاء الصلاحية'}), 400
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@surveillance_bp.route('/cameras/<int:camera_id>/access/check', methods=['GET'])
@jwt_required()
def check_camera_access(camera_id):
    """التحقق من صلاحية الوصول للكاميرا"""
    try:
        user_id = get_jwt_identity()
        access_type = request.args.get('type', 'view_live')
        
        has_access = CameraAccessService.check_access(camera_id, user_id, access_type)
        
        return jsonify({
            'success': True,
            'has_access': has_access,
            'access_type': access_type
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ===== المشاهدة المباشرة =====

@surveillance_bp.route('/live/start', methods=['POST'])
@jwt_required()
def start_live_view():
    """بدء جلسة مشاهدة مباشرة"""
    try:
        data = request.get_json()
        camera_id = data.get('camera_id')
        user_id = get_jwt_identity()
        
        client_info = {
            'ip': request.remote_addr,
            'user_agent': request.headers.get('User-Agent')
        }
        
        session = LiveViewService.start_live_session(camera_id, user_id, client_info)
        
        return jsonify({
            'success': True,
            'message': 'تم بدء المشاهدة المباشرة',
            'session': session.to_dict()
        }), 201
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@surveillance_bp.route('/live/end', methods=['POST'])
@jwt_required()
def end_live_view():
    """إنهاء جلسة مشاهدة مباشرة"""
    try:
        data = request.get_json()
        session_token = data.get('session_token')
        disconnect_reason = data.get('reason')
        
        success = LiveViewService.end_live_session(session_token, disconnect_reason)
        
        if success:
            return jsonify({'success': True, 'message': 'تم إنهاء المشاهدة المباشرة'})
        else:
            return jsonify({'success': False, 'error': 'فشل في إنهاء الجلسة'}), 400
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@surveillance_bp.route('/live/sessions', methods=['GET'])
@jwt_required()
def get_active_sessions():
    """الحصول على الجلسات النشطة"""
    try:
        camera_id = request.args.get('camera_id', type=int)
        sessions = LiveViewService.get_active_sessions(camera_id)
        
        return jsonify({
            'success': True,
            'sessions': [session.to_dict() for session in sessions],
            'total': len(sessions)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ===== إدارة التسجيلات =====

@surveillance_bp.route('/recordings', methods=['GET'])
@jwt_required()
def get_recordings():
    """الحصول على قائمة التسجيلات مع التحليلات"""
    try:
        camera_id = request.args.get('camera_id', type=int)
        days_back = request.args.get('days_back', type=int, default=7)
        include_analysis = request.args.get('include_analysis', type=bool, default=True)
        
        if include_analysis:
            recordings = enhanced_recording_service.get_recordings_with_analysis(
                camera_id=camera_id,
                days_back=days_back
            )
        else:
            start_date = request.args.get('start_date')
            end_date = request.args.get('end_date')
            recordings = RecordingManagementService.search_recordings(
                camera_id=camera_id,
                start_date=start_date,
                end_date=end_date
            )
        
        return jsonify({
            'success': True,
            'recordings': recordings,
            'analysis_included': include_analysis
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@surveillance_bp.route('/recordings/start', methods=['POST'])
@jwt_required()
def start_recording():
    """بدء تسجيل جديد مع دعم Hikvision"""
    try:
        data = request.get_json()
        camera_id = data.get('camera_id')
        duration_minutes = data.get('duration_minutes', 60)
        quality = data.get('quality', 'medium')
        use_hikvision = data.get('use_hikvision', True)
        
        if not camera_id:
            return jsonify({
                'success': False,
                'message': 'معرف الكاميرا مطلوب'
            }), 400
        
        # محاولة استخدام Hikvision أولاً إذا كان متاحاً
        if use_hikvision:
            hikvision_result = enhanced_recording_service.start_hikvision_recording(
                camera_id=camera_id,
                duration_minutes=duration_minutes
            )
            
            if hikvision_result['success']:
                return jsonify(hikvision_result)
        
        # استخدام النظام العادي كبديل
        result = RecordingManagementService.start_recording(
            camera_id=camera_id,
            duration=duration_minutes * 60,
            quality=quality,
            user_id=get_jwt_identity()
        )
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@surveillance_bp.route('/recordings/stop', methods=['POST'])
@jwt_required()
def stop_recording():
    """إيقاف التسجيل مع معالجة Claude AI"""
    try:
        data = request.get_json()
        recording_id = data.get('recording_id')
        camera_id = data.get('camera_id')
        use_hikvision = data.get('use_hikvision', True)
        
        if not recording_id:
            return jsonify({
                'success': False,
                'message': 'معرف التسجيل مطلوب'
            }), 400
        
        # محاولة إيقاف Hikvision أولاً إذا كان متاحاً
        if use_hikvision and camera_id:
            hikvision_result = enhanced_recording_service.stop_hikvision_recording(
                camera_id=camera_id,
                recording_id=recording_id
            )
            
            if hikvision_result['success']:
                return jsonify(hikvision_result)
        
        # استخدام النظام العادي كبديل
        result = RecordingManagementService.stop_recording(recording_id)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@surveillance_bp.route('/recordings/<int:recording_id>/analyze', methods=['POST'])
@jwt_required()
def analyze_recording(recording_id):
    """تحليل التسجيل باستخدام Claude AI"""
    try:
        result = enhanced_recording_service.analyze_recording_with_claude(recording_id)
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

# ===== إدارة التنبيهات =====

@surveillance_bp.route('/alerts', methods=['GET'])
@jwt_required()
def get_alerts():
    """الحصول على التنبيهات"""
    try:
        branch_id = request.args.get('branch_id', type=int)
        severity = request.args.get('severity')
        acknowledged = request.args.get('acknowledged', 'false').lower() == 'true'
        
        if acknowledged:
            alerts = SurveillanceAlert.query.filter_by(is_acknowledged=True).all()
        else:
            alerts = AlertService.get_active_alerts(branch_id, severity)
        
        return jsonify({
            'success': True,
            'alerts': [alert.to_dict() for alert in alerts],
            'total': len(alerts)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@surveillance_bp.route('/alerts', methods=['POST'])
@jwt_required()
def create_alert():
    """إنشاء تنبيه جديد"""
    try:
        data = request.get_json()
        
        alert = AlertService.create_alert(
            camera_id=data['camera_id'],
            alert_type=AlertType(data['alert_type']),
            severity=AlertSeverity(data['severity']),
            title=data['title'],
            description=data.get('description'),
            detection_data=data.get('detection_data')
        )
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء التنبيه',
            'alert': alert.to_dict()
        }), 201
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@surveillance_bp.route('/alerts/<int:alert_id>/acknowledge', methods=['POST'])
@jwt_required()
def acknowledge_alert(alert_id):
    """الإقرار بالتنبيه"""
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        notes = data.get('notes')
        
        success = AlertService.acknowledge_alert(alert_id, user_id, notes)
        
        if success:
            return jsonify({'success': True, 'message': 'تم الإقرار بالتنبيه'})
        else:
            return jsonify({'success': False, 'error': 'فشل في الإقرار'}), 400
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ===== مراقبة النظام =====

@surveillance_bp.route('/system/health', methods=['GET'])
@jwt_required()
def get_system_health():
    """الحصول على صحة النظام"""
    try:
        health_data = CameraMonitoringService.get_system_health()
        
        return jsonify({
            'success': True,
            'health': health_data
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@surveillance_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard_data():
    """الحصول على بيانات لوحة التحكم"""
    try:
        branch_id = request.args.get('branch_id', type=int)
        
        # إحصائيات عامة
        total_cameras = Camera.query.count()
        online_cameras = Camera.query.filter_by(status=CameraStatus.ONLINE).count()
        active_recordings = Recording.query.filter(Recording.end_time.is_(None)).count()
        unacknowledged_alerts = SurveillanceAlert.query.filter_by(is_acknowledged=False).count()
        
        # إحصائيات الفرع إذا تم تحديده
        if branch_id:
            branch_cameras = Camera.query.filter_by(branch_id=branch_id).count()
            branch_online = Camera.query.filter_by(
                branch_id=branch_id, 
                status=CameraStatus.ONLINE
            ).count()
        else:
            branch_cameras = total_cameras
            branch_online = online_cameras
        
        # التنبيهات الأخيرة
        recent_alerts = SurveillanceAlert.query.order_by(
            SurveillanceAlert.detected_at.desc()
        ).limit(10).all()
        
        # الجلسات النشطة
        active_sessions = LiveViewSession.query.filter_by(is_active=True).count()
        
        return jsonify({
            'success': True,
            'dashboard': {
                'cameras': {
                    'total': total_cameras,
                    'online': online_cameras,
                    'offline': total_cameras - online_cameras,
                    'branch_total': branch_cameras,
                    'branch_online': branch_online
                },
                'activity': {
                    'active_recordings': active_recordings,
                    'active_sessions': active_sessions,
                    'unacknowledged_alerts': unacknowledged_alerts
                },
                'recent_alerts': [alert.to_dict() for alert in recent_alerts]
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ===== التقارير =====

@surveillance_bp.route('/reports/activity', methods=['POST'])
@jwt_required()
def generate_activity_report():
    """إنشاء تقرير النشاط"""
    try:
        data = request.get_json()
        branch_id = data.get('branch_id')
        start_date = datetime.fromisoformat(data['start_date'])
        end_date = datetime.fromisoformat(data['end_date'])
        
        report = SurveillanceReportService.generate_activity_report(
            branch_id, start_date, end_date
        )
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء التقرير',
            'report': report.to_dict()
        }), 201
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@surveillance_bp.route('/reports', methods=['GET'])
@jwt_required()
def get_reports():
    """الحصول على التقارير"""
    try:
        branch_id = request.args.get('branch_id', type=int)
        report_type = request.args.get('type')
        
        query = SurveillanceReport.query
        
        if branch_id:
            query = query.filter_by(branch_id=branch_id)
        
        if report_type:
            query = query.filter_by(report_type=report_type)
        
        reports = query.order_by(SurveillanceReport.created_at.desc()).all()
        
        return jsonify({
            'success': True,
            'reports': [report.to_dict() for report in reports],
            'total': len(reports)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ===== معالجة الأخطاء =====

@surveillance_bp.errorhandler(404)
def not_found(error):
    return jsonify({'success': False, 'error': 'المورد غير موجود'}), 404

@surveillance_bp.errorhandler(400)
def bad_request(error):
    return jsonify({'success': False, 'error': 'طلب غير صحيح'}), 400

@surveillance_bp.errorhandler(500)
def internal_error(error):
    return jsonify({'success': False, 'error': 'خطأ داخلي في الخادم'}), 500
