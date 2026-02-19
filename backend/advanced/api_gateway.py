"""
API Gateway وخدمات متقدمة لنظام إدارة الطلاب
Advanced Features: API Gateway, Caching, Rate Limiting
"""

import hashlib
import time
from datetime import datetime, timedelta
from functools import wraps
from typing import Dict, List, Any, Optional
from enum import Enum
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ==================== CACHING STRATEGIES ====================

class CacheStrategy(Enum):
    """استراتيجيات التخزين المؤقت"""
    NONE = "none"
    MEMORY = "memory"  # في الذاكرة
    REDIS = "redis"    # Redis
    HYBRID = "hybrid"  # ذاكرة + Redis


class CacheManager:
    """مدير التخزين المؤقت المتقدم"""

    def __init__(self, strategy: CacheStrategy = CacheStrategy.MEMORY):
        self.strategy = strategy
        self.memory_cache: Dict[str, dict] = {}
        self.redis_client = None  # سيتم ربطه في الإنتاج

    def set(self, key: str, value: Any, ttl: int = 3600):
        """تخزين قيمة في الذاكرة المؤقتة"""
        cache_data = {
            'value': value,
            'expires_at': datetime.now() + timedelta(seconds=ttl),
            'created_at': datetime.now()
        }

        if self.strategy in [CacheStrategy.MEMORY, CacheStrategy.HYBRID]:
            self.memory_cache[key] = cache_data
            logger.info(f"✅ Cached: {key} (TTL: {ttl}s)")

        if self.strategy in [CacheStrategy.REDIS, CacheStrategy.HYBRID] and self.redis_client:
            self.redis_client.setex(key, ttl, json.dumps(cache_data))

    def get(self, key: str) -> Optional[Any]:
        """استرجاع قيمة من الذاكرة المؤقتة"""
        if self.strategy in [CacheStrategy.MEMORY, CacheStrategy.HYBRID]:
            if key in self.memory_cache:
                cache_data = self.memory_cache[key]

                # التحقق من انتهاء الصلاحية
                if datetime.now() < cache_data['expires_at']:
                    logger.info(f"✅ Cache HIT: {key}")
                    return cache_data['value']
                else:
                    del self.memory_cache[key]
                    logger.info(f"⏰ Cache EXPIRED: {key}")

        if self.strategy in [CacheStrategy.REDIS, CacheStrategy.HYBRID] and self.redis_client:
            cached = self.redis_client.get(key)
            if cached:
                logger.info(f"✅ Redis Cache HIT: {key}")
                return json.loads(cached)['value']

        logger.info(f"❌ Cache MISS: {key}")
        return None

    def delete(self, key: str):
        """حذف قيمة من الذاكرة المؤقتة"""
        if key in self.memory_cache:
            del self.memory_cache[key]

        if self.redis_client:
            self.redis_client.delete(key)

        logger.info(f"🗑️  Deleted: {key}")

    def clear_expired(self):
        """تنظيف البيانات المنتهية الصلاحية"""
        expired_keys = [
            key for key, data in self.memory_cache.items()
            if datetime.now() >= data['expires_at']
        ]

        for key in expired_keys:
            del self.memory_cache[key]

        if expired_keys:
            logger.info(f"🧹 Cleaned {len(expired_keys)} expired cache entries")

    def get_stats(self) -> dict:
        """الحصول على إحصائيات الذاكرة المؤقتة"""
        return {
            'strategy': self.strategy.value,
            'total_entries': len(self.memory_cache),
            'memory_usage_mb': len(str(self.memory_cache)) / (1024 * 1024)
        }


# ==================== API GATEWAY ====================

class RateLimitConfig:
    """تكوين حد معدل الطلبات"""

    def __init__(self,
                 requests_per_minute: int = 60,
                 requests_per_hour: int = 1000,
                 requests_per_day: int = 10000,
                 burst_size: int = 10):
        self.rpm = requests_per_minute
        self.rph = requests_per_hour
        self.rpd = requests_per_day
        self.burst_size = burst_size


