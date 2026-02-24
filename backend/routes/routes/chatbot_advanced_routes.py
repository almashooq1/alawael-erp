#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
ADVANCED CHATBOT ROUTES - متقدم
واجهات برمجية شاملة للـ Chatbot الذكي
"""

from flask import Blueprint, request, jsonify, session
from datetime import datetime, timedelta
import logging
import json
import os
import sys

# إضافة المسار للموارد
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../alawael-erp')))

try:
    from advanced_intelligent_assistant import (
        intelligent_assistant_service,
        cache_manager,
        error_handler,
        monitoring_service,
        NLPProcessor,
        IntentClassifier
    )
except ImportError as e:
    print(f"Error importing from advanced_intelligent_assistant: {e}")

# إعداد Blueprint
chatbot_bp = Blueprint('chatbot_advanced', __name__, url_prefix='/api/v2/chatbot')

# إعداد Logging
logger = logging.getLogger(__name__)


# ========================
# MIDDLEWARE & HELPERS
# ========================

def require_session():
    """Decorator للتحقق من الجلسة"""
    def decorator(f):
        def wrapped(*args, **kwargs):
            session_id = request.headers.get('X-Session-ID') or session.get('session_id')
            if not session_id:
                return jsonify({'error': 'جلسة غير صالحة'}), 401
            return f(session_id, *args, **kwargs)
        return wrapped
    return decorator


def get_user_language():
    """الحصول على اللغة المفضلة للمستخدم"""
    return request.headers.get('Accept-Language', 'ar').split('-')[0]


# ========================
# SESSION ROUTES
# ========================

@chatbot_bp.route('/session/start', methods=['POST'])
def start_session():
    """بدء جلسة محادثة جديدة"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        conversation_type = data.get('type', 'general')
        context_data = data.get('context', {})

        if not user_id:
            return jsonify({'error': 'user_id مطلوب'}), 400

        # بدء الجلسة
        session_id = intelligent_assistant_service.start_conversation(
            user_id, 
            conversation_type=conversation_type,
            context_data=context_data
        )

        session['session_id'] = session_id

        return jsonify({
            'success': True,
            'session_id': session_id,
            'message': 'تم بدء الجلسة بنجاح',
            'user_id': user_id
        }), 201

    except Exception as e:
        logger.error(f"Error starting session: {e}")
        error_id = error_handler.register_error('session_error', str(e))
        return error_handler.handle_error('system_error', str(e), get_user_language()), 500


@chatbot_bp.route('/session/<session_id>/end', methods=['POST'])
@require_session()
def end_session(session_id):
    """إنهاء جلسة محادثة"""
    try:
        if session_id in intelligent_assistant_service.conversations:
            intelligent_assistant_service.conversations[session_id]['status'] = 'closed'
            intelligent_assistant_service.conversations[session_id]['closed_at'] = datetime.now()

        return jsonify({
            'success': True,
            'message': 'تم إنهاء الجلسة بنجاح'
        }), 200

    except Exception as e:
        logger.error(f"Error ending session: {e}")
        return error_handler.handle_error('system_error', str(e), get_user_language()), 500


# ========================
# MESSAGE ROUTES
# ========================

@chatbot_bp.route('/message/send', methods=['POST'])
def send_message():
    """إرسال رسالة للـ Chatbot"""
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        message = data.get('message', '').strip()
        user_id = data.get('user_id')

        if not session_id or not message:
            return jsonify({'error': 'session_id و message مطلوبان'}), 400

        if len(message) > 5000:
            return jsonify({'error': 'الرسالة طويلة جداً (الحد الأقصى 5000 حرف)'}), 400

        # معالجة الرسالة
        result = intelligent_assistant_service.process_message(
            session_id, 
            message,
            user_id=user_id
        )

        # تتبع الأداء
        monitoring_service.track_performance(
            'message_processing_time',
            result.get('response_time', 0)
        )

        # التخزين المؤقت للنتيجة
        cache_key = f"message_{session_id}_{hash(message)}"
        cache_manager.set(cache_key, result)

        return jsonify({
            'success': result.get('success', False),
            'response': result.get('response'),
            'intent': result.get('intent'),
            'confidence': result.get('confidence'),
            'emotion': result.get('emotion'),
            'language': result.get('language'),
            'suggestions': result.get('suggestions', []),
            'is_frustrated': result.get('is_frustrated', False),
            'entities': result.get('entities', {})
        }), 200

    except Exception as e:
        logger.error(f"Error processing message: {e}")
        return error_handler.handle_error('system_error', str(e), get_user_language()), 500


