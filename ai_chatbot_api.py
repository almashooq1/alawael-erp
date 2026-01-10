#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
AI Chatbot API
Intelligent chatbot endpoints for Al-Awael Centers
"""

from flask import Blueprint, request, jsonify, session
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
import uuid
import json
import re
from textblob import TextBlob
import openai
import os

from database import db
from ai_chatbot_models import *
from models import User, Student

# Create blueprint
ai_chatbot_bp = Blueprint('ai_chatbot', __name__, url_prefix='/api/chatbot')

# OpenAI configuration (if available)
openai.api_key = os.getenv('OPENAI_API_KEY')

class ChatbotService:
    """خدمة الدردشة الذكية"""
    
    def __init__(self):
        self.knowledge_base = self._load_knowledge_base()
        self.intents = {
            'student_info': ['طالب', 'معلومات', 'بيانات', 'student', 'information'],
            'appointment_booking': ['موعد', 'حجز', 'جلسة', 'appointment', 'booking'],
            'progress_inquiry': ['تقدم', 'تطور', 'نتائج', 'progress', 'development'],
            'general_info': ['معلومات', 'خدمات', 'برامج', 'info', 'services'],
            'complaint': ['شكوى', 'مشكلة', 'complaint', 'problem'],
            'emergency': ['طوارئ', 'عاجل', 'emergency', 'urgent']
        }
    
    def _load_knowledge_base(self):
        """تحميل قاعدة المعرفة"""
        return ChatbotKnowledgeBase.query.filter_by(is_active=True).all()
    
    def detect_language(self, text):
        """كشف لغة النص"""
        try:
            blob = TextBlob(text)
            if blob.detect_language() == 'ar':
                return ChatbotLanguage.ARABIC
            else:
                return ChatbotLanguage.ENGLISH
        except:
            # Default to Arabic if detection fails
            return ChatbotLanguage.ARABIC
    
    def detect_intent(self, text):
        """كشف نية المستخدم"""
        text_lower = text.lower()
        intent_scores = {}
        
        for intent, keywords in self.intents.items():
            score = 0
            for keyword in keywords:
                if keyword in text_lower:
                    score += 1
            if score > 0:
                intent_scores[intent] = score
        
        if intent_scores:
            best_intent = max(intent_scores, key=intent_scores.get)
            confidence = intent_scores[best_intent] / len(text.split())
            return ChatbotIntent(best_intent), confidence
        
        return ChatbotIntent.GENERAL_INFO, 0.1
    
    def find_best_answer(self, text, language, intent):
        """البحث عن أفضل إجابة"""
        text_lower = text.lower()
        best_match = None
        best_score = 0
        
        for kb_item in self.knowledge_base:
            if kb_item.intent == intent or intent == ChatbotIntent.GENERAL_INFO:
                score = 0
                keywords = kb_item.keywords or []
                
                for keyword in keywords:
                    if keyword.lower() in text_lower:
                        score += 1
                
                if score > best_score:
                    best_score = score
                    best_match = kb_item
        
        if best_match:
            if language == ChatbotLanguage.ARABIC:
                return best_match.answer_ar, best_score / len(text.split())
            else:
                return best_match.answer_en or best_match.answer_ar, best_score / len(text.split())
        
        return None, 0
    
    def generate_ai_response(self, text, language, context):
        """توليد رد ذكي باستخدام AI"""
        try:
            if not openai.api_key:
                return self.get_fallback_response(language)
            
            system_prompt = """أنت مساعد ذكي لمراكز الأوائل لذوي الاحتياجات الخاصة. 
            تجيب بطريقة مفيدة ومتعاطفة. إذا لم تعرف الإجابة، اطلب من المستخدم التواصل مع الموظفين."""
            
            if language == ChatbotLanguage.ENGLISH:
                system_prompt = """You are an AI assistant for Al-Awael Centers for special needs. 
                Answer helpfully and empathetically. If you don't know, ask user to contact staff."""
            
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": text}
                ],
                max_tokens=200,
                temperature=0.7
            )
            
            return response.choices[0].message.content.strip()
        
        except Exception as e:
            return self.get_fallback_response(language)
    
    def get_fallback_response(self, language):
        """رد احتياطي"""
        if language == ChatbotLanguage.ARABIC:
            return "أعتذر، لم أتمكن من فهم استفسارك بوضوح. يرجى التواصل مع فريق الدعم للمساعدة."
        else:
            return "I apologize, I couldn't understand your inquiry clearly. Please contact our support team for assistance."

