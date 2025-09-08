"""
نظام التقارير التلقائية للأتمتة
Automated Reporting System for Automation
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Union
from enum import Enum
import pandas as pd
from io import BytesIO
import matplotlib.pyplot as plt
import seaborn as sns
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from flask import current_app
from sqlalchemy import and_, or_, func, desc
from models import db
from automation_models import (
    AutomationWorkflow, AutomationAction, ScheduledMessage, WorkflowExecution,
    ActionExecution, MessageDelivery, AutomationRule, AutomationLog
)

# إعداد التسجيل
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ReportType(Enum):
    """أنواع التقارير"""
    WORKFLOW_PERFORMANCE = "workflow_performance"
    EXECUTION_SUMMARY = "execution_summary"
    MESSAGE_DELIVERY = "message_delivery"
    SYSTEM_HEALTH = "system_health"
    RULE_EFFECTIVENESS = "rule_effectiveness"
    DAILY_SUMMARY = "daily_summary"
    WEEKLY_SUMMARY = "weekly_summary"
    MONTHLY_SUMMARY = "monthly_summary"
    CUSTOM_REPORT = "custom_report"

class ReportFormat(Enum):
    """تنسيقات التقارير"""
    PDF = "pdf"
    EXCEL = "excel"
    CSV = "csv"
    JSON = "json"
    HTML = "html"

class AutomationReportGenerator:
    """مولد التقارير التلقائية"""
    
    def __init__(self):
        self.setup_matplotlib()
        self.setup_reportlab()
        
    def setup_matplotlib(self):
        """إعداد matplotlib للرسوم البيانية"""
        plt.style.use('seaborn-v0_8')
        sns.set_palette("husl")
        
        # إعداد الخط العربي (إذا كان متوفراً)
        try:
            plt.rcParams['font.family'] = ['Arial Unicode MS', 'Tahoma', 'DejaVu Sans']
        except:
            pass
    
    def setup_reportlab(self):
        """إعداد reportlab للتقارير PDF"""
        try:
            # يمكن إضافة خط عربي هنا إذا كان متوفراً
            pass
        except:
            pass
    
    def generate_report(self, report_type: str, format_type: str = "pdf", 
                       start_date: datetime = None, end_date: datetime = None,
                       filters: Dict[str, Any] = None) -> Dict[str, Any]:
        """توليد تقرير"""
        try:
            # تحديد الفترة الزمنية الافتراضية
            if not end_date:
                end_date = datetime.utcnow()
            if not start_date:
                start_date = end_date - timedelta(days=30)
            
            # جمع البيانات
            data = self._collect_report_data(report_type, start_date, end_date, filters)
            
            # توليد التقرير حسب التنسيق
            if format_type == ReportFormat.PDF.value:
                return self._generate_pdf_report(report_type, data, start_date, end_date)
            elif format_type == ReportFormat.EXCEL.value:
                return self._generate_excel_report(report_type, data, start_date, end_date)
            elif format_type == ReportFormat.CSV.value:
                return self._generate_csv_report(report_type, data, start_date, end_date)
            elif format_type == ReportFormat.JSON.value:
                return self._generate_json_report(report_type, data, start_date, end_date)
            elif format_type == ReportFormat.HTML.value:
                return self._generate_html_report(report_type, data, start_date, end_date)
            else:
                raise ValueError(f"تنسيق غير مدعوم: {format_type}")
                
        except Exception as e:
            logger.error(f"خطأ في توليد التقرير: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def _collect_report_data(self, report_type: str, start_date: datetime, 
                           end_date: datetime, filters: Dict[str, Any] = None) -> Dict[str, Any]:
        """جمع بيانات التقرير"""
        data = {}
        
        if report_type == ReportType.WORKFLOW_PERFORMANCE.value:
            data = self._collect_workflow_performance_data(start_date, end_date, filters)
        elif report_type == ReportType.EXECUTION_SUMMARY.value:
            data = self._collect_execution_summary_data(start_date, end_date, filters)
        elif report_type == ReportType.MESSAGE_DELIVERY.value:
            data = self._collect_message_delivery_data(start_date, end_date, filters)
        elif report_type == ReportType.SYSTEM_HEALTH.value:
            data = self._collect_system_health_data(start_date, end_date, filters)
        elif report_type == ReportType.RULE_EFFECTIVENESS.value:
            data = self._collect_rule_effectiveness_data(start_date, end_date, filters)
        elif report_type in [ReportType.DAILY_SUMMARY.value, ReportType.WEEKLY_SUMMARY.value, ReportType.MONTHLY_SUMMARY.value]:
            data = self._collect_summary_data(report_type, start_date, end_date, filters)
        
        return data
    
    def _collect_workflow_performance_data(self, start_date: datetime, end_date: datetime, filters: Dict[str, Any] = None) -> Dict[str, Any]:
        """جمع بيانات أداء سير العمل"""
        try:
            # إحصائيات سير العمل
            workflows = AutomationWorkflow.query.all()
            workflow_stats = []
            
            for workflow in workflows:
                executions = WorkflowExecution.query.filter(
                    and_(
                        WorkflowExecution.workflow_id == workflow.id,
                        WorkflowExecution.started_at >= start_date,
                        WorkflowExecution.started_at <= end_date
                    )
                ).all()
                
                total_executions = len(executions)
                successful_executions = len([e for e in executions if e.status == 'completed'])
                failed_executions = len([e for e in executions if e.status == 'failed'])
                avg_duration = sum([e.duration or 0 for e in executions]) / total_executions if total_executions > 0 else 0
                
                workflow_stats.append({
                    'workflow_id': workflow.id,
                    'workflow_name': workflow.name,
                    'total_executions': total_executions,
                    'successful_executions': successful_executions,
                    'failed_executions': failed_executions,
                    'success_rate': (successful_executions / total_executions * 100) if total_executions > 0 else 0,
                    'avg_duration': avg_duration,
                    'is_active': workflow.is_active
                })
            
            # أداء الإجراءات
            action_stats = []
            actions = AutomationAction.query.all()
            
            for action in actions:
                action_executions = ActionExecution.query.join(WorkflowExecution).filter(
                    and_(
                        ActionExecution.action_id == action.id,
                        WorkflowExecution.started_at >= start_date,
                        WorkflowExecution.started_at <= end_date
                    )
                ).all()
                
                total_action_executions = len(action_executions)
                successful_action_executions = len([ae for ae in action_executions if ae.status == 'completed'])
                
                action_stats.append({
                    'action_id': action.id,
                    'action_name': action.name,
                    'action_type': action.action_type,
                    'workflow_name': action.workflow.name if action.workflow else 'Unknown',
                    'total_executions': total_action_executions,
                    'successful_executions': successful_action_executions,
                    'success_rate': (successful_action_executions / total_action_executions * 100) if total_action_executions > 0 else 0
                })
            
            return {
                'workflow_stats': workflow_stats,
                'action_stats': action_stats,
                'period': {'start': start_date, 'end': end_date}
            }
            
        except Exception as e:
            logger.error(f"خطأ في جمع بيانات أداء سير العمل: {str(e)}")
            return {}
    
    def _collect_execution_summary_data(self, start_date: datetime, end_date: datetime, filters: Dict[str, Any] = None) -> Dict[str, Any]:
        """جمع بيانات ملخص التنفيذ"""
        try:
            # إحصائيات التنفيذ العامة
            total_executions = WorkflowExecution.query.filter(
                and_(
                    WorkflowExecution.started_at >= start_date,
                    WorkflowExecution.started_at <= end_date
                )
            ).count()
            
            successful_executions = WorkflowExecution.query.filter(
                and_(
                    WorkflowExecution.started_at >= start_date,
                    WorkflowExecution.started_at <= end_date,
                    WorkflowExecution.status == 'completed'
                )
            ).count()
            
            failed_executions = WorkflowExecution.query.filter(
                and_(
                    WorkflowExecution.started_at >= start_date,
                    WorkflowExecution.started_at <= end_date,
                    WorkflowExecution.status == 'failed'
                )
            ).count()
            
            running_executions = WorkflowExecution.query.filter(
                and_(
                    WorkflowExecution.started_at >= start_date,
                    WorkflowExecution.started_at <= end_date,
                    WorkflowExecution.status == 'running'
                )
            ).count()
            
            # التنفيذات اليومية
            daily_executions = db.session.query(
                func.date(WorkflowExecution.started_at).label('date'),
                func.count(WorkflowExecution.id).label('count'),
                func.sum(func.case([(WorkflowExecution.status == 'completed', 1)], else_=0)).label('successful'),
                func.sum(func.case([(WorkflowExecution.status == 'failed', 1)], else_=0)).label('failed')
            ).filter(
                and_(
                    WorkflowExecution.started_at >= start_date,
                    WorkflowExecution.started_at <= end_date
                )
            ).group_by(func.date(WorkflowExecution.started_at)).all()
            
            # أكثر سير العمل تنفيذاً
            top_workflows = db.session.query(
                AutomationWorkflow.name,
                func.count(WorkflowExecution.id).label('execution_count')
            ).join(WorkflowExecution).filter(
                and_(
                    WorkflowExecution.started_at >= start_date,
                    WorkflowExecution.started_at <= end_date
                )
            ).group_by(AutomationWorkflow.id, AutomationWorkflow.name).order_by(
                desc('execution_count')
            ).limit(10).all()
            
            return {
                'summary': {
                    'total_executions': total_executions,
                    'successful_executions': successful_executions,
                    'failed_executions': failed_executions,
                    'running_executions': running_executions,
                    'success_rate': (successful_executions / total_executions * 100) if total_executions > 0 else 0
                },
                'daily_executions': [
                    {
                        'date': str(de.date),
                        'total': de.count,
                        'successful': de.successful or 0,
                        'failed': de.failed or 0
                    } for de in daily_executions
                ],
                'top_workflows': [
                    {
                        'name': tw.name,
                        'execution_count': tw.execution_count
                    } for tw in top_workflows
                ],
                'period': {'start': start_date, 'end': end_date}
            }
            
        except Exception as e:
            logger.error(f"خطأ في جمع بيانات ملخص التنفيذ: {str(e)}")
            return {}
    
    def _collect_message_delivery_data(self, start_date: datetime, end_date: datetime, filters: Dict[str, Any] = None) -> Dict[str, Any]:
        """جمع بيانات تسليم الرسائل"""
        try:
            # إحصائيات الرسائل
            total_messages = ScheduledMessage.query.filter(
                and_(
                    ScheduledMessage.created_at >= start_date,
                    ScheduledMessage.created_at <= end_date
                )
            ).count()
            
            sent_messages = ScheduledMessage.query.filter(
                and_(
                    ScheduledMessage.created_at >= start_date,
                    ScheduledMessage.created_at <= end_date,
                    ScheduledMessage.status == 'sent'
                )
            ).count()
            
            failed_messages = ScheduledMessage.query.filter(
                and_(
                    ScheduledMessage.created_at >= start_date,
                    ScheduledMessage.created_at <= end_date,
                    ScheduledMessage.status == 'failed'
                )
            ).count()
            
            # الرسائل حسب النوع
            message_types = db.session.query(
                ScheduledMessage.message_type,
                func.count(ScheduledMessage.id).label('count'),
                func.sum(func.case([(ScheduledMessage.status == 'sent', 1)], else_=0)).label('sent'),
                func.sum(func.case([(ScheduledMessage.status == 'failed', 1)], else_=0)).label('failed')
            ).filter(
                and_(
                    ScheduledMessage.created_at >= start_date,
                    ScheduledMessage.created_at <= end_date
                )
            ).group_by(ScheduledMessage.message_type).all()
            
            # الرسائل اليومية
            daily_messages = db.session.query(
                func.date(ScheduledMessage.created_at).label('date'),
                func.count(ScheduledMessage.id).label('count'),
                func.sum(func.case([(ScheduledMessage.status == 'sent', 1)], else_=0)).label('sent'),
                func.sum(func.case([(ScheduledMessage.status == 'failed', 1)], else_=0)).label('failed')
            ).filter(
                and_(
                    ScheduledMessage.created_at >= start_date,
                    ScheduledMessage.created_at <= end_date
                )
            ).group_by(func.date(ScheduledMessage.created_at)).all()
            
            return {
                'summary': {
                    'total_messages': total_messages,
                    'sent_messages': sent_messages,
                    'failed_messages': failed_messages,
                    'delivery_rate': (sent_messages / total_messages * 100) if total_messages > 0 else 0
                },
                'message_types': [
                    {
                        'type': mt.message_type,
                        'total': mt.count,
                        'sent': mt.sent or 0,
                        'failed': mt.failed or 0,
                        'delivery_rate': ((mt.sent or 0) / mt.count * 100) if mt.count > 0 else 0
                    } for mt in message_types
                ],
                'daily_messages': [
                    {
                        'date': str(dm.date),
                        'total': dm.count,
                        'sent': dm.sent or 0,
                        'failed': dm.failed or 0
                    } for dm in daily_messages
                ],
                'period': {'start': start_date, 'end': end_date}
            }
            
        except Exception as e:
            logger.error(f"خطأ في جمع بيانات تسليم الرسائل: {str(e)}")
            return {}
    
    def _collect_system_health_data(self, start_date: datetime, end_date: datetime, filters: Dict[str, Any] = None) -> Dict[str, Any]:
        """جمع بيانات صحة النظام"""
        try:
            # إحصائيات الأخطاء
            error_logs = AutomationLog.query.filter(
                and_(
                    AutomationLog.timestamp >= start_date,
                    AutomationLog.timestamp <= end_date,
                    AutomationLog.event_type.contains('error')
                )
            ).count()
            
            warning_logs = AutomationLog.query.filter(
                and_(
                    AutomationLog.timestamp >= start_date,
                    AutomationLog.timestamp <= end_date,
                    AutomationLog.event_type.contains('warning')
                )
            ).count()
            
            # الأخطاء اليومية
            daily_errors = db.session.query(
                func.date(AutomationLog.timestamp).label('date'),
                func.count(AutomationLog.id).label('error_count')
            ).filter(
                and_(
                    AutomationLog.timestamp >= start_date,
                    AutomationLog.timestamp <= end_date,
                    AutomationLog.event_type.contains('error')
                )
            ).group_by(func.date(AutomationLog.timestamp)).all()
            
            # أنواع الأحداث
            event_types = db.session.query(
                AutomationLog.event_type,
                func.count(AutomationLog.id).label('count')
            ).filter(
                and_(
                    AutomationLog.timestamp >= start_date,
                    AutomationLog.timestamp <= end_date
                )
            ).group_by(AutomationLog.event_type).all()
            
            # حالة سير العمل النشط
            active_workflows = AutomationWorkflow.query.filter_by(is_active=True).count()
            total_workflows = AutomationWorkflow.query.count()
            
            return {
                'summary': {
                    'error_logs': error_logs,
                    'warning_logs': warning_logs,
                    'active_workflows': active_workflows,
                    'total_workflows': total_workflows,
                    'system_uptime': self._calculate_system_uptime(start_date, end_date)
                },
                'daily_errors': [
                    {
                        'date': str(de.date),
                        'error_count': de.error_count
                    } for de in daily_errors
                ],
                'event_types': [
                    {
                        'event_type': et.event_type,
                        'count': et.count
                    } for et in event_types
                ],
                'period': {'start': start_date, 'end': end_date}
            }
            
        except Exception as e:
            logger.error(f"خطأ في جمع بيانات صحة النظام: {str(e)}")
            return {}
    
    def _calculate_system_uptime(self, start_date: datetime, end_date: datetime) -> float:
        """حساب وقت تشغيل النظام"""
        try:
            # حساب تقريبي لوقت التشغيل بناءً على السجلات
            total_period = (end_date - start_date).total_seconds()
            
            # البحث عن أحداث إيقاف وبدء النظام
            engine_stops = AutomationLog.query.filter(
                and_(
                    AutomationLog.timestamp >= start_date,
                    AutomationLog.timestamp <= end_date,
                    AutomationLog.event_type == 'engine_stopped'
                )
            ).count()
            
            # تقدير وقت التوقف (افتراضي: 5 دقائق لكل إيقاف)
            estimated_downtime = engine_stops * 300  # 5 دقائق بالثواني
            
            uptime_percentage = ((total_period - estimated_downtime) / total_period * 100) if total_period > 0 else 100
            return min(100, max(0, uptime_percentage))
            
        except Exception as e:
            logger.error(f"خطأ في حساب وقت التشغيل: {str(e)}")
            return 0
    
    def _collect_rule_effectiveness_data(self, start_date: datetime, end_date: datetime, filters: Dict[str, Any] = None) -> Dict[str, Any]:
        """جمع بيانات فعالية القواعد"""
        try:
            rules = AutomationRule.query.filter_by(is_active=True).all()
            rule_stats = []
            
            for rule in rules:
                # البحث عن تنفيذات القاعدة في السجلات
                rule_executions = AutomationLog.query.filter(
                    and_(
                        AutomationLog.timestamp >= start_date,
                        AutomationLog.timestamp <= end_date,
                        AutomationLog.message.contains(f'rule_{rule.id}')
                    )
                ).count()
                
                rule_stats.append({
                    'rule_id': rule.id,
                    'rule_name': rule.name,
                    'executions': rule_executions,
                    'priority': rule.priority,
                    'workflow_id': rule.workflow_id
                })
            
            return {
                'rule_stats': rule_stats,
                'total_active_rules': len(rules),
                'period': {'start': start_date, 'end': end_date}
            }
            
        except Exception as e:
            logger.error(f"خطأ في جمع بيانات فعالية القواعد: {str(e)}")
            return {}
    
    def _collect_summary_data(self, report_type: str, start_date: datetime, end_date: datetime, filters: Dict[str, Any] = None) -> Dict[str, Any]:
        """جمع بيانات التقارير الملخصة"""
        try:
            # جمع جميع البيانات للملخص
            workflow_data = self._collect_workflow_performance_data(start_date, end_date, filters)
            execution_data = self._collect_execution_summary_data(start_date, end_date, filters)
            message_data = self._collect_message_delivery_data(start_date, end_date, filters)
            health_data = self._collect_system_health_data(start_date, end_date, filters)
            
            return {
                'report_type': report_type,
                'workflow_performance': workflow_data,
                'execution_summary': execution_data,
                'message_delivery': message_data,
                'system_health': health_data,
                'period': {'start': start_date, 'end': end_date}
            }
            
        except Exception as e:
            logger.error(f"خطأ في جمع بيانات الملخص: {str(e)}")
            return {}
    
    def _generate_pdf_report(self, report_type: str, data: Dict[str, Any], 
                           start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """توليد تقرير PDF"""
        try:
            buffer = BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=72, leftMargin=72,
                                  topMargin=72, bottomMargin=18)
            
            # إعداد الأنماط
            styles = getSampleStyleSheet()
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=18,
                spaceAfter=30,
                alignment=TA_CENTER
            )
            
            heading_style = ParagraphStyle(
                'CustomHeading',
                parent=styles['Heading2'],
                fontSize=14,
                spaceAfter=12,
                alignment=TA_RIGHT
            )
            
            # محتوى التقرير
            story = []
            
            # العنوان
            title = self._get_report_title(report_type)
            story.append(Paragraph(title, title_style))
            story.append(Spacer(1, 12))
            
            # معلومات الفترة
            period_text = f"الفترة: من {start_date.strftime('%Y-%m-%d')} إلى {end_date.strftime('%Y-%m-%d')}"
            story.append(Paragraph(period_text, styles['Normal']))
            story.append(Spacer(1, 20))
            
            # إضافة المحتوى حسب نوع التقرير
            if report_type == ReportType.WORKFLOW_PERFORMANCE.value:
                story.extend(self._add_workflow_performance_content(data, styles))
            elif report_type == ReportType.EXECUTION_SUMMARY.value:
                story.extend(self._add_execution_summary_content(data, styles))
            elif report_type == ReportType.MESSAGE_DELIVERY.value:
                story.extend(self._add_message_delivery_content(data, styles))
            elif report_type == ReportType.SYSTEM_HEALTH.value:
                story.extend(self._add_system_health_content(data, styles))
            
            # بناء التقرير
            doc.build(story)
            
            # إرجاع البيانات
            buffer.seek(0)
            pdf_data = buffer.getvalue()
            buffer.close()
            
            return {
                "success": True,
                "data": pdf_data,
                "filename": f"{report_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf",
                "content_type": "application/pdf"
            }
            
        except Exception as e:
            logger.error(f"خطأ في توليد تقرير PDF: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def _generate_excel_report(self, report_type: str, data: Dict[str, Any], 
                             start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """توليد تقرير Excel"""
        try:
            buffer = BytesIO()
            
            with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
                # إضافة الأوراق حسب نوع التقرير
                if report_type == ReportType.WORKFLOW_PERFORMANCE.value:
                    self._add_workflow_excel_sheets(data, writer)
                elif report_type == ReportType.EXECUTION_SUMMARY.value:
                    self._add_execution_excel_sheets(data, writer)
                elif report_type == ReportType.MESSAGE_DELIVERY.value:
                    self._add_message_excel_sheets(data, writer)
                elif report_type == ReportType.SYSTEM_HEALTH.value:
                    self._add_health_excel_sheets(data, writer)
            
            buffer.seek(0)
            excel_data = buffer.getvalue()
            buffer.close()
            
            return {
                "success": True,
                "data": excel_data,
                "filename": f"{report_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx",
                "content_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            }
            
        except Exception as e:
            logger.error(f"خطأ في توليد تقرير Excel: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def _generate_csv_report(self, report_type: str, data: Dict[str, Any], 
                           start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """توليد تقرير CSV"""
        try:
            # تحويل البيانات إلى DataFrame
            if report_type == ReportType.WORKFLOW_PERFORMANCE.value:
                df = pd.DataFrame(data.get('workflow_stats', []))
            elif report_type == ReportType.EXECUTION_SUMMARY.value:
                df = pd.DataFrame(data.get('daily_executions', []))
            elif report_type == ReportType.MESSAGE_DELIVERY.value:
                df = pd.DataFrame(data.get('message_types', []))
            else:
                df = pd.DataFrame()
            
            # تحويل إلى CSV
            csv_data = df.to_csv(index=False, encoding='utf-8-sig')
            
            return {
                "success": True,
                "data": csv_data.encode('utf-8-sig'),
                "filename": f"{report_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                "content_type": "text/csv"
            }
            
        except Exception as e:
            logger.error(f"خطأ في توليد تقرير CSV: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def _generate_json_report(self, report_type: str, data: Dict[str, Any], 
                            start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """توليد تقرير JSON"""
        try:
            # إضافة معلومات إضافية
            report_data = {
                "report_type": report_type,
                "generated_at": datetime.now().isoformat(),
                "period": {
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat()
                },
                "data": data
            }
            
            json_data = json.dumps(report_data, ensure_ascii=False, indent=2)
            
            return {
                "success": True,
                "data": json_data.encode('utf-8'),
                "filename": f"{report_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
                "content_type": "application/json"
            }
            
        except Exception as e:
            logger.error(f"خطأ في توليد تقرير JSON: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def _generate_html_report(self, report_type: str, data: Dict[str, Any], 
                            start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """توليد تقرير HTML"""
        try:
            title = self._get_report_title(report_type)
            
            html_content = f"""
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>{title}</title>
                <style>
                    body {{ font-family: Arial, sans-serif; margin: 20px; }}
                    .header {{ text-align: center; margin-bottom: 30px; }}
                    .period {{ background-color: #f8f9fa; padding: 10px; border-radius: 5px; }}
                    table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
                    th, td {{ border: 1px solid #ddd; padding: 8px; text-align: right; }}
                    th {{ background-color: #f2f2f2; }}
                    .metric {{ display: inline-block; margin: 10px; padding: 15px; background-color: #e9ecef; border-radius: 5px; }}
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>{title}</h1>
                    <div class="period">
                        الفترة: من {start_date.strftime('%Y-%m-%d')} إلى {end_date.strftime('%Y-%m-%d')}
                    </div>
                </div>
                
                {self._generate_html_content(report_type, data)}
                
                <footer style="margin-top: 50px; text-align: center; color: #666;">
                    تم إنشاء التقرير في: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
                </footer>
            </body>
            </html>
            """
            
            return {
                "success": True,
                "data": html_content.encode('utf-8'),
                "filename": f"{report_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html",
                "content_type": "text/html"
            }
            
        except Exception as e:
            logger.error(f"خطأ في توليد تقرير HTML: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def _get_report_title(self, report_type: str) -> str:
        """الحصول على عنوان التقرير"""
        titles = {
            ReportType.WORKFLOW_PERFORMANCE.value: "تقرير أداء سير العمل",
            ReportType.EXECUTION_SUMMARY.value: "تقرير ملخص التنفيذ",
            ReportType.MESSAGE_DELIVERY.value: "تقرير تسليم الرسائل",
            ReportType.SYSTEM_HEALTH.value: "تقرير صحة النظام",
            ReportType.RULE_EFFECTIVENESS.value: "تقرير فعالية القواعد",
            ReportType.DAILY_SUMMARY.value: "التقرير اليومي",
            ReportType.WEEKLY_SUMMARY.value: "التقرير الأسبوعي",
            ReportType.MONTHLY_SUMMARY.value: "التقرير الشهري"
        }
        
        return titles.get(report_type, "تقرير النظام")
    
    def _add_workflow_performance_content(self, data: Dict[str, Any], styles) -> List:
        """إضافة محتوى أداء سير العمل للـ PDF"""
        content = []
        
        # جدول إحصائيات سير العمل
        if data.get('workflow_stats'):
            content.append(Paragraph("إحصائيات سير العمل", styles['Heading2']))
            
            table_data = [['اسم سير العمل', 'إجمالي التنفيذات', 'النجح', 'الفاشل', 'معدل النجاح', 'متوسط المدة']]
            
            for stat in data['workflow_stats']:
                table_data.append([
                    stat['workflow_name'],
                    str(stat['total_executions']),
                    str(stat['successful_executions']),
                    str(stat['failed_executions']),
                    f"{stat['success_rate']:.1f}%",
                    f"{stat['avg_duration']:.1f}s"
                ])
            
            table = Table(table_data)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 14),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            content.append(table)
            content.append(Spacer(1, 20))
        
        return content
    
    def _add_execution_summary_content(self, data: Dict[str, Any], styles) -> List:
        """إضافة محتوى ملخص التنفيذ للـ PDF"""
        content = []
        
        if data.get('summary'):
            summary = data['summary']
            content.append(Paragraph("ملخص التنفيذ", styles['Heading2']))
            
            summary_text = f"""
            إجمالي التنفيذات: {summary['total_executions']}<br/>
            التنفيذات الناجحة: {summary['successful_executions']}<br/>
            التنفيذات الفاشلة: {summary['failed_executions']}<br/>
            معدل النجاح: {summary['success_rate']:.1f}%
            """
            
            content.append(Paragraph(summary_text, styles['Normal']))
            content.append(Spacer(1, 20))
        
        return content
    
    def _add_message_delivery_content(self, data: Dict[str, Any], styles) -> List:
        """إضافة محتوى تسليم الرسائل للـ PDF"""
        content = []
        
        if data.get('summary'):
            summary = data['summary']
            content.append(Paragraph("ملخص تسليم الرسائل", styles['Heading2']))
            
            summary_text = f"""
            إجمالي الرسائل: {summary['total_messages']}<br/>
            الرسائل المرسلة: {summary['sent_messages']}<br/>
            الرسائل الفاشلة: {summary['failed_messages']}<br/>
            معدل التسليم: {summary['delivery_rate']:.1f}%
            """
            
            content.append(Paragraph(summary_text, styles['Normal']))
            content.append(Spacer(1, 20))
        
        return content
    
    def _add_system_health_content(self, data: Dict[str, Any], styles) -> List:
        """إضافة محتوى صحة النظام للـ PDF"""
        content = []
        
        if data.get('summary'):
            summary = data['summary']
            content.append(Paragraph("صحة النظام", styles['Heading2']))
            
            health_text = f"""
            سجلات الأخطاء: {summary['error_logs']}<br/>
            سجلات التحذيرات: {summary['warning_logs']}<br/>
            سير العمل النشط: {summary['active_workflows']}<br/>
            إجمالي سير العمل: {summary['total_workflows']}<br/>
            وقت التشغيل: {summary['system_uptime']:.1f}%
            """
            
            content.append(Paragraph(health_text, styles['Normal']))
            content.append(Spacer(1, 20))
        
        return content
    
    def _add_workflow_excel_sheets(self, data: Dict[str, Any], writer):
        """إضافة أوراق سير العمل لـ Excel"""
        if data.get('workflow_stats'):
            df = pd.DataFrame(data['workflow_stats'])
            df.to_excel(writer, sheet_name='Workflow Stats', index=False)
        
        if data.get('action_stats'):
            df = pd.DataFrame(data['action_stats'])
            df.to_excel(writer, sheet_name='Action Stats', index=False)
    
    def _add_execution_excel_sheets(self, data: Dict[str, Any], writer):
        """إضافة أوراق التنفيذ لـ Excel"""
        if data.get('summary'):
            summary_df = pd.DataFrame([data['summary']])
            summary_df.to_excel(writer, sheet_name='Summary', index=False)
        
        if data.get('daily_executions'):
            df = pd.DataFrame(data['daily_executions'])
            df.to_excel(writer, sheet_name='Daily Executions', index=False)
        
        if data.get('top_workflows'):
            df = pd.DataFrame(data['top_workflows'])
            df.to_excel(writer, sheet_name='Top Workflows', index=False)
    
    def _add_message_excel_sheets(self, data: Dict[str, Any], writer):
        """إضافة أوراق الرسائل لـ Excel"""
        if data.get('summary'):
            summary_df = pd.DataFrame([data['summary']])
            summary_df.to_excel(writer, sheet_name='Summary', index=False)
        
        if data.get('message_types'):
            df = pd.DataFrame(data['message_types'])
            df.to_excel(writer, sheet_name='Message Types', index=False)
        
        if data.get('daily_messages'):
            df = pd.DataFrame(data['daily_messages'])
            df.to_excel(writer, sheet_name='Daily Messages', index=False)
    
    def _add_health_excel_sheets(self, data: Dict[str, Any], writer):
        """إضافة أوراق صحة النظام لـ Excel"""
        if data.get('summary'):
            summary_df = pd.DataFrame([data['summary']])
            summary_df.to_excel(writer, sheet_name='Summary', index=False)
        
        if data.get('daily_errors'):
            df = pd.DataFrame(data['daily_errors'])
            df.to_excel(writer, sheet_name='Daily Errors', index=False)
        
        if data.get('event_types'):
            df = pd.DataFrame(data['event_types'])
            df.to_excel(writer, sheet_name='Event Types', index=False)
    
    def _generate_html_content(self, report_type: str, data: Dict[str, Any]) -> str:
        """توليد محتوى HTML للتقرير"""
        html_content = ""
        
        if report_type == ReportType.WORKFLOW_PERFORMANCE.value:
            html_content = self._generate_workflow_html(data)
        elif report_type == ReportType.EXECUTION_SUMMARY.value:
            html_content = self._generate_execution_html(data)
        elif report_type == ReportType.MESSAGE_DELIVERY.value:
            html_content = self._generate_message_html(data)
        elif report_type == ReportType.SYSTEM_HEALTH.value:
            html_content = self._generate_health_html(data)
        
        return html_content
    
    def _generate_workflow_html(self, data: Dict[str, Any]) -> str:
        """توليد HTML لأداء سير العمل"""
        html = "<h2>إحصائيات سير العمل</h2>"
        
        if data.get('workflow_stats'):
            html += """
            <table>
                <tr>
                    <th>اسم سير العمل</th>
                    <th>إجمالي التنفيذات</th>
                    <th>الناجح</th>
                    <th>الفاشل</th>
                    <th>معدل النجاح</th>
                </tr>
            """
            
            for stat in data['workflow_stats']:
                html += f"""
                <tr>
                    <td>{stat['workflow_name']}</td>
                    <td>{stat['total_executions']}</td>
                    <td>{stat['successful_executions']}</td>
                    <td>{stat['failed_executions']}</td>
                    <td>{stat['success_rate']:.1f}%</td>
                </tr>
                """
            
            html += "</table>"
        
        return html
    
    def _generate_execution_html(self, data: Dict[str, Any]) -> str:
        """توليد HTML لملخص التنفيذ"""
        html = "<h2>ملخص التنفيذ</h2>"
        
        if data.get('summary'):
            summary = data['summary']
            html += f"""
            <div class="metric">إجمالي التنفيذات: {summary['total_executions']}</div>
            <div class="metric">التنفيذات الناجحة: {summary['successful_executions']}</div>
            <div class="metric">التنفيذات الفاشلة: {summary['failed_executions']}</div>
            <div class="metric">معدل النجاح: {summary['success_rate']:.1f}%</div>
            """
        
        return html
    
    def _generate_message_html(self, data: Dict[str, Any]) -> str:
        """توليد HTML لتسليم الرسائل"""
        html = "<h2>ملخص تسليم الرسائل</h2>"
        
        if data.get('summary'):
            summary = data['summary']
            html += f"""
            <div class="metric">إجمالي الرسائل: {summary['total_messages']}</div>
            <div class="metric">الرسائل المرسلة: {summary['sent_messages']}</div>
            <div class="metric">الرسائل الفاشلة: {summary['failed_messages']}</div>
            <div class="metric">معدل التسليم: {summary['delivery_rate']:.1f}%</div>
            """
        
        return html
    
    def _generate_health_html(self, data: Dict[str, Any]) -> str:
        """توليد HTML لصحة النظام"""
        html = "<h2>صحة النظام</h2>"
        
        if data.get('summary'):
            summary = data['summary']
            html += f"""
            <div class="metric">سجلات الأخطاء: {summary['error_logs']}</div>
            <div class="metric">سجلات التحذيرات: {summary['warning_logs']}</div>
            <div class="metric">سير العمل النشط: {summary['active_workflows']}</div>
            <div class="metric">وقت التشغيل: {summary['system_uptime']:.1f}%</div>
            """
        
        return html

# إنشاء مثيل عام من مولد التقارير
report_generator = AutomationReportGenerator()

class ScheduledReportService:
    """خدمة التقارير المجدولة"""
    
    def __init__(self):
        self.report_generator = report_generator
        self.scheduled_reports = []
        
    def schedule_report(self, report_config: Dict[str, Any]) -> Dict[str, Any]:
        """جدولة تقرير"""
        try:
            # إضافة التقرير المجدول
            self.scheduled_reports.append(report_config)
            
            return {"success": True, "message": "تم جدولة التقرير بنجاح"}
            
        except Exception as e:
            logger.error(f"خطأ في جدولة التقرير: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def generate_scheduled_reports(self):
        """توليد التقارير المجدولة"""
        for config in self.scheduled_reports:
            try:
                # فحص ما إذا كان وقت التوليد قد حان
                if self._should_generate_report(config):
                    self._generate_and_send_report(config)
                    
            except Exception as e:
                logger.error(f"خطأ في توليد التقرير المجدول: {str(e)}")
    
    def _should_generate_report(self, config: Dict[str, Any]) -> bool:
        """فحص ما إذا كان يجب توليد التقرير"""
        # منطق فحص الجدولة
        return True  # مبسط للمثال
    
    def _generate_and_send_report(self, config: Dict[str, Any]):
        """توليد وإرسال التقرير"""
        # توليد التقرير
        report = self.report_generator.generate_report(
            config['report_type'],
            config.get('format', 'pdf'),
            config.get('start_date'),
            config.get('end_date'),
            config.get('filters')
        )
        
        if report.get('success'):
            # إرسال التقرير (يمكن تطويره لاحقاً)
            logger.info(f"تم توليد التقرير المجدول: {config['report_type']}")

# إنشاء مثيل عام من خدمة التقارير المجدولة
scheduled_report_service = ScheduledReportService()
