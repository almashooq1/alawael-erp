"""
خدمات المراقبة المحسنة مع دعم Hikvision و Claude AI
Enhanced Surveillance Services with Hikvision and Claude AI Support
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import logging
import json
import os
from pathlib import Path
import asyncio
from threading import Thread
import uuid

from hikvision_integration import hikvision_manager, HikvisionAPI
from claude_ai_integration import get_claude_manager, initialize_claude_manager
from surveillance_system_models import (
    Camera, Recording, SurveillanceAlert, CameraStatus, 
    AlertType, AlertSeverity, RecordingQuality
)
from database import db
from models import User

logger = logging.getLogger(__name__)

class EnhancedRecordingService:
    """خدمة التسجيلات المحسنة مع Claude AI"""
    
    def __init__(self):
        self.claude_manager = get_claude_manager()
        self.processing_queue = []
        self.auto_analysis_enabled = True
    
    def start_hikvision_recording(self, camera_id: int, duration_minutes: int = 60) -> Dict:
        """بدء تسجيل Hikvision مع حفظ على Claude AI"""
        try:
            camera = Camera.query.get(camera_id)
            if not camera:
                return {'success': False, 'message': 'الكاميرا غير موجودة'}
            
            # الحصول على Hikvision API
            hikvision_api = hikvision_manager.get_camera(str(camera_id))
            if not hikvision_api:
                return {'success': False, 'message': 'كاميرا غير مدعومة من Hikvision'}
            
            # بدء التسجيل في الكاميرا
            recording_started = hikvision_api.start_recording()
            if not recording_started:
                return {'success': False, 'message': 'فشل في بدء التسجيل'}
            
            # إنشاء سجل التسجيل في قاعدة البيانات
            recording = Recording(
                camera_id=camera_id,
                filename=f"hikvision_{camera_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.mp4",
                start_time=datetime.utcnow(),
                end_time=datetime.utcnow() + timedelta(minutes=duration_minutes),
                file_size=0,  # سيتم تحديثه لاحقاً
                quality=RecordingQuality.HIGH,
                recording_type='manual',
                metadata=json.dumps({
                    'hikvision_recording': True,
                    'camera_model': camera.model,
                    'rtsp_url': hikvision_api.get_rtsp_url(),
                    'claude_analysis_pending': True
                })
            )
            
            db.session.add(recording)
            db.session.commit()
            
            # جدولة إيقاف التسجيل
            self._schedule_recording_stop(camera_id, recording.id, duration_minutes)
            
            return {
                'success': True,
                'recording_id': recording.id,
                'message': 'تم بدء التسجيل بنجاح',
                'estimated_end_time': recording.end_time.isoformat()
            }
            
        except Exception as e:
            logger.error(f"خطأ في بدء تسجيل Hikvision: {str(e)}")
            return {'success': False, 'message': f'خطأ في بدء التسجيل: {str(e)}'}
    
    def stop_hikvision_recording(self, camera_id: int, recording_id: int) -> Dict:
        """إيقاف تسجيل Hikvision وبدء معالجة Claude AI"""
        try:
            camera = Camera.query.get(camera_id)
            recording = Recording.query.get(recording_id)
            
            if not camera or not recording:
                return {'success': False, 'message': 'الكاميرا أو التسجيل غير موجود'}
            
            # إيقاف التسجيل في الكاميرا
            hikvision_api = hikvision_manager.get_camera(str(camera_id))
            if hikvision_api:
                hikvision_api.stop_recording()
            
            # تحديث سجل التسجيل
            recording.end_time = datetime.utcnow()
            recording.status = 'completed'
            
            # الحصول على قائمة التسجيلات من الكاميرا
            recordings_list = hikvision_api.get_recordings_list(
                recording.start_time, 
                recording.end_time
            ) if hikvision_api else []
            
            if recordings_list:
                # تحميل أحدث تسجيل
                latest_recording = recordings_list[-1]
                download_path = f"uploads/recordings/{recording.filename}"
                
                # إنشاء المجلد إذا لم يكن موجوداً
                os.makedirs(os.path.dirname(download_path), exist_ok=True)
                
                # تحميل التسجيل
                if hikvision_api.download_recording(latest_recording['playback_uri'], download_path):
                    recording.file_path = download_path
                    recording.file_size = os.path.getsize(download_path) if os.path.exists(download_path) else 0
                    
                    # إضافة إلى قائمة المعالجة مع Claude AI
                    if self.auto_analysis_enabled and self.claude_manager:
                        self._queue_for_claude_analysis(recording.id)
            
            db.session.commit()
            
            return {
                'success': True,
                'message': 'تم إيقاف التسجيل بنجاح',
                'file_path': recording.file_path,
                'file_size': recording.file_size,
                'claude_analysis_queued': self.auto_analysis_enabled and self.claude_manager is not None
            }
            
        except Exception as e:
            logger.error(f"خطأ في إيقاف التسجيل: {str(e)}")
            return {'success': False, 'message': f'خطأ في إيقاف التسجيل: {str(e)}'}
    
    def analyze_recording_with_claude(self, recording_id: int) -> Dict:
        """تحليل التسجيل باستخدام Claude AI"""
        try:
            if not self.claude_manager:
                return {'success': False, 'message': 'Claude AI غير مهيأ'}
            
            recording = Recording.query.get(recording_id)
            if not recording:
                return {'success': False, 'message': 'التسجيل غير موجود'}
            
            if not recording.file_path or not os.path.exists(recording.file_path):
                return {'success': False, 'message': 'ملف التسجيل غير موجود'}
            
            # إعداد بيانات التسجيل للتحليل
            camera = Camera.query.get(recording.camera_id)
            recording_data = {
                'id': recording.id,
                'filename': recording.filename,
                'file_path': recording.file_path,
                'camera_name': camera.name if camera else 'غير محدد',
                'camera_location': camera.location if camera else 'غير محدد',
                'start_time': recording.start_time.isoformat(),
                'duration': (recording.end_time - recording.start_time).total_seconds() if recording.end_time else 0,
                'recording_type': recording.recording_type,
                'quality': recording.quality.value if recording.quality else 'غير محدد'
            }
            
            # استخراج الإطارات وتحليلها
            frames = self.claude_manager.extract_frames_from_video(recording.file_path)
            if not frames:
                return {'success': False, 'message': 'فشل في استخراج الإطارات من الفيديو'}
            
            # تحليل شامل
            analysis_result = self.claude_manager.analyze_recording_with_claude(recording_data, frames)
            
            # كشف الحوادث
            incidents_result = self.claude_manager.detect_incidents_in_recording(frames, recording_data)
            
            # إنشاء ملخص
            summary_result = self.claude_manager.generate_recording_summary(recording_data)
            
            # حفظ النتائج في قاعدة البيانات
            analysis_data = {
                'claude_analysis': analysis_result,
                'incident_detection': incidents_result,
                'summary': summary_result,
                'analysis_timestamp': datetime.now().isoformat(),
                'frames_analyzed': len(frames)
            }
            
            # تحديث metadata التسجيل
            current_metadata = json.loads(recording.metadata) if recording.metadata else {}
            current_metadata.update(analysis_data)
            recording.metadata = json.dumps(current_metadata, ensure_ascii=False)
            
            # إنشاء تنبيه إذا تم اكتشاف حوادث عالية الخطورة
            if incidents_result.get('success') and incidents_result.get('incident_analysis'):
                severity = incidents_result['incident_analysis'].get('severity_level', 'منخفض')
                if severity in ['عالي', 'حرج']:
                    self._create_incident_alert(recording, incidents_result['incident_analysis'])
            
            db.session.commit()
            
            return {
                'success': True,
                'message': 'تم تحليل التسجيل بنجاح',
                'analysis': analysis_data,
                'tokens_used': (
                    analysis_result.get('tokens_used', 0) + 
                    incidents_result.get('tokens_used', 0) + 
                    summary_result.get('tokens_used', 0)
                )
            }
            
        except Exception as e:
            logger.error(f"خطأ في تحليل التسجيل مع Claude: {str(e)}")
            return {'success': False, 'message': f'خطأ في التحليل: {str(e)}'}
    
    def get_recordings_with_analysis(self, camera_id: int = None, days_back: int = 7) -> List[Dict]:
        """الحصول على التسجيلات مع التحليلات"""
        try:
            query = Recording.query
            
            if camera_id:
                query = query.filter_by(camera_id=camera_id)
            
            # الحصول على التسجيلات من آخر أسبوع افتراضياً
            start_date = datetime.utcnow() - timedelta(days=days_back)
            query = query.filter(Recording.start_time >= start_date)
            
            recordings = query.order_by(Recording.start_time.desc()).all()
            
            results = []
            for recording in recordings:
                camera = Camera.query.get(recording.camera_id)
                metadata = json.loads(recording.metadata) if recording.metadata else {}
                
                result = {
                    'id': recording.id,
                    'filename': recording.filename,
                    'camera_name': camera.name if camera else 'غير محدد',
                    'camera_location': camera.location if camera else 'غير محدد',
                    'start_time': recording.start_time.isoformat(),
                    'end_time': recording.end_time.isoformat() if recording.end_time else None,
                    'duration_seconds': (recording.end_time - recording.start_time).total_seconds() if recording.end_time else 0,
                    'file_size': recording.file_size,
                    'quality': recording.quality.value if recording.quality else 'غير محدد',
                    'recording_type': recording.recording_type,
                    'has_claude_analysis': 'claude_analysis' in metadata,
                    'has_incident_detection': 'incident_detection' in metadata,
                    'analysis_summary': metadata.get('summary', {}).get('summary', {}) if 'summary' in metadata else None,
                    'incident_severity': None,
                    'incidents_detected': []
                }
                
                # إضافة معلومات الحوادث إذا كانت متوفرة
                if 'incident_detection' in metadata:
                    incident_data = metadata['incident_detection']
                    if incident_data.get('success') and 'incident_analysis' in incident_data:
                        incident_analysis = incident_data['incident_analysis']
                        result['incident_severity'] = incident_analysis.get('severity_level', 'منخفض')
                        result['incidents_detected'] = incident_analysis.get('incidents_detected', [])
                
                results.append(result)
            
            return results
            
        except Exception as e:
            logger.error(f"خطأ في الحصول على التسجيلات مع التحليلات: {str(e)}")
            return []
    
    def generate_security_report_for_period(self, start_date: datetime, end_date: datetime, branch_id: int = None) -> Dict:
        """إنشاء تقرير أمني للفترة المحددة"""
        try:
            if not self.claude_manager:
                return {'success': False, 'message': 'Claude AI غير مهيأ'}
            
            # الحصول على التسجيلات للفترة المحددة
            query = Recording.query.filter(
                Recording.start_time >= start_date,
                Recording.start_time <= end_date
            )
            
            if branch_id:
                # تصفية حسب الفرع
                camera_ids = [c.id for c in Camera.query.filter_by(branch_id=branch_id).all()]
                query = query.filter(Recording.camera_id.in_(camera_ids))
            
            recordings = query.all()
            
            # تحضير بيانات التحليل
            recordings_analysis = []
            for recording in recordings:
                metadata = json.loads(recording.metadata) if recording.metadata else {}
                if 'claude_analysis' in metadata or 'incident_detection' in metadata:
                    recordings_analysis.append({
                        'recording_id': recording.id,
                        'camera_id': recording.camera_id,
                        'start_time': recording.start_time.isoformat(),
                        'claude_analysis': metadata.get('claude_analysis'),
                        'incident_analysis': metadata.get('incident_detection', {}).get('incident_analysis'),
                        'summary': metadata.get('summary')
                    })
            
            # إنشاء التقرير باستخدام Claude AI
            report_result = self.claude_manager.generate_security_report(
                recordings_analysis, start_date, end_date
            )
            
            if report_result.get('success'):
                # حفظ التقرير في قاعدة البيانات
                from surveillance_system_models import SurveillanceReport
                
                report = SurveillanceReport(
                    title=f"تقرير أمني - {start_date.strftime('%Y-%m-%d')} إلى {end_date.strftime('%Y-%m-%d')}",
                    report_type='security_analysis',
                    start_date=start_date,
                    end_date=end_date,
                    branch_id=branch_id,
                    content=json.dumps(report_result['report'], ensure_ascii=False),
                    metadata=json.dumps({
                        'total_recordings_analyzed': len(recordings_analysis),
                        'claude_tokens_used': report_result.get('tokens_used', 0),
                        'generated_by': 'claude_ai'
                    }, ensure_ascii=False)
                )
                
                db.session.add(report)
                db.session.commit()
                
                return {
                    'success': True,
                    'report_id': report.id,
                    'report': report_result['report'],
                    'tokens_used': report_result.get('tokens_used', 0),
                    'recordings_analyzed': len(recordings_analysis)
                }
            else:
                return report_result
                
        except Exception as e:
            logger.error(f"خطأ في إنشاء التقرير الأمني: {str(e)}")
            return {'success': False, 'message': f'خطأ في إنشاء التقرير: {str(e)}'}
    
    def _schedule_recording_stop(self, camera_id: int, recording_id: int, duration_minutes: int):
        """جدولة إيقاف التسجيل"""
        def stop_after_duration():
            import time
            time.sleep(duration_minutes * 60)  # تحويل إلى ثواني
            self.stop_hikvision_recording(camera_id, recording_id)
        
        thread = Thread(target=stop_after_duration)
        thread.daemon = True
        thread.start()
    
    def _queue_for_claude_analysis(self, recording_id: int):
        """إضافة التسجيل إلى قائمة انتظار تحليل Claude AI"""
        self.processing_queue.append({
            'recording_id': recording_id,
            'queued_at': datetime.now(),
            'status': 'pending'
        })
        
        # بدء معالجة التحليل في خيط منفصل
        thread = Thread(target=self._process_claude_queue)
        thread.daemon = True
        thread.start()
    
    def _process_claude_queue(self):
        """معالجة قائمة انتظار تحليل Claude AI"""
        while self.processing_queue:
            item = self.processing_queue.pop(0)
            try:
                self.analyze_recording_with_claude(item['recording_id'])
                logger.info(f"تم تحليل التسجيل {item['recording_id']} بنجاح")
            except Exception as e:
                logger.error(f"خطأ في تحليل التسجيل {item['recording_id']}: {str(e)}")
    
    def _create_incident_alert(self, recording: Recording, incident_analysis: Dict):
        """إنشاء تنبيه للحوادث المكتشفة"""
        try:
            camera = Camera.query.get(recording.camera_id)
            
            # تحديد نوع وشدة التنبيه
            severity_map = {
                'منخفض': AlertSeverity.LOW,
                'متوسط': AlertSeverity.MEDIUM,
                'عالي': AlertSeverity.HIGH,
                'حرج': AlertSeverity.CRITICAL
            }
            
            severity = severity_map.get(incident_analysis.get('severity_level', 'منخفض'), AlertSeverity.MEDIUM)
            
            alert = SurveillanceAlert(
                camera_id=recording.camera_id,
                alert_type=AlertType.SECURITY_INCIDENT,
                severity=severity,
                title=f"حادث أمني مكتشف - {camera.name if camera else 'كاميرا غير محددة'}",
                description=f"تم اكتشاف حادث أمني في التسجيل: {', '.join(incident_analysis.get('incidents_detected', []))}",
                metadata=json.dumps({
                    'recording_id': recording.id,
                    'incident_analysis': incident_analysis,
                    'detection_method': 'claude_ai'
                }, ensure_ascii=False),
                acknowledged=False
            )
            
            db.session.add(alert)
            db.session.commit()
            
            logger.info(f"تم إنشاء تنبيه أمني للتسجيل {recording.id}")
            
        except Exception as e:
            logger.error(f"خطأ في إنشاء تنبيه الحادث: {str(e)}")

# إنشاء مثيل عام للخدمة المحسنة
enhanced_recording_service = EnhancedRecordingService()
