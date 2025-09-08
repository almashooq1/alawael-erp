#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from flask import Blueprint, request, jsonify, session
from flask_jwt_extended import jwt_required, get_jwt_identity
from typing import Dict, List, Optional
import json
import os

class MultilingualSupport:
    """نظام الدعم متعدد اللغات"""
    
    def __init__(self):
        self.supported_languages = {
            'ar': {'name': 'العربية', 'direction': 'rtl', 'flag': '🇸🇦'},
            'en': {'name': 'English', 'direction': 'ltr', 'flag': '🇺🇸'},
            'fr': {'name': 'Français', 'direction': 'ltr', 'flag': '🇫🇷'},
            'es': {'name': 'Español', 'direction': 'ltr', 'flag': '🇪🇸'},
            'de': {'name': 'Deutsch', 'direction': 'ltr', 'flag': '🇩🇪'}
        }
        
        self.translations = {
            'ar': {
                # واجهة المستخدم
                'dashboard': 'لوحة التحكم',
                'beneficiaries': 'المستفيدون',
                'therapists': 'المعالجون',
                'sessions': 'الجلسات',
                'assessments': 'التقييمات',
                'reports': 'التقارير',
                'settings': 'الإعدادات',
                'logout': 'تسجيل الخروج',
                
                # النماذج
                'first_name': 'الاسم الأول',
                'last_name': 'اسم العائلة',
                'email': 'البريد الإلكتروني',
                'phone': 'رقم الهاتف',
                'date_of_birth': 'تاريخ الميلاد',
                'gender': 'الجنس',
                'address': 'العنوان',
                'save': 'حفظ',
                'cancel': 'إلغاء',
                'edit': 'تعديل',
                'delete': 'حذف',
                'add': 'إضافة',
                'search': 'بحث',
                
                # أنواع الإعاقة
                'physical': 'إعاقة حركية',
                'intellectual': 'إعاقة ذهنية',
                'autism_spectrum': 'طيف التوحد',
                'speech_language': 'اضطرابات النطق واللغة',
                'sensory': 'إعاقة حسية',
                'behavioral': 'اضطرابات سلوكية',
                'multiple': 'إعاقات متعددة',
                
                # مستويات الشدة
                'mild': 'خفيف',
                'moderate': 'متوسط',
                'severe': 'شديد',
                'profound': 'شديد جداً',
                
                # حالات الجلسات
                'scheduled': 'مجدولة',
                'completed': 'مكتملة',
                'cancelled': 'ملغية',
                'missed': 'فائتة',
                'in_progress': 'جارية',
                
                # أنواع العلاج
                'physical_therapy': 'العلاج الطبيعي',
                'occupational_therapy': 'العلاج الوظيفي',
                'speech_therapy': 'علاج النطق',
                'behavioral_therapy': 'العلاج السلوكي',
                'cognitive_therapy': 'العلاج المعرفي',
                
                # الرسائل
                'success_save': 'تم الحفظ بنجاح',
                'success_delete': 'تم الحذف بنجاح',
                'error_occurred': 'حدث خطأ',
                'confirm_delete': 'هل أنت متأكد من الحذف؟',
                'no_data_found': 'لا توجد بيانات',
                'loading': 'جاري التحميل...',
                
                # التقييمات
                'motor_skills': 'المهارات الحركية',
                'cognitive_skills': 'المهارات المعرفية',
                'communication_skills': 'مهارات التواصل',
                'social_skills': 'المهارات الاجتماعية',
                'sensory_skills': 'المهارات الحسية',
                'daily_living_skills': 'مهارات الحياة اليومية',
                
                # التقارير
                'progress_report': 'تقرير التقدم',
                'comprehensive_report': 'التقرير الشامل',
                'generate_report': 'إنتاج التقرير',
                'export_pdf': 'تصدير PDF',
                'export_excel': 'تصدير Excel',
                
                # التلعيب
                'achievements': 'الإنجازات',
                'points': 'النقاط',
                'level': 'المستوى',
                'leaderboard': 'لوحة المتصدرين',
                'challenges': 'التحديات',
                'badges': 'الشارات',
                
                # التطبيب عن بُعد
                'virtual_session': 'جلسة افتراضية',
                'join_meeting': 'الانضمام للاجتماع',
                'start_session': 'بدء الجلسة',
                'end_session': 'إنهاء الجلسة',
                'technical_check': 'فحص تقني'
            },
            
            'en': {
                # User Interface
                'dashboard': 'Dashboard',
                'beneficiaries': 'Beneficiaries',
                'therapists': 'Therapists',
                'sessions': 'Sessions',
                'assessments': 'Assessments',
                'reports': 'Reports',
                'settings': 'Settings',
                'logout': 'Logout',
                
                # Forms
                'first_name': 'First Name',
                'last_name': 'Last Name',
                'email': 'Email',
                'phone': 'Phone',
                'date_of_birth': 'Date of Birth',
                'gender': 'Gender',
                'address': 'Address',
                'save': 'Save',
                'cancel': 'Cancel',
                'edit': 'Edit',
                'delete': 'Delete',
                'add': 'Add',
                'search': 'Search',
                
                # Disability Types
                'physical': 'Physical Disability',
                'intellectual': 'Intellectual Disability',
                'autism_spectrum': 'Autism Spectrum',
                'speech_language': 'Speech & Language Disorders',
                'sensory': 'Sensory Disability',
                'behavioral': 'Behavioral Disorders',
                'multiple': 'Multiple Disabilities',
                
                # Severity Levels
                'mild': 'Mild',
                'moderate': 'Moderate',
                'severe': 'Severe',
                'profound': 'Profound',
                
                # Session Status
                'scheduled': 'Scheduled',
                'completed': 'Completed',
                'cancelled': 'Cancelled',
                'missed': 'Missed',
                'in_progress': 'In Progress',
                
                # Therapy Types
                'physical_therapy': 'Physical Therapy',
                'occupational_therapy': 'Occupational Therapy',
                'speech_therapy': 'Speech Therapy',
                'behavioral_therapy': 'Behavioral Therapy',
                'cognitive_therapy': 'Cognitive Therapy',
                
                # Messages
                'success_save': 'Saved successfully',
                'success_delete': 'Deleted successfully',
                'error_occurred': 'An error occurred',
                'confirm_delete': 'Are you sure you want to delete?',
                'no_data_found': 'No data found',
                'loading': 'Loading...',
                
                # Assessments
                'motor_skills': 'Motor Skills',
                'cognitive_skills': 'Cognitive Skills',
                'communication_skills': 'Communication Skills',
                'social_skills': 'Social Skills',
                'sensory_skills': 'Sensory Skills',
                'daily_living_skills': 'Daily Living Skills',
                
                # Reports
                'progress_report': 'Progress Report',
                'comprehensive_report': 'Comprehensive Report',
                'generate_report': 'Generate Report',
                'export_pdf': 'Export PDF',
                'export_excel': 'Export Excel',
                
                # Gamification
                'achievements': 'Achievements',
                'points': 'Points',
                'level': 'Level',
                'leaderboard': 'Leaderboard',
                'challenges': 'Challenges',
                'badges': 'Badges',
                
                # Telemedicine
                'virtual_session': 'Virtual Session',
                'join_meeting': 'Join Meeting',
                'start_session': 'Start Session',
                'end_session': 'End Session',
                'technical_check': 'Technical Check'
            }
        }
        
        self.default_language = 'ar'
        self.current_language = 'ar'
    
    def set_language(self, language_code: str) -> Dict:
        """تعيين اللغة الحالية"""
        try:
            if language_code not in self.supported_languages:
                return {'success': False, 'message': 'اللغة غير مدعومة'}
            
            self.current_language = language_code
            
            return {
                'success': True,
                'language': language_code,
                'language_info': self.supported_languages[language_code],
                'message': f'تم تغيير اللغة إلى {self.supported_languages[language_code]["name"]}'
            }
            
        except Exception as e:
            return {'success': False, 'message': f'خطأ في تعيين اللغة: {str(e)}'}
    
    def get_translation(self, key: str, language: str = None) -> str:
        """الحصول على الترجمة"""
        if not language:
            language = self.current_language
        
        if language in self.translations and key in self.translations[language]:
            return self.translations[language][key]
        
        # العودة للغة الافتراضية إذا لم توجد الترجمة
        if self.default_language in self.translations and key in self.translations[self.default_language]:
            return self.translations[self.default_language][key]
        
        # إرجاع المفتاح نفسه إذا لم توجد ترجمة
        return key
    
    def get_translations_batch(self, keys: List[str], language: str = None) -> Dict:
        """الحصول على ترجمات متعددة"""
        if not language:
            language = self.current_language
        
        translations = {}
        for key in keys:
            translations[key] = self.get_translation(key, language)
        
        return translations
    
    def get_all_translations(self, language: str = None) -> Dict:
        """الحصول على جميع الترجمات للغة"""
        if not language:
            language = self.current_language
        
        if language in self.translations:
            return self.translations[language]
        
        return self.translations[self.default_language]
    
    def add_translation(self, language: str, key: str, value: str) -> Dict:
        """إضافة ترجمة جديدة"""
        try:
            if language not in self.translations:
                self.translations[language] = {}
            
            self.translations[language][key] = value
            
            return {
                'success': True,
                'message': f'تم إضافة الترجمة للمفتاح {key} في اللغة {language}'
            }
            
        except Exception as e:
            return {'success': False, 'message': f'خطأ في إضافة الترجمة: {str(e)}'}
    
    def get_supported_languages(self) -> Dict:
        """الحصول على اللغات المدعومة"""
        return {
            'success': True,
            'languages': self.supported_languages,
            'current_language': self.current_language,
            'default_language': self.default_language
        }
    
    def format_date(self, date_obj, language: str = None) -> str:
        """تنسيق التاريخ حسب اللغة"""
        if not language:
            language = self.current_language
        
        if language == 'ar':
            # التنسيق العربي
            return date_obj.strftime('%d/%m/%Y')
        else:
            # التنسيق الإنجليزي
            return date_obj.strftime('%m/%d/%Y')
    
    def format_number(self, number, language: str = None) -> str:
        """تنسيق الأرقام حسب اللغة"""
        if not language:
            language = self.current_language
        
        if language == 'ar':
            # الأرقام العربية
            arabic_digits = '٠١٢٣٤٥٦٧٨٩'
            english_digits = '0123456789'
            
            number_str = str(number)
            for i, digit in enumerate(english_digits):
                number_str = number_str.replace(digit, arabic_digits[i])
            
            return number_str
        
        return str(number)
    
    def get_text_direction(self, language: str = None) -> str:
        """الحصول على اتجاه النص"""
        if not language:
            language = self.current_language
        
        if language in self.supported_languages:
            return self.supported_languages[language]['direction']
        
        return 'ltr'
    
    def validate_translation_completeness(self) -> Dict:
        """التحقق من اكتمال الترجمات"""
        try:
            base_keys = set(self.translations[self.default_language].keys())
            completeness_report = {}
            
            for lang_code, translations in self.translations.items():
                if lang_code == self.default_language:
                    completeness_report[lang_code] = {'percentage': 100, 'missing_keys': []}
                    continue
                
                current_keys = set(translations.keys())
                missing_keys = base_keys - current_keys
                percentage = ((len(current_keys) / len(base_keys)) * 100) if base_keys else 0
                
                completeness_report[lang_code] = {
                    'percentage': round(percentage, 2),
                    'missing_keys': list(missing_keys)
                }
            
            return {
                'success': True,
                'completeness_report': completeness_report
            }
            
        except Exception as e:
            return {'success': False, 'message': f'خطأ في التحقق من الترجمات: {str(e)}'}

