#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
API endpoints للذكاء الاصطناعي في الاتصالات
AI Communications API Endpoints
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
import json
from app import db
from ai_communications_models import *
from ai_communications_services import *

# إنشاء Blueprint
ai_comm_bp = Blueprint('ai_communications', __name__, url_prefix='/api/ai-communications')

# خدمات الذكاء الاصطناعي
chatbot_service = AIChatbotService()
sentiment_service = AISentimentAnalysisService()
auto_response_service = AIAutoResponseService()
classification_service = AIMessageClassificationService()
analytics_service = AIAnalyticsService()

@ai_comm_bp.route('/chatbot/chat', methods=['POST'])
@jwt_required()
def chat_with_bot():
    """محادثة مع الشات بوت"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        message = data.get('message', '').strip()
        conversation_id = data.get('conversation_id')
        chatbot_id = data.get('chatbot_id', 1)
        
        if not message:
            return jsonify({'error': 'الرسالة مطلوبة'}), 400
        
        # البحث عن المحادثة أو إنشاء جديدة
        if conversation_id:
            conversation = AIChatConversation.query.filter_by(
                conversation_id=conversation_id
            ).first()
        else:
            conversation = AIChatConversation(
                chatbot_id=chatbot_id,
                user_id=current_user_id,
                channel='web'
            )
            db.session.add(conversation)
            db.session.flush()
        
        # حفظ رسالة المستخدم
        user_message = AIChatMessage(
            conversation_id=conversation.id,
            sender_type='user',
            message_text=message,
            created_at=datetime.utcnow()
        )
        db.session.add(user_message)
        
        # معالجة الرسالة بالذكاء الاصطناعي
        start_time = datetime.utcnow()
        ai_response = chatbot_service.process_message(message, {
            'user_id': current_user_id,
            'conversation_id': conversation.conversation_id
        })
        response_time = (datetime.utcnow() - start_time).total_seconds()
        
        # حفظ رد البوت
        bot_message = AIChatMessage(
            conversation_id=conversation.id,
            sender_type='bot',
            message_text=ai_response['response'],
            intent=ai_response.get('intent'),
            confidence_score=ai_response.get('confidence'),
            response_time=response_time,
            knowledge_base_id=ai_response.get('knowledge_base_id'),
            created_at=datetime.utcnow()
        )
        db.session.add(bot_message)
        
        # تحليل المشاعر للرسالة
        sentiment_analysis = sentiment_service.analyze_sentiment(message)
        user_message.sentiment = sentiment_analysis['sentiment']
        user_message.sentiment_score = sentiment_analysis['score']
        user_message.entities = json.dumps(ai_response.get('entities', []), ensure_ascii=False)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'conversation_id': conversation.conversation_id,
            'response': ai_response['response'],
            'intent': ai_response.get('intent'),
            'confidence': ai_response.get('confidence'),
            'response_time': response_time,
            'sentiment': sentiment_analysis
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'خطأ في المحادثة: {str(e)}'}), 500

@ai_comm_bp.route('/sentiment/analyze', methods=['POST'])
@jwt_required()
def analyze_sentiment():
    """تحليل مشاعر النص"""
    try:
        data = request.get_json()
        text = data.get('text', '').strip()
        message_id = data.get('message_id')
        message_type = data.get('message_type', 'general')
        
        if not text:
            return jsonify({'error': 'النص مطلوب'}), 400
        
        # تحليل المشاعر
        analysis = sentiment_service.analyze_sentiment(text)
        
        # حفظ التحليل في قاعدة البيانات
        if message_id:
            sentiment_record = AISentimentAnalysis(
                message_id=message_id,
                message_type=message_type,
                text_content=text,
                sentiment=analysis['sentiment'],
                sentiment_score=analysis['score'],
                emotions=json.dumps(analysis.get('emotions', {}), ensure_ascii=False),
                confidence=analysis['confidence'],
                analyzed_at=datetime.utcnow()
            )
            db.session.add(sentiment_record)
            db.session.commit()
        
        return jsonify({
            'success': True,
            'sentiment': analysis['sentiment'],
            'score': analysis['score'],
            'confidence': analysis['confidence'],
            'emotions': analysis.get('emotions', {}),
            'analysis_id': sentiment_record.id if message_id else None
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'خطأ في تحليل المشاعر: {str(e)}'}), 500

@ai_comm_bp.route('/auto-response/suggest', methods=['POST'])
@jwt_required()
def suggest_auto_responses():
    """اقتراح ردود تلقائية"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        message = data.get('message', '').strip()
        context = data.get('context', {})
        
        if not message:
            return jsonify({'error': 'الرسالة مطلوبة'}), 400
        
        # إضافة معلومات المستخدم للسياق
        context['user_id'] = current_user_id
        
        # الحصول على اقتراحات الردود
        suggestions = auto_response_service.suggest_responses(message, context)
        
        return jsonify({
            'success': True,
            'suggestions': suggestions,
            'count': len(suggestions)
        })
        
    except Exception as e:
        return jsonify({'error': f'خطأ في اقتراح الردود: {str(e)}'}), 500

