"""
خدمات نظام كاميرات المراقبة المترابطة - النسخة المنظفة
Surveillance System Services - Clean Version
"""

from datetime import datetime, timedelta
from sqlalchemy import and_, or_, func
from flask import current_app
from typing import Dict, List, Optional, Tuple
import logging
from enum import Enum
import json
import uuid

# استيراد التكاملات المحسنة
from hikvision_integration import hikvision_manager, HikvisionAPI
from claude_ai_integration import get_claude_manager, initialize_claude_manager

# استيراد النماذج والقاعدة
from surveillance_system_models import (
    Camera, CameraAccess, Recording, SurveillanceAlert, LiveViewSession,
    CameraGroup, SurveillanceReport, CameraStatus, CameraType, RecordingQuality,
    AlertType, AlertSeverity, AccessLevel
)
from database import db
from models import User
from branch_integration_models import Branch

logger = logging.getLogger(__name__)

class CameraManagementService:
    """خدمة إدارة الكاميرات"""
    
    @staticmethod
    def register_camera(camera_data: Dict, user_id: int) -> Dict:
        """تسجيل كاميرا جديدة مع دعم Hikvision"""
        try:
            # التحقق من وجود الكاميرا
            existing_camera = Camera.query.filter_by(
                ip_address=camera_data['ip_address']
            ).first()
            
            if existing_camera:
                return {
                    'success': False,
                    'message': 'الكاميرا مسجلة مسبقاً بهذا العنوان',
                    'camera_id': existing_camera.id
                }
            
            # إنشاء كاميرا جديدة
            camera = Camera(
                name=camera_data['name'],
                ip_address=camera_data['ip_address'],
                port=camera_data.get('port', 80),
                username=camera_data['username'],
                password=camera_data['password'],
                camera_type=CameraType(camera_data.get('type', 'fixed')),
                location=camera_data['location'],
                branch_id=camera_data['branch_id'],
                status=CameraStatus.OFFLINE,
                created_by=user_id
            )
            
            db.session.add(camera)
            db.session.commit()
            
            # إضافة الكاميرا إلى مدير Hikvision إذا كانت من نوع Hikvision
            if camera_data.get('brand', '').lower() == 'hikvision':
                hikvision_success = hikvision_manager.add_camera(
                    str(camera.id),
                    camera.ip_address,
                    camera.username,
                    camera.password,
                    camera.port
                )
                
                if hikvision_success:
                    # الحصول على معلومات الجهاز من Hikvision API
                    hikvision_api = hikvision_manager.get_camera(str(camera.id))
                    if hikvision_api:
                        device_info = hikvision_api.get_device_info()
                        if device_info:
                            camera.model = device_info.get('model', '')
                            camera.firmware_version = device_info.get('firmware_version', '')
                            camera.serial_number = device_info.get('serial_number', '')
                            db.session.commit()
            
            # اختبار الاتصال
            connection_test = CameraManagementService.test_camera_connection(camera.id)
            
            return {
                'success': True,
                'message': 'تم تسجيل الكاميرا بنجاح',
                'camera_id': camera.id,
                'connection_status': connection_test,
                'hikvision_integrated': camera_data.get('brand', '').lower() == 'hikvision'
            }
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"خطأ في تسجيل الكاميرا: {str(e)}")
            return {
                'success': False,
                'message': f'خطأ في تسجيل الكاميرا: {str(e)}'
            }
    
    @staticmethod
    def get_branch_cameras(branch_id: int, include_shared: bool = True) -> List[Camera]:
        """الحصول على كاميرات الفرع"""
        query = Camera.query.filter_by(branch_id=branch_id)
        
        if include_shared:
            # إضافة الكاميرات المشتركة مع هذا الفرع
            shared_cameras = Camera.query.filter(
                Camera.shared_with_branches.contains([branch_id])
            ).all()
            
            own_cameras = query.all()
            return own_cameras + shared_cameras
        
        return query.all()
    
    @staticmethod
    def test_camera_connection(camera_id: int) -> Dict:
        """اختبار اتصال الكاميرا مع دعم Hikvision"""
        try:
            camera = Camera.query.get(camera_id)
            if not camera:
                return {
                    'success': False,
                    'message': 'الكاميرا غير موجودة'
                }
            
            # اختبار الاتصال مع Hikvision إذا كانت متاحة
            hikvision_api = hikvision_manager.get_camera(str(camera_id))
            if hikvision_api:
                connection_success = hikvision_api.test_connection()
                
                if connection_success:
                    # الحصول على معلومات النظام
                    system_status = hikvision_api.get_system_status()
                    camera.status = CameraStatus.ONLINE
                    camera.last_seen = datetime.utcnow()
                    
                    # تحديث معلومات إضافية إذا كانت متوفرة
                    if system_status:
                        camera.cpu_usage = system_status.get('cpu_usage', '0')
                        camera.memory_usage = system_status.get('memory_usage', '0')
                        camera.temperature = system_status.get('temperature', '0')
                else:
                    camera.status = CameraStatus.OFFLINE
            else:
                # محاولة اتصال عادي (محاكاة للكاميرات غير Hikvision)
                import random
                connection_success = random.choice([True, False])
                
                if connection_success:
                    camera.status = CameraStatus.ONLINE
                    camera.last_seen = datetime.utcnow()
                else:
                    camera.status = CameraStatus.OFFLINE
            
            db.session.commit()
            
            return {
                'success': connection_success,
                'status': camera.status.value,
                'last_seen': camera.last_seen.isoformat() if camera.last_seen else None,
                'message': 'متصلة' if connection_success else 'غير متصلة',
                'hikvision_api': hikvision_api is not None
            }
            
        except Exception as e:
            logger.error(f"خطأ في اختبار اتصال الكاميرا: {str(e)}")
            return {
                'success': False,
                'message': f'خطأ في اختبار الاتصال: {str(e)}'
            }
    
    @staticmethod
    def update_camera_status(camera_id: int, status: str) -> bool:
        """تحديث حالة الكاميرا"""
        try:
            camera = Camera.query.get(camera_id)
            if not camera:
                return False
            
            old_status = camera.status
            camera.status = CameraStatus(status)
            camera.last_seen = datetime.utcnow()
            
            db.session.commit()
            return True
            
        except Exception as e:
            logger.error(f"خطأ في تحديث حالة الكاميرا: {str(e)}")
            return False
    
    @staticmethod
    def share_camera(camera_id: int, target_branch_ids: List[int]) -> bool:
        """مشاركة كاميرا مع فروع أخرى"""
        try:
            camera = Camera.query.get(camera_id)
            if not camera:
                return False
            
            camera.is_shared = True
            camera.shared_with_branches = target_branch_ids
            camera.updated_at = datetime.utcnow()
            
            db.session.commit()
            logger.info(f"تم مشاركة الكاميرا {camera.name} مع الفروع: {target_branch_ids}")
            return True
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"خطأ في مشاركة الكاميرا: {str(e)}")
            return False

