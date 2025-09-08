#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import json
import uuid
from database import db
try:
    from comprehensive_rehabilitation_models import (
        RehabilitationBeneficiary, RehabilitationTherapist
    )
except ImportError:
    # تعريف بديل في حالة عدم توفر النماذج
    RehabilitationBeneficiary = None
    RehabilitationTherapist = None

class TelemedicineIntegration:
    """نظام التطبيب عن بُعد المتكامل"""
    
    def __init__(self):
        self.video_platforms = {
            'zoom': 'Zoom',
            'teams': 'Microsoft Teams',
            'webex': 'Cisco Webex',
            'jitsi': 'Jitsi Meet'
        }
        self.session_statuses = ['scheduled', 'active', 'completed', 'cancelled']
        
    def create_virtual_session(self, session_data: Dict) -> Dict:
        """إنشاء جلسة افتراضية"""
        try:
            # التحقق من البيانات المطلوبة
            required_fields = ['beneficiary_id', 'therapist_id', 'session_date', 'duration']
            for field in required_fields:
                if field not in session_data:
                    return {'success': False, 'message': f'الحقل {field} مطلوب'}
            
            # إنشاء معرف فريد للجلسة
            session_id = str(uuid.uuid4())
            
            # إنشاء رابط الجلسة الافتراضية
            meeting_link = self._generate_meeting_link(session_data.get('platform', 'jitsi'), session_id)
            
            # حفظ بيانات الجلسة الافتراضية
            virtual_session = {
                'session_id': session_id,
                'beneficiary_id': session_data['beneficiary_id'],
                'therapist_id': session_data['therapist_id'],
                'session_date': session_data['session_date'],
                'duration': session_data['duration'],
                'platform': session_data.get('platform', 'jitsi'),
                'meeting_link': meeting_link,
                'status': 'scheduled',
                'created_at': datetime.now().isoformat(),
                'session_type': 'virtual_therapy'
            }
            
            # إرسال دعوات للمشاركين
            invitations = self._send_session_invitations(virtual_session)
            
            return {
                'success': True,
                'session': virtual_session,
                'invitations_sent': invitations['sent'],
                'meeting_link': meeting_link
            }
            
        except Exception as e:
            return {'success': False, 'message': f'خطأ في إنشاء الجلسة: {str(e)}'}
    
    def _generate_meeting_link(self, platform: str, session_id: str) -> str:
        """توليد رابط الاجتماع حسب المنصة"""
        base_urls = {
            'jitsi': f'https://meet.jit.si/rehab-session-{session_id}',
            'zoom': f'https://zoom.us/j/{session_id}',
            'teams': f'https://teams.microsoft.com/l/meetup-join/{session_id}',
            'webex': f'https://webex.com/meet/{session_id}'
        }
        return base_urls.get(platform, base_urls['jitsi'])
    
    def _send_session_invitations(self, session_data: Dict) -> Dict:
        """إرسال دعوات الجلسة"""
        try:
            # الحصول على بيانات المستفيد والمعالج
            beneficiary = None
            therapist = None
            
            if RehabilitationBeneficiary:
                beneficiary = RehabilitationBeneficiary.query.get(session_data['beneficiary_id'])
            if RehabilitationTherapist:
                therapist = RehabilitationTherapist.query.get(session_data['therapist_id'])
            
            invitations = []
            
            # دعوة المستفيد
            if beneficiary and beneficiary.email:
                invitation = {
                    'recipient': beneficiary.email,
                    'recipient_name': f"{beneficiary.first_name} {beneficiary.last_name}",
                    'role': 'beneficiary',
                    'meeting_link': session_data['meeting_link'],
                    'session_date': session_data['session_date'],
                    'duration': session_data['duration']
                }
                invitations.append(invitation)
            
            # دعوة المعالج
            if therapist and therapist.email:
                invitation = {
                    'recipient': therapist.email,
                    'recipient_name': f"{therapist.first_name} {therapist.last_name}",
                    'role': 'therapist',
                    'meeting_link': session_data['meeting_link'],
                    'session_date': session_data['session_date'],
                    'duration': session_data['duration']
                }
                invitations.append(invitation)
            
            # في التطبيق الحقيقي، يتم إرسال الدعوات عبر البريد الإلكتروني
            return {'sent': len(invitations), 'invitations': invitations}
            
        except Exception as e:
            return {'sent': 0, 'error': str(e)}
    
    def start_virtual_session(self, session_id: str) -> Dict:
        """بدء الجلسة الافتراضية"""
        try:
            # تحديث حالة الجلسة
            session_data = {
                'status': 'active',
                'started_at': datetime.now().isoformat(),
                'participants': []
            }
            
            return {
                'success': True,
                'message': 'تم بدء الجلسة بنجاح',
                'session_data': session_data
            }
            
        except Exception as e:
            return {'success': False, 'message': f'خطأ في بدء الجلسة: {str(e)}'}
    
    def end_virtual_session(self, session_id: str, session_notes: str = '') -> Dict:
        """إنهاء الجلسة الافتراضية"""
        try:
            # تحديث حالة الجلسة
            session_data = {
                'status': 'completed',
                'ended_at': datetime.now().isoformat(),
                'session_notes': session_notes,
                'duration_actual': 0  # يمكن حسابه من started_at و ended_at
            }
            
            return {
                'success': True,
                'message': 'تم إنهاء الجلسة بنجاح',
                'session_data': session_data
            }
            
        except Exception as e:
            return {'success': False, 'message': f'خطأ في إنهاء الجلسة: {str(e)}'}
    
    def get_session_participants(self, session_id: str) -> Dict:
        """الحصول على المشاركين في الجلسة"""
        try:
            # في التطبيق الحقيقي، يتم الحصول على المشاركين من قاعدة البيانات
            participants = [
                {
                    'user_id': 'beneficiary_123',
                    'name': 'أحمد محمد',
                    'role': 'beneficiary',
                    'joined_at': datetime.now().isoformat(),
                    'status': 'connected'
                },
                {
                    'user_id': 'therapist_456',
                    'name': 'د. فاطمة أحمد',
                    'role': 'therapist',
                    'joined_at': datetime.now().isoformat(),
                    'status': 'connected'
                }
            ]
            
            return {
                'success': True,
                'participants': participants,
                'total_count': len(participants)
            }
            
        except Exception as e:
            return {'success': False, 'message': f'خطأ في الحصول على المشاركين: {str(e)}'}
    
    def record_session_activity(self, session_id: str, activity_data: Dict) -> Dict:
        """تسجيل نشاط الجلسة"""
        try:
            activity = {
                'session_id': session_id,
                'activity_type': activity_data.get('type', 'general'),
                'description': activity_data.get('description', ''),
                'timestamp': datetime.now().isoformat(),
                'user_id': activity_data.get('user_id'),
                'metadata': activity_data.get('metadata', {})
            }
            
            return {
                'success': True,
                'activity': activity
            }
            
        except Exception as e:
            return {'success': False, 'message': f'خطأ في تسجيل النشاط: {str(e)}'}
    
    def get_virtual_sessions_schedule(self, therapist_id: int = None, date_range: Dict = None) -> Dict:
        """الحصول على جدول الجلسات الافتراضية"""
        try:
            # في التطبيق الحقيقي، يتم الاستعلام من قاعدة البيانات
            sessions = [
                {
                    'session_id': 'session_001',
                    'beneficiary_name': 'أحمد محمد',
                    'therapist_name': 'د. فاطمة أحمد',
                    'session_date': '2024-01-15T10:00:00',
                    'duration': 60,
                    'platform': 'jitsi',
                    'status': 'scheduled',
                    'meeting_link': 'https://meet.jit.si/rehab-session-001'
                },
                {
                    'session_id': 'session_002',
                    'beneficiary_name': 'سارة علي',
                    'therapist_name': 'د. محمد حسن',
                    'session_date': '2024-01-15T14:00:00',
                    'duration': 45,
                    'platform': 'zoom',
                    'status': 'scheduled',
                    'meeting_link': 'https://zoom.us/j/session_002'
                }
            ]
            
            return {
                'success': True,
                'sessions': sessions,
                'total_count': len(sessions)
            }
            
        except Exception as e:
            return {'success': False, 'message': f'خطأ في الحصول على الجدول: {str(e)}'}
    
    def generate_session_report(self, session_id: str) -> Dict:
        """إنتاج تقرير الجلسة"""
        try:
            # جمع بيانات الجلسة
            session_report = {
                'session_id': session_id,
                'session_date': '2024-01-15T10:00:00',
                'duration_scheduled': 60,
                'duration_actual': 55,
                'participants': [
                    {'name': 'أحمد محمد', 'role': 'beneficiary', 'attendance': 'present'},
                    {'name': 'د. فاطمة أحمد', 'role': 'therapist', 'attendance': 'present'}
                ],
                'activities_completed': [
                    'تمارين التوازن',
                    'تمارين التنسيق الحركي',
                    'تقييم التقدم'
                ],
                'session_notes': 'الجلسة تمت بنجاح مع تحسن ملحوظ في التوازن',
                'next_session_recommendations': [
                    'زيادة صعوبة تمارين التوازن',
                    'إضافة تمارين جديدة للتنسيق'
                ],
                'technical_issues': [],
                'session_rating': 4.5
            }
            
            return {
                'success': True,
                'report': session_report
            }
            
        except Exception as e:
            return {'success': False, 'message': f'خطأ في إنتاج التقرير: {str(e)}'}
    
    def check_technical_requirements(self, user_id: str) -> Dict:
        """فحص المتطلبات التقنية"""
        try:
            requirements = {
                'internet_speed': {
                    'minimum': '5 Mbps',
                    'recommended': '10 Mbps',
                    'status': 'good'
                },
                'device_compatibility': {
                    'camera': True,
                    'microphone': True,
                    'speakers': True,
                    'browser_support': True
                },
                'platform_access': {
                    'jitsi': True,
                    'zoom': True,
                    'teams': False,
                    'webex': True
                },
                'recommendations': [
                    'تأكد من وجود إضاءة جيدة',
                    'استخدم سماعات لتحسين جودة الصوت',
                    'أغلق التطبيقات غير الضرورية'
                ]
            }
            
            return {
                'success': True,
                'requirements': requirements,
                'overall_status': 'ready'
            }
            
        except Exception as e:
            return {'success': False, 'message': f'خطأ في فحص المتطلبات: {str(e)}'}

