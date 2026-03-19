"""
خدمة البريد الإلكتروني والإخطارات
"""

from flask import Flask, render_template_string
from flask_mail import Mail, Message
from datetime import datetime, timedelta
from models import TherapySession, Beneficiary, Report
import logging
from functools import wraps

logger = logging.getLogger(__name__)


class EmailService:
    """خدمة إرسال البريد الإلكتروني"""
    
    def __init__(self, app=None, mail=None):
        self.app = app
        self.mail = mail
    
    def init_app(self, app):
        """تهيئة الخدمة مع التطبيق"""
        self.app = app
        self.mail = Mail(app)
    
    def send_simple_email(self, to_email, subject, body):
        """إرسال بريد بسيط"""
        try:
            msg = Message(
                subject=subject,
                recipients=[to_email],
                body=body,
                html=body
            )
            self.mail.send(msg)
            logger.info(f"تم إرسال بريد إلى {to_email}")
            return True
        except Exception as e:
            logger.error(f"خطأ في إرسال البريد: {str(e)}")
            return False
    
    def send_welcome_email(self, user_email, user_name):
        """إرسال بريد ترحيب"""
        subject = "مرحباً بك في نظام إدارة مراكز التأهيل"
        
        html_body = f"""
        <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; direction: rtl; }}
                    .container {{ max-width: 600px; margin: 0 auto; }}
                    .header {{ background: #667eea; color: white; padding: 20px; text-align: center; }}
                    .content {{ padding: 20px; }}
                    .footer {{ background: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>مرحباً بك</h1>
                    </div>
                    <div class="content">
                        <p>السلام عليكم ورحمة الله {user_name},</p>
                        <p>شكراً لتسجيلك في نظام إدارة مراكز التأهيل!</p>
                        <p>يمكنك الآن الوصول إلى جميع الميزات والخدمات المتاحة:</p>
                        <ul>
                            <li>إدارة المستفيدين</li>
                            <li>جدولة الجلسات</li>
                            <li>إنشاء التقارير</li>
                            <li>تتبع التقدم</li>
                        </ul>
                        <p>إذا كان لديك أي أسئلة، لا تتردد في التواصل معنا.</p>
                    </div>
                    <div class="footer">
                        <p>© 2026 نظام إدارة مراكز التأهيل - جميع الحقوق محفوظة</p>
                    </div>
                </div>
            </body>
        </html>
        """
        
        return self.send_simple_email(user_email, subject, html_body)
    
    def send_session_reminder(self, user_email, session_data):
        """إرسال تذكير بالجلسة"""
        subject = "تذكير: جلسة قادمة غداً"
        
        html_body = f"""
        <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; direction: rtl; }}
                    .container {{ max-width: 600px; margin: 0 auto; }}
                    .alert {{ background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 4px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="alert">
                        <h2>تذكير بالجلسة</h2>
                        <p>لديك جلسة مجدولة غداً في:</p>
                        <p><strong>التاريخ:</strong> {session_data.get('date', 'غير محدد')}</p>
                        <p><strong>الوقت:</strong> {session_data.get('time', 'غير محدد')}</p>
                        <p><strong>المكان:</strong> {session_data.get('location', 'غير محدد')}</p>
                        <p><strong>المستفيد:</strong> {session_data.get('beneficiary_name', 'غير محدد')}</p>
                    </div>
                </div>
            </body>
        </html>
        """
        
        return self.send_simple_email(user_email, subject, html_body)
    
    def send_report_notification(self, user_email, report_data):
        """إرسال إخطار بالتقرير الجديد"""
        subject = f"تقرير جديد: {report_data.get('title', 'بدون عنوان')}"
        
        html_body = f"""
        <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; direction: rtl; }}
                    .container {{ max-width: 600px; margin: 0 auto; }}
                    .report-card {{ background: #e7f3ff; border-right: 4px solid #667eea; padding: 15px; margin: 10px 0; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>تقرير جديد متاح</h2>
                    <div class="report-card">
                        <p><strong>العنوان:</strong> {report_data.get('title', 'بدون عنوان')}</p>
                        <p><strong>نوع التقرير:</strong> {report_data.get('type', 'عام')}</p>
                        <p><strong>المستفيد:</strong> {report_data.get('beneficiary_name', 'غير محدد')}</p>
                        <p><strong>التاريخ:</strong> {report_data.get('date', 'غير محدد')}</p>
                        <p><strong>الملخص:</strong></p>
                        <p>{report_data.get('summary', 'لا يوجد ملخص')}</p>
                    </div>
                </div>
            </body>
        </html>
        """
        
        return self.send_simple_email(user_email, subject, html_body)
    
    def send_progress_notification(self, user_email, goal_data):
        """إرسال إخطار بتحديث التقدم"""
        subject = "تحديث تقدم الهدف"
        
        progress_percent = goal_data.get('progress', 0)
        status = "ممتاز" if progress_percent >= 75 else "جيد" if progress_percent >= 50 else "بحاجة لمتابعة"
        
        html_body = f"""
        <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; direction: rtl; }}
                    .container {{ max-width: 600px; margin: 0 auto; }}
                    .progress-bar {{
                        width: 100%;
                        background: #ddd;
                        border-radius: 4px;
                        overflow: hidden;
                        height: 20px;
                    }}
                    .progress-fill {{
                        background: #28a745;
                        width: {progress_percent}%;
                        height: 100%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-size: 12px;
                    }}
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>تحديث تقدم الهدف</h2>
                    <p><strong>الهدف:</strong> {goal_data.get('description', 'بدون وصف')}</p>
                    <p><strong>المستفيد:</strong> {goal_data.get('beneficiary_name', 'غير محدد')}</p>
                    
                    <p><strong>التقدم: {progress_percent}%</strong></p>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: {progress_percent}%">
                            {progress_percent}%
                        </div>
                    </div>
                    
                    <p><strong>الحالة:</strong> {status}</p>
                    <p><strong>الملاحظات:</strong> {goal_data.get('notes', 'لا توجد ملاحظات')}</p>
                </div>
            </body>
        </html>
        """
        
        return self.send_simple_email(user_email, subject, html_body)