class RateLimiter:
    """محدّد معدل الطلبات المتقدم"""

    def __init__(self, config: RateLimitConfig):
        self.config = config
        self.request_history: Dict[str, List[float]] = {}

    def is_allowed(self, client_id: str) -> bool:
        """التحقق من السماح بالطلب"""
        now = time.time()

        if client_id not in self.request_history:
            self.request_history[client_id] = []

        # تنظيف الطلبات القديمة (أكثر من يوم واحد)
        cutoff = now - 86400
        self.request_history[client_id] = [
            req_time for req_time in self.request_history[client_id]
            if req_time > cutoff
        ]

        # التحقق من الحدود
        recent_minute = sum(1 for t in self.request_history[client_id] if t > now - 60)
        recent_hour = sum(1 for t in self.request_history[client_id] if t > now - 3600)
        recent_day = len(self.request_history[client_id])

        if recent_minute >= self.config.rpm:
            logger.warning(f"⚠️  Rate limit exceeded for {client_id}: {recent_minute}/min")
            return False

        if recent_hour >= self.config.rph:
            logger.warning(f"⚠️  Rate limit exceeded for {client_id}: {recent_hour}/hour")
            return False

        if recent_day >= self.config.rpd:
            logger.warning(f"⚠️  Rate limit exceeded for {client_id}: {recent_day}/day")
            return False

        # قبول الطلب
        self.request_history[client_id].append(now)
        return True

    def get_remaining(self, client_id: str) -> dict:
        """الحصول على الطلبات المتبقية"""
        if client_id not in self.request_history:
            return {
                'remaining_per_minute': self.config.rpm,
                'remaining_per_hour': self.config.rph,
                'remaining_per_day': self.config.rpd
            }

        now = time.time()
        recent_minute = sum(1 for t in self.request_history[client_id] if t > now - 60)
        recent_hour = sum(1 for t in self.request_history[client_id] if t > now - 3600)
        recent_day = len(self.request_history[client_id])

        return {
            'remaining_per_minute': max(0, self.config.rpm - recent_minute),
            'remaining_per_hour': max(0, self.config.rph - recent_hour),
            'remaining_per_day': max(0, self.config.rpd - recent_day)
        }


class APIGateway:
    """بوابة API المركزية"""

    def __init__(self):
        self.cache_manager = CacheManager(CacheStrategy.HYBRID)
        self.rate_limiter = RateLimiter(RateLimitConfig(
            requests_per_minute=60,
            requests_per_hour=600,
            requests_per_day=5000
        ))
        self.request_log: List[dict] = []
        self.routing_rules: Dict[str, dict] = {}

    def add_route(self, path: str, method: str, handler, cache_ttl: int = 0):
        """إضافة مسار جديد"""
        route_key = f"{method.upper()}:{path}"
        self.routing_rules[route_key] = {
            'handler': handler,
            'cache_ttl': cache_ttl,
            'rate_limited': True
        }
        logger.info(f"📍 Registered route: {route_key} (cache_ttl: {cache_ttl})")

    def handle_request(self, method: str, path: str, client_id: str,
                      params: dict = None) -> dict:
        """معالجة الطلب عبر البوابة"""

        # 1. التحقق من حد معدل الطلبات
        if not self.rate_limiter.is_allowed(client_id):
            return {
                'status': 429,
                'error': 'TOO_MANY_REQUESTS',
                'message': 'Rate limit exceeded',
                'remaining': self.rate_limiter.get_remaining(client_id)
            }

        # 2. البحث في الذاكرة المؤقتة (للطلبات GET فقط)
        cache_key = f"{client_id}:{method}:{path}:{json.dumps(params or {})}"
        cache_key_hash = hashlib.md5(cache_key.encode()).hexdigest()

        if method.upper() == 'GET':
            cached_response = self.cache_manager.get(cache_key_hash)
            if cached_response:
                return {
                    'status': 200,
                    'data': cached_response,
                    'cached': True
                }

        # 3. البحث عن المسار
        route_key = f"{method.upper()}:{path}"
        if route_key not in self.routing_rules:
            return {
                'status': 404,
                'error': 'NOT_FOUND',
                'message': f'Route {route_key} not found'
            }

        # 4. تنفيذ المعالج
        route_config = self.routing_rules[route_key]

        try:
            start_time = time.time()

            response = route_config['handler'](params or {})

            execution_time = time.time() - start_time

            # 5. تخزين النتيجة في الذاكرة المؤقتة (للطلبات الناجحة)
            if method.upper() == 'GET' and route_config['cache_ttl'] > 0:
                self.cache_manager.set(cache_key_hash, response, route_config['cache_ttl'])

            # 6. تسجيل الطلب
            self._log_request(method, path, client_id, 200, execution_time)

            return {
                'status': 200,
                'data': response,
                'execution_time_ms': round(execution_time * 1000, 2)
            }

        except Exception as e:
            self._log_request(method, path, client_id, 500, 0)
            return {
                'status': 500,
                'error': 'INTERNAL_ERROR',
                'message': str(e)
            }

    def _log_request(self, method: str, path: str, client_id: str,
                    status: int, execution_time: float):
        """تسجيل الطلب"""
        self.request_log.append({
            'timestamp': datetime.now().isoformat(),
            'method': method.upper(),
            'path': path,
            'client_id': client_id,
            'status': status,
            'execution_time_ms': round(execution_time * 1000, 2)
        })

    def get_analytics(self) -> dict:
        """الحصول على تحليلات الطلبات"""
        if not self.request_log:
            return {'total_requests': 0}

        success_count = sum(1 for r in self.request_log if r['status'] == 200)
        error_count = sum(1 for r in self.request_log if r['status'] >= 400)

        from statistics import mean
        avg_execution_time = mean(r['execution_time_ms'] for r in self.request_log)

        return {
            'total_requests': len(self.request_log),
            'successful_requests': success_count,
            'error_requests': error_count,
            'success_rate': round((success_count / len(self.request_log)) * 100, 2),
            'avg_execution_time_ms': round(avg_execution_time, 2),
            'cache_stats': self.cache_manager.get_stats()
        }


# ==================== ADVANCED REQUEST HANDLER ====================

