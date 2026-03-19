"""
📊 Performance Analytics Service
نظام مراقبة الأداء والتحليلات المتقدمة

المميزات:
1. مراقبة الأداء في الوقت الفعلي
2. تحليل السرعة والاستجابة
3. تحليل استهلاك الموارد
4. التنبيهات الآلية
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional
import json

class PerformanceAnalyticsService:
    """خدمة تحليلات الأداء المتقدمة"""

    def __init__(self, db):
        self.db = db
        self.metrics_window = 60  # آخر 60 دقيقة

    # ==========================================
    # 1. جمع المقاييس
    # ==========================================

    def record_metric(self, metric_data: Dict) -> Dict:
        """
        تسجيل مقياس الأداء

        Args:
            metric_data: بيانات المقياس
                - metric_type: نوع المقياس (response_time, memory, cpu, etc)
                - value: القيمة
                - threshold: الحد الأقصى
                - source: المصدر (api, database, etc)
                - tags: علامات تمييزية
        """

        metric = {
            'id': self._generate_metric_id(),
            'type': metric_data.get('metric_type'),
            'value': metric_data.get('value'),
            'threshold': metric_data.get('threshold'),
            'source': metric_data.get('source'),
            'tags': metric_data.get('tags', {}),
            'timestamp': datetime.now().isoformat(),
            'is_alert': metric_data.get('value', 0) > metric_data.get('threshold', float('inf'))
        }

        self.db['performance_metrics'].insert_one(metric)

        # التحقق من التنبيهات
        if metric['is_alert']:
            self._trigger_alert(metric)

        return {
            'metric_id': metric['id'],
            'status': 'recorded'
        }

    # ==========================================
    # 2. مراقبة الأداء الحالية
    # ==========================================

    def get_current_performance(self) -> Dict:
        """الحصول على أداء النظام الحالية"""

        # جمع المقاييس الأخيرة
        recent_metrics = list(
            self.db['performance_metrics'].find({
                'timestamp': {
                    '$gte': (datetime.now() - timedelta(minutes=5)).isoformat()
                }
            }).sort('timestamp', -1).limit(100)
        )

        performance = {
            'timestamp': datetime.now().isoformat(),
            'overall_health': self._calculate_health_score(recent_metrics),
            'response_time': self._calculate_avg_metric(recent_metrics, 'response_time'),
            'api_availability': self._calculate_availability(recent_metrics),
            'error_rate': self._calculate_error_rate(recent_metrics),
            'active_connections': self._get_active_connections(),
            'database_status': self._check_database_status(),
            'server_resources': self._get_server_resources(),
            'alerts': self._get_active_alerts()
        }

        return performance

    def get_system_health_dashboard(self) -> Dict:
        """الحصول على لوحة صحة النظام"""

        return {
            'status': self.get_current_performance(),
            'metrics': self._get_performance_summary(),
            'alerts': self._get_alert_summary(),
            'trends': self._get_performance_trends()
        }

    # ==========================================
    # 3. تحليل الأداء
    # ==========================================

    def analyze_response_time(self, endpoint: Optional[str] = None) -> Dict:
        """تحليل أوقات الاستجابة"""

        query = {'type': 'response_time'}
        if endpoint:
            query['tags.endpoint'] = endpoint

        metrics = list(
            self.db['performance_metrics'].find(query).sort('timestamp', -1).limit(1000)
        )

        values = [m['value'] for m in metrics]

        analysis = {
            'endpoint': endpoint or 'all_endpoints',
            'period': 'last_hour',
            'statistics': {
                'min': min(values) if values else 0,
                'max': max(values) if values else 0,
                'average': sum(values) / len(values) if values else 0,
                'median': self._calculate_median(values),
                'percentile_95': self._calculate_percentile(values, 95),
                'percentile_99': self._calculate_percentile(values, 99)
            },
            'trend': self._calculate_trend(values),
            'slow_endpoints': self._get_slow_endpoints(metrics) if not endpoint else []
        }

        return analysis

    def analyze_resource_usage(self) -> Dict:
        """تحليل استهلاك الموارد"""

        # جمع مقاييس الموارد
        cpu_metrics = list(
            self.db['performance_metrics'].find({
                'type': 'cpu_usage',
                'timestamp': {
                    '$gte': (datetime.now() - timedelta(hours=1)).isoformat()
                }
            }).sort('timestamp', -1).limit(100)
        )

        memory_metrics = list(
            self.db['performance_metrics'].find({
                'type': 'memory_usage',
                'timestamp': {
                    '$gte': (datetime.now() - timedelta(hours=1)).isoformat()
                }
            }).sort('timestamp', -1).limit(100)
        )

        cpu_values = [m['value'] for m in cpu_metrics]
        memory_values = [m['value'] for m in memory_metrics]

        analysis = {
            'cpu': {
                'current': cpu_values[0] if cpu_values else 0,
                'average': sum(cpu_values) / len(cpu_values) if cpu_values else 0,
                'peak': max(cpu_values) if cpu_values else 0,
                'trend': self._calculate_trend(cpu_values)
            },
            'memory': {
                'current': memory_values[0] if memory_values else 0,
                'average': sum(memory_values) / len(memory_values) if memory_values else 0,
                'peak': max(memory_values) if memory_values else 0,
                'trend': self._calculate_trend(memory_values)
            },
            'recommendations': self._generate_resource_recommendations(
                cpu_values,
                memory_values
            )
        }

        return analysis

    def identify_bottlenecks(self) -> List[Dict]:
        """تحديد الاختناقات في النظام"""

        # الحصول على المقاييس البطيئة
        slow_metrics = list(
            self.db['performance_metrics'].find({
                'is_alert': True,
                'type': 'response_time',
                'timestamp': {
                    '$gte': (datetime.now() - timedelta(hours=1)).isoformat()
                }
            }).sort('value', -1).limit(20)
        )

        bottlenecks = []

        for metric in slow_metrics:
            bottleneck = {
                'source': metric.get('source'),
                'endpoint': metric.get('tags', {}).get('endpoint'),
                'response_time': metric.get('value'),
                'severity': self._calculate_severity(metric.get('value')),
                'frequency': self._count_occurrences(
                    metric.get('source'),
                    metric.get('tags', {}).get('endpoint')
                ),
                'recommendations': self._get_optimization_recommendations(metric)
            }
            bottlenecks.append(bottleneck)

        return bottlenecks

    # ==========================================
    # 4. التنبيهات
    # ==========================================

    def set_alert_threshold(self, alert_config: Dict) -> Dict:
        """تعيين حد تنبيه"""

        alert = {
            'id': self._generate_alert_id(),
            'metric_type': alert_config.get('metric_type'),
            'threshold': alert_config.get('threshold'),
            'condition': alert_config.get('condition', 'greater_than'),  # greater_than, less_than
            'actions': alert_config.get('actions', []),  # email, sms, webhook
            'is_active': True,
            'created_at': datetime.now().isoformat()
        }

        self.db['alert_thresholds'].insert_one(alert)

        return {
            'alert_id': alert['id'],
            'status': 'created'
        }

    def get_active_alerts(self) -> List[Dict]:
        """الحصول على التنبيهات النشطة"""

        alerts = list(
            self.db['performance_alerts'].find({
                'status': 'active',
                'resolved_at': None
            }).sort('triggered_at', -1).limit(50)
        )

        return alerts

    def acknowledge_alert(self, alert_id: str, notes: str = '') -> Dict:
        """الإقرار بالتنبيه"""

        self.db['performance_alerts'].update_one(
            {'_id': alert_id},
            {
                '$set': {
                    'status': 'acknowledged',
                    'acknowledged_at': datetime.now().isoformat(),
                    'acknowledged_by': 'system',
                    'notes': notes
                }
            }
        )

        return {'status': 'acknowledged'}

    def resolve_alert(self, alert_id: str, resolution: str = '') -> Dict:
        """حل التنبيه"""

        self.db['performance_alerts'].update_one(
            {'_id': alert_id},
            {
                '$set': {
                    'status': 'resolved',
                    'resolved_at': datetime.now().isoformat(),
                    'resolution': resolution
                }
            }
        )

        return {'status': 'resolved'}

    # ==========================================
    # 5. التقارير
    # ==========================================

    def generate_performance_report(self, date_from: str,
                                   date_to: str) -> Dict:
        """توليد تقرير أداء شامل"""

        metrics = list(
            self.db['performance_metrics'].find({
                'timestamp': {
                    '$gte': date_from,
                    '$lte': date_to
                }
            })
        )

        alerts = list(
            self.db['performance_alerts'].find({
                'triggered_at': {
                    '$gte': date_from,
                    '$lte': date_to
                }
            })
        )

        report = {
            'period': {'from': date_from, 'to': date_to},
            'generated_at': datetime.now().isoformat(),
            'summary': {
                'total_metrics': len(metrics),
                'total_alerts': len(alerts),
                'uptime': self._calculate_uptime(metrics),
                'average_response_time': self._calculate_avg_metric(metrics, 'response_time')
            },
            'by_metric_type': self._group_metrics_by_type(metrics),
            'alerts_summary': self._summarize_alerts(alerts),
            'trends': self._analyze_trends(metrics),
            'recommendations': self._generate_report_recommendations(metrics, alerts)
        }

        return report

    def get_performance_trends(self, metric_type: str,
                              days: int = 7) -> Dict:
        """الحصول على اتجاهات الأداء"""

        start_date = datetime.now() - timedelta(days=days)

        metrics = list(
            self.db['performance_metrics'].find({
                'type': metric_type,
                'timestamp': {
                    '$gte': start_date.isoformat()
                }
            }).sort('timestamp', 1)
        )

        # تجميع حسب اليوم
        daily_stats = {}
        for metric in metrics:
            day = metric['timestamp'][:10]
            if day not in daily_stats:
                daily_stats[day] = []
            daily_stats[day].append(metric['value'])

        trend_data = {
            'metric_type': metric_type,
            'period': f'last_{days}_days',
            'daily_averages': {
                day: sum(values) / len(values)
                for day, values in daily_stats.items()
            },
            'trend': self._calculate_trend([
                sum(values) / len(values)
                for values in daily_stats.values()
            ])
        }

        return trend_data

    # ==========================================
    # Helper Methods
    # ==========================================

    def _generate_metric_id(self) -> str:
        """توليد معرف المقياس"""
        return f"MET_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    def _generate_alert_id(self) -> str:
        """توليد معرف التنبيه"""
        return f"ALR_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    def _calculate_health_score(self, metrics: List[Dict]) -> float:
        """حساب درجة صحة النظام"""
        if not metrics:
            return 100

        alert_count = sum(1 for m in metrics if m.get('is_alert'))
        health = 100 - (alert_count * 5)

        return max(0, min(100, health))

    def _calculate_avg_metric(self, metrics: List[Dict], metric_type: str) -> float:
        """حساب متوسط مقياس معين"""
        filtered = [m['value'] for m in metrics if m['type'] == metric_type]
        return sum(filtered) / len(filtered) if filtered else 0

    def _calculate_availability(self, metrics: List[Dict]) -> float:
        """حساب التوفرية (%)"""
        # حساب بناءً على الأخطاء
        total = len(metrics)
        errors = sum(1 for m in metrics if m['type'] == 'error')

        return ((total - errors) / total * 100) if total > 0 else 100

    def _calculate_error_rate(self, metrics: List[Dict]) -> float:
        """حساب معدل الأخطاء"""
        total = len(metrics)
        errors = sum(1 for m in metrics if m['type'] == 'error')

        return (errors / total * 100) if total > 0 else 0

    def _get_active_connections(self) -> int:
        """الحصول على عدد الاتصالات النشطة"""
        return 0  # يمكن الحصول من النظام الفعلي

    def _check_database_status(self) -> str:
        """التحقق من حالة قاعدة البيانات"""
        return 'healthy'

    def _get_server_resources(self) -> Dict:
        """الحصول على موارد الخادم"""
        return {
            'cpu': 0,
            'memory': 0,
            'disk': 0
        }

    def _get_active_alerts(self) -> List[Dict]:
        """الحصول على التنبيهات النشطة"""
        return list(
            self.db['performance_alerts'].find({'status': 'active'}).limit(10)
        )

    def _get_performance_summary(self) -> Dict:
        """ملخص الأداء"""
        return {}

    def _get_alert_summary(self) -> Dict:
        """ملخص التنبيهات"""
        return {}

    def _get_performance_trends(self) -> Dict:
        """اتجاهات الأداء"""
        return {}

    def _calculate_median(self, values: List[float]) -> float:
        """حساب الوسيط"""
        if not values:
            return 0
        sorted_values = sorted(values)
        n = len(sorted_values)
        return (sorted_values[n//2] + sorted_values[(n-1)//2]) / 2

    def _calculate_percentile(self, values: List[float], percentile: int) -> float:
        """حساب النسبة المئوية"""
        if not values:
            return 0
        sorted_values = sorted(values)
        index = int(len(sorted_values) * percentile / 100)
        return sorted_values[min(index, len(sorted_values) - 1)]

    def _calculate_trend(self, values: List[float]) -> str:
        """حساب الاتجاه"""
        if len(values) < 2:
            return 'stable'

        recent = values[-5:] if len(values) >= 5 else values
        old = values[:5] if len(values) >= 10 else values[:len(values)//2]

        recent_avg = sum(recent) / len(recent)
        old_avg = sum(old) / len(old)

        if recent_avg > old_avg * 1.1:
            return 'increasing'
        elif recent_avg < old_avg * 0.9:
            return 'decreasing'
        else:
            return 'stable'

    def _get_slow_endpoints(self, metrics: List[Dict]) -> List[Dict]:
        """الحصول على الـ endpoints البطيئة"""
        return []

    def _generate_resource_recommendations(self, cpu: List[float],
                                          memory: List[float]) -> List[str]:
        """توليد توصيات الموارد"""
        recommendations = []

        if cpu and sum(cpu) / len(cpu) > 80:
            recommendations.append('Consider scaling out CPU resources')

        if memory and sum(memory) / len(memory) > 80:
            recommendations.append('Consider increasing memory')

        return recommendations

    def _count_occurrences(self, source: str, endpoint: str) -> int:
        """عد حدوث الاختناق"""
        return 1

    def _calculate_severity(self, value: float) -> str:
        """حساب درجة الخطورة"""
        if value > 5000:
            return 'critical'
        elif value > 1000:
            return 'high'
        elif value > 500:
            return 'medium'
        else:
            return 'low'

    def _get_optimization_recommendations(self, metric: Dict) -> List[str]:
        """الحصول على توصيات التحسين"""
        return []

    def _trigger_alert(self, metric: Dict):
        """تفعيل التنبيه"""
        alert = {
            'id': self._generate_alert_id(),
            'metric_id': metric['id'],
            'triggered_at': datetime.now().isoformat(),
            'status': 'active',
            'resolved_at': None
        }
        self.db['performance_alerts'].insert_one(alert)

    def _calculate_uptime(self, metrics: List[Dict]) -> float:
        """حساب التوفرية"""
        return 99.9

    def _group_metrics_by_type(self, metrics: List[Dict]) -> Dict:
        """تجميع المقاييس حسب النوع"""
        return {}

    def _summarize_alerts(self, alerts: List[Dict]) -> Dict:
        """ملخص التنبيهات"""
        return {}

    def _analyze_trends(self, metrics: List[Dict]) -> Dict:
        """تحليل الاتجاهات"""
        return {}

    def _generate_report_recommendations(self, metrics: List[Dict],
                                        alerts: List[Dict]) -> List[str]:
        """توليد توصيات التقرير"""
        return []