@chatbot_bp.route('/message/batch', methods=['POST'])
def send_batch_messages():
    """إرسال عدة رسائل دفعة واحدة"""
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        messages = data.get('messages', [])

        if not session_id or not messages:
            return jsonify({'error': 'session_id و messages مطلوبان'}), 400

        results = []
        for msg in messages[:10]:  # حد أقصى 10 رسائل
            result = intelligent_assistant_service.process_message(session_id, msg)
            results.append(result)

        return jsonify({
            'success': True,
            'messages_processed': len(results),
            'results': results
        }), 200

    except Exception as e:
        logger.error(f"Error processing batch messages: {e}")
        return error_handler.handle_error('system_error', str(e), get_user_language()), 500


# ========================
# CONVERSATION ROUTES
# ========================

@chatbot_bp.route('/conversation/<session_id>/history', methods=['GET'])
def get_history(session_id):
    """الحصول على سجل المحادثة"""
    try:
        limit = request.args.get('limit', 50, type=int)
        
        if limit > 200:
            limit = 200  # حد أقصى للحماية

        history = intelligent_assistant_service.get_conversation_history(session_id, limit)

        # تحويل datetime إلى string للـ JSON
        for msg in history:
            if isinstance(msg.get('timestamp'), datetime):
                msg['timestamp'] = msg['timestamp'].isoformat()

        return jsonify({
            'success': True,
            'session_id': session_id,
            'message_count': len(history),
            'messages': history
        }), 200

    except Exception as e:
        logger.error(f"Error getting history: {e}")
        return error_handler.handle_error('system_error', str(e), get_user_language()), 500


@chatbot_bp.route('/conversation/<session_id>/rate', methods=['POST'])
def rate_conversation_endpoint(session_id):
    """تقييم المحادثة"""
    try:
        data = request.get_json()
        rating = data.get('rating', 0)
        comment = data.get('comment', '')
        feedback_category = data.get('category', '')

        if rating < 1 or rating > 5:
            return jsonify({'error': 'التقييم يجب أن يكون بين 1 و 5'}), 400

        result = intelligent_assistant_service.rate_conversation(
            session_id, 
            rating, 
            comment,
            feedback_category
        )

        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Error rating conversation: {e}")
        return error_handler.handle_error('system_error', str(e), get_user_language()), 500


@chatbot_bp.route('/conversation/<session_id>/escalate', methods=['POST'])
def escalate_conversation(session_id):
    """تصعيد المحادثة للموظفين"""
    try:
        data = request.get_json()
        reason = data.get('reason', 'تصعيد من Chatbot')

        result = intelligent_assistant_service.handle_escalation(session_id, reason)

        return jsonify(result), 200 if result.get('success') else 400

    except Exception as e:
        logger.error(f"Error escalating conversation: {e}")
        return error_handler.handle_error('system_error', str(e), get_user_language()), 500


# ========================
# KNOWLEDGE BASE ROUTES
# ========================

@chatbot_bp.route('/knowledge/search', methods=['GET'])
def search_knowledge():
    """البحث في قاعدة المعارف"""
    try:
        query = request.args.get('q', '')
        limit = request.args.get('limit', 5, type=int)

        if not query or len(query) < 2:
            return jsonify({'error': 'query مطلوب ويجب أن يكون 2 حرف على الأقل'}), 400

        # البحث في الذاكرة المؤقتة أولاً
        cache_key = f"kb_search_{query}_{limit}"
        cached = cache_manager.get(cache_key)
        if cached:
            return jsonify({
                'success': True,
                'cached': True,
                'results': cached
            }), 200

        # البحث في قاعدة المعارف
        results = intelligent_assistant_service.knowledge_base.search(query, limit)

        # التخزين المؤقت
        cache_manager.set(cache_key, results)

        return jsonify({
            'success': True,
            'cached': False,
            'query': query,
            'results_count': len(results),
            'results': results
        }), 200

    except Exception as e:
        logger.error(f"Error searching knowledge base: {e}")
        return error_handler.handle_error('system_error', str(e), get_user_language()), 500