class CameraAccessService:
    """خدمة إدارة صلاحيات الوصول للكاميرات"""
    
    @staticmethod
    def grant_access(access_data: Dict, granted_by: int) -> CameraAccess:
        """منح صلاحية وصول للكاميرا"""
        try:
            access = CameraAccess(
                camera_id=access_data['camera_id'],
                user_id=access_data['user_id'],
                branch_id=access_data['branch_id'],
                access_level=AccessLevel(access_data.get('access_level', 'view_only')),
                access_start_time=datetime.strptime(access_data['access_start_time'], '%H:%M').time() if access_data.get('access_start_time') else None,
                access_end_time=datetime.strptime(access_data['access_end_time'], '%H:%M').time() if access_data.get('access_end_time') else None,
                allowed_days=access_data.get('allowed_days', []),
                can_view_live=access_data.get('can_view_live', True),
                can_view_recordings=access_data.get('can_view_recordings', True),
                can_control_camera=access_data.get('can_control_camera', False),
                can_download_recordings=access_data.get('can_download_recordings', False),
                can_delete_recordings=access_data.get('can_delete_recordings', False),
                granted_by=granted_by,
                expires_at=datetime.strptime(access_data['expires_at'], '%Y-%m-%d') if access_data.get('expires_at') else None,
                notes=access_data.get('notes')
            )
            
            db.session.add(access)
            db.session.commit()
            
            logger.info(f"تم منح صلاحية وصول للكاميرا {access.camera_id} للمستخدم {access.user_id}")
            return access
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"خطأ في منح صلاحية الوصول: {str(e)}")
            raise
    
    @staticmethod
    def check_access(camera_id: int, user_id: int, access_type: str = 'view_live') -> bool:
        """التحقق من صلاحية الوصول"""
        try:
            access = CameraAccess.query.filter_by(
                camera_id=camera_id,
                user_id=user_id,
                is_active=True
            ).first()
            
            if not access:
                return False
            
            # التحقق من انتهاء الصلاحية
            if access.expires_at and access.expires_at < datetime.utcnow():
                return False
            
            # التحقق من الوقت المسموح
            current_time = datetime.now().time()
            if access.access_start_time and access.access_end_time:
                if not (access.access_start_time <= current_time <= access.access_end_time):
                    return False
            
            # التحقق من اليوم المسموح
            if access.allowed_days:
                current_day = datetime.now().strftime('%A').lower()
                if current_day not in access.allowed_days:
                    return False
            
            # التحقق من نوع الوصول المطلوب
            if access_type == 'view_live':
                return access.can_view_live
            elif access_type == 'view_recordings':
                return access.can_view_recordings
            elif access_type == 'control_camera':
                return access.can_control_camera
            elif access_type == 'download_recordings':
                return access.can_download_recordings
            elif access_type == 'delete_recordings':
                return access.can_delete_recordings
            
            return True
            
        except Exception as e:
            logger.error(f"خطأ في التحقق من صلاحية الوصول: {str(e)}")
            return False
    
    @staticmethod
    def revoke_access(access_id: int) -> bool:
        """إلغاء صلاحية الوصول"""
        try:
            access = CameraAccess.query.get(access_id)
            if not access:
                return False
            
            access.is_active = False
            access.updated_at = datetime.utcnow()
            
            db.session.commit()
            return True
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"خطأ في إلغاء صلاحية الوصول: {str(e)}")
            return False

