"""
Performance Monitoring Service
خدمة مراقبة الأداء
"""

from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import json
import time
import os
import psutil


class MetricType:
    """أنواع المقاييس"""
    CPU_USAGE = "cpu_usage"
    MEMORY_USAGE = "memory_usage"
    DISK_USAGE = "disk_usage"
    API_RESPONSE_TIME = "api_response_time"
    ERROR_RATE = "error_rate"
    REQUEST_COUNT = "request_count"
    DATABASE_QUERY_TIME = "database_query_time"
    ACTIVE_USERS = "active_users"


class HealthStatus:
    """حالات الصحة"""
    HEALTHY = "healthy"
    WARNING = "warning"
    CRITICAL = "critical"
    DOWN = "down"


class PerformanceMonitoringService:
    """خدمة مراقبة الأداء"""

    # قاعدة بيانات مؤقتة
    metrics_db = {}
    alerts_db = {}
    health_checks_db = {}
    log_db = {}

    # Counters
    request_count = 0
    error_count = 0
    active_connections = 0

    @staticmethod
    def record_metric(metric_type: str, value: float, tags: Optional[Dict] = None) -> Dict[str, Any]:
        """تسجيل مقياس"""
        try:
            metric_id = f"metric_{len(PerformanceMonitoringService.metrics_db) + 1}"

            metric = {
                'id': metric_id,
                'type': metric_type,
                'value': value,
                'tags': tags or {},
                'timestamp': datetime.now().isoformat(),
                'unit': PerformanceMonitoringService._get_unit(metric_type)
            }

            PerformanceMonitoringService.metrics_db[metric_id] = metric

            # تحقق من التنبيهات
            PerformanceMonitoringService._check_alerts(metric_type, value)

            return metric

        except Exception as e:
            return {'error': str(e)}

    @staticmethod
    def _get_unit(metric_type: str) -> str:
        """الحصول على وحدة القياس"""
        units = {
            MetricType.CPU_USAGE: '%',
            MetricType.MEMORY_USAGE: '%',
            MetricType.DISK_USAGE: '%',
            MetricType.API_RESPONSE_TIME: 'ms',
            MetricType.ERROR_RATE: '%',
            MetricType.REQUEST_COUNT: 'req/s',
            MetricType.DATABASE_QUERY_TIME: 'ms',
            MetricType.ACTIVE_USERS: 'users'
        }
        return units.get(metric_type, '')

    @staticmethod
    def get_system_metrics() -> Dict[str, Any]:
        """الحصول على مقاييس النظام"""
        try:
            # CPU
            cpu_percent = psutil.cpu_percent(interval=1)
            cpu_count = psutil.cpu_count()

            # Memory
            memory = psutil.virtual_memory()
            memory_percent = memory.percent

            # Disk
            disk = psutil.disk_usage('/')
            disk_percent = disk.percent

            # Network
            net_io = psutil.net_io_counters()

            metrics = {
                'cpu': {
                    'usage_percent': cpu_percent,
                    'count': cpu_count,
                    'status': PerformanceMonitoringService._get_status_from_value(cpu_percent, 70, 90)
                },
                'memory': {
                    'usage_percent': memory_percent,
                    'available_mb': memory.available / (1024 * 1024),
                    'total_mb': memory.total / (1024 * 1024),
                    'status': PerformanceMonitoringService._get_status_from_value(memory_percent, 70, 90)
                },
                'disk': {
                    'usage_percent': disk_percent,
                    'free_gb': disk.free / (1024 * 1024 * 1024),
                    'total_gb': disk.total / (1024 * 1024 * 1024),
                    'status': PerformanceMonitoringService._get_status_from_value(disk_percent, 80, 95)
                },
                'network': {
                    'bytes_sent': net_io.bytes_sent,
                    'bytes_recv': net_io.bytes_recv,
                    'packets_sent': net_io.packets_sent,
                    'packets_recv': net_io.packets_recv
                },
                'timestamp': datetime.now().isoformat()
            }

            # Save to db
            check_id = f"health_check_{len(PerformanceMonitoringService.health_checks_db) + 1}"
            PerformanceMonitoringService.health_checks_db[check_id] = metrics

            return metrics

        except Exception as e:
            return {'error': str(e)}

    @staticmethod
    def _get_status_from_value(value: float, warning_threshold: float, critical_threshold: float) -> str:
        """تحديد الحالة من القيمة"""
        if value >= critical_threshold:
            return HealthStatus.CRITICAL
        elif value >= warning_threshold:
            return HealthStatus.WARNING
        else:
            return HealthStatus.HEALTHY

    @staticmethod
    def track_request(method: str, path: str, status_code: int, response_time: float) -> None:
        """تتبع طلب HTTP"""
        try:
            PerformanceMonitoringService.request_count += 1

            if status_code >= 400:
                PerformanceMonitoringService.error_count += 1

            # Record metrics
            PerformanceMonitoringService.record_metric(
                MetricType.API_RESPONSE_TIME,
                response_time,
                {'method': method, 'path': path, 'status': status_code}
            )

            # Log
            PerformanceMonitoringService._log_request(method, path, status_code, response_time)

        except Exception as e:
            print(f"Error tracking request: {e}")

    @staticmethod
    def _log_request(method: str, path: str, status_code: int, response_time: float) -> None:
        """تسجيل طلب"""
        log_id = f"log_{len(PerformanceMonitoringService.log_db) + 1}"

        log_entry = {
            'id': log_id,
            'method': method,
            'path': path,
            'status_code': status_code,
            'response_time_ms': response_time,
            'timestamp': datetime.now().isoformat(),
            'level': 'error' if status_code >= 400 else 'info'
        }

        PerformanceMonitoringService.log_db[log_id] = log_entry

    @staticmethod
    def get_api_metrics(time_range_minutes: int = 60) -> Dict[str, Any]:
        """الحصول على مقاييس API"""
        try:
            cutoff_time = datetime.now() - timedelta(minutes=time_range_minutes)

            relevant_metrics = [
                m for m in PerformanceMonitoringService.metrics_db.values()
                if m['type'] == MetricType.API_RESPONSE_TIME and
                datetime.fromisoformat(m['timestamp']) > cutoff_time
            ]

            if not relevant_metrics:
                return {
                    'avg_response_time_ms': 0,
                    'min_response_time_ms': 0,
                    'max_response_time_ms': 0,
                    'p95_response_time_ms': 0,
                    'p99_response_time_ms': 0,
                    'request_count': 0
                }

            values = [m['value'] for m in relevant_metrics]
            values.sort()

            return {
                'avg_response_time_ms': sum(values) / len(values),
                'min_response_time_ms': min(values),
                'max_response_time_ms': max(values),
                'p95_response_time_ms': values[int(len(values) * 0.95)],
                'p99_response_time_ms': values[int(len(values) * 0.99)],
                'request_count': len(values)
            }

        except Exception as e:
            return {'error': str(e)}

    @staticmethod
    def get_error_rate(time_range_minutes: int = 60) -> Dict[str, Any]:
        """الحصول على معدل الأخطاء"""
        try:
            cutoff_time = datetime.now() - timedelta(minutes=time_range_minutes)

            relevant_logs = [
                l for l in PerformanceMonitoringService.log_db.values()
                if datetime.fromisoformat(l['timestamp']) > cutoff_time
            ]

            if not relevant_logs:
                return {
                    'total_requests': 0,
                    'total_errors': 0,
                    'error_rate_percent': 0,
                    'errors_by_status': {}
                }

            errors = [l for l in relevant_logs if l['status_code'] >= 400]
            errors_by_status = {}

            for error in errors:
                status = str(error['status_code'])
                errors_by_status[status] = errors_by_status.get(status, 0) + 1

            return {
                'total_requests': len(relevant_logs),
                'total_errors': len(errors),
                'error_rate_percent': (len(errors) / len(relevant_logs) * 100) if relevant_logs else 0,
                'errors_by_status': errors_by_status
            }

        except Exception as e:
            return {'error': str(e)}

    @staticmethod
    def create_alert_rule(rule_data: Dict[str, Any]) -> Dict[str, Any]:
        """إنشاء قاعدة تنبيه"""
        try:
            rule_id = f"alert_rule_{len(PerformanceMonitoringService.alerts_db) + 1}"

            rule = {
                'id': rule_id,
                'name': rule_data.get('name'),
                'metric_type': rule_data.get('metric_type'),
                'condition': rule_data.get('condition'),  # 'greater_than', 'less_than'
                'threshold': rule_data.get('threshold'),
                'duration_seconds': rule_data.get('duration_seconds', 60),
                'action': rule_data.get('action'),  # 'notification', 'email', 'log'
                'enabled': rule_data.get('enabled', True),
                'created_at': datetime.now().isoformat()
            }

            PerformanceMonitoringService.alerts_db[rule_id] = rule

            return rule

        except Exception as e:
            return {'error': str(e)}

    @staticmethod
    def _check_alerts(metric_type: str, value: float) -> List[str]:
        """التحقق من التنبيهات"""
        triggered_alerts = []

        try:
            for rule_id, rule in PerformanceMonitoringService.alerts_db.items():
                if not rule['enabled'] or rule['metric_type'] != metric_type:
                    continue

                should_trigger = False

                if rule['condition'] == 'greater_than' and value > rule['threshold']:
                    should_trigger = True
                elif rule['condition'] == 'less_than' and value < rule['threshold']:
                    should_trigger = True

                if should_trigger:
                    # تنفيذ الإجراء
                    if rule['action'] == 'notification':
                        # Send notification
                        pass
                    elif rule['action'] == 'email':
                        # Send email
                        pass

                    triggered_alerts.append(rule_id)

            return triggered_alerts

        except Exception as e:
            return []

    @staticmethod
    def get_dashboard_summary() -> Dict[str, Any]:
        """الحصول على ملخص لوحة التحكم"""
        try:
            system_metrics = PerformanceMonitoringService.get_system_metrics()
            api_metrics = PerformanceMonitoringService.get_api_metrics()
            error_rate = PerformanceMonitoringService.get_error_rate()

            # Overall health status
            statuses = [
                system_metrics.get('cpu', {}).get('status'),
                system_metrics.get('memory', {}).get('status'),
                system_metrics.get('disk', {}).get('status')
            ]

            overall_status = HealthStatus.HEALTHY
            if HealthStatus.CRITICAL in statuses:
                overall_status = HealthStatus.CRITICAL
            elif HealthStatus.WARNING in statuses:
                overall_status = HealthStatus.WARNING

            return {
                'overall_status': overall_status,
                'system_metrics': system_metrics,
                'api_metrics': api_metrics,
                'error_rate': error_rate,
                'active_connections': PerformanceMonitoringService.active_connections,
                'total_requests': PerformanceMonitoringService.request_count,
                'total_errors': PerformanceMonitoringService.error_count,
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            return {'error': str(e)}

    @staticmethod
    def get_alerts() -> List[Dict[str, Any]]:
        """الحصول على التنبيهات"""
        return list(PerformanceMonitoringService.alerts_db.values())

    @staticmethod
    def get_logs(limit: int = 100, level: Optional[str] = None) -> List[Dict[str, Any]]:
        """الحصول على السجلات"""
        logs = list(PerformanceMonitoringService.log_db.values())

        if level:
            logs = [l for l in logs if l['level'] == level]

        logs.sort(key=lambda x: x['timestamp'], reverse=True)

        return logs[:limit]

    @staticmethod
    def get_metrics_by_type(metric_type: str, limit: int = 100) -> List[Dict[str, Any]]:
        """الحصول على المقاييس حسب النوع"""
        metrics = [
            m for m in PerformanceMonitoringService.metrics_db.values()
            if m['type'] == metric_type
        ]

        metrics.sort(key=lambda x: x['timestamp'], reverse=True)

        return metrics[:limit]

    @staticmethod
    def get_uptime() -> Dict[str, Any]:
        """الحصول على وقت التشغيل"""
        try:
            # Process uptime
            process = psutil.Process(os.getpid())
            create_time = process.create_time()
            current_time = time.time()
            uptime_seconds = int(current_time - create_time)

            uptime_hours = uptime_seconds // 3600
            uptime_minutes = (uptime_seconds % 3600) // 60

            return {
                'uptime_seconds': uptime_seconds,
                'uptime_hours': uptime_hours,
                'uptime_minutes': uptime_minutes,
                'start_time': datetime.fromtimestamp(create_time).isoformat()
            }

        except Exception as e:
            return {'error': str(e)}

    @staticmethod
    def get_performance_report(time_range_minutes: int = 60) -> Dict[str, Any]:
        """الحصول على تقرير الأداء"""
        try:
            system = PerformanceMonitoringService.get_system_metrics()
            api = PerformanceMonitoringService.get_api_metrics(time_range_minutes)
            errors = PerformanceMonitoringService.get_error_rate(time_range_minutes)
            uptime = PerformanceMonitoringService.get_uptime()

            return {
                'time_range_minutes': time_range_minutes,
                'system': system,
                'api': api,
                'errors': errors,
                'uptime': uptime,
                'generated_at': datetime.now().isoformat()
            }

        except Exception as e:
            return {'error': str(e)}

    @staticmethod
    def cleanup_old_data(days: int = 7) -> int:
        """تنظيف البيانات القديمة"""
        try:
            cutoff_time = datetime.now() - timedelta(days=days)
            deleted_count = 0

            # Clean metrics
            keys_to_delete = [
                k for k, v in PerformanceMonitoringService.metrics_db.items()
                if datetime.fromisoformat(v['timestamp']) < cutoff_time
            ]

            for key in keys_to_delete:
                del PerformanceMonitoringService.metrics_db[key]
                deleted_count += 1

            # Clean logs
            keys_to_delete = [
                k for k, v in PerformanceMonitoringService.log_db.items()
                if datetime.fromisoformat(v['timestamp']) < cutoff_time
            ]

            for key in keys_to_delete:
                del PerformanceMonitoringService.log_db[key]
                deleted_count += 1

            # Clean health checks
            keys_to_delete = [
                k for k, v in PerformanceMonitoringService.health_checks_db.items()
                if datetime.fromisoformat(v['timestamp']) < cutoff_time
            ]

            for key in keys_to_delete:
                del PerformanceMonitoringService.health_checks_db[key]
                deleted_count += 1

            return deleted_count

        except Exception as e:
            return 0
