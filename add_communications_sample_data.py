#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
إضافة بيانات تجريبية شاملة لنظام الاتصالات المتكامل
Sample Data for Integrated Communications System
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from models import User
from communications_models import (
    CommunicationChannel, MessageTemplate, CommunicationMessage,
    CommunicationCampaign, VoiceCall, VideoConference, ConferenceParticipant,
    PushNotification, CommunicationStats, CommunicationPreference,
    generate_message_id, generate_call_id, generate_conference_id, generate_notification_id
)
from datetime import datetime, timedelta
import json
import random

def add_communication_channels():
    """إضافة قنوات الاتصال"""
    print("إضافة قنوات الاتصال...")
    
    channels = [
        {
            'channel_name': 'SMS الأساسي',
            'channel_type': 'text',
            'provider_name': 'Twilio',
            'provider_config': json.dumps({
                'account_sid': 'AC_test_account',
                'auth_token': 'test_token',
                'from_number': '+966501234567'
            }),
            'is_active': True,
            'daily_limit': 1000,
            'monthly_limit': 30000,
            'cost_per_message': 0.05
        },
        {
            'channel_name': 'البريد الإلكتروني الرئيسي',
            'channel_type': 'email',
            'provider_name': 'SendGrid',
            'provider_config': json.dumps({
                'api_key': 'SG.test_api_key',
                'from_email': 'noreply@awail.com',
                'from_name': 'مراكز الأوائل'
            }),
            'is_active': True,
            'daily_limit': 5000,
            'monthly_limit': 150000,
            'cost_per_message': 0.01
        },
        {
            'channel_name': 'إشعارات التطبيق',
            'channel_type': 'push',
            'provider_name': 'Firebase',
            'provider_config': json.dumps({
                'server_key': 'firebase_server_key',
                'project_id': 'awail-app'
            }),
            'is_active': True,
            'daily_limit': 10000,
            'monthly_limit': 300000,
            'cost_per_message': 0.001
        },
        {
            'channel_name': 'المكالمات الصوتية',
            'channel_type': 'voice',
            'provider_name': 'Twilio Voice',
            'provider_config': json.dumps({
                'account_sid': 'AC_voice_account',
                'auth_token': 'voice_token'
            }),
            'is_active': True,
            'daily_limit': 500,
            'monthly_limit': 15000,
            'cost_per_message': 0.25
        }
    ]
    
    for channel_data in channels:
        channel = CommunicationChannel(**channel_data)
        db.session.add(channel)
    
    db.session.commit()
    print(f"✅ تم إضافة {len(channels)} قناة اتصال")

