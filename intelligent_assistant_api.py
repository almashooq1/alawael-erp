# -*- coding: utf-8 -*-
"""
API endpoints للمساعد الذكي المتقدم
نظام ERP مراكز الأوائل للتأهيل الشامل لذوي الاحتياجات الخاصة
"""

from flask import Blueprint, request, jsonify, session
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import db
from intelligent_assistant_services import IntelligentAssistantService
from intelligent_assistant_models import (
    AIAssistantConversation, AIAssistantMessage, AIKnowledgeBase,
    AIIntentPattern, AIUserPreference, AIAnalytics, AIFeedback
)
import json
from datetime import datetime, date

# إنشاء Blueprint
intelligent_assistant_bp = Blueprint('intelligent_assistant', __name__, url_prefix='/api/ai-assistant')

# إنشاء خدمة المساعد الذكي
ai_service = IntelligentAssistantService()

@intelligent_assistant_bp.route('/start-conversation', methods=['POST'])
@jwt_required()
def start_conversation():
    """بدء محادثة جديدة مع المساعد الذكي"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        conversation_type = data.get('conversation_type', 'general')
        context_data = data.get('context_data', {})
        
        session_id = ai_service.start_conversation(user_id, conversation_type, context_data)
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'message': 'تم بدء المحادثة بنجاح'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@intelligent_assistant_bp.route('/send-message', methods=['POST'])
@jwt_required()
def send_message():
    """إرسال رسالة للمساعد الذكي"""
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        message = data.get('message')
        
        if not session_id or not message:
            return jsonify({'success': False, 'message': 'معرف الجلسة والرسالة مطلوبان'}), 400
        
        response = ai_service.process_message(session_id, message)
        
        if 'error' in response:
            return jsonify({'success': False, 'message': response['error']}), 400
        
        return jsonify({
            'success': True,
            'response': response
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@intelligent_assistant_bp.route('/conversation-history/<session_id>', methods=['GET'])
@jwt_required()
def get_conversation_history(session_id):
    """الحصول على تاريخ المحادثة"""
    try:
        limit = request.args.get('limit', 50, type=int)
        history = ai_service.get_conversation_history(session_id, limit)
        
        return jsonify({
            'success': True,
            'history': history
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@intelligent_assistant_bp.route('/rate-conversation', methods=['POST'])
@jwt_required()
def rate_conversation():
    """تقييم المحادثة"""
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        rating = data.get('rating')
        comment = data.get('comment', '')
        
        if not session_id or rating is None:
            return jsonify({'success': False, 'message': 'معرف الجلسة والتقييم مطلوبان'}), 400
        
        if not (1 <= rating <= 5):
            return jsonify({'success': False, 'message': 'التقييم يجب أن يكون بين 1 و 5'}), 400
        
        success = ai_service.rate_conversation(session_id, rating, comment)
        
        if success:
            return jsonify({'success': True, 'message': 'تم حفظ التقييم بنجاح'})
        else:
            return jsonify({'success': False, 'message': 'فشل في حفظ التقييم'}), 400
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@intelligent_assistant_bp.route('/user-conversations', methods=['GET'])
@jwt_required()
def get_user_conversations():
    """الحصول على محادثات المستخدم"""
    try:
        user_id = get_jwt_identity()
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        conversations = AIAssistantConversation.query.filter_by(
            user_id=user_id
        ).order_by(AIAssistantConversation.updated_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'conversations': [conv.to_dict() for conv in conversations.items],
            'pagination': {
                'page': page,
                'pages': conversations.pages,
                'per_page': per_page,
                'total': conversations.total
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@intelligent_assistant_bp.route('/knowledge-base', methods=['GET'])
@jwt_required()
def get_knowledge_base():
    """الحصول على قاعدة المعرفة"""
    try:
        category = request.args.get('category')
        search = request.args.get('search')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        query = AIKnowledgeBase.query.filter_by(is_active=True)
        
        if category:
            query = query.filter_by(category=category)
        
        if search:
            query = query.filter(
                db.or_(
                    AIKnowledgeBase.title.contains(search),
                    AIKnowledgeBase.content.contains(search)
                )
            )
        
        knowledge = query.order_by(AIKnowledgeBase.usage_count.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'knowledge': [kb.to_dict() for kb in knowledge.items],
            'pagination': {
                'page': page,
                'pages': knowledge.pages,
                'per_page': per_page,
                'total': knowledge.total
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@intelligent_assistant_bp.route('/knowledge-base', methods=['POST'])
@jwt_required()
def add_knowledge():
    """إضافة معرفة جديدة"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        knowledge = AIKnowledgeBase(
            category=data.get('category'),
            subcategory=data.get('subcategory'),
            title=data.get('title'),
            content=data.get('content'),
            keywords=json.dumps(data.get('keywords', [])),
            language=data.get('language', 'ar'),
            source_type='manual',
            source_reference=data.get('source_reference'),
            created_by=user_id
        )
        
        db.session.add(knowledge)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إضافة المعرفة بنجاح',
            'knowledge': knowledge.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@intelligent_assistant_bp.route('/intent-patterns', methods=['GET'])
