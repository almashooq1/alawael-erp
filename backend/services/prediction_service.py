"""
AI Prediction Service
خدمة التنبؤات الذكية
"""

from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import json
import statistics


class PredictionType:
    """أنواع التنبؤات"""
    SALES = "sales"
    REVENUE = "revenue"
    ATTENDANCE = "attendance"
    INVENTORY = "inventory"
    CUSTOMER_CHURN = "customer_churn"
    DEMAND = "demand"
    PERFORMANCE = "performance"


class PredictionService:
    """خدمة التنبؤات بالذكاء الاصطناعي"""

    # قاعدة بيانات مؤقتة للتنبؤات
    predictions_db = {}
    historical_data_db = {}

    @staticmethod
    def predict_sales(data: Dict[str, Any]) -> Dict[str, Any]:
        """
        التنبؤ بالمبيعات

        Args:
            data: البيانات التاريخية للمبيعات

        Returns:
            dict: التنبؤات والتحليل
        """
        try:
            historical_sales = data.get('historical_sales', [])
            days_ahead = data.get('days_ahead', 7)

            if not historical_sales:
                return {
                    "error": "No historical data provided",
                    "predictions": []
                }

            # حساب المتوسط والاتجاه
            values = [float(sale['amount']) for sale in historical_sales]
            avg_sales = statistics.mean(values)

            # حساب معدل النمو
            if len(values) > 1:
                growth_rate = (values[-1] - values[0]) / len(values)
            else:
                growth_rate = 0

            # توليد التنبؤات
            predictions = []
            current_date = datetime.now()

            for i in range(days_ahead):
                predicted_value = avg_sales + (growth_rate * (len(values) + i))

                # إضافة تباين واقعي (±15%)
                variance = predicted_value * 0.15

                predictions.append({
                    'date': (current_date + timedelta(days=i+1)).strftime('%Y-%m-%d'),
                    'predicted_value': round(predicted_value, 2),
                    'confidence': round(85 - (i * 2), 2),  # تقل الثقة مع البعد
                    'lower_bound': round(predicted_value - variance, 2),
                    'upper_bound': round(predicted_value + variance, 2)
                })

            # تحليل الاتجاه
            trend = "increasing" if growth_rate > 0 else "decreasing" if growth_rate < 0 else "stable"

            result = {
                "prediction_type": PredictionType.SALES,
                "predictions": predictions,
                "analysis": {
                    "average_historical": round(avg_sales, 2),
                    "growth_rate": round(growth_rate, 2),
                    "trend": trend,
                    "confidence_level": "high" if len(values) > 10 else "medium"
                },
                "metadata": {
                    "historical_data_points": len(values),
                    "prediction_days": days_ahead,
                    "generated_at": datetime.now().isoformat()
                }
            }

            # حفظ التنبؤ
            prediction_id = f"pred_{len(PredictionService.predictions_db) + 1}"
            PredictionService.predictions_db[prediction_id] = result

            return {**result, "prediction_id": prediction_id}

        except Exception as e:
            return {
                "error": str(e),
                "prediction_type": PredictionType.SALES,
                "predictions": []
            }

    @staticmethod
    def predict_revenue(data: Dict[str, Any]) -> Dict[str, Any]:
        """التنبؤ بالإيرادات"""
        try:
            historical_revenue = data.get('historical_revenue', [])
            months_ahead = data.get('months_ahead', 3)

            if not historical_revenue:
                return {"error": "No historical data", "predictions": []}

            values = [float(rev['amount']) for rev in historical_revenue]
            avg_revenue = statistics.mean(values)

            # حساب الموسمية (seasonality)
            if len(values) >= 12:
                seasonal_factor = statistics.stdev(values) / avg_revenue
            else:
                seasonal_factor = 0.1

            predictions = []
            current_date = datetime.now()

            for i in range(months_ahead):
                base_prediction = avg_revenue * (1 + (0.05 * i))  # نمو 5% شهري
                seasonal_adjustment = base_prediction * seasonal_factor

                predictions.append({
                    'month': (current_date + timedelta(days=30*(i+1))).strftime('%Y-%m'),
                    'predicted_revenue': round(base_prediction, 2),
                    'seasonal_adjustment': round(seasonal_adjustment, 2),
                    'confidence': round(80 - (i * 3), 2),
                    'lower_bound': round(base_prediction - seasonal_adjustment, 2),
                    'upper_bound': round(base_prediction + seasonal_adjustment, 2)
                })

            result = {
                "prediction_type": PredictionType.REVENUE,
                "predictions": predictions,
                "analysis": {
                    "average_monthly": round(avg_revenue, 2),
                    "seasonal_factor": round(seasonal_factor, 2),
                    "growth_estimate": "5% monthly",
                    "data_quality": "high" if len(values) >= 12 else "medium"
                },
                "metadata": {
                    "data_points": len(values),
                    "months_predicted": months_ahead,
                    "generated_at": datetime.now().isoformat()
                }
            }

            prediction_id = f"pred_{len(PredictionService.predictions_db) + 1}"
            PredictionService.predictions_db[prediction_id] = result

            return {**result, "prediction_id": prediction_id}

        except Exception as e:
            return {"error": str(e), "predictions": []}

    @staticmethod
    def predict_attendance(data: Dict[str, Any]) -> Dict[str, Any]:
        """التنبؤ بالحضور"""
        try:
            historical_attendance = data.get('historical_attendance', [])
            days_ahead = data.get('days_ahead', 30)

            if not historical_attendance:
                return {"error": "No data", "predictions": []}

            # حساب معدل الحضور
            attendance_rates = [float(att['rate']) for att in historical_attendance]
            avg_rate = statistics.mean(attendance_rates)

            # تحديد أيام الأسبوع
            weekday_pattern = {
                0: 0.95,  # Monday
                1: 0.93,  # Tuesday
                2: 0.92,  # Wednesday
                3: 0.90,  # Thursday
                4: 0.85,  # Friday
                5: 0.70,  # Saturday
                6: 0.65   # Sunday
            }

            predictions = []
            current_date = datetime.now()

            for i in range(days_ahead):
                predict_date = current_date + timedelta(days=i+1)
                weekday = predict_date.weekday()

                # تطبيق نمط أيام الأسبوع
                weekday_factor = weekday_pattern.get(weekday, 0.9)
                predicted_rate = avg_rate * weekday_factor

                predictions.append({
                    'date': predict_date.strftime('%Y-%m-%d'),
                    'day_of_week': predict_date.strftime('%A'),
                    'predicted_rate': round(predicted_rate, 2),
                    'confidence': round(75, 2),
                    'expected_absent': round((100 - predicted_rate), 2)
                })

            result = {
                "prediction_type": PredictionType.ATTENDANCE,
                "predictions": predictions,
                "analysis": {
                    "average_rate": round(avg_rate, 2),
                    "best_day": "Monday",
                    "worst_day": "Sunday",
                    "pattern": "weekday_based"
                },
                "metadata": {
                    "data_points": len(attendance_rates),
                    "days_predicted": days_ahead,
                    "generated_at": datetime.now().isoformat()
                }
            }

            prediction_id = f"pred_{len(PredictionService.predictions_db) + 1}"
            PredictionService.predictions_db[prediction_id] = result

            return {**result, "prediction_id": prediction_id}

        except Exception as e:
            return {"error": str(e), "predictions": []}

    @staticmethod
    def predict_inventory_demand(data: Dict[str, Any]) -> Dict[str, Any]:
        """التنبؤ بالطلب على المخزون"""
        try:
            historical_demand = data.get('historical_demand', [])
            items = data.get('items', [])
            weeks_ahead = data.get('weeks_ahead', 4)

            if not historical_demand:
                return {"error": "No demand data", "predictions": []}

            predictions = []

            for item in items:
                item_id = item.get('id')
                item_name = item.get('name')

                # فلترة البيانات لهذا المنتج
                item_demands = [d['quantity'] for d in historical_demand if d.get('item_id') == item_id]

                if item_demands:
                    avg_demand = statistics.mean(item_demands)

                    # حساب الاتجاه
                    if len(item_demands) > 1:
                        trend = (item_demands[-1] - item_demands[0]) / len(item_demands)
                    else:
                        trend = 0

                    weekly_predictions = []
                    for week in range(1, weeks_ahead + 1):
                        predicted_demand = avg_demand + (trend * week)

                        weekly_predictions.append({
                            'week': week,
                            'predicted_quantity': max(0, round(predicted_demand, 0)),
                            'confidence': round(80 - (week * 5), 2)
                        })

                    predictions.append({
                        'item_id': item_id,
                        'item_name': item_name,
                        'current_stock': item.get('current_stock', 0),
                        'weekly_predictions': weekly_predictions,
                        'recommendation': 'reorder' if predicted_demand > item.get('current_stock', 0) else 'sufficient'
                    })

            result = {
                "prediction_type": PredictionType.DEMAND,
                "predictions": predictions,
                "summary": {
                    "total_items": len(predictions),
                    "reorder_needed": len([p for p in predictions if p['recommendation'] == 'reorder']),
                    "weeks_analyzed": weeks_ahead
                },
                "metadata": {
                    "generated_at": datetime.now().isoformat()
                }
            }

            prediction_id = f"pred_{len(PredictionService.predictions_db) + 1}"
            PredictionService.predictions_db[prediction_id] = result

            return {**result, "prediction_id": prediction_id}

        except Exception as e:
            return {"error": str(e), "predictions": []}

    @staticmethod
    def predict_customer_churn(data: Dict[str, Any]) -> Dict[str, Any]:
        """التنبؤ بتسرب العملاء"""
        try:
            customers = data.get('customers', [])

            predictions = []

            for customer in customers:
                customer_id = customer.get('id')
                last_purchase_days = customer.get('days_since_last_purchase', 0)
                total_purchases = customer.get('total_purchases', 0)
                avg_purchase_value = customer.get('avg_purchase_value', 0)

                # حساب احتمالية التسرب
                churn_score = 0

                # عامل الوقت منذ آخر شراء
                if last_purchase_days > 90:
                    churn_score += 40
                elif last_purchase_days > 60:
                    churn_score += 25
                elif last_purchase_days > 30:
                    churn_score += 10

                # عامل عدد المشتريات
                if total_purchases < 3:
                    churn_score += 30
                elif total_purchases < 5:
                    churn_score += 15

                # عامل قيمة الشراء
                if avg_purchase_value < 50:
                    churn_score += 20
                elif avg_purchase_value < 100:
                    churn_score += 10

                churn_probability = min(churn_score, 100)
                risk_level = "high" if churn_probability > 60 else "medium" if churn_probability > 30 else "low"

                predictions.append({
                    'customer_id': customer_id,
                    'customer_name': customer.get('name'),
                    'churn_probability': churn_probability,
                    'risk_level': risk_level,
                    'days_since_last_purchase': last_purchase_days,
                    'recommendation': 'engage_immediately' if risk_level == 'high' else 'monitor'
                })

            # ترتيب حسب المخاطر
            predictions.sort(key=lambda x: x['churn_probability'], reverse=True)

            result = {
                "prediction_type": PredictionType.CUSTOMER_CHURN,
                "predictions": predictions,
                "summary": {
                    "total_customers": len(predictions),
                    "high_risk": len([p for p in predictions if p['risk_level'] == 'high']),
                    "medium_risk": len([p for p in predictions if p['risk_level'] == 'medium']),
                    "low_risk": len([p for p in predictions if p['risk_level'] == 'low'])
                },
                "metadata": {
                    "generated_at": datetime.now().isoformat()
                }
            }

            prediction_id = f"pred_{len(PredictionService.predictions_db) + 1}"
            PredictionService.predictions_db[prediction_id] = result

            return {**result, "prediction_id": prediction_id}

        except Exception as e:
            return {"error": str(e), "predictions": []}

    @staticmethod
    def get_prediction(prediction_id: str) -> Optional[Dict[str, Any]]:
        """الحصول على تنبؤ محفوظ"""
        return PredictionService.predictions_db.get(prediction_id)

    @staticmethod
    def get_all_predictions() -> List[Dict[str, Any]]:
        """الحصول على جميع التنبؤات"""
        return [
            {**pred, "id": pred_id}
            for pred_id, pred in PredictionService.predictions_db.items()
        ]

    @staticmethod
    def save_historical_data(data_type: str, data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """حفظ البيانات التاريخية"""
        try:
            data_id = f"hist_{len(PredictionService.historical_data_db) + 1}"

            PredictionService.historical_data_db[data_id] = {
                "data_type": data_type,
                "data": data,
                "created_at": datetime.now().isoformat(),
                "data_points": len(data)
            }

            return {
                "success": True,
                "data_id": data_id,
                "data_points": len(data)
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    @staticmethod
    def get_historical_data(data_id: str) -> Optional[Dict[str, Any]]:
        """الحصول على البيانات التاريخية"""
        return PredictionService.historical_data_db.get(data_id)

    @staticmethod
    def analyze_accuracy(prediction_id: str, actual_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """تحليل دقة التنبؤ"""
        try:
            prediction = PredictionService.get_prediction(prediction_id)

            if not prediction:
                return {"error": "Prediction not found"}

            predictions = prediction.get('predictions', [])

            if len(actual_data) == 0:
                return {"error": "No actual data provided"}

            # حساب الدقة
            errors = []
            for i, pred in enumerate(predictions):
                if i < len(actual_data):
                    predicted_value = pred.get('predicted_value', pred.get('predicted_rate', 0))
                    actual_value = actual_data[i].get('value', 0)

                    error = abs(predicted_value - actual_value)
                    percentage_error = (error / actual_value * 100) if actual_value > 0 else 0

                    errors.append({
                        'date': pred.get('date', pred.get('month')),
                        'predicted': predicted_value,
                        'actual': actual_value,
                        'error': round(error, 2),
                        'percentage_error': round(percentage_error, 2)
                    })

            avg_error = statistics.mean([e['percentage_error'] for e in errors])
            accuracy = max(0, 100 - avg_error)

            return {
                "prediction_id": prediction_id,
                "accuracy": round(accuracy, 2),
                "average_error": round(avg_error, 2),
                "detailed_errors": errors,
                "grade": "excellent" if accuracy > 90 else "good" if accuracy > 75 else "fair"
            }

        except Exception as e:
            return {"error": str(e)}