class RequestValidator:
    """التحقق من صحة الطلبات"""

    @staticmethod
    def validate_student_data(data: dict) -> tuple[bool, str]:
        """التحقق من بيانات الطالب"""
        required_fields = ['firstName', 'lastName', 'email', 'phoneNumber']

        for field in required_fields:
            if field not in data or not data[field]:
                return False, f"Missing required field: {field}"

        # التحقق من صيغة البريد الإلكتروني
        if '@' not in data.get('email', ''):
            return False, "Invalid email format"

        # التحقق من صيغة رقم الهاتف (سعودي)
        phone = data.get('phoneNumber', '')
        if not phone.startswith('+966') and not phone.startswith('05'):
            return False, "Invalid phone format"

        return True, "Valid"

    @staticmethod
    def validate_grade_data(data: dict) -> tuple[bool, str]:
        """التحقق من بيانات الدرجات"""
        if 'studentId' not in data or 'courseId' not in data:
            return False, "Missing student or course ID"

        scores = {
            'assignments': data.get('assignments', 0),
            'midterm': data.get('midterm', 0),
            'final': data.get('final', 0)
        }

        for component, score in scores.items():
            if not (0 <= score <= 100):
                return False, f"{component} score must be between 0 and 100"

        return True, "Valid"


# ==================== PERFORMANCE OPTIMIZATION ====================

class QueryOptimizer:
    """محسّن الاستعلامات"""

    def __init__(self):
        self.index_config = {
            'students': ['studentId', 'email', 'major'],
            'courses': ['courseCode', 'semester'],
            'grades': ['studentId', 'courseId'],
            'attendance': ['studentId', 'date']
        }

    def get_recommended_indexes(self, collection: str) -> List[str]:
        """الحصول على الفهارس الموصى بها"""
        return self.index_config.get(collection, [])

    def optimize_query(self, query: dict) -> dict:
        """تحسين الاستعلام"""
        # محاكاة تحسين الاستعلام
        optimized = query.copy()

        # إضافة عمليات الفهرسة إذا لزم الأمر
        if 'filter' in query:
            optimized['use_index'] = True

        return optimized


# ==================== MONITORING & METRICS ====================

class PerformanceMonitor:
    """مراقب الأداء"""

    def __init__(self):
        self.metrics = {
            'api_calls': 0,
            'cache_hits': 0,
            'cache_misses': 0,
            'avg_response_time_ms': 0,
            'error_rate': 0
        }

    def record_api_call(self, response_time_ms: float, cached: bool = False):
        """تسجيل استدعاء API"""
        self.metrics['api_calls'] += 1

        if cached:
            self.metrics['cache_hits'] += 1
        else:
            self.metrics['cache_misses'] += 1

        # تحديث متوسط وقت الاستجابة
        total_api_calls = self.metrics['api_calls']
        current_avg = self.metrics['avg_response_time_ms']

        self.metrics['avg_response_time_ms'] = (
            (current_avg * (total_api_calls - 1) + response_time_ms) / total_api_calls
        )

    def get_cache_hit_rate(self) -> float:
        """الحصول على معدل هيت الذاكرة المؤقتة"""
        total = self.metrics['cache_hits'] + self.metrics['cache_misses']

        if total == 0:
            return 0.0

        return (self.metrics['cache_hits'] / total) * 100

    def get_report(self) -> dict:
        """الحصول على تقرير الأداء"""
        return {
            'total_api_calls': self.metrics['api_calls'],
            'cache_hits': self.metrics['cache_hits'],
            'cache_misses': self.metrics['cache_misses'],
            'cache_hit_rate_%': round(self.get_cache_hit_rate(), 2),
            'avg_response_time_ms': round(self.metrics['avg_response_time_ms'], 2),
            'error_rate_%': self.metrics['error_rate']
        }


# ==================== EXAMPLE USAGE ====================

def demo_api_gateway():
    """عرض توضيحي لبوابة API"""

    # إنشاء البوابة
    gateway = APIGateway()

    # تسجيل المسارات
    gateway.add_route('/api/v1/students', 'GET',
                     lambda params: get_students(params), cache_ttl=300)
    gateway.add_route('/api/v1/students', 'POST',
                     lambda params: create_student(params), cache_ttl=0)
    gateway.add_route('/api/v1/students/:id/gpa', 'GET',
                     lambda params: get_student_gpa(params), cache_ttl=600)

    # معالجة طلب
    response = gateway.handle_request(
        method='GET',
        path='/api/v1/students',
        client_id='client_123',
        params={'page': 1}
    )

    print("✅ Response:", response)
    print("📊 Analytics:", gateway.get_analytics())


def get_students(params):
    """معالج الحصول على الطلاب"""
    return ['STU001', 'STU002', 'STU003']


def create_student(params):
    """معالج إنشاء طالب"""
    return {'studentId': 'STU004', 'created': True}


def get_student_gpa(params):
    """معالج الحصول على معدل الطالب"""
    return {'gpa': 3.75, 'semester': 'Fall 2024'}


if __name__ == '__main__':
    demo_api_gateway()
