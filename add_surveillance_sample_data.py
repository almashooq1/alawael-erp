"""
إضافة بيانات تجريبية لنظام كاميرات المراقبة المترابطة
Add Sample Data for Surveillance System
"""

from datetime import datetime, timedelta
import random
from app import app
from models import db
from surveillance_system_models import (
    Camera, CameraAccess, Recording, SurveillanceAlert, LiveViewSession,
    CameraGroup, SurveillanceReport, CameraStatus, CameraType, RecordingQuality,
    AlertType, AlertSeverity, AccessLevel
)
from branch_integration_models import Branch

def add_surveillance_sample_data():
    """إضافة بيانات تجريبية لنظام المراقبة"""
    
    with app.app_context():
        try:
            print("بدء إضافة البيانات التجريبية لنظام المراقبة...")
            
            # التأكد من وجود فروع
            branches = Branch.query.all()
            if not branches:
                print("لا توجد فروع في النظام. يرجى إضافة الفروع أولاً.")
                return
            
            # إضافة كاميرات تجريبية
            cameras_data = [
                {
                    'name': 'كاميرا المدخل الرئيسي',
                    'camera_id': 'CAM_001',
                    'branch_id': branches[0].id,
                    'camera_type': CameraType.DOME,
                    'location': 'المدخل الرئيسي',
                    'description': 'كاميرا مراقبة المدخل الرئيسي للمركز',
                    'ip_address': '192.168.1.101',
                    'port': 554,
                    'rtsp_url': 'rtsp://192.168.1.101:554/stream1',
                    'username': 'admin',
                    'password': 'admin123',
                    'recording_quality': RecordingQuality.HIGH,
                    'recording_enabled': True,
                    'motion_detection': True,
                    'audio_recording': True,
                    'status': CameraStatus.ONLINE,
                    'manufacturer': 'Hikvision',
                    'model': 'DS-2CD2385FWD-I',
                    'firmware_version': '5.6.3',
                    'installation_date': datetime.now().date() - timedelta(days=90),
                    'warranty_expiry': datetime.now().date() + timedelta(days=275),
                    'latitude': 24.7136,
                    'longitude': 46.6753,
                    'floor_level': 0,
                    'zone': 'مدخل',
                    'metadata': {
                        'resolution': '2688x1520',
                        'fps': 30,
                        'night_vision': True,
                        'ptz_support': False
                    }
                },
                {
                    'name': 'كاميرا القاعة الرئيسية',
                    'camera_id': 'CAM_002',
                    'branch_id': branches[0].id,
                    'camera_type': CameraType.PTZ,
                    'location': 'القاعة الرئيسية',
                    'description': 'كاميرا مراقبة القاعة الرئيسية مع إمكانية التحكم',
                    'ip_address': '192.168.1.102',
                    'port': 554,
                    'rtsp_url': 'rtsp://192.168.1.102:554/stream1',
                    'username': 'admin',
                    'password': 'admin123',
                    'recording_quality': RecordingQuality.ULTRA_HIGH,
                    'recording_enabled': True,
                    'motion_detection': True,
                    'audio_recording': True,
                    'status': CameraStatus.ONLINE,
                    'manufacturer': 'Dahua',
                    'model': 'SD59225U-HNI',
                    'firmware_version': '2.820.0000000.25.R',
                    'installation_date': datetime.now().date() - timedelta(days=60),
                    'warranty_expiry': datetime.now().date() + timedelta(days=305),
                    'latitude': 24.7138,
                    'longitude': 46.6755,
                    'floor_level': 1,
                    'zone': 'قاعات',
                    'metadata': {
                        'resolution': '1920x1080',
                        'fps': 25,
                        'night_vision': True,
                        'ptz_support': True,
                        'zoom_range': '25x optical'
                    }
                },
                {
                    'name': 'كاميرا الممر الشرقي',
                    'camera_id': 'CAM_003',
                    'branch_id': branches[0].id,
                    'camera_type': CameraType.BULLET,
                    'location': 'الممر الشرقي',
                    'description': 'كاميرا مراقبة الممر الشرقي',
                    'ip_address': '192.168.1.103',
                    'port': 554,
                    'rtsp_url': 'rtsp://192.168.1.103:554/stream1',
                    'username': 'admin',
                    'password': 'admin123',
                    'recording_quality': RecordingQuality.MEDIUM,
                    'recording_enabled': True,
                    'motion_detection': True,
                    'audio_recording': False,
                    'status': CameraStatus.OFFLINE,
                    'manufacturer': 'Axis',
                    'model': 'M3046-V',
                    'firmware_version': '8.40.1',
                    'installation_date': datetime.now().date() - timedelta(days=120),
                    'warranty_expiry': datetime.now().date() + timedelta(days=245),
                    'latitude': 24.7140,
                    'longitude': 46.6757,
                    'floor_level': 1,
                    'zone': 'ممرات',
                    'metadata': {
                        'resolution': '1280x720',
                        'fps': 30,
                        'night_vision': False,
                        'ptz_support': False
                    }
                },
                {
                    'name': 'كاميرا الساحة الخارجية',
                    'camera_id': 'CAM_004',
                    'branch_id': branches[0].id,
                    'camera_type': CameraType.FIXED,
                    'location': 'الساحة الخارجية',
                    'description': 'كاميرا مراقبة الساحة الخارجية',
                    'ip_address': '192.168.1.104',
                    'port': 554,
                    'rtsp_url': 'rtsp://192.168.1.104:554/stream1',
                    'username': 'admin',
                    'password': 'admin123',
                    'recording_quality': RecordingQuality.HIGH,
                    'recording_enabled': True,
                    'motion_detection': True,
                    'audio_recording': False,
                    'status': CameraStatus.MAINTENANCE,
                    'is_shared': True,
                    'shared_with_branches': [branches[1].id] if len(branches) > 1 else [],
                    'manufacturer': 'Bosch',
                    'model': 'FLEXIDOME IP outdoor 5000 HD',
                    'firmware_version': '6.50.0.105',
                    'installation_date': datetime.now().date() - timedelta(days=30),
                    'warranty_expiry': datetime.now().date() + timedelta(days=335),
                    'latitude': 24.7135,
                    'longitude': 46.6750,
                    'floor_level': 0,
                    'zone': 'خارجي',
                    'metadata': {
                        'resolution': '1920x1080',
                        'fps': 30,
                        'night_vision': True,
                        'ptz_support': False,
                        'weather_resistant': True
                    }
                }
            ]
            
            # إضافة كاميرات إضافية للفروع الأخرى
            if len(branches) > 1:
                cameras_data.append({
                    'name': 'كاميرا مدخل الفرع الثاني',
                    'camera_id': 'CAM_005',
                    'branch_id': branches[1].id,
                    'camera_type': CameraType.DOME,
                    'location': 'المدخل الرئيسي - الفرع الثاني',
                    'description': 'كاميرا مراقبة المدخل الرئيسي للفرع الثاني',
                    'ip_address': '192.168.2.101',
                    'port': 554,
                    'rtsp_url': 'rtsp://192.168.2.101:554/stream1',
                    'username': 'admin',
                    'password': 'admin123',
                    'recording_quality': RecordingQuality.HIGH,
                    'recording_enabled': True,
                    'motion_detection': True,
                    'audio_recording': True,
                    'status': CameraStatus.ONLINE,
                    'manufacturer': 'Hikvision',
                    'model': 'DS-2CD2385FWD-I',
                    'firmware_version': '5.6.3',
                    'installation_date': datetime.now().date() - timedelta(days=45),
                    'warranty_expiry': datetime.now().date() + timedelta(days=320),
                    'latitude': 24.6892,
                    'longitude': 46.7224,
                    'floor_level': 0,
                    'zone': 'مدخل',
                    'metadata': {
                        'resolution': '2688x1520',
                        'fps': 30,
                        'night_vision': True,
                        'ptz_support': False
                    }
                })
            
            cameras = []
            for camera_data in cameras_data:
                camera = Camera(**camera_data)
                cameras.append(camera)
                db.session.add(camera)
            
            db.session.commit()
            print(f"تم إضافة {len(cameras)} كاميرا")
            
            # إضافة صلاحيات الوصول
            access_data = [
                {
                    'camera_id': cameras[0].id,
                    'user_id': 1,
                    'branch_id': branches[0].id,
                    'access_level': AccessLevel.FULL_CONTROL,
                    'can_view_live': True,
                    'can_view_recordings': True,
                    'can_control_camera': True,
                    'can_download_recordings': True,
                    'can_delete_recordings': True,
                    'granted_by': 1,
                    'expires_at': datetime.utcnow() + timedelta(days=365),
                    'notes': 'صلاحية كاملة للمدير'
                },
                {
                    'camera_id': cameras[1].id,
                    'user_id': 2,
                    'branch_id': branches[0].id,
                    'access_level': AccessLevel.VIEW_ONLY,
                    'can_view_live': True,
                    'can_view_recordings': True,
                    'can_control_camera': False,
                    'can_download_recordings': False,
                    'can_delete_recordings': False,
                    'access_start_time': datetime.strptime('08:00', '%H:%M').time(),
                    'access_end_time': datetime.strptime('18:00', '%H:%M').time(),
                    'allowed_days': ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
                    'granted_by': 1,
                    'expires_at': datetime.utcnow() + timedelta(days=90),
                    'notes': 'صلاحية مشاهدة فقط للموظف'
                }
            ]
            
            accesses = []
            for access_info in access_data:
                access = CameraAccess(**access_info)
                accesses.append(access)
                db.session.add(access)
            
            db.session.commit()
            print(f"تم إضافة {len(accesses)} صلاحية وصول")
            
            # إضافة تسجيلات تجريبية
            recordings_data = []
            for i, camera in enumerate(cameras[:3]):  # أول 3 كاميرات فقط
                for j in range(5):  # 5 تسجيلات لكل كاميرا
                    start_time = datetime.utcnow() - timedelta(days=j+1, hours=random.randint(1, 23))
                    duration = random.randint(300, 3600)  # 5 دقائق إلى ساعة
                    
                    recording_data = {
                        'camera_id': camera.id,
                        'filename': f'{camera.camera_id}_{start_time.strftime("%Y%m%d_%H%M%S")}.mp4',
                        'file_path': f'/recordings/{camera.branch_id}/{camera.camera_id}/',
                        'start_time': start_time,
                        'end_time': start_time + timedelta(seconds=duration),
                        'duration_seconds': duration,
                        'file_size': random.randint(100000000, 1000000000),  # 100MB to 1GB
                        'quality': camera.recording_quality,
                        'is_continuous': random.choice([True, False]),
                        'is_motion_triggered': random.choice([True, False]),
                        'is_alert_triggered': random.choice([True, False]),
                        'has_audio': camera.audio_recording,
                        'metadata': {
                            'codec': 'H.264',
                            'bitrate': f'{random.randint(1000, 8000)}kbps',
                            'resolution': '1920x1080' if camera.recording_quality == RecordingQuality.HIGH else '1280x720'
                        }
                    }
                    recordings_data.append(recording_data)
            
            recordings = []
            for recording_data in recordings_data:
                recording = Recording(**recording_data)
                recordings.append(recording)
                db.session.add(recording)
            
            db.session.commit()
            print(f"تم إضافة {len(recordings)} تسجيل")
            
            # إضافة تنبيهات تجريبية
            alerts_data = [
                {
                    'camera_id': cameras[0].id,
                    'alert_type': AlertType.MOTION_DETECTED,
                    'severity': AlertSeverity.MEDIUM,
                    'title': 'اكتشاف حركة في المدخل الرئيسي',
                    'description': 'تم اكتشاف حركة غير عادية في المدخل الرئيسي خارج ساعات العمل',
                    'detected_at': datetime.utcnow() - timedelta(hours=2),
                    'detection_data': {
                        'confidence': 0.85,
                        'object_type': 'person',
                        'bounding_box': [100, 150, 200, 300]
                    }
                },
                {
                    'camera_id': cameras[2].id,
                    'alert_type': AlertType.CAMERA_OFFLINE,
                    'severity': AlertSeverity.HIGH,
                    'title': 'انقطاع الاتصال مع كاميرا الممر الشرقي',
                    'description': 'فقد الاتصال مع كاميرا الممر الشرقي منذ 30 دقيقة',
                    'detected_at': datetime.utcnow() - timedelta(minutes=30),
                    'detection_data': {
                        'last_seen': (datetime.utcnow() - timedelta(minutes=30)).isoformat(),
                        'error_code': 'CONNECTION_TIMEOUT'
                    }
                },
                {
                    'camera_id': cameras[1].id,
                    'alert_type': AlertType.UNAUTHORIZED_ACCESS,
                    'severity': AlertSeverity.CRITICAL,
                    'title': 'محاولة وصول غير مصرح به',
                    'description': 'تم اكتشاف محاولة وصول غير مصرح به إلى القاعة الرئيسية',
                    'detected_at': datetime.utcnow() - timedelta(hours=1),
                    'is_acknowledged': True,
                    'acknowledged_by': 1,
                    'acknowledged_at': datetime.utcnow() - timedelta(minutes=45),
                    'resolution_notes': 'تم التحقق من الحادث وتبين أنه موظف نسي بطاقته',
                    'detection_data': {
                        'confidence': 0.92,
                        'access_method': 'door_forced'
                    }
                }
            ]
            
            alerts = []
            for alert_data in alerts_data:
                alert = SurveillanceAlert(**alert_data)
                alerts.append(alert)
                db.session.add(alert)
            
            db.session.commit()
            print(f"تم إضافة {len(alerts)} تنبيه")
            
            # إضافة جلسات مشاهدة مباشرة
            sessions_data = [
                {
                    'camera_id': cameras[0].id,
                    'user_id': 1,
                    'session_token': 'session_001_active',
                    'start_time': datetime.utcnow() - timedelta(minutes=15),
                    'client_ip': '192.168.1.50',
                    'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'is_active': True
                },
                {
                    'camera_id': cameras[1].id,
                    'user_id': 2,
                    'session_token': 'session_002_ended',
                    'start_time': datetime.utcnow() - timedelta(hours=2),
                    'end_time': datetime.utcnow() - timedelta(hours=1, minutes=30),
                    'duration_seconds': 1800,
                    'client_ip': '192.168.1.51',
                    'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'is_active': False,
                    'disconnect_reason': 'user_ended'
                }
            ]
            
            sessions = []
            for session_data in sessions_data:
                session = LiveViewSession(**session_data)
                sessions.append(session)
                db.session.add(session)
            
            db.session.commit()
            print(f"تم إضافة {len(sessions)} جلسة مشاهدة")
            
            # إضافة مجموعات كاميرات
            groups_data = [
                {
                    'name': 'كاميرات الأمان الرئيسية',
                    'description': 'مجموعة كاميرات المراقبة الأساسية للمركز',
                    'branch_id': branches[0].id,
                    'camera_ids': [cameras[0].id, cameras[1].id],
                    'is_active': True,
                    'created_by': 1
                },
                {
                    'name': 'كاميرات الممرات',
                    'description': 'كاميرات مراقبة الممرات والطرقات الداخلية',
                    'branch_id': branches[0].id,
                    'camera_ids': [cameras[2].id],
                    'is_active': True,
                    'created_by': 1
                }
            ]
            
            groups = []
            for group_data in groups_data:
                group = CameraGroup(**group_data)
                groups.append(group)
                db.session.add(group)
            
            db.session.commit()
            print(f"تم إضافة {len(groups)} مجموعة كاميرات")
            
            # إضافة تقرير تجريبي
            report_data = {
                'title': 'تقرير نشاط المراقبة الأسبوعي',
                'description': 'تقرير شامل عن نشاط نظام المراقبة خلال الأسبوع الماضي',
                'branch_id': branches[0].id,
                'camera_ids': [c.id for c in cameras[:3]],
                'start_date': datetime.utcnow() - timedelta(days=7),
                'end_date': datetime.utcnow(),
                'report_type': 'activity',
                'report_data': {
                    'total_recordings': len(recordings),
                    'total_alerts': len(alerts),
                    'total_sessions': len(sessions),
                    'cameras_status': {
                        'online': 2,
                        'offline': 1,
                        'maintenance': 1
                    }
                },
                'summary_statistics': {
                    'average_recording_duration': 1800,
                    'alerts_per_day': 0.5,
                    'most_active_camera': cameras[0].name
                },
                'created_by': 1
            }
            
            report = SurveillanceReport(**report_data)
            db.session.add(report)
            db.session.commit()
            print("تم إضافة تقرير تجريبي")
            
            print("✅ تم إضافة جميع البيانات التجريبية لنظام المراقبة بنجاح!")
            print(f"📊 الإحصائيات:")
            print(f"   - الكاميرات: {len(cameras)}")
            print(f"   - صلاحيات الوصول: {len(accesses)}")
            print(f"   - التسجيلات: {len(recordings)}")
            print(f"   - التنبيهات: {len(alerts)}")
            print(f"   - جلسات المشاهدة: {len(sessions)}")
            print(f"   - مجموعات الكاميرات: {len(groups)}")
            print(f"   - التقارير: 1")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ خطأ في إضافة البيانات التجريبية: {str(e)}")
            raise

if __name__ == '__main__':
    add_surveillance_sample_data()