# Initialize chatbot service
chatbot_service = ChatbotService()

@ai_chatbot_bp.route('/start-session', methods=['POST'])
def start_chat_session():
    """بدء جلسة دردشة جديدة"""
    try:
        data = request.get_json()
        user_type = data.get('user_type', 'visitor')
        language = data.get('language', 'ar')
        
        # Get current user if authenticated
        current_user_id = None
        try:
            current_user_id = get_jwt_identity()
        except:
            pass
        
        # Create new session
        session_token = str(uuid.uuid4())
        chat_session = ChatbotSession(
            user_id=current_user_id,
            session_token=session_token,
            language=ChatbotLanguage.ARABIC if language == 'ar' else ChatbotLanguage.ENGLISH,
            user_type=user_type,
            context_data=data.get('context', {})
        )
        
        db.session.add(chat_session)
        db.session.commit()
        
        # Welcome message
        welcome_msg = "مرحباً بك في مساعد الأوائل الذكي! كيف يمكنني مساعدتك اليوم؟"
        if language == 'en':
            welcome_msg = "Welcome to Al-Awael Smart Assistant! How can I help you today?"
        
        # Create welcome message
        welcome_message = ChatbotMessage(
            session_id=chat_session.id,
            message_text=welcome_msg,
            is_from_user=False,
            intent=ChatbotIntent.GENERAL_INFO,
            confidence_score=1.0,
            response_time=0.1
        )
        
        db.session.add(welcome_message)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'session_token': session_token,
            'session_id': chat_session.id,
            'welcome_message': welcome_msg
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ai_chatbot_bp.route('/send-message', methods=['POST'])
def send_message():
    """إرسال رسالة للبوت"""
    try:
        data = request.get_json()
        session_token = data.get('session_token')
        message_text = data.get('message', '').strip()
        
        if not session_token or not message_text:
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        # Find session
        chat_session = ChatbotSession.query.filter_by(
            session_token=session_token,
            is_active=True
        ).first()
        
        if not chat_session:
            return jsonify({'success': False, 'error': 'Invalid session'}), 404
        
        start_time = datetime.utcnow()
        
        # Save user message
        user_message = ChatbotMessage(
            session_id=chat_session.id,
            message_text=message_text,
            is_from_user=True,
            timestamp=start_time
        )
        db.session.add(user_message)
        
        # Process message
        language = chat_session.language
        intent, confidence = chatbot_service.detect_intent(message_text)
        
        # Find answer from knowledge base
        answer, kb_confidence = chatbot_service.find_best_answer(message_text, language, intent)
        
        # If no good answer found, use AI
        if not answer or kb_confidence < 0.3:
            answer = chatbot_service.generate_ai_response(
                message_text, 
                language, 
                chat_session.context_data
            )
            confidence = 0.8
        else:
            confidence = kb_confidence
        
        response_time = (datetime.utcnow() - start_time).total_seconds()
        
        # Save bot response
        bot_message = ChatbotMessage(
            session_id=chat_session.id,
            message_text=answer,
            is_from_user=False,
            intent=intent,
            confidence_score=confidence,
            response_time=response_time
        )
        
        db.session.add(bot_message)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'response': answer,
            'intent': intent.value,
            'confidence': confidence,
            'response_time': response_time
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ai_chatbot_bp.route('/end-session', methods=['POST'])
def end_chat_session():
    """إنهاء جلسة الدردشة"""
    try:
        data = request.get_json()
        session_token = data.get('session_token')
        satisfaction_rating = data.get('rating')
        
        chat_session = ChatbotSession.query.filter_by(
            session_token=session_token,
            is_active=True
        ).first()
        
        if not chat_session:
            return jsonify({'success': False, 'error': 'Session not found'}), 404
        
        chat_session.end_time = datetime.utcnow()
        chat_session.is_active = False
        if satisfaction_rating:
            chat_session.satisfaction_rating = satisfaction_rating
        
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Session ended successfully'})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ai_chatbot_bp.route('/feedback', methods=['POST'])
def submit_feedback():
    """تقديم تقييم للبوت"""
    try:
        data = request.get_json()
        session_token = data.get('session_token')
        rating = data.get('rating')
        feedback_text = data.get('feedback')
        
        chat_session = ChatbotSession.query.filter_by(
            session_token=session_token
        ).first()
        
        if not chat_session:
            return jsonify({'success': False, 'error': 'Session not found'}), 404
        
        feedback = ChatbotFeedback(
            session_id=chat_session.id,
            rating=rating,
            feedback_text=feedback_text,
            is_helpful=rating >= 4
        )
        
        db.session.add(feedback)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Feedback submitted successfully'})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ai_chatbot_bp.route('/analytics', methods=['GET'])
