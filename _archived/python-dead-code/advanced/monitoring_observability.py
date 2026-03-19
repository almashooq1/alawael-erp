"""
نظام المراقبة والملاحظة المتقدم
Advanced Monitoring & Observability System
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from enum import Enum
import logging
import json
import statistics
from collections import defaultdict, deque
from threading import Lock

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ==================== تعريفات النظام ====================

class MetricType(Enum):
    """أنواع المقاييس"""
    COUNTER = "counter"           # عدد تراكمي
    GAUGE = "gauge"               # قيمة لحظية
    HISTOGRAM = "histogram"        # توزيع القيم
    TIMER = "timer"               # قياس الوقت


class AlertSeverity(Enum):
    """مستويات الأهمية"""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class HealthStatus(Enum):
    """حالات الصحة"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"


# ==================== نظام المقاييس ====================

class Metric:
    """كلاس المقياس الأساسي"""
    
    def __init__(self, name: str, metric_type: MetricType, 
                 description: str = ""):
        self.name = name
        self.metric_type = metric_type
        self.description = description
        self.created_at = datetime.now()
        self.values: deque = deque(maxlen=1000)
        self.tags: Dict[str, str] = {}
        self._lock = Lock()
    
    def record(self, value: float, tags: Dict[str, str] = None):
        """تسجيل قيمة"""
        with self._lock:
            self.values.append({
                'value': value,
                'timestamp': datetime.now(),
                'tags': tags or {}
            })
    
    def get_statistics(self) -> Dict[str, Any]:
        """الحصول على الإحصائيات"""
        with self._lock:
            if not self.values:
                return {}
            
            values = [v['value'] for v in self.values]
            
            return {
                'count': len(values),
                'min': min(values),
                'max': max(values),
                'mean': statistics.mean(values),
                'median': statistics.median(values),
                'stdev': statistics.stdev(values) if len(values) > 1 else 0
            }
    
    def to_dict(self) -> Dict:
        """تحويل إلى قاموس"""
        return {
            'name': self.name,
            'type': self.metric_type.value,
            'description': self.description,
            'created_at': self.created_at.isoformat(),
            'statistics': self.get_statistics(),
            'recent_values': list(self.values)[-10:]
        }


class MetricsCollector:
    """جامع المقاييس"""
    
    def __init__(self):
        self.metrics: Dict[str, Metric] = {}
        self._lock = Lock()
    
    def create_metric(self, name: str, metric_type: MetricType,
                     description: str = "") -> Metric:
        """إنشاء مقياس جديد"""
        
        with self._lock:
            if name not in self.metrics:
                metric = Metric(name, metric_type, description)
                self.metrics[name] = metric
                logger.info(f"✅ مقياس تم إنشاؤه: {name}")
                return metric
            
            return self.metrics[name]
    
    def record_metric(self, name: str, value: float, 
                     tags: Dict[str, str] = None):
        """تسجيل قيمة مقياس"""
        
        if name not in self.metrics:
            return
        
        self.metrics[name].record(value, tags)
    
    def get_metric(self, name: str) -> Optional[Dict]:
        """الحصول على معلومات المقياس"""
        
        if name in self.metrics:
            return self.metrics[name].to_dict()
        
        return None
    
    def get_all_metrics(self) -> List[Dict]:
        """جميع المقاييس"""
        
        return [m.to_dict() for m in self.metrics.values()]


# ==================== نظام الأحداث والتنبيهات ====================

class HealthCheck:
    """فحص الصحة"""
    
    def __init__(self, name: str, check_func, interval: int = 60):
        self.name = name
        self.check_func = check_func
        self.interval = interval
        self.last_check = None
        self.status = HealthStatus.HEALTHY
        self.last_error = None
    
    def perform_check(self) -> bool:
        """تنفيذ الفحص"""
        try:
            result = self.check_func()
            self.last_check = datetime.now()
            
            if result:
                self.status = HealthStatus.HEALTHY
                logger.info(f"✅ فحص الصحة نجح: {self.name}")
            else:
                self.status = HealthStatus.DEGRADED
                logger.warning(f"⚠️ فحص الصحة تحذير: {self.name}")
            
            return result
        
        except Exception as e:
            self.status = HealthStatus.UNHEALTHY
            self.last_error = str(e)
            logger.error(f"❌ فحص الصحة فشل: {self.name} - {e}")
            return False
    
    def to_dict(self) -> Dict:
        """تحويل إلى قاموس"""
        return {
            'name': self.name,
            'status': self.status.value,
            'last_check': self.last_check.isoformat() if self.last_check else None,
            'error': self.last_error
        }


