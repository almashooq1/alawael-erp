#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Family Portal Sample Data Script
Creates comprehensive sample data for the family portal system
"""

import sys
import os
from datetime import datetime, date, timedelta
import random

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from family_portal_models import (
    FamilyMember, FamilyMessage, FamilyMessageReply, FamilyProgressReport,
    FamilyFeedback, FamilyPortalSession, FamilyHomeworkAssignment,
    MessageType, MessagePriority, FeedbackType, HomeworkStatus
)
from rehabilitation_programs_models import RehabilitationBeneficiary
from models import User
import bcrypt

def create_family_portal_sample_data():
    """Create comprehensive sample data for family portal"""
    
    print("🚀 بدء إنشاء البيانات التجريبية لبوابة الأسرة...")
    
    try:
        with app.app_context():
            # Create family members for existing beneficiaries
            beneficiaries = RehabilitationBeneficiary.query.limit(3).all()
            
            if not beneficiaries:
                print("⚠️ لا توجد مستفيدين في النظام. يرجى إضافة بيانات المستفيدين أولاً.")
                return
            
            family_members = []
            
            # Create family members
            for i, beneficiary in enumerate(beneficiaries):
                # Create mother
                mother = FamilyMember(
                    beneficiary_id=beneficiary.id,
                    first_name=f"أم {beneficiary.first_name}",
                    last_name=beneficiary.last_name,
                    relationship="mother",
                    phone=f"05{random.randint(10000000, 99999999)}",
                    email=f"mother{i+1}@example.com",
                    username=f"mother{i+1}",
                    password_hash=bcrypt.hashpw("password123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
                    has_portal_access=True,
                    preferred_language="ar",
                    notification_preferences={
                        "email": True,
                        "sms": True,
                        "push": True,
                        "session_reminders": True,
                        "progress_updates": True,
                        "homework_assignments": True
                    },
                    emergency_contact=True,
                    is_active=True
                )
                
                # Create father
                father = FamilyMember(
                    beneficiary_id=beneficiary.id,
                    first_name=f"أبو {beneficiary.first_name}",
                    last_name=beneficiary.last_name,
                    relationship="father",
                    phone=f"05{random.randint(10000000, 99999999)}",
                    email=f"father{i+1}@example.com",
                    username=f"father{i+1}",
                    password_hash=bcrypt.hashpw("password123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
                    has_portal_access=True,
                    preferred_language="ar",
                    notification_preferences={
                        "email": True,
                        "sms": False,
                        "push": True,
                        "session_reminders": False,
                        "progress_updates": True,
                        "homework_assignments": False
                    },
                    emergency_contact=False,
                    is_active=True
                )
                
                family_members.extend([mother, father])
            
            db.session.add_all(family_members)
            db.session.commit()
            print(f"✅ تم إنشاء {len(family_members)} عضو أسرة")
            
            # Create family messages
            messages = []
            message_types = [MessageType.PROGRESS_UPDATE, MessageType.APPOINTMENT_REMINDER, 
                           MessageType.GENERAL_INFO, MessageType.HOMEWORK_ASSIGNMENT]
            priorities = [MessagePriority.LOW, MessagePriority.MEDIUM, MessagePriority.HIGH]
            
            for i in range(15):
                message = FamilyMessage(
                    family_member_id=random.choice(family_members).id,
                    sender_id=1,  # Admin user
                    subject=f"رسالة تجريبية {i+1}",
                    content=f"هذه رسالة تجريبية رقم {i+1} تحتوي على معلومات مهمة حول تقدم الطفل في البرنامج التأهيلي.",
                    message_type=random.choice(message_types),
                    priority=random.choice(priorities),
                    sent_date=datetime.now() - timedelta(days=random.randint(0, 30)),
                    is_read=random.choice([True, False]),
                    read_date=datetime.now() - timedelta(days=random.randint(0, 5)) if random.choice([True, False]) else None,
                    delivery_status="delivered",
                    delivery_attempts=1,
                    last_delivery_attempt=datetime.now() - timedelta(hours=random.randint(1, 24))
                )
                messages.append(message)
            
            db.session.add_all(messages)
            db.session.commit()
            print(f"✅ تم إنشاء {len(messages)} رسالة عائلية")
            
            # Create message replies
            replies = []
            for i in range(8):
                message = random.choice(messages)
                reply = FamilyMessageReply(
                    message_id=message.id,
                    sender_id=message.family_member_id,
                    content=f"شكراً لكم على هذه المعلومات المفيدة. نحن سعداء بالتقدم الذي يحرزه طفلنا.",
                    sent_date=message.sent_date + timedelta(hours=random.randint(1, 48)),
                    is_read=random.choice([True, False])
                )
                replies.append(reply)
            
            db.session.add_all(replies)
            db.session.commit()
            print(f"✅ تم إنشاء {len(replies)} رد على الرسائل")
            
            # Create progress reports
            progress_reports = []
            for i, beneficiary in enumerate(beneficiaries):
                for j in range(3):  # 3 reports per beneficiary
                    report = FamilyProgressReport(
                        beneficiary_id=beneficiary.id,
                        report_date=date.today() - timedelta(days=30*j),
                        report_period_start=date.today() - timedelta(days=30*(j+1)),
                        report_period_end=date.today() - timedelta(days=30*j),
                        overall_score=random.randint(70, 95),
                        detailed_scores={
                            "المهارات الحركية": random.randint(70, 90),
                            "المهارات المعرفية": random.randint(75, 95),
                            "مهارات التواصل": random.randint(65, 85),
                            "المهارات الاجتماعية": random.randint(70, 90)
                        },
                        summary=f"تقرير التقدم الشهري رقم {j+1} للمستفيد {beneficiary.first_name}. يظهر الطفل تحسناً ملحوظاً في جميع المجالات.",
                        achievements=[
                            "تحسن في التواصل البصري",
                            "زيادة في المفردات المستخدمة",
                            "تطور في المهارات الحركية الدقيقة"
                        ],
                        challenges=[
                            "صعوبة في التركيز لفترات طويلة",
                            "حاجة لمزيد من التدريب على المهارات الاجتماعية"
                        ],
                        recommendations=[
                            "الاستمرار في التدريب المنزلي",
                            "زيادة وقت الأنشطة التفاعلية",
                            "التركيز على تطوير مهارات التواصل"
                        ],
                        next_goals=[
                            "تطوير مهارات الكتابة",
                            "تحسين التفاعل الاجتماعي",
                            "زيادة مدة التركيز"
                        ],
                        therapist_notes="الطفل يظهر تعاوناً جيداً ورغبة في التعلم. ننصح بالاستمرار في البرنامج الحالي.",
                        family_feedback_requested=True,
                        shared_with_family=True,
                        shared_date=datetime.now() - timedelta(days=random.randint(1, 7))
                    )
                    progress_reports.append(report)
            
            db.session.add_all(progress_reports)
            db.session.commit()
            print(f"✅ تم إنشاء {len(progress_reports)} تقرير تقدم")
            
            # Create family feedback
            feedback_list = []
            feedback_types = [FeedbackType.SESSION_FEEDBACK, FeedbackType.PROGRAM_FEEDBACK, 
                            FeedbackType.THERAPIST_FEEDBACK, FeedbackType.FACILITY_FEEDBACK]
            
            for i in range(10):
                feedback = FamilyFeedback(
                    family_member_id=random.choice(family_members).id,
                    beneficiary_id=random.choice(beneficiaries).id,
                    feedback_type=random.choice(feedback_types),
                    overall_rating=random.randint(4, 5),
                    communication_rating=random.randint(4, 5),
                    professionalism_rating=random.randint(4, 5),
                    positive_feedback="نحن راضون جداً عن مستوى الخدمة والاهتمام بطفلنا. الفريق محترف ومتفهم.",
                    improvement_areas="يمكن تحسين أوقات المواعيد لتكون أكثر مرونة.",
                    suggestions="إضافة المزيد من الأنشطة الترفيهية التعليمية.",
                    is_anonymous=random.choice([True, False]),
                    submitted_date=datetime.now() - timedelta(days=random.randint(1, 30)),
                    follow_up_required=random.choice([True, False])
                )
                feedback_list.append(feedback)
            
            db.session.add_all(feedback_list)
            db.session.commit()
            print(f"✅ تم إنشاء {len(feedback_list)} تقييم عائلي")
            
            # Create portal sessions
            portal_sessions = []
            for family_member in family_members:
                for i in range(random.randint(5, 15)):
                    session = FamilyPortalSession(
                        family_member_id=family_member.id,
                        login_time=datetime.now() - timedelta(days=random.randint(0, 30), 
                                                            hours=random.randint(0, 23)),
                        logout_time=datetime.now() - timedelta(days=random.randint(0, 30), 
                                                             hours=random.randint(0, 23)) + timedelta(minutes=random.randint(10, 120)),
                        ip_address=f"192.168.1.{random.randint(1, 254)}",
                        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                        pages_visited=[
                            "/family-portal",
                            "/family-portal/messages",
                            "/family-portal/progress",
                            "/family-portal/homework"
                        ],
                        actions_performed=[
                            "viewed_messages",
                            "read_progress_report",
                            "submitted_feedback"
                        ],
                        session_duration=random.randint(600, 7200)  # 10 minutes to 2 hours
                    )
                    portal_sessions.append(session)
            
            db.session.add_all(portal_sessions)
            db.session.commit()
            print(f"✅ تم إنشاء {len(portal_sessions)} جلسة بوابة")
            
            # Create homework assignments
            homework_assignments = []
            homework_statuses = [HomeworkStatus.PENDING, HomeworkStatus.COMPLETED, HomeworkStatus.OVERDUE]
            
            for i, beneficiary in enumerate(beneficiaries):
                for j in range(5):  # 5 homework per beneficiary
                    due_date = date.today() + timedelta(days=random.randint(-10, 30))
                    status = random.choice(homework_statuses)
                    
                    homework = FamilyHomeworkAssignment(
                        beneficiary_id=beneficiary.id,
                        assigned_by_id=1,  # Admin user
                        title=f"واجب منزلي {j+1} - {beneficiary.first_name}",
                        description=f"تدريب على المهارات الحركية والمعرفية. يرجى ممارسة التمارين المرفقة لمدة 15 دقيقة يومياً.",
                        instructions=[
                            "ممارسة التمارين في مكان هادئ",
                            "التكرار 3 مرات يومياً",
                            "تسجيل الملاحظات",
                            "التواصل مع المعالج عند الحاجة"
                        ],
                        materials_needed=[
                            "كرة صغيرة",
                            "أقلام ملونة",
                            "ورق أبيض",
                            "مكعبات ملونة"
                        ],
                        assigned_date=date.today() - timedelta(days=random.randint(1, 15)),
                        due_date=due_date,
                        status=status,
                        completion_date=due_date - timedelta(days=random.randint(1, 5)) if status == HomeworkStatus.COMPLETED else None,
                        family_feedback="تم إنجاز الواجب بنجاح. الطفل استمتع بالأنشطة." if status == HomeworkStatus.COMPLETED else None,
                        therapist_feedback="أداء ممتاز. يظهر تحسن واضح." if status == HomeworkStatus.COMPLETED else None,
                        estimated_duration=random.randint(15, 45),
                        difficulty_level=random.choice(["easy", "medium", "hard"]),
                        related_skills=[
                            "المهارات الحركية",
                            "التركيز والانتباه",
                            "التنسيق البصري الحركي"
                        ]
                    )
                    homework_assignments.append(homework)
            
            db.session.add_all(homework_assignments)
            db.session.commit()
            print(f"✅ تم إنشاء {len(homework_assignments)} واجب منزلي")
            
            print("\n" + "="*50)
            print("✅ تم إنشاء جميع البيانات التجريبية لبوابة الأسرة بنجاح!")
            print("="*50)
            
            # Print summary
            print("\n📊 ملخص البيانات المُنشأة:")
            print(f"👥 أعضاء الأسرة: {len(family_members)}")
            print(f"📧 الرسائل العائلية: {len(messages)}")
            print(f"💬 ردود الرسائل: {len(replies)}")
            print(f"📈 تقارير التقدم: {len(progress_reports)}")
            print(f"⭐ التقييمات العائلية: {len(feedback_list)}")
            print(f"🔐 جلسات البوابة: {len(portal_sessions)}")
            print(f"📝 الواجبات المنزلية: {len(homework_assignments)}")
            
            print("\n🔑 بيانات تسجيل الدخول:")
            for i, member in enumerate(family_members):
                print(f"👤 {member.first_name} {member.last_name}")
                print(f"   اسم المستخدم: {member.username}")
                print(f"   كلمة المرور: password123")
                print(f"   البريد الإلكتروني: {member.email}")
                print()
            
    except Exception as e:
        print(f"❌ خطأ في إنشاء البيانات التجريبية: {str(e)}")
        db.session.rollback()
        raise

if __name__ == "__main__":
    create_family_portal_sample_data()
