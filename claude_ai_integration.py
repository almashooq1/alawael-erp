"""
تكامل مع Claude AI لحفظ وتحليل تسجيلات الكاميرات
Claude AI Integration for Camera Recordings Storage and Analysis
"""

import anthropic
import base64
import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
import logging
import asyncio
import aiohttp
import hashlib
from pathlib import Path
import cv2
import numpy as np
from PIL import Image
import io

logger = logging.getLogger(__name__)

class ClaudeAIRecordingManager:
    """مدير تسجيلات الكاميرات مع Claude AI"""
    
    def __init__(self, api_key: str = None):
        """
        تهيئة مدير Claude AI
        
        Args:
            api_key: مفتاح API لـ Claude (يمكن تمريره من متغيرات البيئة)
        """
        self.api_key = api_key or os.getenv('CLAUDE_API_KEY')
        if not self.api_key:
            raise ValueError("Claude API key is required")
        
        self.client = anthropic.Anthropic(api_key=self.api_key)
        self.max_file_size = 20 * 1024 * 1024  # 20MB حد أقصى لحجم الملف
        self.supported_formats = ['.mp4', '.avi', '.mov', '.mkv', '.jpg', '.jpeg', '.png']
        
    def encode_video_to_base64(self, video_path: str) -> Optional[str]:
        """تحويل الفيديو إلى base64"""
        try:
            file_size = os.path.getsize(video_path)
            if file_size > self.max_file_size:
                logger.warning(f"حجم الملف كبير جداً: {file_size} bytes")
                return None
            
            with open(video_path, 'rb') as video_file:
                video_data = video_file.read()
                encoded_video = base64.b64encode(video_data).decode('utf-8')
                return encoded_video
                
        except Exception as e:
            logger.error(f"خطأ في تحويل الفيديو إلى base64: {str(e)}")
            return None
    
    def extract_frames_from_video(self, video_path: str, num_frames: int = 5) -> List[str]:
        """استخراج إطارات من الفيديو وتحويلها إلى base64"""
        try:
            cap = cv2.VideoCapture(video_path)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            
            if total_frames == 0:
                logger.error("لا يمكن قراءة الفيديو")
                return []
            
            # حساب الفواصل الزمنية لاستخراج الإطارات
            frame_indices = np.linspace(0, total_frames - 1, num_frames, dtype=int)
            
            frames_base64 = []
            for frame_idx in frame_indices:
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
                ret, frame = cap.read()
                
                if ret:
                    # تحويل الإطار إلى صورة PNG
                    _, buffer = cv2.imencode('.png', frame)
                    frame_base64 = base64.b64encode(buffer).decode('utf-8')
                    frames_base64.append(frame_base64)
            
            cap.release()
            return frames_base64
            
        except Exception as e:
            logger.error(f"خطأ في استخراج الإطارات: {str(e)}")
            return []
    
    def analyze_recording_with_claude(self, recording_data: Dict, frames_base64: List[str] = None) -> Dict:
        """تحليل التسجيل باستخدام Claude AI"""
        try:
            # إعداد الرسالة للتحليل
            analysis_prompt = f"""
            أنت محلل أمني متخصص في تحليل تسجيلات كاميرات المراقبة لمراكز التربية الخاصة.
            
            معلومات التسجيل:
            - اسم الكاميرا: {recording_data.get('camera_name', 'غير محدد')}
            - موقع الكاميرا: {recording_data.get('camera_location', 'غير محدد')}
            - تاريخ التسجيل: {recording_data.get('start_time', 'غير محدد')}
            - مدة التسجيل: {recording_data.get('duration', 'غير محدد')} ثانية
            - نوع التسجيل: {recording_data.get('recording_type', 'غير محدد')}
            - جودة التسجيل: {recording_data.get('quality', 'غير محدد')}
            
            المطلوب تحليله:
            1. تحديد الأنشطة المرئية في التسجيل
            2. عدد الأشخاص الظاهرين
            3. أي سلوكيات غير طبيعية أو مثيرة للقلق
            4. مستوى الأمان العام
            5. توصيات للتحسين
            6. ملخص عام للتسجيل
            
            يرجى تقديم التحليل باللغة العربية في شكل JSON منظم.
            """
            
            # إعداد المحتوى للرسالة
            message_content = [
                {
                    "type": "text",
                    "text": analysis_prompt
                }
            ]
            
            # إضافة الإطارات إذا كانت متوفرة
            if frames_base64:
                for i, frame_base64 in enumerate(frames_base64):
                    message_content.append({
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/png",
                            "data": frame_base64
                        }
                    })
            
            # إرسال الطلب إلى Claude
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=2000,
                temperature=0.1,
                messages=[
                    {
                        "role": "user",
                        "content": message_content
                    }
                ]
            )
            
            # تحليل الاستجابة
            analysis_text = response.content[0].text
            
            # محاولة تحليل JSON إذا كان متوفراً
            try:
                analysis_json = json.loads(analysis_text)
            except json.JSONDecodeError:
                # إذا لم يكن JSON صالحاً، إنشاء هيكل منظم
                analysis_json = {
                    "raw_analysis": analysis_text,
                    "timestamp": datetime.now().isoformat(),
                    "model_used": "claude-3-5-sonnet-20241022"
                }
            
            return {
                "success": True,
                "analysis": analysis_json,
                "tokens_used": response.usage.input_tokens + response.usage.output_tokens,
                "model": "claude-3-5-sonnet-20241022"
            }
            
        except Exception as e:
            logger.error(f"خطأ في تحليل التسجيل مع Claude: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    def generate_recording_summary(self, recording_data: Dict) -> Dict:
        """إنشاء ملخص للتسجيل"""
        try:
            summary_prompt = f"""
            قم بإنشاء ملخص مختصر وواضح لتسجيل كاميرا المراقبة التالي:
            
            معلومات التسجيل:
            - الكاميرا: {recording_data.get('camera_name', 'غير محدد')}
            - الموقع: {recording_data.get('camera_location', 'غير محدد')}
            - التاريخ: {recording_data.get('start_time', 'غير محدد')}
            - المدة: {recording_data.get('duration', 0)} ثانية
            - النوع: {recording_data.get('recording_type', 'غير محدد')}
            
            يرجى تقديم:
            1. عنوان مختصر للتسجيل
            2. وصف موجز للمحتوى
            3. مستوى الأهمية (منخفض/متوسط/عالي)
            4. كلمات مفتاحية للبحث
            
            الرد باللغة العربية في شكل JSON.
            """
            
            response = self.client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=500,
                temperature=0.3,
                messages=[
                    {
                        "role": "user",
                        "content": summary_prompt
                    }
                ]
            )
            
            summary_text = response.content[0].text
            
            try:
                summary_json = json.loads(summary_text)
            except json.JSONDecodeError:
                summary_json = {
                    "title": f"تسجيل {recording_data.get('camera_name', 'كاميرا')} - {recording_data.get('start_time', 'غير محدد')}",
                    "description": summary_text,
                    "importance": "متوسط",
                    "keywords": ["مراقبة", "أمان"]
                }
            
            return {
                "success": True,
                "summary": summary_json,
                "tokens_used": response.usage.input_tokens + response.usage.output_tokens
            }
            
        except Exception as e:
            logger.error(f"خطأ في إنشاء ملخص التسجيل: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def detect_incidents_in_recording(self, frames_base64: List[str], recording_data: Dict) -> Dict:
        """كشف الحوادث في التسجيل"""
        try:
            incident_prompt = f"""
            أنت نظام كشف الحوادث الأمنية المتخصص في مراكز التربية الخاصة.
            
            قم بتحليل الإطارات التالية من تسجيل كاميرا المراقبة للبحث عن:
            
            1. حوادث أمنية:
               - دخول غير مصرح به
               - سلوك عدواني أو عنيف
               - تخريب أو إتلاف ممتلكات
               - حوادث سقوط أو إصابات
            
            2. مخاطر السلامة:
               - تجمعات غير آمنة
               - استخدام غير صحيح للمعدات
               - مخاطر الحريق أو الكهرباء
               - عوائق في مخارج الطوارئ
            
            3. سلوكيات مثيرة للقلق:
               - طلاب في ضائقة
               - سلوك غير طبيعي من الموظفين
               - مواقف تتطلب تدخل فوري
            
            معلومات السياق:
            - الموقع: {recording_data.get('camera_location', 'غير محدد')}
            - الوقت: {recording_data.get('start_time', 'غير محدد')}
            - نوع التسجيل: {recording_data.get('recording_type', 'غير محدد')}
            
            يرجى الرد بـ JSON يحتوي على:
            - incidents_detected: قائمة بالحوادث المكتشفة
            - severity_level: مستوى الخطورة (منخفض/متوسط/عالي/حرج)
            - immediate_action_required: هل يتطلب تدخل فوري؟
            - recommendations: توصيات للتعامل مع الموقف
            """
            
            message_content = [
                {
                    "type": "text",
                    "text": incident_prompt
                }
            ]
            
            # إضافة الإطارات
            for frame_base64 in frames_base64:
                message_content.append({
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/png",
                        "data": frame_base64
                    }
                })
            
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1500,
                temperature=0.1,
                messages=[
                    {
                        "role": "user",
                        "content": message_content
                    }
                ]
            )
            
            incident_analysis = response.content[0].text
            
            try:
                incident_json = json.loads(incident_analysis)
            except json.JSONDecodeError:
                incident_json = {
                    "incidents_detected": [],
                    "severity_level": "منخفض",
                    "immediate_action_required": False,
                    "recommendations": ["مراجعة التسجيل يدوياً"],
                    "raw_analysis": incident_analysis
                }
            
            return {
                "success": True,
                "incident_analysis": incident_json,
                "tokens_used": response.usage.input_tokens + response.usage.output_tokens,
                "analysis_timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"خطأ في كشف الحوادث: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def generate_security_report(self, recordings_analysis: List[Dict], period_start: datetime, period_end: datetime) -> Dict:
        """إنشاء تقرير أمني شامل"""
        try:
            # تجميع البيانات
            total_recordings = len(recordings_analysis)
            incidents_found = sum(1 for analysis in recordings_analysis 
                                if analysis.get('incident_analysis', {}).get('incidents_detected'))
            
            high_severity_incidents = sum(1 for analysis in recordings_analysis 
                                        if analysis.get('incident_analysis', {}).get('severity_level') in ['عالي', 'حرج'])
            
            report_prompt = f"""
            قم بإنشاء تقرير أمني شامل لمركز التربية الخاصة للفترة من {period_start.strftime('%Y-%m-%d')} إلى {period_end.strftime('%Y-%m-%d')}.
            
            إحصائيات التحليل:
            - إجمالي التسجيلات المحللة: {total_recordings}
            - عدد الحوادث المكتشفة: {incidents_found}
            - الحوادث عالية الخطورة: {high_severity_incidents}
            
            بيانات التحليلات:
            {json.dumps(recordings_analysis, ensure_ascii=False, indent=2)}
            
            يرجى إنشاء تقرير يتضمن:
            1. ملخص تنفيذي
            2. إحصائيات الأمان
            3. الحوادث المهمة
            4. التوصيات الأمنية
            5. خطة التحسين
            6. مؤشرات الأداء الأمني
            
            الرد باللغة العربية في شكل JSON منظم.
            """
            
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=3000,
                temperature=0.2,
                messages=[
                    {
                        "role": "user",
                        "content": report_prompt
                    }
                ]
            )
            
            report_text = response.content[0].text
            
            try:
                report_json = json.loads(report_text)
            except json.JSONDecodeError:
                report_json = {
                    "executive_summary": report_text,
                    "period": f"{period_start.strftime('%Y-%m-%d')} - {period_end.strftime('%Y-%m-%d')}",
                    "total_recordings": total_recordings,
                    "incidents_detected": incidents_found,
                    "high_severity_incidents": high_severity_incidents
                }
            
            return {
                "success": True,
                "report": report_json,
                "tokens_used": response.usage.input_tokens + response.usage.output_tokens,
                "generated_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"خطأ في إنشاء التقرير الأمني: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def process_recording_batch(self, recordings_data: List[Dict]) -> List[Dict]:
        """معالجة مجموعة من التسجيلات"""
        results = []
        
        for recording in recordings_data:
            try:
                logger.info(f"معالجة التسجيل: {recording.get('filename', 'غير محدد')}")
                
                result = {
                    "recording_id": recording.get('id'),
                    "filename": recording.get('filename'),
                    "processed_at": datetime.now().isoformat()
                }
                
                # استخراج الإطارات إذا كان الملف موجوداً
                video_path = recording.get('file_path')
                if video_path and os.path.exists(video_path):
                    frames = self.extract_frames_from_video(video_path)
                    if frames:
                        # تحليل التسجيل
                        analysis = self.analyze_recording_with_claude(recording, frames)
                        result['analysis'] = analysis
                        
                        # كشف الحوادث
                        incidents = self.detect_incidents_in_recording(frames, recording)
                        result['incidents'] = incidents
                        
                        # إنشاء ملخص
                        summary = self.generate_recording_summary(recording)
                        result['summary'] = summary
                    else:
                        result['error'] = 'فشل في استخراج الإطارات'
                else:
                    result['error'] = 'ملف التسجيل غير موجود'
                
                results.append(result)
                
            except Exception as e:
                logger.error(f"خطأ في معالجة التسجيل {recording.get('filename', 'غير محدد')}: {str(e)}")
                results.append({
                    "recording_id": recording.get('id'),
                    "filename": recording.get('filename'),
                    "error": str(e),
                    "processed_at": datetime.now().isoformat()
                })
        
        return results

# إنشاء مثيل عام لمدير Claude AI
claude_recording_manager = None

def initialize_claude_manager(api_key: str = None) -> ClaudeAIRecordingManager:
    """تهيئة مدير Claude AI"""
    global claude_recording_manager
    try:
        claude_recording_manager = ClaudeAIRecordingManager(api_key)
        logger.info("تم تهيئة مدير Claude AI بنجاح")
        return claude_recording_manager
    except Exception as e:
        logger.error(f"خطأ في تهيئة مدير Claude AI: {str(e)}")
        raise

def get_claude_manager() -> Optional[ClaudeAIRecordingManager]:
    """الحصول على مدير Claude AI"""
    return claude_recording_manager
