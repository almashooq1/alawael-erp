# -*- coding: utf-8 -*-
"""
خدمات لوحة التحكم التفاعلية المتقدمة
نظام ERP مراكز الأوائل للتأهيل الشامل لذوي الاحتياجات الخاصة
"""

from datetime import datetime, timedelta
from sqlalchemy import func, and_, or_, desc, asc
from database import db
from advanced_dashboard_models import (
    DashboardWidget, DashboardLayout, DashboardAlert, DashboardFilter,
    DashboardMetric, DashboardExport, DashboardTheme, DashboardNotification
)
import json
import os
from typing import Dict, List, Optional, Any

class AdvancedDashboardService:
    """خدمة لوحة التحكم التفاعلية المتقدمة"""
    
    @staticmethod
    def get_user_dashboard(user_id: int, layout_id: Optional[int] = None) -> Dict[str, Any]:
        """الحصول على لوحة تحكم المستخدم"""
        try:
            # الحصول على التخطيط
            if layout_id:
                layout = DashboardLayout.query.filter_by(
                    id=layout_id, user_id=user_id
                ).first()
            else:
                layout = DashboardLayout.query.filter_by(
                    user_id=user_id, is_default=True
                ).first()
            
            # الحصول على الودجات
            widgets = DashboardWidget.query.filter_by(
                user_id=user_id, is_visible=True
            ).order_by(DashboardWidget.position_y, DashboardWidget.position_x).all()
            
            # الحصول على التنبيهات غير المقروءة
            alerts = DashboardAlert.query.filter_by(
                user_id=user_id, is_read=False, is_dismissed=False
            ).filter(
                or_(
                    DashboardAlert.expires_at.is_(None),
                    DashboardAlert.expires_at > datetime.utcnow()
                )
            ).order_by(desc(DashboardAlert.created_at)).limit(10).all()
            
            # الحصول على الإشعارات غير المقروءة
            notifications = DashboardNotification.query.filter_by(
                user_id=user_id, is_read=False
            ).order_by(desc(DashboardNotification.created_at)).limit(5).all()
            
            return {
                'success': True,
                'layout': layout.to_dict() if layout else None,
                'widgets': [widget.to_dict() for widget in widgets],
                'alerts': [alert.to_dict() for alert in alerts],
                'notifications': [notification.to_dict() for notification in notifications],
                'alerts_count': len(alerts),
                'notifications_count': len(notifications)
            }
            
        except Exception as e:
            return {'success': False, 'message': f'خطأ في جلب لوحة التحكم: {str(e)}'}
    
    @staticmethod
    def create_widget(user_id: int, widget_data: Dict[str, Any]) -> Dict[str, Any]:
        """إنشاء ودجة جديدة"""
        try:
            widget = DashboardWidget(
                user_id=user_id,
                widget_type=widget_data.get('widget_type'),
                title=widget_data.get('title'),
                description=widget_data.get('description'),
                position_x=widget_data.get('position_x', 0),
                position_y=widget_data.get('position_y', 0),
                width=widget_data.get('width', 4),
                height=widget_data.get('height', 3),
                config=json.dumps(widget_data.get('config', {})),
                data_source=widget_data.get('data_source'),
                refresh_interval=widget_data.get('refresh_interval', 300)
            )
            
            db.session.add(widget)
            db.session.commit()
            
            return {
                'success': True,
                'message': 'تم إنشاء الودجة بنجاح',
                'widget': widget.to_dict()
            }
            
        except Exception as e:
            db.session.rollback()
            return {'success': False, 'message': f'خطأ في إنشاء الودجة: {str(e)}'}
    
    @staticmethod
    def update_widget(widget_id: int, user_id: int, widget_data: Dict[str, Any]) -> Dict[str, Any]:
        """تحديث ودجة"""
        try:
            widget = DashboardWidget.query.filter_by(
                id=widget_id, user_id=user_id
            ).first()
            
            if not widget:
                return {'success': False, 'message': 'الودجة غير موجودة'}
            
            if widget.is_locked:
                return {'success': False, 'message': 'الودجة مقفلة ولا يمكن تعديلها'}
            
            # تحديث البيانات
            for key, value in widget_data.items():
                if key == 'config':
                    widget.config = json.dumps(value)
                elif hasattr(widget, key):
                    setattr(widget, key, value)
            
            widget.updated_at = datetime.utcnow()
            db.session.commit()
            
            return {
                'success': True,
                'message': 'تم تحديث الودجة بنجاح',
                'widget': widget.to_dict()
            }
            
        except Exception as e:
            db.session.rollback()
            return {'success': False, 'message': f'خطأ في تحديث الودجة: {str(e)}'}
    
    @staticmethod
    def delete_widget(widget_id: int, user_id: int) -> Dict[str, Any]:
        """حذف ودجة"""
        try:
            widget = DashboardWidget.query.filter_by(
                id=widget_id, user_id=user_id
            ).first()
            
            if not widget:
                return {'success': False, 'message': 'الودجة غير موجودة'}
            
            if widget.is_locked:
                return {'success': False, 'message': 'الودجة مقفلة ولا يمكن حذفها'}
            
            db.session.delete(widget)
            db.session.commit()
            
            return {'success': True, 'message': 'تم حذف الودجة بنجاح'}
            
        except Exception as e:
            db.session.rollback()
            return {'success': False, 'message': f'خطأ في حذف الودجة: {str(e)}'}
    
    @staticmethod
    def save_layout(user_id: int, layout_data: Dict[str, Any]) -> Dict[str, Any]:
        """حفظ تخطيط لوحة التحكم"""
        try:
            # إذا كان التخطيط الافتراضي، إلغاء الافتراضية من التخطيطات الأخرى
            if layout_data.get('is_default'):
                DashboardLayout.query.filter_by(
                    user_id=user_id, is_default=True
                ).update({'is_default': False})
            
            layout = DashboardLayout(
                user_id=user_id,
                name=layout_data.get('name'),
                description=layout_data.get('description'),
                layout_data=json.dumps(layout_data.get('layout_data', {})),
                is_default=layout_data.get('is_default', False),
                is_public=layout_data.get('is_public', False),
                theme=layout_data.get('theme', 'light')
            )
            
            db.session.add(layout)
            db.session.commit()
            
            return {
                'success': True,
                'message': 'تم حفظ التخطيط بنجاح',
                'layout': layout.to_dict()
            }
            
        except Exception as e:
            db.session.rollback()
            return {'success': False, 'message': f'خطأ في حفظ التخطيط: {str(e)}'}
    
    @staticmethod
    def get_widget_data(widget_id: int, user_id: int, filters: Optional[Dict] = None) -> Dict[str, Any]:
        """الحصول على بيانات ودجة محددة"""
        try:
            widget = DashboardWidget.query.filter_by(
                id=widget_id, user_id=user_id
            ).first()
            
            if not widget:
                return {'success': False, 'message': 'الودجة غير موجودة'}
            
            # تحديد نوع البيانات حسب نوع الودجة
            data = {}
            
            if widget.widget_type == 'students_stats':
                data = AdvancedDashboardService._get_students_stats(filters)
            elif widget.widget_type == 'appointments_chart':
                data = AdvancedDashboardService._get_appointments_chart_data(filters)
            elif widget.widget_type == 'revenue_chart':
                data = AdvancedDashboardService._get_revenue_chart_data(filters)
            elif widget.widget_type == 'recent_activities':
                data = AdvancedDashboardService._get_recent_activities(filters)
            elif widget.widget_type == 'performance_metrics':
                data = AdvancedDashboardService._get_performance_metrics(filters)
            elif widget.widget_type == 'calendar_view':
                data = AdvancedDashboardService._get_calendar_data(filters)
            elif widget.widget_type == 'alerts_summary':
                data = AdvancedDashboardService._get_alerts_summary(user_id, filters)
            else:
                data = {'message': 'نوع ودجة غير مدعوم'}
            
            return {
                'success': True,
                'widget': widget.to_dict(),
                'data': data
            }
            
        except Exception as e:
            return {'success': False, 'message': f'خطأ في جلب بيانات الودجة: {str(e)}'}
    
    @staticmethod
    def _get_students_stats(filters: Optional[Dict] = None) -> Dict[str, Any]:
        """إحصائيات الطلاب"""
        try:
            from models import Student, StudentAssessment
            
            # إجمالي الطلاب
            total_students = Student.query.count()
            
            # الطلاب النشطين
            active_students = Student.query.filter_by(is_active=True).count()
            
            # الطلاب الجدد هذا الشهر
            start_of_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            new_students = Student.query.filter(
                Student.created_at >= start_of_month
            ).count()
            
            # توزيع الطلاب حسب الفئة العمرية
            age_distribution = db.session.query(
                func.case(
                    (func.extract('year', func.age(Student.date_of_birth)) < 6, 'أقل من 6 سنوات'),
                    (func.extract('year', func.age(Student.date_of_birth)) < 12, '6-12 سنة'),
                    (func.extract('year', func.age(Student.date_of_birth)) < 18, '12-18 سنة'),
                    else_='أكبر من 18 سنة'
                ).label('age_group'),
                func.count(Student.id).label('count')
            ).group_by('age_group').all()
            
            return {
                'total_students': total_students,
                'active_students': active_students,
                'new_students': new_students,
                'age_distribution': [
                    {'age_group': row.age_group, 'count': row.count}
                    for row in age_distribution
                ]
            }
            
        except Exception as e:
            return {'error': f'خطأ في جلب إحصائيات الطلاب: {str(e)}'}
    
    @staticmethod
    def _get_appointments_chart_data(filters: Optional[Dict] = None) -> Dict[str, Any]:
        """بيانات مخطط المواعيد"""
        try:
            from models import Appointment
            
            # المواعيد خلال آخر 30 يوم
            end_date = datetime.now()
            start_date = end_date - timedelta(days=30)
            
            daily_appointments = db.session.query(
                func.date(Appointment.appointment_date).label('date'),
                func.count(Appointment.id).label('count')
            ).filter(
                Appointment.appointment_date.between(start_date, end_date)
            ).group_by(func.date(Appointment.appointment_date)).all()
            
            # توزيع المواعيد حسب الحالة
            status_distribution = db.session.query(
                Appointment.status,
                func.count(Appointment.id).label('count')
            ).group_by(Appointment.status).all()
            
            return {
                'daily_appointments': [
                    {'date': row.date.isoformat(), 'count': row.count}
                    for row in daily_appointments
                ],
                'status_distribution': [
                    {'status': row.status, 'count': row.count}
                    for row in status_distribution
                ]
            }
            
        except Exception as e:
            return {'error': f'خطأ في جلب بيانات المواعيد: {str(e)}'}
    
    @staticmethod
    def _get_revenue_chart_data(filters: Optional[Dict] = None) -> Dict[str, Any]:
        """بيانات مخطط الإيرادات"""
        try:
            from models import Payment
            
            # الإيرادات الشهرية
            monthly_revenue = db.session.query(
                func.extract('year', Payment.payment_date).label('year'),
                func.extract('month', Payment.payment_date).label('month'),
                func.sum(Payment.amount).label('total')
            ).filter(
                Payment.status == 'completed'
            ).group_by(
                func.extract('year', Payment.payment_date),
                func.extract('month', Payment.payment_date)
            ).order_by('year', 'month').limit(12).all()
            
            return {
                'monthly_revenue': [
                    {
                        'year': int(row.year),
                        'month': int(row.month),
                        'total': float(row.total)
                    }
                    for row in monthly_revenue
                ]
            }
            
        except Exception as e:
            return {'error': f'خطأ في جلب بيانات الإيرادات: {str(e)}'}
    
    @staticmethod
    def _get_recent_activities(filters: Optional[Dict] = None) -> Dict[str, Any]:
        """الأنشطة الأخيرة"""
        try:
            from models import Student, Appointment, User
            
            activities = []
            
            # آخر الطلاب المسجلين
            recent_students = Student.query.order_by(
                desc(Student.created_at)
            ).limit(5).all()
            
            for student in recent_students:
                activities.append({
                    'type': 'student_registration',
                    'title': f'تسجيل طالب جديد: {student.name}',
                    'timestamp': student.created_at.isoformat(),
                    'icon': 'fas fa-user-plus',
                    'color': 'success'
                })
            
            # آخر المواعيد
            recent_appointments = Appointment.query.order_by(
                desc(Appointment.created_at)
            ).limit(5).all()
            
            for appointment in recent_appointments:
                activities.append({
                    'type': 'appointment',
                    'title': f'موعد جديد مع {appointment.student.name if appointment.student else "غير محدد"}',
                    'timestamp': appointment.created_at.isoformat(),
                    'icon': 'fas fa-calendar-plus',
                    'color': 'info'
                })
            
            # ترتيب الأنشطة حسب التاريخ
            activities.sort(key=lambda x: x['timestamp'], reverse=True)
            
            return {'activities': activities[:10]}
            
        except Exception as e:
            return {'error': f'خطأ في جلب الأنشطة الأخيرة: {str(e)}'}
    
    @staticmethod
    def _get_performance_metrics(filters: Optional[Dict] = None) -> Dict[str, Any]:
        """مقاييس الأداء"""
        try:
            from models import Student, Appointment, Payment
            
            # معدل الحضور
            total_appointments = Appointment.query.count()
            attended_appointments = Appointment.query.filter_by(status='completed').count()
            attendance_rate = (attended_appointments / total_appointments * 100) if total_appointments > 0 else 0
            
            # معدل الدفع
            total_payments = Payment.query.count()
            completed_payments = Payment.query.filter_by(status='completed').count()
            payment_rate = (completed_payments / total_payments * 100) if total_payments > 0 else 0
            
            # معدل رضا العملاء (افتراضي)
            satisfaction_rate = 85.5
            
            return {
                'attendance_rate': round(attendance_rate, 1),
                'payment_rate': round(payment_rate, 1),
                'satisfaction_rate': satisfaction_rate,
                'total_students': Student.query.count()
            }
            
        except Exception as e:
            return {'error': f'خطأ في جلب مقاييس الأداء: {str(e)}'}
    
    @staticmethod
    def _get_calendar_data(filters: Optional[Dict] = None) -> Dict[str, Any]:
        """بيانات التقويم"""
        try:
            from models import Appointment
            
            # المواعيد للشهر الحالي
            start_of_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            end_of_month = (start_of_month + timedelta(days=32)).replace(day=1) - timedelta(days=1)
            
            appointments = Appointment.query.filter(
                Appointment.appointment_date.between(start_of_month, end_of_month)
            ).all()
            
            events = []
            for appointment in appointments:
                events.append({
                    'id': appointment.id,
                    'title': f'{appointment.student.name if appointment.student else "موعد"}',
                    'start': appointment.appointment_date.isoformat(),
                    'end': (appointment.appointment_date + timedelta(hours=1)).isoformat(),
                    'color': 'primary' if appointment.status == 'scheduled' else 'success'
                })
            
            return {'events': events}
            
        except Exception as e:
            return {'error': f'خطأ في جلب بيانات التقويم: {str(e)}'}
    
    @staticmethod
    def _get_alerts_summary(user_id: int, filters: Optional[Dict] = None) -> Dict[str, Any]:
        """ملخص التنبيهات"""
        try:
            alerts = DashboardAlert.query.filter_by(
                user_id=user_id, is_dismissed=False
            ).filter(
                or_(
                    DashboardAlert.expires_at.is_(None),
                    DashboardAlert.expires_at > datetime.utcnow()
                )
            ).order_by(desc(DashboardAlert.created_at)).limit(10).all()
            
            # تجميع التنبيهات حسب النوع
            alerts_by_type = {}
            for alert in alerts:
                alert_type = alert.alert_type
                if alert_type not in alerts_by_type:
                    alerts_by_type[alert_type] = []
                alerts_by_type[alert_type].append(alert.to_dict())
            
            return {
                'alerts': [alert.to_dict() for alert in alerts],
                'alerts_by_type': alerts_by_type,
                'total_count': len(alerts)
            }
            
        except Exception as e:
            return {'error': f'خطأ في جلب ملخص التنبيهات: {str(e)}'}
    
    @staticmethod
    def create_alert(user_id: int, alert_data: Dict[str, Any]) -> Dict[str, Any]:
        """إنشاء تنبيه جديد"""
        try:
            alert = DashboardAlert(
                user_id=user_id,
                alert_type=alert_data.get('alert_type'),
                title=alert_data.get('title'),
                message=alert_data.get('message'),
                severity=alert_data.get('severity', 'medium'),
                category=alert_data.get('category'),
                source_type=alert_data.get('source_type', 'manual'),
                source_id=alert_data.get('source_id'),
                action_required=alert_data.get('action_required', False),
                action_url=alert_data.get('action_url'),
                action_text=alert_data.get('action_text'),
                expires_at=alert_data.get('expires_at'),
                metadata=json.dumps(alert_data.get('metadata', {}))
            )
            
            db.session.add(alert)
            db.session.commit()
            
            return {
                'success': True,
                'message': 'تم إنشاء التنبيه بنجاح',
                'alert': alert.to_dict()
            }
            
        except Exception as e:
            db.session.rollback()
            return {'success': False, 'message': f'خطأ في إنشاء التنبيه: {str(e)}'}
    
    @staticmethod
    def mark_alert_read(alert_id: int, user_id: int) -> Dict[str, Any]:
        """تمييز التنبيه كمقروء"""
        try:
            alert = DashboardAlert.query.filter_by(
                id=alert_id, user_id=user_id
            ).first()
            
            if not alert:
                return {'success': False, 'message': 'التنبيه غير موجود'}
            
            alert.is_read = True
            alert.read_at = datetime.utcnow()
            db.session.commit()
            
            return {'success': True, 'message': 'تم تمييز التنبيه كمقروء'}
            
        except Exception as e:
            db.session.rollback()
            return {'success': False, 'message': f'خطأ في تحديث التنبيه: {str(e)}'}
    
    @staticmethod
    def dismiss_alert(alert_id: int, user_id: int) -> Dict[str, Any]:
        """إخفاء التنبيه"""
        try:
            alert = DashboardAlert.query.filter_by(
                id=alert_id, user_id=user_id
            ).first()
            
            if not alert:
                return {'success': False, 'message': 'التنبيه غير موجود'}
            
            alert.is_dismissed = True
            alert.dismissed_at = datetime.utcnow()
            db.session.commit()
            
            return {'success': True, 'message': 'تم إخفاء التنبيه'}
            
        except Exception as e:
            db.session.rollback()
            return {'success': False, 'message': f'خطأ في إخفاء التنبيه: {str(e)}'}
    
    @staticmethod
    def get_dashboard_themes() -> Dict[str, Any]:
        """الحصول على سمات لوحة التحكم المتاحة"""
        try:
            themes = DashboardTheme.query.filter_by(is_public=True).all()
            
            return {
                'success': True,
                'themes': [theme.to_dict() for theme in themes]
            }
            
        except Exception as e:
            return {'success': False, 'message': f'خطأ في جلب السمات: {str(e)}'}
    
    @staticmethod
    def export_dashboard(user_id: int, export_config: Dict[str, Any]) -> Dict[str, Any]:
        """تصدير لوحة التحكم"""
        try:
            export_record = DashboardExport(
                user_id=user_id,
                export_type=export_config.get('export_type'),
                export_name=export_config.get('export_name'),
                export_config=json.dumps(export_config),
                expires_at=datetime.utcnow() + timedelta(days=7)  # ينتهي خلال أسبوع
            )
            
            db.session.add(export_record)
            db.session.commit()
            
            # هنا يمكن إضافة منطق التصدير الفعلي
            # مثل إنشاء ملف PDF أو Excel
            
            return {
                'success': True,
                'message': 'تم بدء عملية التصدير',
                'export_id': export_record.id
            }
            
        except Exception as e:
            db.session.rollback()
            return {'success': False, 'message': f'خطأ في التصدير: {str(e)}'}
