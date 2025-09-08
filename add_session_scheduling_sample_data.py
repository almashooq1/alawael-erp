#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
إضافة بيانات تجريبية لنظام جدولة الجلسات المتقدمة
Sample Data for Advanced Session Scheduling System
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from session_scheduling_models import *
from rehabilitation_programs_models import RehabilitationBeneficiary, RehabilitationProgram, Therapist
from models import User
from datetime import datetime, date, time, timedelta
import random

def add_session_scheduling_sample_data():
    """إضافة بيانات تجريبية لنظام جدولة الجلسات"""
    
    with app.app_context():
        try:
            print("🚀 بدء إضافة البيانات التجريبية لنظام جدولة الجلسات...")
            
            # 1. إضافة غرف العلاج
            print("📍 إضافة غرف العلاج...")
            therapy_rooms = [
                TherapyRoom(
                    room_number="TR-001",
                    name="غرفة العلاج الطبيعي الرئيسية",
                    room_type=RoomType.PHYSICAL_THERAPY,
                    capacity=2,
                    equipment=["أجهزة العلاج الطبيعي", "طاولات العلاج", "كرات التمرين", "أوزان خفيفة"],
                    location="الطابق الأول - الجناح الشرقي",
                    is_available=True,
                    availability_hours={"start": "08:00", "end": "17:00"},
                    special_requirements=["تهوية جيدة", "إضاءة طبيعية"],
                    created_by=1,
                    updated_by=1
                ),
                TherapyRoom(
                    room_number="TR-002",
                    name="غرفة علاج النطق والتخاطب",
                    room_type=RoomType.SPEECH_THERAPY,
                    capacity=1,
                    equipment=["مرآة كبيرة", "أدوات النطق", "ألعاب تعليمية", "جهاز تسجيل"],
                    location="الطابق الأول - الجناح الغربي",
                    is_available=True,
                    availability_hours={"start": "08:30", "end": "16:30"},
                    special_requirements=["عزل صوتي", "هدوء تام"],
                    created_by=1,
                    updated_by=1
                ),
                TherapyRoom(
                    room_number="TR-003",
                    name="غرفة العلاج الوظيفي",
                    room_type=RoomType.OCCUPATIONAL_THERAPY,
                    capacity=3,
                    equipment=["أدوات المهارات الحركية الدقيقة", "ألعاب تطوير المهارات", "طاولات قابلة للتعديل"],
                    location="الطابق الثاني - الجناح الشمالي",
                    is_available=True,
                    availability_hours={"start": "09:00", "end": "16:00"},
                    special_requirements=["مساحة واسعة", "أرضية آمنة"],
                    created_by=1,
                    updated_by=1
                ),
                TherapyRoom(
                    room_number="TR-004",
                    name="غرفة العلاج السلوكي",
                    room_type=RoomType.BEHAVIORAL_THERAPY,
                    capacity=1,
                    equipment=["كاميرا مراقبة", "ألعاب تفاعلية", "مقاعد مريحة", "لوح تفاعلي"],
                    location="الطابق الثاني - الجناح الجنوبي",
                    is_available=True,
                    availability_hours={"start": "08:00", "end": "18:00"},
                    special_requirements=["بيئة هادئة", "ألوان مهدئة"],
                    created_by=1,
                    updated_by=1
                ),
                TherapyRoom(
                    room_number="TR-005",
                    name="غرفة العلاج الجماعي",
                    room_type=RoomType.GROUP_THERAPY,
                    capacity=8,
                    equipment=["طاولة دائرية كبيرة", "كراسي متحركة", "شاشة عرض", "نظام صوتي"],
                    location="الطابق الأرضي - القاعة الرئيسية",
                    is_available=True,
                    availability_hours={"start": "09:00", "end": "17:00"},
                    special_requirements=["مساحة واسعة", "تهوية ممتازة"],
                    created_by=1,
                    updated_by=1
                )
            ]
            
            for room in therapy_rooms:
                db.session.add(room)
            
            db.session.commit()
            print(f"✅ تم إضافة {len(therapy_rooms)} غرفة علاج")
            
            # 2. إضافة جداول المعالجين
            print("👨‍⚕️ إضافة جداول المعالجين...")
            
            # الحصول على المعالجين الموجودين
            therapists = Therapist.query.all()
            if not therapists:
                print("⚠️ لا توجد معالجين في النظام، سيتم تخطي إضافة الجداول")
            else:
                therapist_schedules = []
                for i, therapist in enumerate(therapists[:3]):  # أول 3 معالجين
                    # جدول أسبوعي للمعالج
                    for day in range(7):  # 0 = الاثنين، 6 = الأحد
                        if day < 5:  # أيام العمل (الاثنين - الجمعة)
                            schedule = TherapistSchedule(
                                therapist_id=therapist.id,
                                day_of_week=day,
                                start_time=time(8, 0) if i == 0 else time(9, 0) if i == 1 else time(8, 30),
                                end_time=time(16, 0) if i == 0 else time(17, 0) if i == 1 else time(16, 30),
                                is_available=True,
                                break_start_time=time(12, 0),
                                break_end_time=time(13, 0),
                                max_sessions_per_day=6 if i == 0 else 8 if i == 1 else 7,
                                notes=f"جدول عمل {therapist.first_name} {therapist.last_name}",
                                created_by=1,
                                updated_by=1
                            )
                            therapist_schedules.append(schedule)
                
                for schedule in therapist_schedules:
                    db.session.add(schedule)
                
                db.session.commit()
                print(f"✅ تم إضافة {len(therapist_schedules)} جدول معالج")
            
            # 3. إضافة جلسات مجدولة
            print("📅 إضافة جلسات مجدولة...")
            
            # الحصول على المستفيدين والبرامج
            beneficiaries = RehabilitationBeneficiary.query.limit(5).all()
            programs = RehabilitationProgram.query.limit(3).all()
            rooms = TherapyRoom.query.all()
            
            if not beneficiaries or not programs or not therapists:
                print("⚠️ البيانات الأساسية غير متوفرة، سيتم تخطي إضافة الجلسات")
            else:
                session_schedules = []
                
                # إنشاء جلسات للأسبوع القادم
                start_date = date.today() + timedelta(days=1)
                
                for day_offset in range(7):  # أسبوع كامل
                    session_date = start_date + timedelta(days=day_offset)
                    
                    # تخطي عطلة نهاية الأسبوع
                    if session_date.weekday() >= 5:  # السبت والأحد
                        continue
                    
                    # إنشاء 3-5 جلسات يومياً
                    daily_sessions = random.randint(3, 5)
                    
                    for session_num in range(daily_sessions):
                        beneficiary = random.choice(beneficiaries)
                        program = random.choice(programs)
                        therapist = random.choice(therapists)
                        room = random.choice(rooms)
                        
                        # أوقات الجلسات
                        start_hour = random.randint(9, 15)
                        start_time = time(start_hour, random.choice([0, 30]))
                        end_time = time(start_hour + 1, start_time.minute)
                        
                        session = SessionSchedule(
                            session_number=f"SS-{session_date.strftime('%Y%m%d')}-{session_num+1:03d}",
                            beneficiary_id=beneficiary.id,
                            program_id=program.id,
                            therapist_id=therapist.id,
                            room_id=room.id,
                            session_date=session_date,
                            start_time=start_time,
                            end_time=end_time,
                            session_type=random.choice(list(SessionType)),
                            status=random.choice([SessionStatus.SCHEDULED, SessionStatus.CONFIRMED]),
                            priority=random.choice(list(SessionPriority)),
                            session_goals=["تحسين المهارات الحركية", "تطوير التواصل", "زيادة التركيز"],
                            required_equipment=["أدوات أساسية", "مواد تعليمية"],
                            preparation_notes="تحضير المواد اللازمة قبل الجلسة",
                            is_recurring=random.choice([True, False]),
                            recurrence_pattern=RecurrencePattern.WEEKLY if random.choice([True, False]) else None,
                            recurrence_end_date=session_date + timedelta(weeks=8) if random.choice([True, False]) else None,
                            created_by=1,
                            updated_by=1
                        )
                        session_schedules.append(session)
                
                for session in session_schedules:
                    db.session.add(session)
                
                db.session.commit()
                print(f"✅ تم إضافة {len(session_schedules)} جلسة مجدولة")
            
            # 4. إضافة حجوزات الغرف
            print("🏠 إضافة حجوزات الغرف...")
            
            room_bookings = []
            for session in session_schedules[:10]:  # أول 10 جلسات
                booking = RoomBooking(
                    room_id=session.room_id,
                    session_id=session.id,
                    booking_date=session.session_date,
                    start_time=session.start_time,
                    end_time=session.end_time,
                    booking_type=BookingType.SESSION,
                    status=BookingStatus.CONFIRMED,
                    booked_by=session.therapist_id,
                    purpose=f"جلسة علاجية - {session.session_number}",
                    special_requirements=["تنظيف الغرفة", "تحضير المعدات"],
                    created_by=1,
                    updated_by=1
                )
                room_bookings.append(booking)
            
            for booking in room_bookings:
                db.session.add(booking)
            
            db.session.commit()
            print(f"✅ تم إضافة {len(room_bookings)} حجز غرفة")
            
            # 5. إضافة قوالب الجدولة
            print("📋 إضافة قوالب الجدولة...")
            
            schedule_templates = [
                ScheduleTemplate(
                    template_name="قالب العلاج الطبيعي الأسبوعي",
                    template_type=TemplateType.WEEKLY,
                    target_program_type="علاج طبيعي",
                    default_duration_minutes=60,
                    default_room_type=RoomType.PHYSICAL_THERAPY,
                    session_pattern={
                        "sessions_per_week": 3,
                        "preferred_days": [0, 2, 4],  # الاثنين، الأربعاء، الجمعة
                        "preferred_times": ["09:00", "10:00", "11:00"]
                    },
                    template_settings={
                        "auto_confirm": True,
                        "send_reminders": True,
                        "allow_rescheduling": True
                    },
                    is_active=True,
                    created_by=1,
                    updated_by=1
                ),
                ScheduleTemplate(
                    template_name="قالب علاج النطق المكثف",
                    template_type=TemplateType.DAILY,
                    target_program_type="علاج نطق",
                    default_duration_minutes=45,
                    default_room_type=RoomType.SPEECH_THERAPY,
                    session_pattern={
                        "sessions_per_week": 5,
                        "preferred_days": [0, 1, 2, 3, 4],  # أيام العمل
                        "preferred_times": ["09:00", "10:00", "14:00", "15:00"]
                    },
                    template_settings={
                        "auto_confirm": False,
                        "send_reminders": True,
                        "allow_rescheduling": False
                    },
                    is_active=True,
                    created_by=1,
                    updated_by=1
                )
            ]
            
            for template in schedule_templates:
                db.session.add(template)
            
            db.session.commit()
            print(f"✅ تم إضافة {len(schedule_templates)} قالب جدولة")
            
            # 6. إضافة إشعارات الجدولة
            print("🔔 إضافة إشعارات الجدولة...")
            
            schedule_notifications = []
            for session in session_schedules[:5]:  # أول 5 جلسات
                # إشعار تأكيد الجلسة
                notification = ScheduleNotification(
                    session_id=session.id,
                    recipient_type=NotificationRecipient.BENEFICIARY,
                    recipient_id=session.beneficiary_id,
                    notification_type=NotificationType.CONFIRMATION,
                    title="تأكيد موعد الجلسة العلاجية",
                    message=f"تم تأكيد موعد جلستك العلاجية يوم {session.session_date} في تمام الساعة {session.start_time}",
                    scheduled_time=datetime.combine(session.session_date, session.start_time) - timedelta(hours=24),
                    delivery_method=DeliveryMethod.SMS,
                    is_sent=False,
                    created_by=1,
                    updated_by=1
                )
                schedule_notifications.append(notification)
                
                # إشعار تذكير
                reminder = ScheduleNotification(
                    session_id=session.id,
                    recipient_type=NotificationRecipient.BENEFICIARY,
                    recipient_id=session.beneficiary_id,
                    notification_type=NotificationType.REMINDER,
                    title="تذكير بموعد الجلسة العلاجية",
                    message=f"تذكير: لديك جلسة علاجية غداً في تمام الساعة {session.start_time}",
                    scheduled_time=datetime.combine(session.session_date, session.start_time) - timedelta(hours=2),
                    delivery_method=DeliveryMethod.SMS,
                    is_sent=False,
                    created_by=1,
                    updated_by=1
                )
                schedule_notifications.append(reminder)
            
            for notification in schedule_notifications:
                db.session.add(notification)
            
            db.session.commit()
            print(f"✅ تم إضافة {len(schedule_notifications)} إشعار جدولة")
            
            # 7. إضافة أحداث التقويم
            print("📅 إضافة أحداث التقويم...")
            
            calendar_events = []
            for session in session_schedules:
                event = CalendarEvent(
                    session_id=session.id,
                    event_title=f"جلسة علاجية - {session.session_number}",
                    event_description=f"جلسة {session.session_type.value} مع المعالج",
                    start_datetime=datetime.combine(session.session_date, session.start_time),
                    end_datetime=datetime.combine(session.session_date, session.end_time),
                    location=f"غرفة رقم {session.room.room_number}" if session.room else "غير محدد",
                    attendees=[
                        {"name": f"{session.beneficiary.first_name} {session.beneficiary.last_name}", "type": "beneficiary"},
                        {"name": f"{session.therapist.first_name} {session.therapist.last_name}", "type": "therapist"}
                    ],
                    event_color="#4CAF50" if session.status == SessionStatus.CONFIRMED else "#FF9800",
                    is_all_day=False,
                    timezone="Asia/Riyadh",
                    created_by=1,
                    updated_by=1
                )
                calendar_events.append(event)
            
            for event in calendar_events:
                db.session.add(event)
            
            db.session.commit()
            print(f"✅ تم إضافة {len(calendar_events)} حدث تقويم")
            
            # 8. إضافة إحصائيات الجدولة
            print("📊 إضافة إحصائيات الجدولة...")
            
            # حساب الإحصائيات
            total_sessions = len(session_schedules)
            confirmed_sessions = len([s for s in session_schedules if s.status == SessionStatus.CONFIRMED])
            total_rooms = len(therapy_rooms)
            total_therapists = len(therapists) if therapists else 0
            
            schedule_stats = ScheduleStatistics(
                date=date.today(),
                total_sessions_scheduled=total_sessions,
                total_sessions_completed=0,
                total_sessions_cancelled=0,
                total_sessions_rescheduled=0,
                average_session_duration=60.0,
                room_utilization_rate=75.5,
                therapist_utilization_rate=68.2,
                no_show_rate=5.0,
                cancellation_rate=8.5,
                patient_satisfaction_score=4.3,
                statistics_data={
                    "rooms_count": total_rooms,
                    "therapists_count": total_therapists,
                    "confirmed_sessions": confirmed_sessions,
                    "peak_hours": ["10:00", "11:00", "14:00"],
                    "most_requested_therapy": "علاج طبيعي"
                },
                created_by=1,
                updated_by=1
            )
            
            db.session.add(schedule_stats)
            db.session.commit()
            print("✅ تم إضافة إحصائيات الجدولة")
            
            print("\n🎉 تم إكمال إضافة جميع البيانات التجريبية لنظام جدولة الجلسات بنجاح!")
            print(f"📈 الإحصائيات النهائية:")
            print(f"   • غرف العلاج: {len(therapy_rooms)}")
            print(f"   • جداول المعالجين: {len(therapist_schedules) if 'therapist_schedules' in locals() else 0}")
            print(f"   • الجلسات المجدولة: {len(session_schedules) if 'session_schedules' in locals() else 0}")
            print(f"   • حجوزات الغرف: {len(room_bookings)}")
            print(f"   • قوالب الجدولة: {len(schedule_templates)}")
            print(f"   • الإشعارات: {len(schedule_notifications)}")
            print(f"   • أحداث التقويم: {len(calendar_events) if 'calendar_events' in locals() else 0}")
            
        except Exception as e:
            print(f"❌ خطأ في إضافة البيانات التجريبية: {str(e)}")
            db.session.rollback()
            raise e

if __name__ == "__main__":
    add_session_scheduling_sample_data()