class Alert:
    """تنبيه"""
    
    def __init__(self, alert_id: str, title: str, 
                 message: str, severity: AlertSeverity,
                 metric_name: str, threshold: float):
        self.id = alert_id
        self.title = title
        self.message = message
        self.severity = severity
        self.metric_name = metric_name
        self.threshold = threshold
        self.created_at = datetime.now()
        self.resolved_at = None
        self.is_active = True
        self.occurrences = 0
    
    def resolve(self):
        """حل التنبيه"""
        self.is_active = False
        self.resolved_at = datetime.now()
        logger.info(f"✅ تنبيه تم حله: {self.id}")
    
    def increment_occurrences(self):
        """زيادة عدد الحالات"""
        self.occurrences += 1
    
    def to_dict(self) -> Dict:
        """تحويل إلى قاموس"""
        return {
            'id': self.id,
            'title': self.title,
            'message': self.message,
            'severity': self.severity.value,
            'metric_name': self.metric_name,
            'threshold': self.threshold,
            'created_at': self.created_at.isoformat(),
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'is_active': self.is_active,
            'occurrences': self.occurrences
        }


class AlertManager:
    """مدير التنبيهات"""
    
    def __init__(self):
        self.alerts: Dict[str, Alert] = {}
        self.alert_rules: List[Dict] = []
        self.triggered_count = 0
        self._lock = Lock()
    
    def add_alert_rule(self, metric_name: str, threshold: float,
                      comparison: str = "greater_than",
                      severity: AlertSeverity = AlertSeverity.WARNING):
        """إضافة قاعدة تنبيه"""
        
        rule = {
            'metric_name': metric_name,
            'threshold': threshold,
            'comparison': comparison,
            'severity': severity
        }
        
        self.alert_rules.append(rule)
        logger.info(f"✅ قاعدة تنبيه مضافة: {metric_name}")
    
    def check_and_trigger(self, metric_name: str, value: float):
        """التحقق والتشغيل"""
        
        with self._lock:
            for rule in self.alert_rules:
                if rule['metric_name'] != metric_name:
                    continue
                
                should_trigger = False
                
                if rule['comparison'] == 'greater_than':
                    should_trigger = value > rule['threshold']
                elif rule['comparison'] == 'less_than':
                    should_trigger = value < rule['threshold']
                elif rule['comparison'] == 'equals':
                    should_trigger = value == rule['threshold']
                
                if should_trigger:
                    self._trigger_alert(metric_name, value, rule)
    
    def _trigger_alert(self, metric_name: str, value: float, rule: Dict):
        """تشغيل تنبيه"""
        
        import uuid
        alert_id = str(uuid.uuid4())
        
        alert = Alert(
            alert_id=alert_id,
            title=f"التنبيه: {metric_name}",
            message=f"{metric_name} تجاوز الحد ({value} > {rule['threshold']})",
            severity=rule['severity'],
            metric_name=metric_name,
            threshold=rule['threshold']
        )
        
        self.alerts[alert_id] = alert
        self.triggered_count += 1
        
        logger.warning(f"🚨 تنبيه تم تشغيله: {alert_id}")
    
    def get_active_alerts(self) -> List[Dict]:
        """التنبيهات النشطة"""
        
        return [a.to_dict() for a in self.alerts.values() if a.is_active]
    
    def resolve_alert(self, alert_id: str):
        """حل تنبيه"""
        
        if alert_id in self.alerts:
            self.alerts[alert_id].resolve()


# ==================== نظام المراقبة الشامل ====================