class LiveViewService:
    """خدمة المشاهدة المباشرة"""
    
    @staticmethod
    def start_live_session(camera_id: int, user_id: int, client_info: Dict) -> LiveViewSession:
        """بدء جلسة مشاهدة مباشرة"""
        try:
            # التحقق من صلاحية الوصول
            if not CameraAccessService.check_access(camera_id, user_id, 'view_live'):
                raise ValueError("ليس لديك صلاحية لمشاهدة هذه الكاميرا")
            
            # إنشاء رمز جلسة فريد
            session_token = str(uuid.uuid4())
            
            session = LiveViewSession(
                camera_id=camera_id,
                user_id=user_id,
                session_token=session_token,
                client_ip=client_info.get('ip'),
                user_agent=client_info.get('user_agent')
            )
            
            db.session.add(session)
            db.session.commit()
            
            logger.info(f"بدأت جلسة مشاهدة مباشرة للكاميرا {camera_id} بواسطة المستخدم {user_id}")
            return session
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"خطأ في بدء جلسة المشاهدة المباشرة: {str(e)}")
            raise
    
    @staticmethod
    def end_live_session(session_token: str, disconnect_reason: str = None) -> bool:
        """إنهاء جلسة مشاهدة مباشرة"""
        try:
            session = LiveViewSession.query.filter_by(
                session_token=session_token,
                is_active=True
            ).first()
            
            if not session:
                return False
            
            session.end_time = datetime.utcnow()
            session.duration_seconds = int((session.end_time - session.start_time).total_seconds())
            session.is_active = False
            session.disconnect_reason = disconnect_reason
            
            db.session.commit()
            
            logger.info(f"انتهت جلسة المشاهدة المباشرة: {session_token}")
            return True
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"خطأ في إنهاء جلسة المشاهدة المباشرة: {str(e)}")
            return False
    
    @staticmethod
    def get_active_sessions(camera_id: int = None) -> List[LiveViewSession]:
        """الحصول على الجلسات النشطة"""
        query = LiveViewSession.query.filter_by(is_active=True)
        
        if camera_id:
            query = query.filter_by(camera_id=camera_id)
        
        return query.all()

