"""
Advanced Reports Service
خدمة التقارير المتقدمة
"""

from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import json
import csv
import io


class ReportType:
    """أنواع التقارير"""
    SALES = "sales"
    REVENUE = "revenue"
    USERS = "users"
    ATTENDANCE = "attendance"
    INVENTORY = "inventory"
    FINANCIAL = "financial"
    CUSTOM = "custom"


class ReportFormat:
    """صيغ التصدير"""
    JSON = "json"
    CSV = "csv"
    PDF = "pdf"
    EXCEL = "excel"


class ReportService:
    """خدمة التقارير المتقدمة"""

    # قاعدة بيانات مؤقتة
    reports_db = {}
    templates_db = {}
    scheduled_reports_db = {}

    @staticmethod
    def generate_sales_report(filters: Dict[str, Any]) -> Dict[str, Any]:
        """توليد تقرير المبيعات"""
        try:
            start_date = filters.get('start_date', (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d'))
            end_date = filters.get('end_date', datetime.now().strftime('%Y-%m-%d'))
            group_by = filters.get('group_by', 'day')  # day, week, month

            # توليد بيانات تجريبية
            data = []
            total_sales = 0
            total_transactions = 0

            start = datetime.strptime(start_date, '%Y-%m-%d')
            end = datetime.strptime(end_date, '%Y-%m-%d')
            delta = end - start

            for i in range(delta.days + 1):
                current_date = start + timedelta(days=i)
                daily_sales = 1000 + (i * 50) + ((i % 7) * 100)
                transactions = 20 + (i % 10)

                data.append({
                    'date': current_date.strftime('%Y-%m-%d'),
                    'sales': round(daily_sales, 2),
                    'transactions': transactions,
                    'average_transaction': round(daily_sales / transactions, 2)
                })

                total_sales += daily_sales
                total_transactions += transactions

            report = {
                'report_type': ReportType.SALES,
                'title': 'تقرير المبيعات',
                'period': {
                    'start_date': start_date,
                    'end_date': end_date,
                    'days': delta.days + 1
                },
                'data': data,
                'summary': {
                    'total_sales': round(total_sales, 2),
                    'total_transactions': total_transactions,
                    'average_daily_sales': round(total_sales / (delta.days + 1), 2),
                    'average_transaction_value': round(total_sales / total_transactions, 2)
                },
                'metadata': {
                    'generated_at': datetime.now().isoformat(),
                    'filters': filters
                }
            }

            # حفظ التقرير
            report_id = f"report_{len(ReportService.reports_db) + 1}"
            ReportService.reports_db[report_id] = report

            return {**report, 'report_id': report_id}

        except Exception as e:
            return {'error': str(e)}

    @staticmethod
    def generate_revenue_report(filters: Dict[str, Any]) -> Dict[str, Any]:
        """توليد تقرير الإيرادات"""
        try:
            start_date = filters.get('start_date')
            end_date = filters.get('end_date')
            category = filters.get('category', 'all')

            # بيانات تجريبية
            data = []
            categories = ['Products', 'Services', 'Subscriptions', 'Other']

            for cat in categories:
                if category != 'all' and category != cat:
                    continue

                revenue = 10000 + (categories.index(cat) * 5000)
                growth = 5 + (categories.index(cat) * 2)

                data.append({
                    'category': cat,
                    'revenue': revenue,
                    'growth_percentage': growth,
                    'transactions': 100 + (categories.index(cat) * 20)
                })

            total_revenue = sum(item['revenue'] for item in data)

            report = {
                'report_type': ReportType.REVENUE,
                'title': 'تقرير الإيرادات',
                'period': {
                    'start_date': start_date or 'N/A',
                    'end_date': end_date or 'N/A'
                },
                'data': data,
                'summary': {
                    'total_revenue': total_revenue,
                    'categories_count': len(data),
                    'average_revenue_per_category': round(total_revenue / len(data), 2)
                },
                'charts': {
                    'pie_chart': {
                        'labels': [item['category'] for item in data],
                        'values': [item['revenue'] for item in data]
                    }
                },
                'metadata': {
                    'generated_at': datetime.now().isoformat(),
                    'filters': filters
                }
            }

            report_id = f"report_{len(ReportService.reports_db) + 1}"
            ReportService.reports_db[report_id] = report

            return {**report, 'report_id': report_id}

        except Exception as e:
            return {'error': str(e)}

    @staticmethod
    def generate_users_report(filters: Dict[str, Any]) -> Dict[str, Any]:
        """توليد تقرير المستخدمين"""
        try:
            role_filter = filters.get('role', 'all')
            status_filter = filters.get('status', 'all')

            # بيانات تجريبية
            roles_data = {
                'admin': {'count': 5, 'active': 5, 'inactive': 0},
                'manager': {'count': 15, 'active': 14, 'inactive': 1},
                'staff': {'count': 50, 'active': 45, 'inactive': 5},
                'user': {'count': 200, 'active': 180, 'inactive': 20}
            }

            data = []
            for role, stats in roles_data.items():
                if role_filter != 'all' and role_filter != role:
                    continue

                data.append({
                    'role': role,
                    'total_users': stats['count'],
                    'active_users': stats['active'],
                    'inactive_users': stats['inactive'],
                    'activity_rate': round((stats['active'] / stats['count']) * 100, 2)
                })

            total_users = sum(item['total_users'] for item in data)
            total_active = sum(item['active_users'] for item in data)

            report = {
                'report_type': ReportType.USERS,
                'title': 'تقرير المستخدمين',
                'data': data,
                'summary': {
                    'total_users': total_users,
                    'active_users': total_active,
                    'inactive_users': total_users - total_active,
                    'overall_activity_rate': round((total_active / total_users) * 100, 2)
                },
                'charts': {
                    'bar_chart': {
                        'labels': [item['role'] for item in data],
                        'active': [item['active_users'] for item in data],
                        'inactive': [item['inactive_users'] for item in data]
                    }
                },
                'metadata': {
                    'generated_at': datetime.now().isoformat(),
                    'filters': filters
                }
            }

            report_id = f"report_{len(ReportService.reports_db) + 1}"
            ReportService.reports_db[report_id] = report

            return {**report, 'report_id': report_id}

        except Exception as e:
            return {'error': str(e)}

    @staticmethod
    def generate_attendance_report(filters: Dict[str, Any]) -> Dict[str, Any]:
        """توليد تقرير الحضور"""
        try:
            start_date = filters.get('start_date', (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d'))
            end_date = filters.get('end_date', datetime.now().strftime('%Y-%m-%d'))

            data = []
            start = datetime.strptime(start_date, '%Y-%m-%d')
            end = datetime.strptime(end_date, '%Y-%m-%d')
            delta = end - start

            total_present = 0
            total_absent = 0

            for i in range(delta.days + 1):
                current_date = start + timedelta(days=i)
                weekday = current_date.weekday()

                # نسبة الحضور تعتمد على اليوم
                base_rate = 95 if weekday < 5 else 70
                present = base_rate + ((i % 5) - 2)
                absent = 100 - present

                data.append({
                    'date': current_date.strftime('%Y-%m-%d'),
                    'day': current_date.strftime('%A'),
                    'present_rate': round(present, 2),
                    'absent_rate': round(absent, 2),
                    'on_time': round(present * 0.9, 2),
                    'late': round(present * 0.1, 2)
                })

                total_present += present
                total_absent += absent

            report = {
                'report_type': ReportType.ATTENDANCE,
                'title': 'تقرير الحضور',
                'period': {
                    'start_date': start_date,
                    'end_date': end_date,
                    'days': delta.days + 1
                },
                'data': data,
                'summary': {
                    'average_present_rate': round(total_present / (delta.days + 1), 2),
                    'average_absent_rate': round(total_absent / (delta.days + 1), 2),
                    'best_day': max(data, key=lambda x: x['present_rate']),
                    'worst_day': min(data, key=lambda x: x['present_rate'])
                },
                'metadata': {
                    'generated_at': datetime.now().isoformat(),
                    'filters': filters
                }
            }

            report_id = f"report_{len(ReportService.reports_db) + 1}"
            ReportService.reports_db[report_id] = report

            return {**report, 'report_id': report_id}

        except Exception as e:
            return {'error': str(e)}

    @staticmethod
    def export_to_csv(report_id: str) -> str:
        """تصدير التقرير إلى CSV"""
        try:
            report = ReportService.reports_db.get(report_id)
            if not report:
                return None

            output = io.StringIO()

            if report['data']:
                fieldnames = report['data'][0].keys()
                writer = csv.DictWriter(output, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(report['data'])

            return output.getvalue()

        except Exception as e:
            return None

    @staticmethod
    def export_to_json(report_id: str) -> str:
        """تصدير التقرير إلى JSON"""
        try:
            report = ReportService.reports_db.get(report_id)
            if not report:
                return None

            return json.dumps(report, indent=2, ensure_ascii=False)

        except Exception as e:
            return None

    @staticmethod
    def create_template(template_data: Dict[str, Any]) -> Dict[str, Any]:
        """إنشاء قالب تقرير"""
        try:
            template_id = f"template_{len(ReportService.templates_db) + 1}"

            template = {
                'template_id': template_id,
                'name': template_data.get('name'),
                'description': template_data.get('description'),
                'report_type': template_data.get('report_type'),
                'filters': template_data.get('filters', {}),
                'columns': template_data.get('columns', []),
                'created_at': datetime.now().isoformat(),
                'created_by': template_data.get('created_by')
            }

            ReportService.templates_db[template_id] = template

            return template

        except Exception as e:
            return {'error': str(e)}

    @staticmethod
    def get_template(template_id: str) -> Optional[Dict[str, Any]]:
        """الحصول على قالب"""
        return ReportService.templates_db.get(template_id)

    @staticmethod
    def get_all_templates() -> List[Dict[str, Any]]:
        """الحصول على جميع القوالب"""
        return list(ReportService.templates_db.values())

    @staticmethod
    def schedule_report(schedule_data: Dict[str, Any]) -> Dict[str, Any]:
        """جدولة تقرير"""
        try:
            schedule_id = f"schedule_{len(ReportService.scheduled_reports_db) + 1}"

            schedule = {
                'schedule_id': schedule_id,
                'report_type': schedule_data.get('report_type'),
                'template_id': schedule_data.get('template_id'),
                'frequency': schedule_data.get('frequency'),  # daily, weekly, monthly
                'recipients': schedule_data.get('recipients', []),
                'format': schedule_data.get('format', ReportFormat.JSON),
                'next_run': schedule_data.get('next_run'),
                'status': 'active',
                'created_at': datetime.now().isoformat()
            }

            ReportService.scheduled_reports_db[schedule_id] = schedule

            return schedule

        except Exception as e:
            return {'error': str(e)}

    @staticmethod
    def get_report(report_id: str) -> Optional[Dict[str, Any]]:
        """الحصول على تقرير"""
        return ReportService.reports_db.get(report_id)

    @staticmethod
    def get_all_reports() -> List[Dict[str, Any]]:
        """الحصول على جميع التقارير"""
        return [
            {**report, 'report_id': rid}
            for rid, report in ReportService.reports_db.items()
        ]

    @staticmethod
    def delete_report(report_id: str) -> bool:
        """حذف تقرير"""
        if report_id in ReportService.reports_db:
            del ReportService.reports_db[report_id]
            return True
        return False

    @staticmethod
    def get_report_statistics() -> Dict[str, Any]:
        """إحصائيات التقارير"""
        reports = list(ReportService.reports_db.values())

        report_types = {}
        for report in reports:
            rtype = report.get('report_type', 'unknown')
            report_types[rtype] = report_types.get(rtype, 0) + 1

        return {
            'total_reports': len(reports),
            'total_templates': len(ReportService.templates_db),
            'total_scheduled': len(ReportService.scheduled_reports_db),
            'reports_by_type': report_types,
            'last_generated': reports[-1].get('metadata', {}).get('generated_at') if reports else None
        }