def add_message_templates():
    """إضافة قوالب الرسائل"""
    print("إضافة قوالب الرسائل...")
    
    # الحصول على القنوات
    sms_channel = CommunicationChannel.query.filter_by(channel_type='text').first()
    email_channel = CommunicationChannel.query.filter_by(channel_type='email').first()
    push_channel = CommunicationChannel.query.filter_by(channel_type='push').first()
    
    templates = [
        # قوالب SMS
        {
            'template_name': 'تأكيد الموعد',
            'template_code': 'appointment_confirmation',
            'channel_id': sms_channel.id,
            'category': 'appointment',
            'content': 'مرحباً {name}، نذكركم بموعدكم في {date} الساعة {time} في مركز {clinic_name}. للاستفسار: {phone}',
            'variables': json.dumps(['name', 'date', 'time', 'clinic_name', 'phone']),
            'language': 'ar',
            'usage_count': 45
        },
        {
            'template_name': 'تذكير بالموعد',
            'template_code': 'appointment_reminder',
            'channel_id': sms_channel.id,
            'category': 'reminder',
            'content': 'تذكير: لديكم موعد غداً {date} الساعة {time}. يرجى الحضور قبل 15 دقيقة. مع تحيات مراكز الأوائل',
            'variables': json.dumps(['date', 'time']),
            'language': 'ar',
            'usage_count': 78
        },
        {
            'template_name': 'رسالة ترحيب',
            'template_code': 'welcome_message',
            'channel_id': sms_channel.id,
            'category': 'welcome',
            'content': 'أهلاً وسهلاً {name}، مرحباً بكم في مراكز الأوائل. نتطلع لخدمتكم بأفضل ما لدينا.',
            'variables': json.dumps(['name']),
            'language': 'ar',
            'usage_count': 23
        },
        
        # قوالب البريد الإلكتروني
        {
            'template_name': 'تقرير التقييم',
            'template_code': 'assessment_report',
            'channel_id': email_channel.id,
            'category': 'report',
            'subject': 'تقرير التقييم - {patient_name}',
            'content': '''السيد/ة {parent_name} المحترم/ة،

نتشرف بإرسال تقرير التقييم الخاص بـ {patient_name}.

تاريخ التقييم: {assessment_date}
نوع التقييم: {assessment_type}
النتيجة: {result}

يرجى مراجعة التقرير المرفق والتواصل معنا لأي استفسارات.

مع أطيب التحيات،
فريق مراكز الأوائل''',
            'variables': json.dumps(['parent_name', 'patient_name', 'assessment_date', 'assessment_type', 'result']),
            'language': 'ar',
            'usage_count': 34
        },
        {
            'template_name': 'دعوة لحضور ورشة عمل',
            'template_code': 'workshop_invitation',
            'channel_id': email_channel.id,
            'category': 'invitation',
            'subject': 'دعوة لحضور ورشة عمل: {workshop_title}',
            'content': '''عزيزي/تي {name}،

يسعدنا دعوتكم لحضور ورشة العمل:
العنوان: {workshop_title}
التاريخ: {date}
الوقت: {time}
المكان: {location}

للتسجيل يرجى الرد على هذا البريد أو الاتصال بنا.

مع التقدير،
إدارة مراكز الأوائل''',
            'variables': json.dumps(['name', 'workshop_title', 'date', 'time', 'location']),
            'language': 'ar',
            'usage_count': 12
        },
        
        # قوالب الإشعارات
        {
            'template_name': 'إشعار موعد جديد',
            'template_code': 'new_appointment_notification',
            'channel_id': push_channel.id,
            'category': 'appointment',
            'content': 'تم تحديد موعد جديد لكم في {date} الساعة {time}',
            'variables': json.dumps(['date', 'time']),
            'language': 'ar',
            'usage_count': 67
        }
    ]
    
    for template_data in templates:
        template = MessageTemplate(**template_data)
        db.session.add(template)
    
    db.session.commit()
    print(f"✅ تم إضافة {len(templates)} قالب رسالة")

def add_communication_messages():
    """إضافة رسائل الاتصال"""
    print("إضافة رسائل الاتصال...")
    
    # الحصول على المستخدمين والقنوات
    users = User.query.limit(5).all()
    sms_channel = CommunicationChannel.query.filter_by(channel_type='text').first()
    email_channel = CommunicationChannel.query.filter_by(channel_type='email').first()
    
    messages = []
    
    # رسائل SMS
    sms_messages = [
        {
            'channel_id': sms_channel.id,
            'sender_id': users[0].id if users else 1,
            'recipient_type': 'external',
            'recipient_contact': '+966501234567',
            'recipient_name': 'أحمد محمد',
            'content': 'مرحباً أحمد، نذكركم بموعدكم غداً الساعة 10:00 صباحاً',
            'status': 'sent',
            'priority': 'normal',
            'sent_at': datetime.utcnow() - timedelta(hours=2),
            'delivery_status': 'delivered'
        },
        {
            'channel_id': sms_channel.id,
            'sender_id': users[1].id if len(users) > 1 else 1,
            'recipient_type': 'external',
            'recipient_contact': '+966502345678',
            'recipient_name': 'فاطمة علي',
            'content': 'تم تأكيد موعدكم يوم الأحد الساعة 2:00 مساءً',
            'status': 'sent',
            'priority': 'high',
            'sent_at': datetime.utcnow() - timedelta(hours=1),
            'delivery_status': 'delivered'
        },
        {
            'channel_id': sms_channel.id,
            'sender_id': users[0].id if users else 1,
            'recipient_type': 'external',
            'recipient_contact': '+966503456789',
            'recipient_name': 'خالد السعد',
            'content': 'نعتذر عن تأجيل الموعد، سيتم التواصل معكم لتحديد موعد بديل',
            'status': 'failed',
            'priority': 'urgent',
            'error_message': 'رقم الهاتف غير صحيح'
        }
    ]
    
    # رسائل البريد الإلكتروني
    email_messages = [
        {
            'channel_id': email_channel.id,
            'sender_id': users[0].id if users else 1,
            'recipient_type': 'external',
            'recipient_contact': 'ahmed@example.com',
            'recipient_name': 'أحمد محمد',
            'subject': 'تقرير التقييم النهائي',
            'content': 'نرسل لكم تقرير التقييم النهائي لطفلكم، يرجى مراجعته والتواصل معنا لأي استفسارات',
            'status': 'sent',
            'priority': 'normal',
            'sent_at': datetime.utcnow() - timedelta(days=1),
            'delivery_status': 'delivered',
            'opened_at': datetime.utcnow() - timedelta(hours=20)
        },
        {
            'channel_id': email_channel.id,
            'sender_id': users[1].id if len(users) > 1 else 1,
            'recipient_type': 'external',
            'recipient_contact': 'fatima@example.com',
            'recipient_name': 'فاطمة علي',
            'subject': 'دعوة لحضور ورشة عمل',
            'content': 'يسعدنا دعوتكم لحضور ورشة عمل حول التعامل مع الأطفال ذوي الاحتياجات الخاصة',
            'status': 'sent',
            'priority': 'normal',
            'sent_at': datetime.utcnow() - timedelta(hours=6),
            'delivery_status': 'delivered'
        }
    ]
    
    all_messages = sms_messages + email_messages
    
    for msg_data in all_messages:
        msg_data['message_id'] = generate_message_id()
        message = CommunicationMessage(**msg_data)
        db.session.add(message)
    
    db.session.commit()
    print(f"✅ تم إضافة {len(all_messages)} رسالة اتصال")