class ObservabilitySystem:
    """نظام الملاحظة الشامل"""
    
    def __init__(self):
        self.metrics_collector = MetricsCollector()
        self.alert_manager = AlertManager()
        self.health_checks: Dict[str, HealthCheck] = {}
        self.logs: deque = deque(maxlen=10000)
        self.traces: Dict[str, Dict] = {}
        self.dashboards: Dict[str, Dict] = {}
    
    # ==================== المقاييس ====================
    
    def create_metric(self, name: str, metric_type: MetricType,
                     description: str = "") -> Metric:
        """إنشاء مقياس"""
        return self.metrics_collector.create_metric(name, metric_type, description)
    
    def record_metric(self, name: str, value: float, 
                     tags: Dict[str, str] = None):
        """تسجيل قيمة مقياس"""
        
        self.metrics_collector.record_metric(name, value, tags)
        self.alert_manager.check_and_trigger(name, value)
    
    # ==================== فحوصات الصحة ====================
    
    def register_health_check(self, name: str, check_func, interval: int = 60):
        """تسجيل فحص صحة"""
        
        health_check = HealthCheck(name, check_func, interval)
        self.health_checks[name] = health_check
        logger.info(f"✅ فحص صحة مسجل: {name}")
    
    def get_system_health(self) -> Dict:
        """حالة النظام"""
        
        statuses = [hc.status.value for hc in self.health_checks.values()]
        
        if "unhealthy" in statuses:
            overall = "unhealthy"
        elif "degraded" in statuses:
            overall = "degraded"
        else:
            overall = "healthy"
        
        return {
            'overall': overall,
            'checks': [hc.to_dict() for hc in self.health_checks.values()],
            'timestamp': datetime.now().isoformat()
        }
    
    # ==================== التنبيهات ====================
    
    def add_alert_rule(self, metric_name: str, threshold: float,
                      comparison: str = "greater_than",
                      severity: AlertSeverity = AlertSeverity.WARNING):
        """إضافة قاعدة تنبيه"""
        
        self.alert_manager.add_alert_rule(metric_name, threshold, comparison, severity)
    
    def get_active_alerts(self) -> List[Dict]:
        """التنبيهات النشطة"""
        return self.alert_manager.get_active_alerts()
    
    # ==================== السجلات ====================
    
    def log_event(self, level: str, message: str, 
                 context: Dict = None):
        """تسجيل حدث"""
        
        self.logs.append({
            'timestamp': datetime.now().isoformat(),
            'level': level,
            'message': message,
            'context': context or {}
        })
    
    def get_logs(self, level: str = None, limit: int = 100) -> List[Dict]:
        """الحصول على السجلات"""
        
        logs = list(self.logs)
        
        if level:
            logs = [l for l in logs if l['level'] == level]
        
        return logs[-limit:]
    
    # ==================== المتتبعات ====================
    
    def start_trace(self, trace_id: str, operation: str) -> str:
        """بدء متتبع"""
        
        self.traces[trace_id] = {
            'id': trace_id,
            'operation': operation,
            'started_at': datetime.now(),
            'spans': []
        }
        
        return trace_id
    
    def add_span(self, trace_id: str, span_name: str, 
                 duration_ms: float, status: str = "success"):
        """إضافة مدى"""
        
        if trace_id not in self.traces:
            return
        
        self.traces[trace_id]['spans'].append({
            'name': span_name,
            'duration_ms': duration_ms,
            'status': status,
            'timestamp': datetime.now().isoformat()
        })
    
    def end_trace(self, trace_id: str) -> Optional[Dict]:
        """إنهاء متتبع"""
        
        if trace_id not in self.traces:
            return None
        
        trace = self.traces[trace_id]
        trace['ended_at'] = datetime.now()
        
        total_duration = (
            (trace['ended_at'] - trace['started_at']).total_seconds() * 1000
        )
        trace['total_duration_ms'] = total_duration
        
        logger.info(f"📊 متتبع انتهى: {trace_id} ({total_duration}ms)")
        
        return trace
    
    # ==================== لوحات التحكم ====================
    
    def create_dashboard(self, dashboard_id: str, title: str,
                        widgets: List[Dict]):
        """إنشاء لوحة تحكم"""
        
        self.dashboards[dashboard_id] = {
            'id': dashboard_id,
            'title': title,
            'widgets': widgets,
            'created_at': datetime.now().isoformat()
        }
        
        logger.info(f"✅ لوحة تحكم تم إنشاؤها: {title}")
    
    def get_dashboard_data(self, dashboard_id: str) -> Optional[Dict]:
        """الحصول على بيانات لوحة التحكم"""
        
        if dashboard_id not in self.dashboards:
            return None
        
        dashboard = self.dashboards[dashboard_id]
        
        return {
            'id': dashboard['id'],
            'title': dashboard['title'],
            'widgets': dashboard['widgets'],
            'metrics': self.metrics_collector.get_all_metrics(),
            'alerts': self.get_active_alerts(),
            'health': self.get_system_health()
        }


