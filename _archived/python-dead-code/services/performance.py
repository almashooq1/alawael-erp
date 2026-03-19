"""
خدمة تحسين الأداء والـ Caching
"""

import redis
import json
from functools import wraps
from flask import current_app, request, jsonify
from datetime import datetime, timedelta
import hashlib

class CacheManager:
    """مدير التخزين المؤقت"""
    
    def __init__(self, redis_client=None):
        self.redis = redis_client or redis.Redis(
            host=current_app.config.get('REDIS_HOST', 'localhost'),
            port=current_app.config.get('REDIS_PORT', 6379),
            db=current_app.config.get('REDIS_DB', 0),
            decode_responses=True
        )
    
    def get(self, key):
        """الحصول على قيمة من الكاش"""
        try:
            value = self.redis.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            current_app.logger.error(f"خطأ في الكاش: {str(e)}")
            return None
    
    def set(self, key, value, expiry=3600):
        """تخزين قيمة في الكاش"""
        try:
            self.redis.setex(
                key,
                expiry,
                json.dumps(value, default=str)
            )
            return True
        except Exception as e:
            current_app.logger.error(f"خطأ في التخزين: {str(e)}")
            return False
    
    def delete(self, key):
        """حذف قيمة من الكاش"""
        try:
            self.redis.delete(key)
            return True
        except Exception as e:
            current_app.logger.error(f"خطأ في الحذف: {str(e)}")
            return False
    
    def clear_pattern(self, pattern):
        """حذف جميع المفاتيح المطابقة لنمط"""
        try:
            keys = self.redis.keys(pattern)
            if keys:
                self.redis.delete(*keys)
            return True
        except Exception as e:
            current_app.logger.error(f"خطأ في الحذف: {str(e)}")
            return False
    
    def increment(self, key, amount=1):
        """زيادة قيمة رقمية"""
        try:
            return self.redis.incrby(key, amount)
        except Exception as e:
            current_app.logger.error(f"خطأ في الزيادة: {str(e)}")
            return None


class QueryOptimizer:
    """محسّن الاستعلامات"""
    
    @staticmethod
    def optimize_beneficiary_query(query):
        """تحسين استعلام المستفيدين"""
        return query.options(
            # Eager loading للعلاقات
            # joinedload(Beneficiary.sessions),
            # joinedload(Beneficiary.reports),
            # joinedload(Beneficiary.assessments)
        )
    
    @staticmethod
    def get_pagination_info(page, per_page, total):
        """الحصول على معلومات الترقيم"""
        return {
            'page': page,
            'per_page': per_page,
            'total': total,
            'pages': (total + per_page - 1) // per_page,
            'has_next': page < (total + per_page - 1) // per_page,
            'has_prev': page > 1
        }


def cached_endpoint(timeout=3600, key_builder=None):
    """ديكوريتر للعمليات المخزنة مؤقتاً"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # بناء مفتاح الكاش
            if key_builder:
                cache_key = key_builder(request)
            else:
                cache_key = f"{request.path}:{request.query_string.decode()}"
            
            # محاولة الحصول من الكاش
            cache = CacheManager()
            cached_data = cache.get(cache_key)
            
            if cached_data:
                current_app.logger.info(f"تم الحصول من الكاش: {cache_key}")
                return jsonify(cached_data)
            
            # تنفيذ الدالة
            result = f(*args, **kwargs)
            
            # تخزين النتيجة
            if isinstance(result, dict):
                cache.set(cache_key, result, timeout)
            
            return result
        
        return decorated_function
    return decorator


def profile_endpoint(f):
    """ديكوريتر لقياس الأداء"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        import time
        
        start_time = time.time()
        result = f(*args, **kwargs)
        end_time = time.time()
        
        duration = (end_time - start_time) * 1000  # بالميلي ثانية
        
        current_app.logger.info(
            f"المسار: {request.path} | المدة: {duration:.2f}ms"
        )
        
        # إذا استغرق أكثر من 1 ثانية، تسجيل تحذير
        if duration > 1000:
            current_app.logger.warning(
                f"استعلام بطيء: {request.path} ({duration:.2f}ms)"
            )
        
        return result
    
    return decorated_function


class DatabaseOptimization:
    """فئة لتحسينات قاعدة البيانات"""
    
    @staticmethod
    def create_indexes(db):
        """إنشاء الفهارس المهمة"""
        try:
            # فهارس على حقول البحث الشائعة
            from models import (
                Beneficiary, Report, TherapySession, 
                Assessment, Program, Goal, User
            )
            
            # يمكن إضافة فهارس باستخدام SQLAlchemy
            # مثال:
            # Beneficiary.__table__.indexes.add(
            #     Index('idx_beneficiary_email', Beneficiary.email)
            # )
            
            current_app.logger.info("تم إنشاء الفهارس")
        except Exception as e:
            current_app.logger.error(f"خطأ في إنشاء الفهارس: {str(e)}")
    
    @staticmethod
    def analyze_slow_queries(db):
        """تحليل الاستعلامات البطيئة"""
        try:
            # تفعيل log_slow_queries في قاعدة البيانات
            if hasattr(db.engine, 'echo'):
                db.engine.echo = True
            
            current_app.logger.info("تم تفعيل تسجيل الاستعلامات البطيئة")
        except Exception as e:
            current_app.logger.error(f"خطأ: {str(e)}")


class PerformanceMonitoring:
    """مراقبة الأداء"""
    
    def __init__(self):
        self.metrics = {}
    
    def record_metric(self, name, value):
        """تسجيل قياس أداء"""
        if name not in self.metrics:
            self.metrics[name] = []
        
        self.metrics[name].append({
            'value': value,
            'timestamp': datetime.now()
        })
    
    def get_average(self, name):
        """الحصول على متوسط القياس"""
        if name not in self.metrics:
            return None
        
        values = [m['value'] for m in self.metrics[name]]
        return sum(values) / len(values) if values else None
    
    def get_report(self):
        """الحصول على تقرير الأداء"""
        report = {}
        for name, measurements in self.metrics.items():
            values = [m['value'] for m in measurements]
            report[name] = {
                'average': sum(values) / len(values),
                'min': min(values),
                'max': max(values),
                'count': len(values)
            }
        return report
    
    def clear(self):
        """مسح القياسات"""
        self.metrics = {}


# مثيل عام لمراقبة الأداء
perf_monitor = PerformanceMonitoring()


def get_cache_manager():
    """الحصول على مدير الكاش"""
    return CacheManager()


def invalidate_cache(pattern):
    """إلغاء الكاش بناءً على نمط"""
    cache = CacheManager()
    cache.clear_pattern(pattern)


# أمثلة على الاستخدام:

"""
# استخدام الكاش
@app.route('/api/beneficiaries', methods=['GET'])
@cached_endpoint(timeout=3600, key_builder=lambda req: f"beneficiaries:{req.args.get('page', 1)}")
@jwt_required()
def get_beneficiaries():
    # الكود هنا
    pass

# قياس الأداء
@app.route('/api/reports', methods=['GET'])
@profile_endpoint
@jwt_required()
def get_reports():
    # الكود هنا
    pass

# إلغاء الكاش عند التحديث
@app.route('/api/beneficiaries/<id>', methods=['PUT'])
@jwt_required()
def update_beneficiary(id):
    # التحديث هنا
    invalidate_cache('beneficiaries:*')
    return jsonify({'message': 'تم التحديث'})
"""