# إنشاء Blueprint للـ API
multilingual_bp = Blueprint('multilingual', __name__, url_prefix='/api/multilingual')
multilingual_service = MultilingualSupport()

@multilingual_bp.route('/languages', methods=['GET'])
@jwt_required()
def get_supported_languages():
    """الحصول على اللغات المدعومة"""
    try:
        result = multilingual_service.get_supported_languages()
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ: {str(e)}'}), 500

@multilingual_bp.route('/set-language', methods=['POST'])
@jwt_required()
def set_language():
    """تعيين اللغة الحالية"""
    try:
        data = request.get_json()
        language_code = data.get('language_code')
        
        if not language_code:
            return jsonify({'success': False, 'message': 'رمز اللغة مطلوب'}), 400
        
        result = multilingual_service.set_language(language_code)
        
        # حفظ اللغة في الجلسة
        if result['success']:
            session['language'] = language_code
        
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ: {str(e)}'}), 500

@multilingual_bp.route('/translate/<key>', methods=['GET'])
@jwt_required()
def get_translation(key):
    """الحصول على ترجمة مفتاح واحد"""
    try:
        language = request.args.get('language', session.get('language', 'ar'))
        translation = multilingual_service.get_translation(key, language)
        
        return jsonify({
            'success': True,
            'key': key,
            'translation': translation,
            'language': language
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ: {str(e)}'}), 500

@multilingual_bp.route('/translations', methods=['POST'])
@jwt_required()
def get_translations_batch():
    """الحصول على ترجمات متعددة"""
    try:
        data = request.get_json()
        keys = data.get('keys', [])
        language = data.get('language', session.get('language', 'ar'))
        
        translations = multilingual_service.get_translations_batch(keys, language)
        
        return jsonify({
            'success': True,
            'translations': translations,
            'language': language
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ: {str(e)}'}), 500

@multilingual_bp.route('/translations/all', methods=['GET'])
@jwt_required()
def get_all_translations():
    """الحصول على جميع الترجمات"""
    try:
        language = request.args.get('language', session.get('language', 'ar'))
        translations = multilingual_service.get_all_translations(language)
        
        return jsonify({
            'success': True,
            'translations': translations,
            'language': language,
            'direction': multilingual_service.get_text_direction(language)
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ: {str(e)}'}), 500

@multilingual_bp.route('/add-translation', methods=['POST'])
@jwt_required()
def add_translation():
    """إضافة ترجمة جديدة"""
    try:
        data = request.get_json()
        language = data.get('language')
        key = data.get('key')
        value = data.get('value')
        
        if not all([language, key, value]):
            return jsonify({'success': False, 'message': 'جميع الحقول مطلوبة'}), 400
        
        result = multilingual_service.add_translation(language, key, value)
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ: {str(e)}'}), 500

@multilingual_bp.route('/completeness-report', methods=['GET'])
@jwt_required()
def get_completeness_report():
    """تقرير اكتمال الترجمات"""
    try:
        result = multilingual_service.validate_translation_completeness()
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ: {str(e)}'}), 500
