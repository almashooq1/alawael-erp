#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import logging
from datetime import datetime
from typing import Dict, List, Optional
from database import db
from comprehensive_rehabilitation_models import *

class VoiceCommand:
    """نموذج أوامر الصوت"""
    
    def __init__(self, command_id: str, command_text: str, action: str, parameters: Dict = None):
        self.command_id = command_id
        self.command_text = command_text
        self.action = action
        self.parameters = parameters or {}
        self.timestamp = datetime.utcnow()

class VoiceRecognitionSystem:
    """نظام التعرف على الصوت والأوامر الصوتية"""
    
    def __init__(self):
        self.supported_languages = ['ar-SA', 'en-US']
        self.current_language = 'ar-SA'
        self.commands_registry = self._initialize_commands()
        self.confidence_threshold = 0.8
        
    def _initialize_commands(self) -> Dict[str, Dict]:
        """تهيئة قاموس الأوامر المدعومة"""
        return {
            # أوامر المستفيدين
            'add_beneficiary': {
                'patterns': [
                    'أضف مستفيد جديد',
                    'إنشاء مستفيد',
                    'تسجيل مستفيد جديد',
                    'add new beneficiary',
                    'create beneficiary'
                ],
                'action': 'create_beneficiary',
                'required_params': ['name', 'disability_type']
            },
            'search_beneficiary': {
                'patterns': [
                    'ابحث عن مستفيد',
                    'العثور على مستفيد',
                    'search for beneficiary',
                    'find beneficiary'
                ],
                'action': 'search_beneficiary',
                'required_params': ['search_term']
            },
            'show_beneficiary_details': {
                'patterns': [
                    'اعرض تفاصيل المستفيد',
                    'معلومات المستفيد',
                    'show beneficiary details',
                    'beneficiary information'
                ],
                'action': 'show_beneficiary_details',
                'required_params': ['beneficiary_id']
            },
            
            # أوامر التقييمات
            'create_assessment': {
                'patterns': [
                    'أنشئ تقييم جديد',
                    'إضافة تقييم',
                    'create new assessment',
                    'add assessment'
                ],
                'action': 'create_assessment',
                'required_params': ['beneficiary_id']
            },
            'run_ai_analysis': {
                'patterns': [
                    'تحليل بالذكاء الاصطناعي',
                    'تشغيل التحليل الذكي',
                    'run AI analysis',
                    'analyze with AI'
                ],
                'action': 'run_ai_analysis',
                'required_params': ['assessment_id']
            },
            
            # أوامر الجلسات
            'schedule_session': {
                'patterns': [
                    'جدول جلسة جديدة',
                    'حجز جلسة',
                    'schedule new session',
                    'book session'
                ],
                'action': 'schedule_session',
                'required_params': ['beneficiary_id', 'session_type', 'date']
            },
            'cancel_session': {
                'patterns': [
                    'إلغاء الجلسة',
                    'cancel session'
                ],
                'action': 'cancel_session',
                'required_params': ['session_id']
            },
            
            # أوامر التقارير
            'generate_report': {
                'patterns': [
                    'أنشئ تقرير',
                    'إنتاج تقرير',
                    'generate report',
                    'create report'
                ],
                'action': 'generate_report',
                'required_params': ['report_type', 'beneficiary_id']
            },
            'export_data': {
                'patterns': [
                    'تصدير البيانات',
                    'export data'
                ],
                'action': 'export_data',
                'required_params': ['data_type']
            },
            
            # أوامر التنقل
            'navigate_to': {
                'patterns': [
                    'انتقل إلى',
                    'اذهب إلى',
                    'navigate to',
                    'go to'
                ],
                'action': 'navigate',
                'required_params': ['destination']
            },
            
            # أوامر المساعدة
            'help': {
                'patterns': [
                    'مساعدة',
                    'ماذا يمكنني أن أفعل',
                    'help',
                    'what can I do'
                ],
                'action': 'show_help',
                'required_params': []
            }
        }
    
    def process_voice_command(self, audio_text: str, user_id: str = None) -> Dict:
        """معالجة الأوامر الصوتية"""
        try:
            # تنظيف النص
            cleaned_text = self._clean_text(audio_text)
            
            # التعرف على الأمر
            recognized_command = self._recognize_command(cleaned_text)
            
            if not recognized_command:
                return {
                    'success': False,
                    'message': 'لم أتمكن من فهم الأمر. يرجى المحاولة مرة أخرى.',
                    'suggestions': self._get_command_suggestions()
                }
            
            # استخراج المعاملات
            parameters = self._extract_parameters(cleaned_text, recognized_command)
            
            # التحقق من المعاملات المطلوبة
            missing_params = self._check_required_parameters(recognized_command, parameters)
            
            if missing_params:
                return {
                    'success': False,
                    'message': f'معاملات مفقودة: {", ".join(missing_params)}',
                    'missing_parameters': missing_params,
                    'command': recognized_command['action']
                }
            
            # تنفيذ الأمر
            result = self._execute_command(recognized_command, parameters, user_id)
            
            # تسجيل الأمر
            self._log_voice_command(audio_text, recognized_command, parameters, user_id, result)
            
            return result
            
        except Exception as e:
            logging.error(f"خطأ في معالجة الأمر الصوتي: {str(e)}")
            return {
                'success': False,
                'message': 'حدث خطأ في معالجة الأمر الصوتي',
                'error': str(e)
            }
    
    def _clean_text(self, text: str) -> str:
        """تنظيف النص المدخل"""
        # إزالة علامات الترقيم والمسافات الزائدة
        import re
        cleaned = re.sub(r'[^\w\s\u0600-\u06FF]', '', text)
        cleaned = ' '.join(cleaned.split())
        return cleaned.lower()
    
    def _recognize_command(self, text: str) -> Optional[Dict]:
        """التعرف على الأمر من النص"""
        best_match = None
        best_score = 0
        
        for command_id, command_data in self.commands_registry.items():
            for pattern in command_data['patterns']:
                similarity = self._calculate_similarity(text, pattern.lower())
                if similarity > best_score and similarity >= self.confidence_threshold:
                    best_score = similarity
                    best_match = {
                        'command_id': command_id,
                        'action': command_data['action'],
                        'required_params': command_data['required_params'],
                        'confidence': similarity
                    }
        
        return best_match
    
    def _calculate_similarity(self, text1: str, text2: str) -> float:
        """حساب التشابه بين النصوص"""
        # خوارزمية بسيطة للتشابه - يمكن تحسينها
        words1 = set(text1.split())
        words2 = set(text2.split())
        
        if not words1 or not words2:
            return 0.0
        
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        
        return len(intersection) / len(union)
    
    def _extract_parameters(self, text: str, command: Dict) -> Dict:
        """استخراج المعاملات من النص"""
        parameters = {}
        
        # استخراج الأرقام
        import re
        numbers = re.findall(r'\d+', text)
        if numbers:
            parameters['id'] = numbers[0]
            parameters['beneficiary_id'] = numbers[0]
            parameters['session_id'] = numbers[0]
            parameters['assessment_id'] = numbers[0]
        
        # استخراج أنواع الإعاقة
        disability_keywords = {
            'حركية': 'physical',
            'ذهنية': 'intellectual',
            'فكرية': 'intellectual',
            'توحد': 'autism_spectrum',
            'نطق': 'speech_language',
            'لغة': 'speech_language',
            'حسية': 'sensory',
            'سلوكية': 'behavioral'
        }
        
        for keyword, disability_type in disability_keywords.items():
            if keyword in text:
                parameters['disability_type'] = disability_type
                break
        
        # استخراج أنواع الجلسات
        session_keywords = {
            'طبيعي': 'physical_therapy',
            'وظيفي': 'occupational_therapy',
            'نطق': 'speech_therapy',
            'سلوكي': 'behavioral_therapy'
        }
        
        for keyword, session_type in session_keywords.items():
            if keyword in text:
                parameters['session_type'] = session_type
                break
        
        # استخراج أنواع التقارير
        report_keywords = {
            'تقدم': 'progress_report',
            'شامل': 'comprehensive_report',
            'تقييم': 'assessment_report'
        }
        
        for keyword, report_type in report_keywords.items():
            if keyword in text:
                parameters['report_type'] = report_type
                break
        
        # استخراج مصطلحات البحث
        search_indicators = ['عن', 'اسم', 'يسمى', 'المسمى']
        for indicator in search_indicators:
            if indicator in text:
                words = text.split()
                try:
                    index = words.index(indicator)
                    if index + 1 < len(words):
                        parameters['search_term'] = words[index + 1]
                except ValueError:
                    continue
        
        return parameters
    
    def _check_required_parameters(self, command: Dict, parameters: Dict) -> List[str]:
        """التحقق من المعاملات المطلوبة"""
        missing = []
        for param in command['required_params']:
            if param not in parameters:
                missing.append(param)
        return missing
    
    def _execute_command(self, command: Dict, parameters: Dict, user_id: str) -> Dict:
        """تنفيذ الأمر"""
        action = command['action']
        
        try:
            if action == 'create_beneficiary':
                return self._create_beneficiary_voice(parameters)
            elif action == 'search_beneficiary':
                return self._search_beneficiary_voice(parameters)
            elif action == 'show_beneficiary_details':
                return self._show_beneficiary_details_voice(parameters)
            elif action == 'create_assessment':
                return self._create_assessment_voice(parameters)
            elif action == 'run_ai_analysis':
                return self._run_ai_analysis_voice(parameters)
            elif action == 'schedule_session':
                return self._schedule_session_voice(parameters)
            elif action == 'cancel_session':
                return self._cancel_session_voice(parameters)
            elif action == 'generate_report':
                return self._generate_report_voice(parameters)
            elif action == 'navigate':
                return self._navigate_voice(parameters)
            elif action == 'show_help':
                return self._show_help_voice()
            else:
                return {
                    'success': False,
                    'message': f'الأمر {action} غير مدعوم حالياً'
                }
                
        except Exception as e:
            return {
                'success': False,
                'message': f'خطأ في تنفيذ الأمر: {str(e)}'
            }
    
    def _create_beneficiary_voice(self, parameters: Dict) -> Dict:
        """إنشاء مستفيد جديد عبر الصوت"""
        return {
            'success': True,
            'message': 'سيتم فتح نموذج إضافة مستفيد جديد',
            'action': 'open_modal',
            'modal': 'addBeneficiaryModal',
            'prefill_data': parameters
        }
    
    def _search_beneficiary_voice(self, parameters: Dict) -> Dict:
        """البحث عن مستفيد عبر الصوت"""
        search_term = parameters.get('search_term', '')
        return {
            'success': True,
            'message': f'البحث عن: {search_term}',
            'action': 'search',
            'search_term': search_term
        }
    
    def _show_beneficiary_details_voice(self, parameters: Dict) -> Dict:
        """عرض تفاصيل المستفيد عبر الصوت"""
        beneficiary_id = parameters.get('beneficiary_id')
        if not beneficiary_id:
            return {
                'success': False,
                'message': 'يرجى تحديد رقم المستفيد'
            }
        
        return {
            'success': True,
            'message': f'عرض تفاصيل المستفيد رقم {beneficiary_id}',
            'action': 'show_details',
            'beneficiary_id': beneficiary_id
        }
    
    def _create_assessment_voice(self, parameters: Dict) -> Dict:
        """إنشاء تقييم جديد عبر الصوت"""
        return {
            'success': True,
            'message': 'سيتم فتح نموذج إنشاء تقييم جديد',
            'action': 'open_modal',
            'modal': 'createAssessmentModal',
            'prefill_data': parameters
        }
    
    def _run_ai_analysis_voice(self, parameters: Dict) -> Dict:
        """تشغيل التحليل بالذكاء الاصطناعي عبر الصوت"""
        assessment_id = parameters.get('assessment_id')
        return {
            'success': True,
            'message': 'تشغيل التحليل بالذكاء الاصطناعي...',
            'action': 'run_ai_analysis',
            'assessment_id': assessment_id
        }
    
    def _schedule_session_voice(self, parameters: Dict) -> Dict:
        """جدولة جلسة عبر الصوت"""
        return {
            'success': True,
            'message': 'سيتم فتح نموذج جدولة جلسة جديدة',
            'action': 'open_modal',
            'modal': 'scheduleSessionModal',
            'prefill_data': parameters
        }
    
    def _cancel_session_voice(self, parameters: Dict) -> Dict:
        """إلغاء جلسة عبر الصوت"""
        session_id = parameters.get('session_id')
        return {
            'success': True,
            'message': f'إلغاء الجلسة رقم {session_id}',
            'action': 'cancel_session',
            'session_id': session_id
        }
    
    def _generate_report_voice(self, parameters: Dict) -> Dict:
        """إنتاج تقرير عبر الصوت"""
        return {
            'success': True,
            'message': 'إنتاج التقرير...',
            'action': 'generate_report',
            'parameters': parameters
        }
    
    def _navigate_voice(self, parameters: Dict) -> Dict:
        """التنقل عبر الصوت"""
        destination = parameters.get('destination', '')
        return {
            'success': True,
            'message': f'الانتقال إلى: {destination}',
            'action': 'navigate',
            'destination': destination
        }
    
    def _show_help_voice(self) -> Dict:
        """عرض المساعدة"""
        help_text = """
        الأوامر المتاحة:
        • أضف مستفيد جديد
        • ابحث عن مستفيد [الاسم]
        • اعرض تفاصيل المستفيد [الرقم]
        • أنشئ تقييم جديد
        • تحليل بالذكاء الاصطناعي
        • جدول جلسة جديدة
        • أنشئ تقرير
        • انتقل إلى [الصفحة]
        """
        
        return {
            'success': True,
            'message': help_text,
            'action': 'show_help'
        }
    
    def _get_command_suggestions(self) -> List[str]:
        """الحصول على اقتراحات الأوامر"""
        suggestions = []
        for command_data in self.commands_registry.values():
            suggestions.extend(command_data['patterns'][:2])  # أول نمطين فقط
        return suggestions[:10]  # أول 10 اقتراحات
    
    def _log_voice_command(self, original_text: str, command: Dict, parameters: Dict, 
                          user_id: str, result: Dict):
        """تسجيل الأوامر الصوتية"""
        log_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'user_id': user_id,
            'original_text': original_text,
            'recognized_command': command,
            'extracted_parameters': parameters,
            'execution_result': result,
            'success': result.get('success', False)
        }
        
        # يمكن حفظ السجل في قاعدة البيانات أو ملف
        logging.info(f"Voice Command Log: {json.dumps(log_entry, ensure_ascii=False)}")
    
    def get_voice_statistics(self, user_id: str = None) -> Dict:
        """إحصائيات استخدام الأوامر الصوتية"""
        # يمكن تطوير هذه الوظيفة لجلب إحصائيات حقيقية من قاعدة البيانات
        return {
            'total_commands': 150,
            'successful_commands': 142,
            'success_rate': 94.7,
            'most_used_commands': [
                'search_beneficiary',
                'show_beneficiary_details',
                'create_assessment'
            ],
            'language_usage': {
                'ar-SA': 85,
                'en-US': 15
            }
        }
    
    def update_language(self, language_code: str) -> bool:
        """تحديث لغة النظام"""
        if language_code in self.supported_languages:
            self.current_language = language_code
            return True
        return False
    
    def add_custom_command(self, command_id: str, patterns: List[str], 
                          action: str, required_params: List[str] = None) -> bool:
        """إضافة أمر مخصص"""
        try:
            self.commands_registry[command_id] = {
                'patterns': patterns,
                'action': action,
                'required_params': required_params or []
            }
            return True
        except Exception:
            return False