def add_voice_calls():
    """إضافة المكالمات الصوتية"""
    print("إضافة المكالمات الصوتية...")
    
    users = User.query.limit(3).all()
    
    calls = [
        {
            'call_id': generate_call_id(),
            'caller_id': users[0].id if users else 1,
            'caller_number': '+966501111111',
            'recipient_number': '+966502222222',
            'recipient_name': 'سارة أحمد',
            'call_type': 'outbound',
            'call_purpose': 'consultation',
            'status': 'completed',
            'answered_at': datetime.utcnow() - timedelta(hours=3),
            'ended_at': datetime.utcnow() - timedelta(hours=3) + timedelta(minutes=15),
            'duration_seconds': 900,
            'is_recorded': True,
            'recording_url': 'https://recordings.awail.com/call_001.mp3',
            'call_cost': 3.75
        },
        {
            'call_id': generate_call_id(),
            'caller_id': users[1].id if len(users) > 1 else 1,
            'caller_number': '+966501111111',
            'recipient_number': '+966503333333',
            'recipient_name': 'محمد الخالد',
            'call_type': 'outbound',
            'call_purpose': 'follow_up',
            'status': 'completed',
            'answered_at': datetime.utcnow() - timedelta(hours=1),
            'ended_at': datetime.utcnow() - timedelta(hours=1) + timedelta(minutes=8),
            'duration_seconds': 480,
            'is_recorded': False,
            'call_cost': 2.00
        },
        {
            'call_id': generate_call_id(),
            'caller_id': users[0].id if users else 1,
            'caller_number': '+966501111111',
            'recipient_number': '+966504444444',
            'recipient_name': 'نورا السالم',
            'call_type': 'outbound',
            'call_purpose': 'emergency',
            'status': 'failed',
            'error_message': 'لم يتم الرد على المكالمة'
        }
    ]
    
    for call_data in calls:
        call = VoiceCall(**call_data)
        db.session.add(call)
    
    db.session.commit()
    print(f"✅ تم إضافة {len(calls)} مكالمة صوتية")

