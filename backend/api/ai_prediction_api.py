"""
🤖 AI Prediction API Routes
نظام التنبؤ الذكي - API Endpoints
"""

from flask import Blueprint, request, jsonify
from services.ai_prediction_service import SmartPredictionService
from datetime import datetime
import logging

# إعداد البلوبرينت
api = Blueprint('predictions', __name__, url_prefix='/api/predictions')

# إعداد السجل
logger = logging.getLogger(__name__)

# ==========================================
# 1. تنبؤات الطلاب
# ==========================================

@api.route('/student-progress/<student_id>', methods=['POST'])
def predict_student_progress(student_id):
    """
    التنبؤ بتقدم الطالب

    POST /api/predictions/student-progress/<student_id>
    """
    try:
        db = request.app.db
        service = SmartPredictionService(db)

        result = service.predict_student_progress(student_id)

        logger.info(f"Student prediction generated for {student_id}")

        return jsonify({
            'status': 'success',
            'data': result,
            'timestamp': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Error in student prediction: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ==========================================
# 2. تنبؤات الفرص والصفقات
# ==========================================

@api.route('/deal-probability/<deal_id>', methods=['POST'])
def predict_deal_probability(deal_id):
    """
    التنبؤ باحتمالية إغلاق الصفقة

    POST /api/predictions/deal-probability/<deal_id>
    """
    try:
        db = request.app.db
        service = SmartPredictionService(db)

        result = service.predict_deal_probability(deal_id)

        logger.info(f"Deal probability prediction for {deal_id}")

        return jsonify({
            'status': 'success',
            'data': result,
            'timestamp': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Error in deal prediction: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ==========================================
# 3. تنبؤات الصيانة
# ==========================================

@api.route('/maintenance-risk/<asset_id>', methods=['POST'])
def predict_maintenance_risk(asset_id):
    """
    التنبؤ بمخاطر الصيانة

    POST /api/predictions/maintenance-risk/<asset_id>
    """
    try:
        db = request.app.db
        service = SmartPredictionService(db)

        result = service.predict_maintenance_risk(asset_id)

        logger.info(f"Maintenance risk prediction for {asset_id}")

        return jsonify({
            'status': 'success',
            'data': result,
            'timestamp': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Error in maintenance prediction: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ==========================================
# 4. تقييم المخاطر الشامل
# ==========================================

@api.route('/risk-assessment', methods=['POST'])
def assess_risk():
    """
    تقييم شامل للمخاطر

    POST /api/predictions/risk-assessment
    Body:
    {
        "entity_type": "student|customer|project",
        "entity_id": "..."
    }
    """
    try:
        data = request.get_json()

        if not data or 'entity_type' not in data or 'entity_id' not in data:
            return jsonify({
                'status': 'error',
                'message': 'Missing required fields: entity_type, entity_id'
            }), 400

        db = request.app.db
        service = SmartPredictionService(db)

        result = service.assess_risk_level(
            data['entity_type'],
            data['entity_id']
        )

        logger.info(f"Risk assessment for {data['entity_type']} {data['entity_id']}")

        return jsonify({
            'status': 'success',
            'data': result,
            'timestamp': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Error in risk assessment: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ==========================================
# 5. لوحة تحكم التنبؤات
# ==========================================

@api.route('/dashboard', methods=['GET'])
def predictions_dashboard():
    """
    لوحة تحكم التنبؤات

    GET /api/predictions/dashboard
    Query Params:
    - limit: عدد التنبؤات (افتراضي: 50)
    - offset: الإزاحة (افتراضي: 0)
    """
    try:
        db = request.app.db
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)

        # الحصول على آخر التنبؤات
        predictions = list(
            db['predictions'].find().sort('created_at', -1).skip(offset).limit(limit)
        )

        # إحصائيات
        total = db['predictions'].count_documents({})
        accurate = db['predictions'].count_documents({'accuracy_score': {'$gte': 0.8}})

        dashboard = {
            'status': 'success',
            'total_predictions': total,
            'accurate_predictions': accurate,
            'accuracy_rate': (accurate / total * 100) if total > 0 else 0,
            'recent_predictions': predictions,
            'pagination': {
                'limit': limit,
                'offset': offset,
                'total': total
            },
            'timestamp': datetime.now().isoformat()
        }

        return jsonify(dashboard), 200

    except Exception as e:
        logger.error(f"Error in dashboard: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ==========================================
# 6. التنبؤات التاريخية
# ==========================================

@api.route('/history/<entity_type>/<entity_id>', methods=['GET'])
def get_prediction_history(entity_type, entity_id):
    """
    الحصول على سجل التنبؤات

    GET /api/predictions/history/<entity_type>/<entity_id>
    """
    try:
        db = request.app.db

        predictions = list(
            db['predictions'].find({
                'type': entity_type,
                'user_id': entity_id
            }).sort('created_at', -1)
        )

        return jsonify({
            'status': 'success',
            'entity_type': entity_type,
            'entity_id': entity_id,
            'predictions': predictions,
            'count': len(predictions),
            'timestamp': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Error in history: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ==========================================
# 7. تقييم دقة التنبؤات
# ==========================================

@api.route('/<prediction_id>/feedback', methods=['POST'])
def submit_prediction_feedback(prediction_id):
    """
    إرسال ملاحظات عن التنبؤ

    POST /api/predictions/<prediction_id>/feedback
    Body:
    {
        "actual_result": "...",
        "accuracy_score": 0.95,
        "notes": "..."
    }
    """
    try:
        data = request.get_json()
        db = request.app.db

        # تحديث سجل التنبؤ
        db['prediction_history'].insert_one({
            'prediction_id': prediction_id,
            'actual_result': data.get('actual_result'),
            'accuracy_score': data.get('accuracy_score'),
            'notes': data.get('notes'),
            'feedback_date': datetime.now().isoformat()
        })

        # تحديث نموذج التنبؤ إذا لزم الأمر
        db['predictions'].update_one(
            {'_id': prediction_id},
            {'$set': {'feedback_received': True}}
        )

        logger.info(f"Feedback received for prediction {prediction_id}")

        return jsonify({
            'status': 'success',
            'message': 'Feedback recorded successfully'
        }), 200

    except Exception as e:
        logger.error(f"Error in feedback: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ==========================================
# 8. إحصائيات التنبؤات
# ==========================================

@api.route('/statistics', methods=['GET'])
def get_statistics():
    """
    الحصول على إحصائيات التنبؤات

    GET /api/predictions/statistics
    Query Params:
    - date_from: من تاريخ
    - date_to: إلى تاريخ
    """
    try:
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')

        db = request.app.db

        query = {}
        if date_from and date_to:
            query = {
                'created_at': {
                    '$gte': date_from,
                    '$lte': date_to
                }
            }

        predictions = list(db['predictions'].find(query))

        stats = {
            'status': 'success',
            'total_predictions': len(predictions),
            'by_type': {},
            'accuracy_distribution': {},
            'confidence_distribution': {}
        }

        for pred in predictions:
            # حسب النوع
            pred_type = pred.get('type', 'unknown')
            stats['by_type'][pred_type] = stats['by_type'].get(pred_type, 0) + 1

        return jsonify(stats), 200

    except Exception as e:
        logger.error(f"Error in statistics: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# ==========================================
# معالجة الأخطاء العامة
# ==========================================

@api.errorhandler(404)
def not_found(error):
    return jsonify({
        'status': 'error',
        'message': 'Endpoint not found'
    }), 404


@api.errorhandler(500)
def internal_error(error):
    return jsonify({
        'status': 'error',
        'message': 'Internal server error'
    }), 500