@ai_comm_bp.route('/classification/classify', methods=['POST'])
@jwt_required()
def classify_message():
    """تصنيف الرسالة تلقائياً"""
    try:
        data = request.get_json()
        message = data.get('message', '').strip()
        message_id = data.get('message_id')
        message_type = data.get('message_type', 'general')
        
        if not message:
            return jsonify({'error': 'الرسالة مطلوبة'}), 400
        
        # تصنيف الرسالة
        classification = classification_service.classify_message(message, data.get('metadata', {}))
        
        # حفظ التصنيف في قاعدة البيانات
        if message_id:
            classification_record = AIMessageClassification(
                message_id=message_id,
                message_type=message_type,
                classification=classification['category'],
                priority_level=classification['priority_level'],
                category=classification['category'],
                tags=json.dumps(classification['tags'], ensure_ascii=False),
                confidence_score=classification['confidence_score'],
                requires_human=classification['requires_human'],
                escalation_reason=classification.get('escalation_reason'),
                classified_at=datetime.utcnow()
            )
            db.session.add(classification_record)
            db.session.commit()
        
        return jsonify({
            'success': True,
            'classification': classification,
            'classification_id': classification_record.id if message_id else None
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'خطأ في تصنيف الرسالة: {str(e)}'}), 500

@ai_comm_bp.route('/knowledge-base', methods=['GET'])
@jwt_required()
def get_knowledge_base():
    """الحصول على قاعدة المعرفة"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        category = request.args.get('category')
        search = request.args.get('search')
        
        query = AIKnowledgeBase.query.filter_by(is_active=True)
        
        if category:
            query = query.filter(AIKnowledgeBase.category == category)
        
        if search:
            query = query.filter(
                db.or_(
                    AIKnowledgeBase.question.contains(search),
                    AIKnowledgeBase.answer.contains(search),
                    AIKnowledgeBase.keywords.contains(search)
                )
            )
        
        knowledge_items = query.order_by(AIKnowledgeBase.usage_count.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'knowledge_base': [{
                'id': item.id,
                'category': item.category,
                'question': item.question,
                'answer': item.answer,
                'keywords': item.get_keywords_list(),
                'confidence_score': item.confidence_score,
                'usage_count': item.usage_count,
                'success_rate': item.success_rate,
                'created_at': item.created_at.isoformat()
            } for item in knowledge_items.items],
            'pagination': {
                'page': page,
                'pages': knowledge_items.pages,
                'per_page': per_page,
                'total': knowledge_items.total
            }
        })
        
    except Exception as e:
        return jsonify({'error': f'خطأ في جلب قاعدة المعرفة: {str(e)}'}), 500

@ai_comm_bp.route('/knowledge-base', methods=['POST'])
@jwt_required()
def add_knowledge_item():
    """إضافة عنصر لقاعدة المعرفة"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        required_fields = ['category', 'question', 'answer']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} مطلوب'}), 400
        
        knowledge_item = AIKnowledgeBase(
            category=data['category'],
            question=data['question'],
            answer=data['answer'],
            confidence_score=data.get('confidence_score', 1.0),
            language=data.get('language', 'ar'),
            created_by=current_user_id
        )
        
        # إضافة الكلمات المفتاحية
        if data.get('keywords'):
            knowledge_item.set_keywords_list(data['keywords'])
        
        db.session.add(knowledge_item)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم إضافة العنصر بنجاح',
            'knowledge_item_id': knowledge_item.id
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'خطأ في إضافة العنصر: {str(e)}'}), 500