def add_video_conferences():
    """إضافة مؤتمرات الفيديو"""
    print("إضافة مؤتمرات الفيديو...")
    
    users = User.query.limit(3).all()
    
    conferences = [
        {
            'conference_id': generate_conference_id(),
            'title': 'اجتماع فريق التأهيل',
            'description': 'مناقشة خطط التأهيل للأطفال الجدد',
            'conference_type': 'meeting',
            'host_id': users[0].id if users else 1,
            'max_participants': 10,
            'scheduled_start': datetime.utcnow() + timedelta(days=1),
            'scheduled_end': datetime.utcnow() + timedelta(days=1, hours=1),
            'timezone': 'Asia/Riyadh',
            'status': 'scheduled',
            'is_recording_enabled': True,
            'is_waiting_room_enabled': True,
            'require_password': True,
            'meeting_password': 'awail123',
            'join_url': 'https://meet.awail.com/join/conf_001',
            'host_url': 'https://meet.awail.com/host/conf_001',
            'provider_name': 'Zoom'
        },
        {
            'conference_id': generate_conference_id(),
            'title': 'ورشة عمل للأهالي',
            'description': 'ورشة عمل حول التعامل مع الأطفال ذوي الاحتياجات الخاصة',
            'conference_type': 'webinar',
            'host_id': users[1].id if len(users) > 1 else 1,
            'max_participants': 50,
            'scheduled_start': datetime.utcnow() + timedelta(days=3),
            'scheduled_end': datetime.utcnow() + timedelta(days=3, hours=2),
            'timezone': 'Asia/Riyadh',
            'status': 'scheduled',
            'is_recording_enabled': True,
            'is_waiting_room_enabled': False,
            'require_password': False,
            'join_url': 'https://meet.awail.com/join/conf_002',
            'host_url': 'https://meet.awail.com/host/conf_002',
            'provider_name': 'Teams'
        }
    ]
    
    for conf_data in conferences:
        conference = VideoConference(**conf_data)
        db.session.add(conference)
    
    db.session.commit()
    
    # إضافة المشاركين
    conferences_db = VideoConference.query.all()
    participants = [
        {
            'conference_id': conferences_db[0].id,
            'participant_type': 'internal',
            'participant_id': users[1].id if len(users) > 1 else 2,
            'participant_name': 'د. سعد الأحمد',
            'participant_email': 'saad@awail.com',
            'can_share_screen': True,
            'is_moderator': True
        },
        {
            'conference_id': conferences_db[0].id,
            'participant_type': 'external',
            'participant_name': 'أ. منى الخالد',
            'participant_email': 'mona@example.com',
            'can_share_screen': False,
            'is_moderator': False
        }
    ]
    
    for participant_data in participants:
        participant = ConferenceParticipant(**participant_data)
        db.session.add(participant)
    
    db.session.commit()
    print(f"✅ تم إضافة {len(conferences)} مؤتمر فيديو مع {len(participants)} مشارك")

def add_push_notifications():
    """إضافة الإشعارات التفاعلية"""
    print("إضافة الإشعارات التفاعلية...")
    
    users = User.query.limit(3).all()
    
    notifications = [
        {
            'notification_id': generate_notification_id(),
            'title': 'موعد جديد',
            'body': 'تم تحديد موعد جديد لكم غداً الساعة 10:00 صباحاً',
            'icon': 'calendar',
            'recipient_type': 'individual',
            'recipient_id': users[0].id if users else 1,
            'notification_type': 'appointment',
            'category': 'appointment',
            'priority': 'high',
            'action_url': '/appointments',
            'actions': json.dumps([
                {'action': 'confirm', 'title': 'تأكيد'},
                {'action': 'reschedule', 'title': 'إعادة جدولة'}
            ]),
            'status': 'delivered',
            'sent_at': datetime.utcnow() - timedelta(hours=2),
            'delivered_at': datetime.utcnow() - timedelta(hours=2) + timedelta(minutes=1),
            'sent_by': users[1].id if len(users) > 1 else 2
        },
        {
            'notification_id': generate_notification_id(),
            'title': 'تذكير بالدواء',
            'body': 'حان وقت تناول الدواء لطفلكم',
            'icon': 'medication',
            'recipient_type': 'role',
            'notification_type': 'reminder',
            'category': 'medication',
            'priority': 'urgent',
            'status': 'delivered',
            'sent_at': datetime.utcnow() - timedelta(minutes=30),
            'delivered_at': datetime.utcnow() - timedelta(minutes=29),
            'sent_by': users[0].id if users else 1
        },
        {
            'notification_id': generate_notification_id(),
            'title': 'تحديث في التقرير',
            'body': 'تم تحديث تقرير التقييم الخاص بطفلكم',
            'icon': 'report',
            'recipient_type': 'individual',
            'recipient_id': users[2].id if len(users) > 2 else 1,
            'notification_type': 'update',
            'category': 'report',
            'priority': 'normal',
            'action_url': '/reports',
            'status': 'sent',
            'sent_at': datetime.utcnow() - timedelta(minutes=10),
            'sent_by': users[1].id if len(users) > 1 else 2
        }
    ]
    
    for notification_data in notifications:
        notification = PushNotification(**notification_data)
        db.session.add(notification)
    
    db.session.commit()
    print(f"✅ تم إضافة {len(notifications)} إشعار تفاعلي")