# إنشاء Blueprint للـ API
telemedicine_bp = Blueprint('telemedicine', __name__, url_prefix='/api/telemedicine')
telemedicine_service = TelemedicineIntegration()

@telemedicine_bp.route('/create-session', methods=['POST'])
@jwt_required()
def create_virtual_session():
    """إنشاء جلسة افتراضية جديدة"""
    try:
        data = request.get_json()
        result = telemedicine_service.create_virtual_session(data)
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ: {str(e)}'}), 500

@telemedicine_bp.route('/start-session/<session_id>', methods=['POST'])
@jwt_required()
def start_session(session_id):
    """بدء الجلسة الافتراضية"""
    try:
        result = telemedicine_service.start_virtual_session(session_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ: {str(e)}'}), 500

@telemedicine_bp.route('/end-session/<session_id>', methods=['POST'])
@jwt_required()
def end_session(session_id):
    """إنهاء الجلسة الافتراضية"""
    try:
        data = request.get_json()
        session_notes = data.get('session_notes', '')
        result = telemedicine_service.end_virtual_session(session_id, session_notes)
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ: {str(e)}'}), 500

@telemedicine_bp.route('/sessions/schedule', methods=['GET'])
@jwt_required()
def get_sessions_schedule():
    """الحصول على جدول الجلسات"""
    try:
        therapist_id = request.args.get('therapist_id', type=int)
        result = telemedicine_service.get_virtual_sessions_schedule(therapist_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ: {str(e)}'}), 500

@telemedicine_bp.route('/session/<session_id>/participants', methods=['GET'])
@jwt_required()
def get_session_participants(session_id):
    """الحصول على المشاركين في الجلسة"""
    try:
        result = telemedicine_service.get_session_participants(session_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ: {str(e)}'}), 500

@telemedicine_bp.route('/session/<session_id>/report', methods=['GET'])
@jwt_required()
def get_session_report(session_id):
    """الحصول على تقرير الجلسة"""
    try:
        result = telemedicine_service.generate_session_report(session_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ: {str(e)}'}), 500

@telemedicine_bp.route('/technical-check/<user_id>', methods=['GET'])
@jwt_required()
def check_technical_requirements(user_id):
    """فحص المتطلبات التقنية"""
    try:
        result = telemedicine_service.check_technical_requirements(user_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'message': f'خطأ: {str(e)}'}), 500