class RecordingService:
    """خدمة إدارة التسجيلات"""
    
    @staticmethod
    def start_recording(camera_id: int, recording_type: str = 'continuous') -> Recording:
        """بدء تسجيل"""
        try:
            camera = Camera.query.get(camera_id)
            if not camera or not camera.recording_enabled:
                raise ValueError("التسجيل غير مفعل لهذه الكاميرا")
            
            # إنشاء اسم ملف فريد
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"{camera.camera_id}_{timestamp}.mp4"
            file_path = f"/recordings/{camera.branch_id}/{camera.camera_id}/{filename}"
            
            recording = Recording(
                camera_id=camera_id,
                filename=filename,
                file_path=file_path,
                start_time=datetime.utcnow(),
                quality=camera.recording_quality,
                is_continuous=(recording_type == 'continuous'),
                is_motion_triggered=(recording_type == 'motion'),
                is_alert_triggered=(recording_type == 'alert'),
                has_audio=camera.audio_recording
            )
            
            db.session.add(recording)
            db.session.commit()
            
            logger.info(f"بدأ تسجيل جديد للكاميرا {camera.name}: {filename}")
            return recording
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"خطأ في بدء التسجيل: {str(e)}")
            raise
    
    @staticmethod
    def stop_recording(recording_id: int, file_size: int = None, duration: int = None) -> bool:
        """إيقاف التسجيل"""
        try:
            recording = Recording.query.get(recording_id)
            if not recording:
                return False
            
            recording.end_time = datetime.utcnow()
            recording.file_size = file_size
            recording.duration_seconds = duration or int((recording.end_time - recording.start_time).total_seconds())
            
            db.session.commit()
            
            logger.info(f"تم إيقاف التسجيل: {recording.filename}")
            return True
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"خطأ في إيقاف التسجيل: {str(e)}")
            return False
    
    @staticmethod
    def search_recordings(camera_id: int = None, start_date: datetime = None, 
                         end_date: datetime = None, recording_type: str = None) -> List[Recording]:
        """البحث في التسجيلات"""
        query = Recording.query
        
        if camera_id:
            query = query.filter_by(camera_id=camera_id)
        
        if start_date:
            query = query.filter(Recording.start_time >= start_date)
        
        if end_date:
            query = query.filter(Recording.end_time <= end_date)
        
        if recording_type == 'motion':
            query = query.filter_by(is_motion_triggered=True)
        elif recording_type == 'alert':
            query = query.filter_by(is_alert_triggered=True)
        elif recording_type == 'continuous':
            query = query.filter_by(is_continuous=True)
        
        return query.order_by(Recording.start_time.desc()).all()
    
    @staticmethod
    def archive_old_recordings(days_old: int = 30) -> int:
        """أرشفة التسجيلات القديمة"""
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days_old)
            
            old_recordings = Recording.query.filter(
                and_(
                    Recording.start_time < cutoff_date,
                    Recording.is_archived == False
                )
            ).all()
            
            archived_count = 0
            for recording in old_recordings:
                recording.is_archived = True
                archived_count += 1
            
            db.session.commit()
            
            logger.info(f"تم أرشفة {archived_count} تسجيل قديم")
            return archived_count
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"خطأ في أرشفة التسجيلات: {str(e)}")
            return 0