class NotificationScheduler:
    """جدولة الإخطارات والتذكيرات"""
    
    @staticmethod
    def send_session_reminders(email_service, hours_before=24):
        """إرسال تذكيرات للجلسات القادمة"""
        try:
            # حساب الوقت
            tomorrow = datetime.now() + timedelta(hours=hours_before)
            today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            
            # البحث عن الجلسات
            sessions = TherapySession.query.filter(
                TherapySession.session_date >= today_start,
                TherapySession.session_date <= tomorrow,
                TherapySession.status == 'scheduled'
            ).all()
            
            sent_count = 0
            for session in sessions:
                try:
                    # الحصول على بيانات المستفيد والمعالج
                    beneficiary = session.beneficiary
                    
                    # إرسال للمعالج
                    if session.therapist_email:
                        email_service.send_session_reminder(
                            session.therapist_email,
                            {
                                'date': session.session_date.strftime('%Y-%m-%d'),
                                'time': session.session_time.strftime('%H:%M'),
                                'beneficiary_name': beneficiary.full_name,
                                'location': 'المركز الرئيسي'
                            }
                        )
                        sent_count += 1
                    
                    # إرسال لولي الأمر
                    if beneficiary.guardian_email:
                        email_service.send_session_reminder(
                            beneficiary.guardian_email,
                            {
                                'date': session.session_date.strftime('%Y-%m-%d'),
                                'time': session.session_time.strftime('%H:%M'),
                                'beneficiary_name': beneficiary.full_name,
                                'location': 'المركز الرئيسي'
                            }
                        )
                        sent_count += 1
                
                except Exception as e:
                    logger.error(f"خطأ في إرسال تذكير للجلسة {session.id}: {str(e)}")
            
            logger.info(f"تم إرسال {sent_count} تذكير جلسة")
            return sent_count
        
        except Exception as e:
            logger.error(f"خطأ في إرسال التذكيرات: {str(e)}")
            return 0
    
    @staticmethod
    def send_weekly_summary(email_service):
        """إرسال ملخص أسبوعي"""
        try:
            from models import User
            
            users = User.query.all()
            
            for user in users:
                # حساب الإحصائيات
                sessions_count = TherapySession.query.filter(
                    TherapySession.created_at >= datetime.now() - timedelta(days=7)
                ).count()
                
                reports_count = Report.query.filter(
                    Report.created_at >= datetime.now() - timedelta(days=7)
                ).count()
                
                html_body = f"""
                <html>
                    <head>
                        <style>
                            body {{ font-family: Arial, sans-serif; direction: rtl; }}
                            .container {{ max-width: 600px; margin: 0 auto; }}
                            .stat {{ background: #f0f0f0; padding: 10px; margin: 5px 0; }}
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h2>ملخص الأسبوع</h2>
                            <div class="stat">
                                <strong>الجلسات المضافة:</strong> {sessions_count}
                            </div>
                            <div class="stat">
                                <strong>التقارير الجديدة:</strong> {reports_count}
                            </div>
                        </div>
                    </body>
                </html>
                """
                
                email_service.send_simple_email(
                    user.email,
                    "ملخص الأسبوع",
                    html_body
                )
        
        except Exception as e:
            logger.error(f"خطأ في إرسال الملخص الأسبوعي: {str(e)}")


def send_notification_async(f):
    """ديكوريتر لإرسال الإخطارات بشكل غير متزامن"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            result = f(*args, **kwargs)
            # في الإنتاج، يمكن استخدام Celery لإرسال غير متزامن
            return result
        except Exception as e:
            logger.error(f"خطأ في الإرسال: {str(e)}")
            return None
    return decorated_function


# تكوين Flask-Mail
def init_email_service(app):
    """تهيئة خدمة البريد"""
    app.config['MAIL_SERVER'] = app.config.get('MAIL_SERVER', 'smtp.gmail.com')
    app.config['MAIL_PORT'] = app.config.get('MAIL_PORT', 587)
    app.config['MAIL_USE_TLS'] = app.config.get('MAIL_USE_TLS', True)
    app.config['MAIL_USERNAME'] = app.config.get('MAIL_USERNAME')
    app.config['MAIL_PASSWORD'] = app.config.get('MAIL_PASSWORD')
    app.config['MAIL_DEFAULT_SENDER'] = app.config.get('MAIL_DEFAULT_SENDER', 'noreply@rehab-system.com')
    
    email_service = EmailService(app)
    return email_service


# مثال على الاستخدام في routes:
"""
from services.email_notifications import EmailService, NotificationScheduler

@auth_bp.route('/register', methods=['POST'])
def register():
    # ... کد التسجيل
    
    email_service = EmailService()
    email_service.send_welcome_email(
        user.email,
        user.name
    )
    
    return jsonify({'message': 'تم التسجيل بنجاح'})


# للجدولة في celery أو background task:
@periodic_task.task(run_every=crontab(hour=9, minute=0))
def send_daily_reminders():
    email_service = EmailService()
    NotificationScheduler.send_session_reminders(email_service, hours_before=24)
"""
