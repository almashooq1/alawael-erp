from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Student
from family_child_models import (
    ChildProfile, FamilyProfile, FamilyMember, ChildFamilyRelation,
    ProgressTracking, SmartAppointment, ParentCommunication,
    SatisfactionSurvey, SurveyResponse
)
from datetime import datetime, date, time
import json
import uuid

family_child_bp = Blueprint('family_child', __name__)

# ==================== Child Profiles API ====================

@family_child_bp.route('/api/child-profiles', methods=['GET'])
@jwt_required()
def get_child_profiles():
    """استرجاع قائمة ملفات الأطفال"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        search = request.args.get('search', '')
        status = request.args.get('status', '')
        
        query = ChildProfile.query
        
        if search:
            query = query.filter(ChildProfile.full_name.contains(search))
        if status:
            query = query.filter(ChildProfile.status == status)
            
        profiles = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'success': True,
            'profiles': [{
                'id': p.id,
                'full_name': p.full_name,
                'nickname': p.nickname,
                'birth_date': p.birth_date.isoformat() if p.birth_date else None,
                'gender': p.gender,
                'status': p.status,
                'primary_diagnosis': p.primary_diagnosis,
                'enrollment_date': p.enrollment_date.isoformat() if p.enrollment_date else None,
                'student_id': p.student_id
            } for p in profiles.items],
            'pagination': {
                'page': profiles.page,
                'pages': profiles.pages,
                'per_page': profiles.per_page,
                'total': profiles.total
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@family_child_bp.route('/api/child-profiles', methods=['POST'])
@jwt_required()
def create_child_profile():
    """إنشاء ملف طفل جديد"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        profile = ChildProfile(
            student_id=data['student_id'],
            full_name=data['full_name'],
            nickname=data.get('nickname'),
            birth_date=datetime.strptime(data['birth_date'], '%Y-%m-%d').date(),
            gender=data['gender'],
            nationality=data.get('nationality'),
            birth_place=data.get('birth_place'),
            medical_history=data.get('medical_history'),
            current_medications=json.dumps(data.get('current_medications', [])),
            allergies=json.dumps(data.get('allergies', [])),
            medical_conditions=json.dumps(data.get('medical_conditions', [])),
            emergency_medical_info=data.get('emergency_medical_info'),
            primary_diagnosis=data.get('primary_diagnosis'),
            secondary_diagnoses=json.dumps(data.get('secondary_diagnoses', [])),
            diagnosis_date=datetime.strptime(data['diagnosis_date'], '%Y-%m-%d').date() if data.get('diagnosis_date') else None,
            diagnosing_doctor=data.get('diagnosing_doctor'),
            diagnosis_reports=json.dumps(data.get('diagnosis_reports', [])),
            developmental_milestones=json.dumps(data.get('developmental_milestones', [])),
            current_abilities=json.dumps(data.get('current_abilities', [])),
            areas_of_strength=json.dumps(data.get('areas_of_strength', [])),
            areas_of_need=json.dumps(data.get('areas_of_need', [])),
            educational_background=data.get('educational_background'),
            learning_style=data.get('learning_style'),
            communication_method=data.get('communication_method'),
            behavioral_notes=data.get('behavioral_notes'),
            social_skills_level=data.get('social_skills_level'),
            interaction_preferences=json.dumps(data.get('interaction_preferences', [])),
            peer_relationships=data.get('peer_relationships'),
            interests=json.dumps(data.get('interests', [])),
            hobbies=json.dumps(data.get('hobbies', [])),
            favorite_activities=json.dumps(data.get('favorite_activities', [])),
            dislikes=json.dumps(data.get('dislikes', [])),
            support_needs=json.dumps(data.get('support_needs', [])),
            assistive_technology=json.dumps(data.get('assistive_technology', [])),
            accommodations=json.dumps(data.get('accommodations', [])),
            created_by=current_user_id
        )
        
        db.session.add(profile)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء ملف الطفل بنجاح',
            'profile_id': profile.id
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@family_child_bp.route('/api/child-profiles/<int:profile_id>', methods=['GET'])
@jwt_required()
def get_child_profile(profile_id):
    """استرجاع ملف طفل محدد"""
    try:
        profile = ChildProfile.query.get_or_404(profile_id)
        
        return jsonify({
            'success': True,
            'profile': {
                'id': profile.id,
                'student_id': profile.student_id,
                'full_name': profile.full_name,
                'nickname': profile.nickname,
                'birth_date': profile.birth_date.isoformat() if profile.birth_date else None,
                'gender': profile.gender,
                'nationality': profile.nationality,
                'birth_place': profile.birth_place,
                'medical_history': profile.medical_history,
                'current_medications': json.loads(profile.current_medications or '[]'),
                'allergies': json.loads(profile.allergies or '[]'),
                'medical_conditions': json.loads(profile.medical_conditions or '[]'),
                'emergency_medical_info': profile.emergency_medical_info,
                'primary_diagnosis': profile.primary_diagnosis,
                'secondary_diagnoses': json.loads(profile.secondary_diagnoses or '[]'),
                'diagnosis_date': profile.diagnosis_date.isoformat() if profile.diagnosis_date else None,
                'diagnosing_doctor': profile.diagnosing_doctor,
                'diagnosis_reports': json.loads(profile.diagnosis_reports or '[]'),
                'developmental_milestones': json.loads(profile.developmental_milestones or '[]'),
                'current_abilities': json.loads(profile.current_abilities or '[]'),
                'areas_of_strength': json.loads(profile.areas_of_strength or '[]'),
                'areas_of_need': json.loads(profile.areas_of_need or '[]'),
                'educational_background': profile.educational_background,
                'learning_style': profile.learning_style,
                'communication_method': profile.communication_method,
                'behavioral_notes': profile.behavioral_notes,
                'social_skills_level': profile.social_skills_level,
                'interaction_preferences': json.loads(profile.interaction_preferences or '[]'),
                'peer_relationships': profile.peer_relationships,
                'interests': json.loads(profile.interests or '[]'),
                'hobbies': json.loads(profile.hobbies or '[]'),
                'favorite_activities': json.loads(profile.favorite_activities or '[]'),
                'dislikes': json.loads(profile.dislikes or '[]'),
                'support_needs': json.loads(profile.support_needs or '[]'),
                'assistive_technology': json.loads(profile.assistive_technology or '[]'),
                'accommodations': json.loads(profile.accommodations or '[]'),
                'status': profile.status,
                'enrollment_date': profile.enrollment_date.isoformat() if profile.enrollment_date else None,
                'last_updated': profile.last_updated.isoformat() if profile.last_updated else None
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ==================== Family Profiles API ====================

@family_child_bp.route('/api/family-profiles', methods=['GET'])
@jwt_required()
def get_family_profiles():
    """استرجاع قائمة ملفات الأسر"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        search = request.args.get('search', '')
        
        query = FamilyProfile.query
        
        if search:
            query = query.filter(FamilyProfile.family_name.contains(search))
            
        families = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'success': True,
            'families': [{
                'id': f.id,
                'family_code': f.family_code,
                'family_name': f.family_name,
                'primary_phone': f.primary_phone,
                'email': f.email,
                'city': f.city,
                'status': f.status,
                'registration_date': f.registration_date.isoformat() if f.registration_date else None,
                'children_count': len(f.child_relations)
            } for f in families.items],
            'pagination': {
                'page': families.page,
                'pages': families.pages,
                'per_page': families.per_page,
                'total': families.total
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@family_child_bp.route('/api/family-profiles', methods=['POST'])
@jwt_required()
def create_family_profile():
    """إنشاء ملف أسرة جديد"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        # توليد رمز الأسرة
        family_code = f"FAM-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
        
        family = FamilyProfile(
            family_code=family_code,
            family_name=data['family_name'],
            address=data.get('address'),
            city=data.get('city'),
            postal_code=data.get('postal_code'),
            primary_phone=data.get('primary_phone'),
            secondary_phone=data.get('secondary_phone'),
            email=data.get('email'),
            family_income_range=data.get('family_income_range'),
            employment_status=json.dumps(data.get('employment_status', [])),
            insurance_info=json.dumps(data.get('insurance_info', {})),
            financial_assistance=data.get('financial_assistance', False),
            primary_language=data.get('primary_language', 'Arabic'),
            secondary_languages=json.dumps(data.get('secondary_languages', [])),
            cultural_background=data.get('cultural_background'),
            religious_considerations=data.get('religious_considerations'),
            support_network=json.dumps(data.get('support_network', [])),
            previous_services=json.dumps(data.get('previous_services', [])),
            current_services=json.dumps(data.get('current_services', [])),
            service_priorities=json.dumps(data.get('service_priorities', [])),
            preferred_communication=data.get('preferred_communication'),
            communication_frequency=data.get('communication_frequency'),
            meeting_preferences=json.dumps(data.get('meeting_preferences', {})),
            participation_level=data.get('participation_level'),
            notes=data.get('notes'),
            created_by=current_user_id
        )
        
        db.session.add(family)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء ملف الأسرة بنجاح',
            'family_id': family.id,
            'family_code': family.family_code
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# ==================== Smart Appointments API ====================

@family_child_bp.route('/api/smart-appointments', methods=['GET'])
@jwt_required()
def get_smart_appointments():
    """استرجاع قائمة المواعيد الذكية"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        status = request.args.get('status', '')
        date_from = request.args.get('date_from', '')
        date_to = request.args.get('date_to', '')
        
        query = SmartAppointment.query
        
        if status:
            query = query.filter(SmartAppointment.status == status)
        if date_from:
            query = query.filter(SmartAppointment.scheduled_date >= datetime.strptime(date_from, '%Y-%m-%d').date())
        if date_to:
            query = query.filter(SmartAppointment.scheduled_date <= datetime.strptime(date_to, '%Y-%m-%d').date())
            
        appointments = query.order_by(SmartAppointment.scheduled_date.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'appointments': [{
                'id': a.id,
                'appointment_code': a.appointment_code,
                'title': a.title,
                'appointment_type': a.appointment_type,
                'scheduled_date': a.scheduled_date.isoformat(),
                'scheduled_time': a.scheduled_time.strftime('%H:%M'),
                'duration_minutes': a.duration_minutes,
                'status': a.status,
                'priority': a.priority,
                'child_name': a.child.full_name if a.child else None,
                'family_name': a.family.family_name if a.family else None,
                'staff_name': a.staff.name if a.staff else None,
                'location': a.location,
                'room': a.room
            } for a in appointments.items],
            'pagination': {
                'page': appointments.page,
                'pages': appointments.pages,
                'per_page': appointments.per_page,
                'total': appointments.total
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@family_child_bp.route('/api/smart-appointments', methods=['POST'])
@jwt_required()
def create_smart_appointment():
    """إنشاء موعد ذكي جديد"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        # توليد رمز الموعد
        appointment_code = f"APT-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
        
        # حساب وقت الانتهاء
        scheduled_time = datetime.strptime(data['scheduled_time'], '%H:%M').time()
        duration = data.get('duration_minutes', 60)
        end_datetime = datetime.combine(date.today(), scheduled_time)
        end_datetime = end_datetime.replace(minute=end_datetime.minute + duration)
        end_time = end_datetime.time()
        
        appointment = SmartAppointment(
            appointment_code=appointment_code,
            child_id=data['child_id'],
            family_id=data['family_id'],
            staff_id=data['staff_id'],
            appointment_type=data['appointment_type'],
            title=data['title'],
            description=data.get('description'),
            scheduled_date=datetime.strptime(data['scheduled_date'], '%Y-%m-%d').date(),
            scheduled_time=scheduled_time,
            duration_minutes=duration,
            end_time=end_time,
            location=data.get('location'),
            room=data.get('room'),
            online_meeting_link=data.get('online_meeting_link'),
            priority=data.get('priority', 'normal'),
            confirmation_required=data.get('confirmation_required', True),
            preparation_notes=data.get('preparation_notes'),
            required_materials=json.dumps(data.get('required_materials', [])),
            special_requirements=data.get('special_requirements'),
            created_by=current_user_id
        )
        
        db.session.add(appointment)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إنشاء الموعد بنجاح',
            'appointment_id': appointment.id,
            'appointment_code': appointment.appointment_code
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# ==================== Dashboard API ====================

@family_child_bp.route('/api/family-child-dashboard', methods=['GET'])
@jwt_required()
def get_dashboard_data():
    """استرجاع بيانات لوحة التحكم"""
    try:
        # إحصائيات الأطفال
        total_children = ChildProfile.query.count()
        active_children = ChildProfile.query.filter_by(status='active').count()
        
        # إحصائيات الأسر
        total_families = FamilyProfile.query.count()
        active_families = FamilyProfile.query.filter_by(status='active').count()
        
        # إحصائيات المواعيد
        total_appointments = SmartAppointment.query.count()
        today_appointments = SmartAppointment.query.filter_by(
            scheduled_date=date.today()
        ).count()
        
        # إحصائيات التواصل
        total_communications = ParentCommunication.query.count()
        recent_communications = ParentCommunication.query.filter(
            ParentCommunication.sent_at >= datetime.now().replace(hour=0, minute=0, second=0)
        ).count()
        
        return jsonify({
            'success': True,
            'statistics': {
                'children': {
                    'total': total_children,
                    'active': active_children,
                    'inactive': total_children - active_children
                },
                'families': {
                    'total': total_families,
                    'active': active_families,
                    'inactive': total_families - active_families
                },
                'appointments': {
                    'total': total_appointments,
                    'today': today_appointments
                },
                'communications': {
                    'total': total_communications,
                    'today': recent_communications
                }
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