@chatbot_bp.route('/knowledge/<category>/<key>', methods=['GET'])
def get_knowledge_detail(category, key):
    """الحصول على تفاصيل موضوع معين"""
    try:
        info = intelligent_assistant_service.knowledge_base.get_detailed_info(category, key)
        
        if not info:
            return jsonify({'error': 'الموضوع غير موجود'}), 404

        related_topics = intelligent_assistant_service.knowledge_base.get_related_topics(category, key)
        faq = intelligent_assistant_service.knowledge_base.get_faq(category, key)

        return jsonify({
            'success': True,
            'category': category,
            'key': key,
            'info': info,
            'related_topics': related_topics,
            'faq': faq
        }), 200

    except Exception as e:
        logger.error(f"Error getting knowledge detail: {e}")
        return error_handler.handle_error('system_error', str(e), get_user_language()), 500


# ========================
# ANALYTICS & STATISTICS
# ========================

@chatbot_bp.route('/statistics', methods=['GET'])
def get_statistics():
    """الحصول على إحصائيات الـ Chatbot"""
    try:
        stats = intelligent_assistant_service.get_statistics()
        cache_stats = cache_manager.get_stats()
        perf_summary = monitoring_service.get_performance_summary()

        return jsonify({
            'success': True,
            'conversation_stats': stats,
            'cache_stats': cache_stats,
            'performance_summary': perf_summary
        }), 200

    except Exception as e:
        logger.error(f"Error getting statistics: {e}")
        return error_handler.handle_error('system_error', str(e), get_user_language()), 500


@chatbot_bp.route('/health', methods=['GET'])
def health_check():
    """فحص صحة النظام"""
    try:
        stats = intelligent_assistant_service.get_statistics()
        alerts = monitoring_service.get_alerts(limit=5)
        error_stats = error_handler.get_error_stats()

        return jsonify({
            'success': True,
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'conversations_active': stats.get('active_conversations', 0),
            'total_messages': stats.get('total_messages', 0),
            'recent_alerts': alerts,
            'error_stats': error_stats
        }), 200

    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({
            'success': False,
            'status': 'unhealthy',
            'error': str(e)
        }), 500


# ========================
# NLP TOOLS ROUTES
# ========================

@chatbot_bp.route('/tools/analyze', methods=['POST'])
def analyze_text():
    """تحليل نص باستخدام NLP"""
    try:
        data = request.get_json()
        text = data.get('text', '')

        if not text:
            return jsonify({'error': 'text مطلوب'}), 400

        nlp = NLPProcessor()
        
        analysis = {
            'language': nlp.detect_language(text),
            'tokens': nlp.tokenize(text),
            'entities': nlp.extract_entities(text),
            'sentiment': nlp.detect_sentiment(text),
            'text_length': len(text)
        }

        return jsonify({
            'success': True,
            'analysis': analysis
        }), 200

    except Exception as e:
        logger.error(f"Error analyzing text: {e}")
        return error_handler.handle_error('system_error', str(e), get_user_language()), 500


@chatbot_bp.route('/tools/intent', methods=['POST'])
def classify_intent():
    """تصنيف النية من نص"""
    try:
        data = request.get_json()
        text = data.get('text', '')
        user_id = data.get('user_id')

        if not text:
            return jsonify({'error': 'text مطلوب'}), 400

        classifier = IntentClassifier()
        intent, confidence, nlp_result = classifier.classify(
            text,
            user_id=user_id
        )

        return jsonify({
            'success': True,
            'intent': intent,
            'confidence': round(confidence, 3),
            'nlp_result': nlp_result
        }), 200

    except Exception as e:
        logger.error(f"Error classifying intent: {e}")
        return error_handler.handle_error('system_error', str(e), get_user_language()), 500


# ========================
# ERROR HANDLER
# ========================

@chatbot_bp.errorhandler(404)
def not_found(error):
    """معالج الأخطاء 404"""
    return jsonify({
        'success': False,
        'error': 'المورد غير موجود'
    }), 404


@chatbot_bp.errorhandler(500)
def server_error(error):
    """معالج الأخطاء 500"""
    logger.error(f"Server error: {error}")
    return jsonify({
        'success': False,
        'error': 'خطأ في الخادم'
    }), 500


if __name__ == '__main__':
    print("Advanced Chatbot Routes Module")