# ==================== عرض توضيحي ====================

def demo_observability_system():
    """عرض توضيحي للنظام"""
    
    print("📊 عرض توضيحي لـ Monitoring & Observability\n")
    
    # 1. إنشاء النظام
    print("1️⃣ إنشاء نظام الملاحظة:")
    obs = ObservabilitySystem()
    
    # 2. إنشاء مقاييس
    print("\n2️⃣ إنشاء المقاييس:")
    
    cpu_metric = obs.create_metric(
        "cpu_usage",
        MetricType.GAUGE,
        "استخدام CPU بالنسبة المئوية"
    )
    
    request_metric = obs.create_metric(
        "http_requests",
        MetricType.COUNTER,
        "إجمالي طلبات HTTP"
    )
    
    response_metric = obs.create_metric(
        "response_time_ms",
        MetricType.HISTOGRAM,
        "وقت الاستجابة بالميلي ثانية"
    )
    
    print(f"   {len(obs.metrics_collector.metrics)} مقاييس تم إنشاؤها")
    
    # 3. تسجيل البيانات
    print("\n3️⃣ تسجيل البيانات:")
    
    for i in range(20):
        obs.record_metric("cpu_usage", 40 + (i % 30))
        obs.record_metric("http_requests", 1)
        obs.record_metric("response_time_ms", 100 + (i * 5))
    
    print(f"   تم تسجيل 60 قيمة")
    
    # 4. قواعد التنبيهات
    print("\n4️⃣ قواعد التنبيهات:")
    
    obs.add_alert_rule("cpu_usage", 80, "greater_than", AlertSeverity.CRITICAL)
    obs.add_alert_rule("response_time_ms", 500, "greater_than", AlertSeverity.WARNING)
    
    print(f"   قاعدتا تنبيه تم إضافتهما")
    
    # 5. فحوصات الصحة
    print("\n5️⃣ فحوصات الصحة:")
    
    def check_database():
        return True
    
    def check_cache():
        return True
    
    obs.register_health_check("database", check_database)
    obs.register_health_check("cache", check_cache)
    
    health = obs.get_system_health()
    print(f"   حالة النظام: {health['overall']}")
    
    # 6. السجلات
    print("\n6️⃣ السجلات:")
    
    obs.log_event("info", "تطبيق بدأ", {"version": "1.0.0"})
    obs.log_event("warning", "استخدام الذاكرة مرتفع")
    
    print(f"   {len(obs.logs)} سجل")
    
    # 7. المتتبعات
    print("\n7️⃣ المتتبعات:")
    
    trace_id = obs.start_trace("trace_001", "user_registration")
    obs.add_span(trace_id, "validate_input", 10)
    obs.add_span(trace_id, "check_email", 50)
    obs.add_span(trace_id, "create_user", 100)
    trace = obs.end_trace(trace_id)
    
    print(f"   المتتبع انتهى بـ {len(trace['spans'])} مدى")
    
    # 8. لوحات التحكم
    print("\n8️⃣ لوحات التحكم:")
    
    obs.create_dashboard(
        "main",
        "لوحة التحكم الرئيسية",
        [
            {'type': 'metric', 'name': 'cpu_usage'},
            {'type': 'metric', 'name': 'http_requests'},
            {'type': 'alert_list'},
            {'type': 'health_status'}
        ]
    )
    
    dashboard = obs.get_dashboard_data("main")
    print(f"   لوحة تحكم بـ {len(dashboard['widgets'])} أداة")


if __name__ == '__main__':
    demo_observability_system()
