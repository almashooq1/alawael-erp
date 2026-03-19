"""
🎫 Support System API Routes
نظام الدعم الفني - API Endpoints
"""

from flask import Blueprint, request, jsonify
from services.support_system_service import EnhancedSupportService
from datetime import datetime
import logging

api = Blueprint('support', __name__, url_prefix='/api/support')
logger = logging.getLogger(__name__)


# ==========================================
# 1. إنشاء تذكرة دعم جديدة
# ==========================================

@api.route('/tickets/create', methods=['POST'])
def create_ticket():
    """
    إنشاء تذكرة دعم جديدة

    POST /api/support/tickets/create
    Body:
    {
        "user_id": "...",
        "title": "عنوان المشكلة",
        "description": "وصف مفصل",
        "priority": "high|medium|low",
        "category": "technical|billing|general"
    }
    """
    try:
        data = request.get_json()
        db = request.app.db
        service = EnhancedSupportService(db)

        ticket = service.create_support_ticket(data)

        logger.info(f"Support ticket created: {ticket['ticket_id']}")

        return jsonify({
            'status': 'success',
            'ticket': ticket,
            'timestamp': datetime.now().isoformat()
        }), 201

    except Exception as e:
        logger.error(f"Error creating ticket: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ==========================================
# 2. قائمة التذاكر
# ==========================================

@api.route('/tickets', methods=['GET'])
def list_tickets():
    """
    الحصول على قائمة التذاكر

    GET /api/support/tickets
    Query Params:
    - user_id: معرف المستخدم
    - status: open|closed|pending
    - limit: عدد النتائج
    """
    try:
        user_id = request.args.get('user_id')
        status = request.args.get('status')
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)

        db = request.app.db

        query = {}
        if user_id:
            query['user_id'] = user_id
        if status:
            query['status'] = status

        tickets = list(
            db['support_tickets'].find(query).sort('created_at', -1).skip(offset).limit(limit)
        )

        total = db['support_tickets'].count_documents(query)

        return jsonify({
            'status': 'success',
            'tickets': tickets,
            'pagination': {
                'limit': limit,
                'offset': offset,
                'total': total
            },
            'timestamp': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Error listing tickets: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ==========================================
# 3. تفاصيل التذكرة
# ==========================================

@api.route('/tickets/<ticket_id>', methods=['GET'])
def get_ticket(ticket_id):
    """
    الحصول على تفاصيل التذكرة

    GET /api/support/tickets/<ticket_id>
    """
    try:
        db = request.app.db

        ticket = db['support_tickets'].find_one({'_id': ticket_id})

        if not ticket:
            return jsonify({
                'status': 'error',
                'message': 'Ticket not found'
            }), 404

        return jsonify({
            'status': 'success',
            'ticket': ticket,
            'timestamp': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Error getting ticket: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ==========================================
# 4. تحديث حالة التذكرة
# ==========================================

@api.route('/tickets/<ticket_id>/status', methods=['PUT'])
def update_ticket_status(ticket_id):
    """
    تحديث حالة التذكرة

    PUT /api/support/tickets/<ticket_id>/status
    Body:
    {
        "status": "open|closed|pending",
        "notes": "ملاحظات اختيارية"
    }
    """
    try:
        data = request.get_json()
        db = request.app.db
        service = EnhancedSupportService(db)

        result = service.update_ticket_status(ticket_id, data['status'], data.get('notes'))

        logger.info(f"Ticket status updated: {ticket_id}")

        return jsonify({
            'status': 'success',
            'message': result.get('message'),
            'timestamp': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Error updating ticket: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ==========================================
# 5. تعيين التذكرة لموظف
# ==========================================

@api.route('/tickets/<ticket_id>/assign', methods=['PUT'])
def assign_ticket(ticket_id):
    """
    تعيين التذكرة لموظف دعم

    PUT /api/support/tickets/<ticket_id>/assign
    Body:
    {
        "agent_id": "...",
        "notes": "سبب التعيين"
    }
    """
    try:
        data = request.get_json()
        db = request.app.db
        service = EnhancedSupportService(db)

        result = service.assign_ticket(ticket_id, data['agent_id'], data.get('notes'))

        logger.info(f"Ticket assigned: {ticket_id} to {data['agent_id']}")

        return jsonify({
            'status': 'success',
            'message': result.get('message'),
            'timestamp': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Error assigning ticket: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ==========================================
# 6. إضافة رسالة للتذكرة
# ==========================================

@api.route('/tickets/<ticket_id>/message', methods=['POST'])
def add_message(ticket_id):
    """
    إضافة رسالة للتذكرة

    POST /api/support/tickets/<ticket_id>/message
    Body:
    {
        "user_id": "...",
        "message": "نص الرسالة",
        "attachments": [...]
    }
    """
    try:
        data = request.get_json()
        db = request.app.db
        service = EnhancedSupportService(db)

        message = service.add_ticket_message(
            ticket_id,
            data['user_id'],
            data['message'],
            data.get('attachments')
        )

        logger.info(f"Message added to ticket: {ticket_id}")

        return jsonify({
            'status': 'success',
            'message': message,
            'timestamp': datetime.now().isoformat()
        }), 201

    except Exception as e:
        logger.error(f"Error adding message: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ==========================================
# 7. البحث في قاعدة المعرفة
# ==========================================

@api.route('/knowledge-base/search', methods=['GET'])
def search_knowledge_base():
    """
    البحث في قاعدة المعرفة

    GET /api/support/knowledge-base/search?q=keyword
    """
    try:
        query = request.args.get('q', '')
        db = request.app.db
        service = EnhancedSupportService(db)

        results = service.search_knowledge_base(query)

        return jsonify({
            'status': 'success',
            'query': query,
            'results': results,
            'count': len(results),
            'timestamp': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Error searching knowledge base: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ==========================================
# 8. إحصائيات الدعم
# ==========================================

@api.route('/statistics', methods=['GET'])
def get_statistics():
    """
    الحصول على إحصائيات الدعم

    GET /api/support/statistics
    Query Params:
    - agent_id: معرف الموظف
    - date_from: من تاريخ
    """
    try:
        agent_id = request.args.get('agent_id')
        date_from = request.args.get('date_from')

        db = request.app.db
        service = EnhancedSupportService(db)

        stats = service.get_support_statistics(agent_id, date_from)

        return jsonify({
            'status': 'success',
            'statistics': stats,
            'timestamp': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Error getting statistics: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ==========================================
# 9. تقييم رضا العملاء
# ==========================================

@api.route('/tickets/<ticket_id>/rating', methods=['POST'])
def rate_ticket(ticket_id):
    """
    تقييم التذكرة

    POST /api/support/tickets/<ticket_id>/rating
    Body:
    {
        "rating": 5,
        "feedback": "شكراً على المساعدة"
    }
    """
    try:
        data = request.get_json()
        db = request.app.db

        result = db['support_tickets'].update_one(
            {'_id': ticket_id},
            {'$set': {
                'rating': data.get('rating'),
                'feedback': data.get('feedback'),
                'rated_at': datetime.now().isoformat()
            }}
        )

        logger.info(f"Ticket rated: {ticket_id}")

        return jsonify({
            'status': 'success',
            'message': 'Thank you for your feedback'
        }), 200

    except Exception as e:
        logger.error(f"Error rating ticket: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ==========================================
# معالجة الأخطاء
# ==========================================

@api.errorhandler(404)
def not_found(error):
    return jsonify({
        'status': 'error',
        'message': 'Ticket not found'
    }), 404