@ai_comm_bp.route('/analytics/dashboard', methods=['GET'])
@jwt_required()
def get_ai_dashboard():
    """لوحة تحكم الذكاء الاصطناعي"""
    try:
        # إحصائيات الشات بوت
        total_conversations = AIChatConversation.query.count()
        active_conversations = AIChatConversation.query.filter_by(status='active').count()
        total_messages = AIChatMessage.query.count()
        
        # إحصائيات تحليل المشاعر
        sentiment_stats = db.session.query(
            AISentimentAnalysis.sentiment,
            db.func.count(AISentimentAnalysis.id)
        ).group_by(AISentimentAnalysis.sentiment).all()
        
        # إحصائيات التصنيف
        classification_stats = db.session.query(
            AIMessageClassification.priority_level,
            db.func.count(AIMessageClassification.id)
        ).group_by(AIMessageClassification.priority_level).all()
        
        # متوسط وقت الاستجابة
        avg_response_time = db.session.query(
            db.func.avg(AIChatMessage.response_time)
        ).filter(AIChatMessage.sender_type == 'bot').scalar() or 0
        
        # معدل الثقة
        avg_confidence = db.session.query(
            db.func.avg(AIChatMessage.confidence_score)
        ).filter(AIChatMessage.confidence_score.isnot(None)).scalar() or 0
        
        # الرسائل التي تحتاج تدخل بشري
        human_intervention_count = AIMessageClassification.query.filter_by(
            requires_human=True
        ).count()
        
        return jsonify({
            'success': True,
            'dashboard': {
                'chatbot_stats': {
                    'total_conversations': total_conversations,
                    'active_conversations': active_conversations,
                    'total_messages': total_messages,
                    'avg_response_time': round(avg_response_time, 2),
                    'avg_confidence': round(avg_confidence, 2)
                },
                'sentiment_distribution': dict(sentiment_stats),
                'priority_distribution': dict(classification_stats),
                'human_intervention': {
                    'count': human_intervention_count,
                    'percentage': round((human_intervention_count / max(total_messages, 1)) * 100, 2)
                }
            }
        })
        
    except Exception as e:
        return jsonify({'error': f'خطأ في جلب لوحة التحكم: {str(e)}'}), 500

@ai_comm_bp.route('/analytics/insights', methods=['POST'])
@jwt_required()
def generate_insights():
    """توليد رؤى تحليلية"""
    try:
        data = request.get_json()
        period_days = data.get('period_days', 30)
        
        # جمع البيانات للفترة المحددة
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=period_days)
        
        # بيانات الرسائل
        daily_messages = db.session.query(
            db.func.date(AIChatMessage.created_at),
            db.func.count(AIChatMessage.id)
        ).filter(
            AIChatMessage.created_at >= start_date
        ).group_by(db.func.date(AIChatMessage.created_at)).all()
        
        # بيانات المشاعر
        sentiment_data = db.session.query(
            AISentimentAnalysis.sentiment,
            db.func.count(AISentimentAnalysis.id)
        ).filter(
            AISentimentAnalysis.analyzed_at >= start_date
        ).group_by(AISentimentAnalysis.sentiment).all()
        
        # إعداد البيانات للتحليل
        analysis_data = {
            'daily_messages': [count for date, count in daily_messages],
            'message_count': sum(count for date, count in daily_messages),
            'sentiment_distribution': dict(sentiment_data),
            'period_days': period_days
        }
        
        # توليد الرؤى
        insights = analytics_service.generate_communication_insights(analysis_data)
        
        # حفظ التقرير
        report = AIAnalyticsReport(
            report_type='communication_insights',
            report_name=f'رؤى الاتصالات - {period_days} يوم',
            description='تحليل شامل لبيانات الاتصالات والذكاء الاصطناعي',
            data_source='ai_communications',
            insights=json.dumps(insights, ensure_ascii=False),
            generated_by=get_jwt_identity(),
            report_period_start=start_date,
            report_period_end=end_date
        )
        db.session.add(report)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'insights': insights,
            'report_id': report.id
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'خطأ في توليد الرؤى: {str(e)}'}), 500