class AlertService:
    """خدمة إدارة التنبيهات"""
    
    @staticmethod
    def create_alert(camera_id: int, alert_type: AlertType, severity: AlertSeverity,
                    title: str, description: str = None, detection_data: Dict = None) -> SurveillanceAlert:
        """إنشاء تنبيه جديد"""
        try:
            alert = SurveillanceAlert(
                camera_id=camera_id,
                alert_type=alert_type,
                severity=severity,
                title=title,
                description=description,
                detected_at=datetime.utcnow(),
                detection_data=detection_data or {}
            )
            
            db.session.add(alert)
            db.session.commit()
            
            # إرسال إشعارات للمستخدمين المعنيين
            AlertService._send_notifications(alert)
            
            logger.info(f"تم إنشاء تنبيه جديد: {title} للكاميرا {camera_id}")
            return alert
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"خطأ في إنشاء التنبيه: {str(e)}")
            raise
    
    @staticmethod
    def _send_notifications(alert: SurveillanceAlert):
        """إرسال إشعارات التنبيه"""
        try:
            # الحصول على المستخدمين الذين لديهم صلاحية للكاميرا
            camera_accesses = CameraAccess.query.filter_by(
                camera_id=alert.camera_id,
                is_active=True
            ).all()
            
            notified_users = []
            for access in camera_accesses:
                # إرسال إشعار (يمكن تطوير آلية الإشعار حسب الحاجة)
                notified_users.append(access.user_id)
            
            alert.notification_sent = True
            alert.notified_users = notified_users
            
            db.session.commit()
            
        except Exception as e:
            logger.error(f"خطأ في إرسال الإشعارات: {str(e)}")
    
    @staticmethod
    def acknowledge_alert(alert_id: int, user_id: int, notes: str = None) -> bool:
        """الإقرار بالتنبيه"""
        try:
            alert = SurveillanceAlert.query.get(alert_id)
            if not alert:
                return False
            
            alert.is_acknowledged = True
            alert.acknowledged_by = user_id
            alert.acknowledged_at = datetime.utcnow()
            alert.resolution_notes = notes
            
            db.session.commit()
            
            logger.info(f"تم الإقرار بالتنبيه {alert_id} بواسطة المستخدم {user_id}")
            return True
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"خطأ في الإقرار بالتنبيه: {str(e)}")
            return False
    
    @staticmethod
    def get_active_alerts(branch_id: int = None, severity: str = None) -> List[SurveillanceAlert]:
        """الحصول على التنبيهات النشطة"""
        query = SurveillanceAlert.query.filter_by(is_acknowledged=False)
        
        if branch_id:
            camera_ids = [c.id for c in Camera.query.filter_by(branch_id=branch_id).all()]
            query = query.filter(SurveillanceAlert.camera_id.in_(camera_ids))
        
        if severity:
            query = query.filter_by(severity=AlertSeverity(severity))
        
        return query.order_by(SurveillanceAlert.detected_at.desc()).all()