@jwt_required()
def get_intent_patterns():
    """الحصول على أنماط النوايا"""
    try:
        patterns = AIIntentPattern.query.filter_by(is_active=True).order_by(
            AIIntentPattern.priority.desc()
        ).all()
        
        return jsonify({
            'success': True,
            'patterns': [pattern.to_dict() for pattern in patterns]
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@intelligent_assistant_bp.route('/intent-patterns', methods=['POST'])
@jwt_required()
def add_intent_pattern():
    """إضافة نمط نية جديد"""
    try:
        data = request.get_json()
        
        pattern = AIIntentPattern(
            intent_name=data.get('intent_name'),
            pattern_text=data.get('pattern_text'),
            pattern_type=data.get('pattern_type', 'keyword'),
            language=data.get('language', 'ar'),
            confidence_threshold=data.get('confidence_threshold', 0.7),
            response_template=data.get('response_template'),
            action_type=data.get('action_type'),
            action_parameters=json.dumps(data.get('action_parameters', {})),
            priority=data.get('priority', 1)
        )
        
        db.session.add(pattern)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إضافة نمط النية بنجاح',
            'pattern': pattern.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@intelligent_assistant_bp.route('/user-preferences', methods=['GET'])
@jwt_required()
def get_user_preferences():
    """الحصول على تفضيلات المستخدم"""
    try:
        user_id = get_jwt_identity()
        preferences = AIUserPreference.query.filter_by(user_id=user_id).first()
        
        if preferences:
            return jsonify({
                'success': True,
                'preferences': preferences.to_dict()
            })
        else:
            return jsonify({
                'success': True,
                'preferences': None,
                'message': 'لا توجد تفضيلات محفوظة'
            })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@intelligent_assistant_bp.route('/user-preferences', methods=['POST'])
@jwt_required()
def save_user_preferences():
    """حفظ تفضيلات المستخدم"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        preferences = AIUserPreference.query.filter_by(user_id=user_id).first()
        
        if preferences:
            # تحديث التفضيلات الموجودة
            preferences.preferred_language = data.get('preferred_language', preferences.preferred_language)
            preferences.communication_style = data.get('communication_style', preferences.communication_style)
            preferences.response_length = data.get('response_length', preferences.response_length)
            preferences.topics_of_interest = json.dumps(data.get('topics_of_interest', []))
            preferences.notification_preferences = json.dumps(data.get('notification_preferences', {}))
            preferences.accessibility_settings = json.dumps(data.get('accessibility_settings', {}))
            preferences.privacy_level = data.get('privacy_level', preferences.privacy_level)
            preferences.learning_mode = data.get('learning_mode', preferences.learning_mode)
            preferences.updated_at = datetime.utcnow()
        else:
            # إنشاء تفضيلات جديدة
            preferences = AIUserPreference(
                user_id=user_id,
                preferred_language=data.get('preferred_language', 'ar'),
                communication_style=data.get('communication_style', 'formal'),
                response_length=data.get('response_length', 'medium'),
                topics_of_interest=json.dumps(data.get('topics_of_interest', [])),
                notification_preferences=json.dumps(data.get('notification_preferences', {})),
                accessibility_settings=json.dumps(data.get('accessibility_settings', {})),
                privacy_level=data.get('privacy_level', 'standard'),
                learning_mode=data.get('learning_mode', True)
            )
            db.session.add(preferences)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم حفظ التفضيلات بنجاح',
            'preferences': preferences.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@intelligent_assistant_bp.route('/analytics', methods=['GET'])
@jwt_required()
def get_analytics():
    """الحصول على تحليلات المساعد الذكي"""
    try:
        days = request.args.get('days', 30, type=int)
        summary = ai_service.get_analytics_summary(days)
        
        return jsonify({
            'success': True,
            'analytics': summary
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@intelligent_assistant_bp.route('/feedback', methods=['POST'])
@jwt_required()
def submit_feedback():
    """إرسال تقييم أو ملاحظة"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        feedback = AIFeedback(
            user_id=user_id,
            conversation_id=data.get('conversation_id'),
            message_id=data.get('message_id'),
            feedback_type=data.get('feedback_type', 'suggestion'),
            rating=data.get('rating'),
            comment=data.get('comment'),
            category=data.get('category', 'general')
        )
        
        db.session.add(feedback)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إرسال التقييم بنجاح',
            'feedback': feedback.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@intelligent_assistant_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard():
    """لوحة تحكم المساعد الذكي"""
    try:
        # إحصائيات عامة
        total_conversations = AIAssistantConversation.query.count()
        total_messages = AIAssistantMessage.query.count()
        total_knowledge = AIKnowledgeBase.query.filter_by(is_active=True).count()
        total_patterns = AIIntentPattern.query.filter_by(is_active=True).count()
        
        # متوسط الرضا
        conversations_with_rating = AIAssistantConversation.query.filter(
            AIAssistantConversation.satisfaction_rating.isnot(None)
        ).all()
        
        avg_satisfaction = 0
        if conversations_with_rating:
            total_rating = sum(c.satisfaction_rating for c in conversations_with_rating)
            avg_satisfaction = round(total_rating / len(conversations_with_rating), 2)
        
        # أكثر النوايا استخداماً
        from sqlalchemy import func
        top_intents = db.session.query(
            AIAssistantMessage.intent,
            func.count(AIAssistantMessage.id).label('count')
        ).filter(
            AIAssistantMessage.intent.isnot(None)
        ).group_by(AIAssistantMessage.intent).order_by(
            func.count(AIAssistantMessage.id).desc()
        ).limit(5).all()
        
        # الاستخدام اليومي (آخر 7 أيام)
        from datetime import timedelta
        end_date = date.today()
        start_date = end_date - timedelta(days=7)
        
        daily_usage = db.session.query(
            func.date(AIAssistantMessage.created_at).label('date'),
            func.count(AIAssistantMessage.id).label('count')
        ).filter(
            func.date(AIAssistantMessage.created_at) >= start_date
        ).group_by(
            func.date(AIAssistantMessage.created_at)
        ).order_by('date').all()
        
        return jsonify({
            'success': True,
            'dashboard': {
                'stats': {
                    'total_conversations': total_conversations,
                    'total_messages': total_messages,
                    'total_knowledge': total_knowledge,
                    'total_patterns': total_patterns,
                    'avg_satisfaction': avg_satisfaction
                },
                'top_intents': [{'intent': intent, 'count': count} for intent, count in top_intents],
                'daily_usage': [{'date': str(date), 'count': count} for date, count in daily_usage]
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@intelligent_assistant_bp.route('/quick-responses', methods=['GET'])
@jwt_required()
def get_quick_responses():
    """الحصول على الردود السريعة"""
    try:
        category = request.args.get('category', 'general')
        
        # ردود سريعة مبرمجة مسبقاً
        quick_responses = {
            'general': [
                "كيف يمكنني مساعدتك؟",
                "هل تحتاج معلومات إضافية؟",
                "يمكنني توضيح أي نقطة تريدها",
                "هل هناك شيء آخر تود معرفته؟"
            ],
            'medical': [
                "ما نوع الاستفسار الطبي؟",
                "هل تريد معلومات عن البرامج العلاجية؟",
                "يمكنني مساعدتك في فهم التقييمات الطبية",
                "هل تحتاج توضيحاً حول الأدوية؟"
            ],
            'educational': [
                "ما البرنامج التعليمي المطلوب؟",
                "هل تريد معلومات عن المناهج؟",
                "يمكنني شرح طرق التدريس المستخدمة",
                "هل تحتاج معلومات عن التقييمات الأكاديمية؟"
            ]
        }
        
        return jsonify({
            'success': True,
            'responses': quick_responses.get(category, quick_responses['general'])
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