@ai_comm_bp.route('/feedback', methods=['POST'])
@jwt_required()
def submit_feedback():
    """تقديم تغذية راجعة للتعلم"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        required_fields = ['interaction_type', 'interaction_id', 'feedback_type']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} مطلوب'}), 400
        
        feedback = AILearningFeedback(
            interaction_type=data['interaction_type'],
            interaction_id=data['interaction_id'],
            feedback_type=data['feedback_type'],
            feedback_score=data.get('feedback_score'),
            feedback_text=data.get('feedback_text'),
            user_id=current_user_id,
            improvement_suggestion=data.get('improvement_suggestion')
        )
        
        db.session.add(feedback)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'تم تسجيل التغذية الراجعة بنجاح',
            'feedback_id': feedback.id
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'خطأ في تسجيل التغذية الراجعة: {str(e)}'}), 500

@ai_comm_bp.route('/performance/metrics', methods=['GET'])
@jwt_required()
def get_performance_metrics():
    """الحصول على مقاييس الأداء"""
    try:
        period_days = request.args.get('period_days', 30, type=int)
        metric_type = request.args.get('metric_type')
        
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=period_days)
        
        query = AIPerformanceMetrics.query.filter(
            AIPerformanceMetrics.calculated_at >= start_date
        )
        
        if metric_type:
            query = query.filter(AIPerformanceMetrics.metric_type == metric_type)
        
        metrics = query.order_by(AIPerformanceMetrics.calculated_at.desc()).all()
        
        return jsonify({
            'success': True,
            'metrics': [{
                'id': metric.id,
                'metric_type': metric.metric_type,
                'metric_name': metric.metric_name,
                'metric_value': metric.metric_value,
                'metric_unit': metric.metric_unit,
                'benchmark_value': metric.benchmark_value,
                'target_value': metric.target_value,
                'trend': metric.trend,
                'performance_status': metric.performance_status,
                'calculated_at': metric.calculated_at.isoformat()
            } for metric in metrics]
        })
        
    except Exception as e:
        return jsonify({'error': f'خطأ في جلب مقاييس الأداء: {str(e)}'}), 500

@ai_comm_bp.route('/chatbots', methods=['GET'])
@jwt_required()
def get_chatbots():
    """الحصول على قائمة الشات بوتس"""
    try:
        chatbots = AIChatbot.query.filter_by(is_active=True).all()
        
        return jsonify({
            'success': True,
            'chatbots': [{
                'id': bot.id,
                'name': bot.name,
                'description': bot.description,
                'bot_type': bot.bot_type,
                'greeting_message': bot.greeting_message,
                'confidence_threshold': bot.confidence_threshold,
                'learning_enabled': bot.learning_enabled,
                'created_at': bot.created_at.isoformat()
            } for bot in chatbots]
        })
        
    except Exception as e:
        return jsonify({'error': f'خطأ في جلب الشات بوتس: {str(e)}'}), 500

@ai_comm_bp.route('/conversations/<conversation_id>/history', methods=['GET'])
@jwt_required()
def get_conversation_history(conversation_id):
    """الحصول على تاريخ المحادثة"""
    try:
        conversation = AIChatConversation.query.filter_by(
            conversation_id=conversation_id
        ).first()
        
        if not conversation:
            return jsonify({'error': 'المحادثة غير موجودة'}), 404
        
        messages = AIChatMessage.query.filter_by(
            conversation_id=conversation.id
        ).order_by(AIChatMessage.created_at).all()
        
        return jsonify({
            'success': True,
            'conversation': {
                'id': conversation.conversation_id,
                'status': conversation.status,
                'started_at': conversation.started_at.isoformat(),
                'ended_at': conversation.ended_at.isoformat() if conversation.ended_at else None
            },
            'messages': [{
                'id': msg.id,
                'sender_type': msg.sender_type,
                'message_text': msg.message_text,
                'intent': msg.intent,
                'confidence_score': msg.confidence_score,
                'sentiment': msg.sentiment,
                'sentiment_score': msg.sentiment_score,
                'response_time': msg.response_time,
                'created_at': msg.created_at.isoformat()
            } for msg in messages]
        })
        
    except Exception as e:
        return jsonify({'error': f'خطأ في جلب تاريخ المحادثة: {str(e)}'}), 500
