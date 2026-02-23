"""
Prediction API Routes
مسارات API التنبؤات
"""

from flask import Blueprint, request, jsonify
from services.prediction_service import PredictionService, PredictionType
from middleware.auth_middleware import AuthMiddleware
from services.admin_service import Permission
from lib.auth_rbac_decorator import check_permission, require_role, log_audit, guard_payload_size, validate_json

prediction_bp = Blueprint('prediction', __name__, url_prefix='/api/predictions')


# ==================== Sales Predictions ====================

@prediction_bp.route('/sales', methods=['POST'])
@AuthMiddleware.require_auth
@AuthMiddleware.require_permission(Permission.VIEW_REPORTS)
def predict_sales():
    """
    التنبؤ بالمبيعات

    Request Body:
        {
            "historical_sales": [
                {"date": "2024-01-01", "amount": 1000},
                {"date": "2024-01-02", "amount": 1200}
            ],
            "days_ahead": 7
        }
    """
    try:
        data = request.get_json()
        result = PredictionService.predict_sales(data)

        if "error" in result:
            return jsonify(result), 400

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==================== Revenue Predictions ====================

@prediction_bp.route('/revenue', methods=['POST'])
@AuthMiddleware.require_auth
@AuthMiddleware.require_permission(Permission.VIEW_REPORTS)
def predict_revenue():
    """
    التنبؤ بالإيرادات

    Request Body:
        {
            "historical_revenue": [
                {"month": "2024-01", "amount": 50000},
                {"month": "2024-02", "amount": 55000}
            ],
            "months_ahead": 3
        }
    """
    try:
        data = request.get_json()
        result = PredictionService.predict_revenue(data)

        if "error" in result:
            return jsonify(result), 400

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==================== Attendance Predictions ====================

@prediction_bp.route('/attendance', methods=['POST'])
@AuthMiddleware.require_auth
@AuthMiddleware.require_permission(Permission.VIEW_REPORTS)
def predict_attendance():
    """
    التنبؤ بالحضور

    Request Body:
        {
            "historical_attendance": [
                {"date": "2024-01-01", "rate": 95},
                {"date": "2024-01-02", "rate": 92}
            ],
            "days_ahead": 30
        }
    """
    try:
        data = request.get_json()
        result = PredictionService.predict_attendance(data)

        if "error" in result:
            return jsonify(result), 400

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==================== Inventory Demand Predictions ====================

@prediction_bp.route('/inventory-demand', methods=['POST'])
@AuthMiddleware.require_auth
@AuthMiddleware.require_permission(Permission.VIEW_REPORTS)
def predict_inventory_demand():
    """
    التنبؤ بالطلب على المخزون

    Request Body:
        {
            "historical_demand": [
                {"item_id": "item_1", "quantity": 100, "date": "2024-01-01"}
            ],
            "items": [
                {"id": "item_1", "name": "Product A", "current_stock": 50}
            ],
            "weeks_ahead": 4
        }
    """
    try:
        data = request.get_json()
        result = PredictionService.predict_inventory_demand(data)

        if "error" in result:
            return jsonify(result), 400

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==================== Customer Churn Predictions ====================

@prediction_bp.route('/customer-churn', methods=['POST'])
@AuthMiddleware.require_auth
@AuthMiddleware.require_permission(Permission.VIEW_REPORTS)
def predict_customer_churn():
    """
    التنبؤ بتسرب العملاء

    Request Body:
        {
            "customers": [
                {
                    "id": "cust_1",
                    "name": "John Doe",
                    "days_since_last_purchase": 45,
                    "total_purchases": 5,
                    "avg_purchase_value": 120
                }
            ]
        }
    """
    try:
        data = request.get_json()
        result = PredictionService.predict_customer_churn(data)

        if "error" in result:
            return jsonify(result), 400

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==================== Get Predictions ====================

@prediction_bp.route('/<prediction_id>', methods=['GET'])
@AuthMiddleware.require_auth
@AuthMiddleware.require_permission(Permission.VIEW_REPORTS)
def get_prediction(prediction_id):
    """الحصول على تنبؤ محدد"""
    try:
        prediction = PredictionService.get_prediction(prediction_id)

        if not prediction:
            return jsonify({"error": "Prediction not found"}), 404

        return jsonify(prediction), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@prediction_bp.route('/', methods=['GET'])
@AuthMiddleware.require_auth
@AuthMiddleware.require_permission(Permission.VIEW_REPORTS)
def get_all_predictions():
    """الحصول على جميع التنبؤات"""
    try:
        predictions = PredictionService.get_all_predictions()

        return jsonify({
            "predictions": predictions,
            "total": len(predictions)
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==================== Historical Data ====================

@prediction_bp.route('/historical-data', methods=['POST'])
@AuthMiddleware.require_auth
@AuthMiddleware.require_permission(Permission.EXPORT_DATA)
def save_historical_data():
    """
    حفظ البيانات التاريخية

    Request Body:
        {
            "data_type": "sales",
            "data": [
                {"date": "2024-01-01", "amount": 1000}
            ]
        }
    """
    try:
        data = request.get_json()
        data_type = data.get('data_type')
        historical_data = data.get('data')

        if not data_type or not historical_data:
            return jsonify({"error": "Missing required fields"}), 400

        result = PredictionService.save_historical_data(data_type, historical_data)

        return jsonify(result), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@prediction_bp.route('/historical-data/<data_id>', methods=['GET'])
@AuthMiddleware.require_auth
@AuthMiddleware.require_permission(Permission.VIEW_REPORTS)
def get_historical_data(data_id):
    """الحصول على البيانات التاريخية"""
    try:
        data = PredictionService.get_historical_data(data_id)

        if not data:
            return jsonify({"error": "Data not found"}), 404

        return jsonify(data), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==================== Accuracy Analysis ====================

@prediction_bp.route('/analyze-accuracy/<prediction_id>', methods=['POST'])
@AuthMiddleware.require_auth
@AuthMiddleware.require_permission(Permission.VIEW_REPORTS)
def analyze_accuracy(prediction_id):
    """
    تحليل دقة التنبؤ

    Request Body:
        {
            "actual_data": [
                {"date": "2024-01-01", "value": 1050}
            ]
        }
    """
    try:
        data = request.get_json()
        actual_data = data.get('actual_data', [])

        result = PredictionService.analyze_accuracy(prediction_id, actual_data)

        if "error" in result:
            return jsonify(result), 400

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ==================== Health Check ====================

@prediction_bp.route('/health', methods=['GET'])

@jwt_required()
@check_permission('view_health_check')
@log_audit('GET_HEALTH_CHECK')
def health_check():
    """فحص صحة نظام التنبؤات"""
    return jsonify({
        "status": "healthy",
        "service": "predictions",
        "total_predictions": len(PredictionService.predictions_db),
        "total_historical_data": len(PredictionService.historical_data_db),
        "timestamp": "2026-01-20"
    }), 200
