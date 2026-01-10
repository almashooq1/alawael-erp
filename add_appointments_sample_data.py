#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
إضافة بيانات تجريبية لنظام المواعيد والتقويم
Sample Data for Appointments and Calendar System
"""

from app import app
from models import db, User
from appointments_calendar_models import (
    Appointment, AppointmentReminder, AppointmentConflict, Calendar, 
    CalendarSettings, SpecialEvent, AppointmentType, AppointmentStatus,
    RecurrenceType, ReminderType, Priority
)
from datetime import datetime, date, timedelta
import random

def create_sample_users():
    """إنشاء مستخدمين تجريبيين"""
    users_data = [
        {
            'name': 'د. أحمد محمد الأخصائي',
            'email': 'ahmed.therapist@awail.com',
            'national_id': '1234567890',
            'password': 'hashed_password_123',
            'role': 'therapist',
            'phone': '0501234567',
            'address': 'الرياض، المملكة العربية السعودية'
        },
        {
            'name': 'أ. فاطمة علي الأخصائية',
            'email': 'fatima.therapist@awail.com',
            'national_id': '1234567891',
            'password': 'hashed_password_123',
            'role': 'therapist',
            'phone': '0501234568',
            'address': 'جدة، المملكة العربية السعودية'
        },
        {
            'name': 'د. سارة أحمد النفسية',
            'email': 'sara.psychologist@awail.com',
            'national_id': '1234567892',
            'password': 'hashed_password_123',
            'role': 'therapist',
            'phone': '0501234569',
            'address': 'الدمام، المملكة العربية السعودية'
        },
        {
            'name': 'أ. محمد عبدالله المنسق',
            'email': 'mohammed.coordinator@awail.com',
            'national_id': '1234567893',
            'password': 'hashed_password_123',
            'role': 'admin',
            'phone': '0501234570',
            'address': 'الرياض، المملكة العربية السعودية'
        },
        {
            'name': 'والد المستفيد - عبدالرحمن',
            'email': 'parent1@awail.com',
            'national_id': '1234567894',
            'password': 'hashed_password_123',
            'role': 'parent',
            'phone': '0501234571',
            'address': 'الرياض، المملكة العربية السعودية'
        },
        {
            'name': 'والدة المستفيدة - نورا',
            'email': 'parent2@awail.com',
            'national_id': '1234567895',
            'password': 'hashed_password_123',
            'role': 'parent',
            'phone': '0501234572',
            'address': 'جدة، المملكة العربية السعودية'
        }
    ]
    
    created_users = []
    for user_data in users_data:
        # التحقق من عدم وجود المستخدم مسبقاً
        existing_user = User.query.filter_by(email=user_data['email']).first()
        if not existing_user:
            user = User(**user_data)
            db.session.add(user)
            created_users.append(user)
        else:
            created_users.append(existing_user)
    
    db.session.commit()
    return created_users

def create_sample_appointments(users):
    """إنشاء مواعيد تجريبية"""
    therapists = [u for u in users if u.role == 'therapist']
    parents = [u for u in users if u.role == 'parent']
    admin = [u for u in users if u.role == 'admin'][0]
    
    appointments_data = []
    
    # مواعيد الأسبوع الحالي
    today = datetime.now()
    start_of_week = today - timedelta(days=today.weekday())
    
    for i in range(20):  # إنشاء 20 موعد تجريبي
        therapist = random.choice(therapists)
        parent = random.choice(parents) if random.choice([True, False]) else None
        
        # تحديد تاريخ ووقت الموعد
        days_offset = random.randint(0, 14)  # خلال الأسبوعين القادمين
        hours_offset = random.choice([9, 10, 11, 13, 14, 15, 16])  # ساعات العمل
        minutes_offset = random.choice([0, 30])  # نصف ساعة أو ساعة كاملة
        
        start_datetime = start_of_week + timedelta(
            days=days_offset, 
            hours=hours_offset, 
            minutes=minutes_offset
        )
        
        # مدة الموعد (30 دقيقة إلى ساعتين)
        duration = random.choice([30, 60, 90, 120])
        end_datetime = start_datetime + timedelta(minutes=duration)
        
        # نوع الموعد
        appointment_types = [
            AppointmentType.THERAPY_SESSION,
            AppointmentType.ASSESSMENT,
            AppointmentType.CONSULTATION,
            AppointmentType.MEETING
        ]
        
        # حالة الموعد
        statuses = [
            AppointmentStatus.SCHEDULED,
            AppointmentStatus.CONFIRMED,
            AppointmentStatus.COMPLETED,
            AppointmentStatus.IN_PROGRESS
        ]
        
        # الأولوية
        priorities = [Priority.LOW, Priority.MEDIUM, Priority.HIGH, Priority.URGENT]
        
        appointment_data = {
            'appointment_number': f'APT-{start_datetime.strftime("%Y%m%d")}-{str(random.randint(1000, 9999))}',
            'title': f'جلسة {random.choice(["علاج طبيعي", "علاج نطق", "علاج وظيفي", "تقييم نفسي", "استشارة أسرية"])}',
            'description': f'موعد مع {therapist.name} للمستفيد',
            'appointment_type': random.choice(appointment_types),
            'start_datetime': start_datetime,
            'end_datetime': end_datetime,
            'duration_minutes': duration,
            'timezone': 'Asia/Riyadh',
            'status': random.choice(statuses),
            'priority': random.choice(priorities),
            'organizer_id': admin.id,
            'therapist_id': therapist.id,
            'participants': [therapist.id] + ([parent.id] if parent else []),
            'beneficiary_id': random.randint(1, 10),  # معرف مستفيد تجريبي
            'location': random.choice(['عيادة 1', 'عيادة 2', 'قاعة العلاج الطبيعي', 'غرفة التقييم']),
            'room_number': random.choice(['101', '102', '201', '202', '301']),
            'notes': f'ملاحظات خاصة بالموعد رقم {i+1}',
            'preparation_instructions': 'يرجى الحضور قبل 15 دقيقة من الموعد',
            'materials_needed': random.choice([
                ['أدوات العلاج الطبيعي'],
                ['ألعاب تعليمية', 'كتب تلوين'],
                ['أجهزة تقييم'],
                []
            ]),
            'cost': random.choice([100.0, 150.0, 200.0, 250.0, None]),
            'created_by': admin.id,
            'is_recurring': random.choice([True, False]) if i < 5 else False  # 5 مواعيد متكررة فقط
        }
        
        # إضافة بيانات التكرار للمواعيد المتكررة
        if appointment_data['is_recurring']:
            appointment_data['recurrence_type'] = random.choice([
                RecurrenceType.WEEKLY, 
                RecurrenceType.MONTHLY
            ])
            appointment_data['recurrence_interval'] = 1
            appointment_data['recurrence_end_date'] = (start_datetime + timedelta(days=90)).date()
        
        appointments_data.append(appointment_data)
    
    # إنشاء المواعيد في قاعدة البيانات
    created_appointments = []
    for appointment_data in appointments_data:
        appointment = Appointment(**appointment_data)
        db.session.add(appointment)
        created_appointments.append(appointment)
    
    db.session.commit()
    return created_appointments

def create_sample_reminders(appointments):
    """إنشاء تذكيرات تجريبية"""
    reminder_types = [ReminderType.EMAIL, ReminderType.SMS, ReminderType.PUSH]
    reminder_times = [15, 30, 60, 120, 1440]  # دقائق قبل الموعد
    
    for appointment in appointments[:10]:  # تذكيرات لأول 10 مواعيد
        num_reminders = random.randint(1, 3)
        
        for _ in range(num_reminders):
            reminder_type = random.choice(reminder_types)
            minutes_before = random.choice(reminder_times)
            
            reminder = AppointmentReminder(
                appointment_id=appointment.id,
                reminder_type=reminder_type,
                remind_before_minutes=minutes_before,
                scheduled_datetime=appointment.start_datetime - timedelta(minutes=minutes_before),
                recipient_id=appointment.therapist_id,
                subject=f'تذكير بموعد: {appointment.title}',
                message=f'لديك موعد مع المستفيد في {appointment.start_datetime.strftime("%Y-%m-%d %H:%M")}',
                created_by=appointment.created_by
            )
            
            db.session.add(reminder)
    
    db.session.commit()

def create_sample_calendar_settings(users):
    """إنشاء إعدادات التقويم التجريبية"""
    for user in users:
        # إنشاء تقويم للمستخدم
        calendar = Calendar(
            user_id=user.id,
            name=f'تقويم {user.name}',
            description=f'التقويم الشخصي للمستخدم {user.name}',
            color='#667eea',
            is_default=True,
            created_by=user.id
        )
        db.session.add(calendar)
        db.session.flush()
        
        # إعدادات التقويم
        settings = CalendarSettings(
            user_id=user.id,
            calendar_id=calendar.id,
            default_appointment_duration=60,
            working_hours_start='08:00:00',
            working_hours_end='17:00:00',
            working_days=['monday', 'tuesday', 'wednesday', 'thursday', 'sunday'],
            default_reminder_minutes=30,
            auto_accept_appointments=False,
            show_weekends=True,
            created_by=user.id
        )
        db.session.add(settings)
    
    db.session.commit()

def create_sample_special_events():
    """إنشاء أحداث خاصة تجريبية"""
    events_data = [
        {
            'title': 'اليوم الوطني السعودي',
            'description': 'عطلة رسمية بمناسبة اليوم الوطني',
            'event_type': 'holiday',
            'start_date': date(2024, 9, 23),
            'end_date': date(2024, 9, 23),
            'is_recurring': True,
            'recurrence_type': RecurrenceType.YEARLY,
            'affects_scheduling': True,
            'created_by': 1
        },
        {
            'title': 'ورشة تدريبية للأخصائيين',
            'description': 'ورشة تدريبية حول أحدث طرق العلاج',
            'event_type': 'training',
            'start_date': date.today() + timedelta(days=7),
            'end_date': date.today() + timedelta(days=7),
            'start_time': '09:00:00',
            'end_time': '17:00:00',
            'location': 'قاعة المؤتمرات',
            'affects_scheduling': True,
            'created_by': 1
        },
        {
            'title': 'اجتماع فريق العمل الشهري',
            'description': 'اجتماع دوري لمناقشة التطورات والخطط',
            'event_type': 'meeting',
            'start_date': date.today() + timedelta(days=14),
            'end_date': date.today() + timedelta(days=14),
            'start_time': '10:00:00',
            'end_time': '12:00:00',
            'is_recurring': True,
            'recurrence_type': RecurrenceType.MONTHLY,
            'location': 'غرفة الاجتماعات',
            'affects_scheduling': False,
            'created_by': 1
        }
    ]
    
    for event_data in events_data:
        event = SpecialEvent(**event_data)
        db.session.add(event)
    
    db.session.commit()

def create_sample_conflicts(appointments):
    """إنشاء تعارضات تجريبية"""
    if len(appointments) >= 2:
        # إنشاء تعارض بين موعدين
        conflict = AppointmentConflict(
            appointment_id=appointments[0].id,
            conflict_type='time_overlap',
            conflict_description='تداخل في الوقت مع موعد آخر',
            conflicting_appointment_id=appointments[1].id,
            severity='medium',
            detected_at=datetime.utcnow(),
            is_resolved=False,
            created_by=appointments[0].created_by
        )
        db.session.add(conflict)
        db.session.commit()

def main():
    """الدالة الرئيسية لإنشاء البيانات التجريبية"""
    with app.app_context():
        print("🚀 بدء إنشاء البيانات التجريبية لنظام المواعيد والتقويم...")
        
        try:
            # إنشاء المستخدمين
            print("👥 إنشاء المستخدمين التجريبيين...")
            users = create_sample_users()
            print(f"✅ تم إنشاء {len(users)} مستخدم")
            
            # إنشاء المواعيد
            print("📅 إنشاء المواعيد التجريبية...")
            appointments = create_sample_appointments(users)
            print(f"✅ تم إنشاء {len(appointments)} موعد")
            
            # إنشاء التذكيرات
            print("🔔 إنشاء التذكيرات التجريبية...")
            create_sample_reminders(appointments)
            print("✅ تم إنشاء التذكيرات")
            
            # إنشاء إعدادات التقويم
            print("⚙️ إنشاء إعدادات التقويم...")
            create_sample_calendar_settings(users)
            print("✅ تم إنشاء إعدادات التقويم")
            
            # إنشاء الأحداث الخاصة
            print("🎉 إنشاء الأحداث الخاصة...")
            create_sample_special_events()
            print("✅ تم إنشاء الأحداث الخاصة")
            
            # إنشاء التعارضات
            print("⚠️ إنشاء التعارضات التجريبية...")
            create_sample_conflicts(appointments)
            print("✅ تم إنشاء التعارضات")
            
            print("\n🎊 تم إنشاء جميع البيانات التجريبية بنجاح!")
            print("\n📊 ملخص البيانات المُنشأة:")
            print(f"   • المستخدمين: {len(users)}")
            print(f"   • المواعيد: {len(appointments)}")
            print(f"   • التذكيرات: {len([a for a in appointments[:10]])}")
            print(f"   • إعدادات التقويم: {len(users)}")
            print(f"   • الأحداث الخاصة: 3")
            print(f"   • التعارضات: 1")
            
            print("\n🔗 يمكنك الآن الوصول لنظام المواعيد عبر:")
            print("   http://localhost:5000/appointments-calendar")
            
        except Exception as e:
            print(f"❌ خطأ في إنشاء البيانات التجريبية: {str(e)}")
            db.session.rollback()
            raise

if __name__ == '__main__':
    main()