class CameraMonitoringService:
    """خدمة مراقبة الكاميرات"""
    
    @staticmethod
    def start_monitoring(camera_id: int):
        """بدء مراقبة الكاميرا"""
        def monitor_camera():
            try:
                camera = Camera.query.get(camera_id)
                if not camera:
                    return
                
                # محاولة الاتصال بالكاميرا
                if CameraMonitoringService._ping_camera(camera):
                    CameraManagementService.update_camera_status(camera_id, 'online')
                else:
                    CameraManagementService.update_camera_status(camera_id, 'offline')
                
            except Exception as e:
                logger.error(f"خطأ في مراقبة الكاميرا {camera_id}: {str(e)}")
        
        # تشغيل المراقبة في خيط منفصل
        monitor_thread = Thread(target=monitor_camera)
        monitor_thread.daemon = True
        monitor_thread.start()
    
    @staticmethod
    def _ping_camera(camera: Camera) -> bool:
        """فحص اتصال الكاميرا"""
        try:
            if camera.rtsp_url:
                # محاولة الاتصال بـ RTSP stream
                cap = cv2.VideoCapture(camera.rtsp_url)
                if cap.isOpened():
                    ret, frame = cap.read()
                    cap.release()
                    return ret
            
            # محاولة ping للـ IP address
            if camera.ip_address:
                import subprocess
                result = subprocess.run(['ping', '-c', '1', camera.ip_address], 
                                      capture_output=True, text=True, timeout=5)
                return result.returncode == 0
            
            return False
            
        except Exception as e:
            logger.error(f"خطأ في فحص الكاميرا {camera.camera_id}: {str(e)}")
            return False
    
    @staticmethod
    def get_system_health() -> Dict:
        """الحصول على صحة النظام"""
        try:
            total_cameras = Camera.query.count()
            online_cameras = Camera.query.filter_by(status=CameraStatus.ONLINE).count()
            offline_cameras = Camera.query.filter_by(status=CameraStatus.OFFLINE).count()
            maintenance_cameras = Camera.query.filter_by(status=CameraStatus.MAINTENANCE).count()
            
            active_recordings = Recording.query.filter(Recording.end_time.is_(None)).count()
            active_sessions = LiveViewSession.query.filter_by(is_active=True).count()
            unacknowledged_alerts = SurveillanceAlert.query.filter_by(is_acknowledged=False).count()
            
            return {
                'cameras': {
                    'total': total_cameras,
                    'online': online_cameras,
                    'offline': offline_cameras,
                    'maintenance': maintenance_cameras,
                    'uptime_percentage': (online_cameras / total_cameras * 100) if total_cameras > 0 else 0
                },
                'activity': {
                    'active_recordings': active_recordings,
                    'active_sessions': active_sessions,
                    'unacknowledged_alerts': unacknowledged_alerts
                },
                'last_updated': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"خطأ في الحصول على صحة النظام: {str(e)}")
            return {}

class SurveillanceReportService:
    """خدمة تقارير المراقبة"""
    
    @staticmethod
    def generate_activity_report(branch_id: int, start_date: datetime, end_date: datetime) -> SurveillanceReport:
        """إنشاء تقرير النشاط"""
        try:
            cameras = Camera.query.filter_by(branch_id=branch_id).all()
            camera_ids = [c.id for c in cameras]
            
            # جمع إحصائيات النشاط
            total_recordings = Recording.query.filter(
                and_(
                    Recording.camera_id.in_(camera_ids),
                    Recording.start_time >= start_date,
                    Recording.start_time <= end_date
                )
            ).count()
            
            total_alerts = SurveillanceAlert.query.filter(
                and_(
                    SurveillanceAlert.camera_id.in_(camera_ids),
                    SurveillanceAlert.detected_at >= start_date,
                    SurveillanceAlert.detected_at <= end_date
                )
            ).count()
            
            total_sessions = LiveViewSession.query.filter(
                and_(
                    LiveViewSession.camera_id.in_(camera_ids),
                    LiveViewSession.start_time >= start_date,
                    LiveViewSession.start_time <= end_date
                )
            ).count()
            
            report_data = {
                'period': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat()
                },
                'cameras_count': len(cameras),
                'total_recordings': total_recordings,
                'total_alerts': total_alerts,
                'total_sessions': total_sessions,
                'camera_details': [c.to_dict() for c in cameras]
            }
            
            summary_stats = {
                'recordings_per_day': total_recordings / ((end_date - start_date).days or 1),
                'alerts_per_day': total_alerts / ((end_date - start_date).days or 1),
                'sessions_per_day': total_sessions / ((end_date - start_date).days or 1)
            }
            
            report = SurveillanceReport(
                title=f"تقرير نشاط المراقبة - {start_date.strftime('%Y-%m-%d')} إلى {end_date.strftime('%Y-%m-%d')}",
                description="تقرير شامل عن نشاط نظام المراقبة",
                branch_id=branch_id,
                camera_ids=camera_ids,
                start_date=start_date,
                end_date=end_date,
                report_type='activity',
                report_data=report_data,
                summary_statistics=summary_stats,
                created_by=1  # يجب تمرير معرف المستخدم الفعلي
            )
            
            db.session.add(report)
            db.session.commit()
            
            logger.info(f"تم إنشاء تقرير النشاط للفرع {branch_id}")
            return report
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"خطأ في إنشاء تقرير النشاط: {str(e)}")
            raise