def add_communication_preferences():
    """إضافة تفضيلات الاتصال"""
    print("إضافة تفضيلات الاتصال...")
    
    users = User.query.limit(5).all()
    
    preferences = []
    for i, user in enumerate(users):
        pref_data = {
            'user_id': user.id,
            'preferred_channels': json.dumps(['email', 'push'] if i % 2 == 0 else ['text', 'email']),
            'email_notifications': True,
            'sms_notifications': i % 3 != 0,
            'push_notifications': True,
            'voice_calls_enabled': i % 2 == 0,
            'quiet_hours_start': '22:00',
            'quiet_hours_end': '08:00',
            'timezone': 'Asia/Riyadh',
            'language': 'ar',
            'frequency_limit': 'daily' if i % 2 == 0 else 'weekly'
        }
        preferences.append(pref_data)
    
    for pref_data in preferences:
        preference = CommunicationPreference(**pref_data)
        db.session.add(preference)
    
    db.session.commit()
    print(f"✅ تم إضافة {len(preferences)} تفضيل اتصال")

def add_communication_stats():
    """إضافة إحصائيات الاتصال"""
    print("إضافة إحصائيات الاتصال...")
    
    channels = CommunicationChannel.query.all()
    
    stats = []
    for i in range(7):  # آخر 7 أيام
        date = datetime.utcnow().date() - timedelta(days=i)
        
        for channel in channels:
            if channel.channel_type == 'text':
                messages_sent = random.randint(50, 150)
                messages_delivered = int(messages_sent * 0.95)
                messages_failed = messages_sent - messages_delivered
                total_cost = messages_sent * 0.05
            elif channel.channel_type == 'email':
                messages_sent = random.randint(100, 300)
                messages_delivered = int(messages_sent * 0.98)
                messages_failed = messages_sent - messages_delivered
                total_cost = messages_sent * 0.01
            elif channel.channel_type == 'push':
                messages_sent = random.randint(200, 500)
                messages_delivered = int(messages_sent * 0.99)
                messages_failed = messages_sent - messages_delivered
                total_cost = messages_sent * 0.001
            else:
                messages_sent = random.randint(10, 50)
                messages_delivered = int(messages_sent * 0.85)
                messages_failed = messages_sent - messages_delivered
                total_cost = messages_sent * 0.25
            
            stat_data = {
                'channel_id': channel.id,
                'date': date,
                'messages_sent': messages_sent,
                'messages_delivered': messages_delivered,
                'messages_failed': messages_failed,
                'total_cost': total_cost,
                'average_response_time': random.uniform(1.0, 5.0)
            }
            stats.append(stat_data)
    
    for stat_data in stats:
        stat = CommunicationStats(**stat_data)
        db.session.add(stat)
    
    db.session.commit()
    print(f"✅ تم إضافة {len(stats)} إحصائية اتصال")

def main():
    """الدالة الرئيسية لإضافة جميع البيانات التجريبية"""
    print("🚀 بدء إضافة البيانات التجريبية لنظام الاتصالات المتكامل...")
    print("=" * 60)
    
    with app.app_context():
        try:
            # إضافة البيانات بالترتيب
            add_communication_channels()
            add_message_templates()
            add_communication_messages()
            add_voice_calls()
            add_video_conferences()
            add_push_notifications()
            add_communication_preferences()
            add_communication_stats()
            
            print("=" * 60)
            print("✅ تم إضافة جميع البيانات التجريبية بنجاح!")
            print("\n📊 ملخص البيانات المضافة:")
            print(f"   • قنوات الاتصال: {CommunicationChannel.query.count()}")
            print(f"   • قوالب الرسائل: {MessageTemplate.query.count()}")
            print(f"   • رسائل الاتصال: {CommunicationMessage.query.count()}")
            print(f"   • المكالمات الصوتية: {VoiceCall.query.count()}")
            print(f"   • مؤتمرات الفيديو: {VideoConference.query.count()}")
            print(f"   • الإشعارات التفاعلية: {PushNotification.query.count()}")
            print(f"   • تفضيلات الاتصال: {CommunicationPreference.query.count()}")
            print(f"   • إحصائيات الاتصال: {CommunicationStats.query.count()}")
            
        except Exception as e:
            print(f"❌ خطأ في إضافة البيانات: {str(e)}")
            db.session.rollback()
            return False
    
    return True

if __name__ == '__main__':
    success = main()
    if success:
        print("\n🎉 تم إكمال إضافة البيانات التجريبية بنجاح!")
        print("يمكنكم الآن اختبار نظام الاتصالات المتكامل.")
    else:
        print("\n💥 فشل في إضافة البيانات التجريبية!")
        sys.exit(1)