@jwt_required()
def get_chatbot_analytics():
    """إحصائيات البوت"""
    try:
        days = request.args.get('days', 30, type=int)
        start_date = datetime.utcnow().date() - timedelta(days=days)
        
        analytics = ChatbotAnalytics.query.filter(
            ChatbotAnalytics.date >= start_date
        ).order_by(ChatbotAnalytics.date.desc()).all()
        
        total_sessions = sum(a.total_sessions for a in analytics)
        total_messages = sum(a.total_messages for a in analytics)
        avg_satisfaction = sum(a.avg_satisfaction or 0 for a in analytics) / len(analytics) if analytics else 0
        
        return jsonify({
            'success': True,
            'analytics': {
                'total_sessions': total_sessions,
                'total_messages': total_messages,
                'avg_satisfaction': round(avg_satisfaction, 2),
                'daily_data': [{
                    'date': a.date.isoformat(),
                    'sessions': a.total_sessions,
                    'messages': a.total_messages,
                    'avg_duration': a.avg_session_duration,
                    'satisfaction': a.avg_satisfaction
                } for a in analytics]
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@ai_chatbot_bp.route('/knowledge-base', methods=['GET', 'POST'])
@jwt_required()
def manage_knowledge_base():
    """إدارة قاعدة المعرفة"""
    if request.method == 'GET':
        try:
            page = request.args.get('page', 1, type=int)
            per_page = request.args.get('per_page', 20, type=int)
            category = request.args.get('category')
            
            query = ChatbotKnowledgeBase.query
            if category:
                query = query.filter_by(category=category)
            
            kb_items = query.paginate(
                page=page, per_page=per_page, error_out=False
            )
            
            return jsonify({
                'success': True,
                'items': [{
                    'id': item.id,
                    'category': item.category,
                    'question_ar': item.question_ar,
                    'answer_ar': item.answer_ar,
                    'intent': item.intent.value if item.intent else None,
                    'usage_count': item.usage_count,
                    'is_active': item.is_active
                } for item in kb_items.items],
                'pagination': {
                    'page': page,
                    'pages': kb_items.pages,
                    'total': kb_items.total
                }
            })
            
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    
    elif request.method == 'POST':
        try:
            data = request.get_json()
            current_user = get_jwt_identity()
            
            kb_item = ChatbotKnowledgeBase(
                category=data.get('category'),
                question_ar=data.get('question_ar'),
                question_en=data.get('question_en'),
                answer_ar=data.get('answer_ar'),
                answer_en=data.get('answer_en'),
                keywords=data.get('keywords', []),
                intent=ChatbotIntent(data.get('intent')) if data.get('intent') else None,
                priority=data.get('priority', 1),
                created_by=current_user
            )
            
            db.session.add(kb_item)
            db.session.commit()
            
            return jsonify({'success': True, 'message': 'Knowledge base item added successfully'})
            
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
