#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
إضافة بيانات تجريبية لنظام الدردشة المباشرة
Sample Data for Real-time Chat System
"""

import sys
import os
from datetime import datetime, timedelta
import random

# إضافة مسار المشروع
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from models import User
from chat_models import (
    ChatRoom, ChatParticipant, ChatMessage, ChatReadReceipt,
    ChatNotification, ChatSession, ChatFile
)

def add_chat_sample_data():
    """إضافة بيانات تجريبية شاملة لنظام الدردشة"""
    
    with app.app_context():
        try:
            print("🚀 بدء إضافة البيانات التجريبية لنظام الدردشة...")
            
            # الحصول على المستخدمين الموجودين
            users = User.query.limit(10).all()
            if len(users) < 3:
                print("⚠️ يجب وجود 3 مستخدمين على الأقل في النظام")
                return False
            
            # 1. إنشاء غرف الدردشة
            chat_rooms = []
            
            # غرفة عامة للفريق
            team_room = ChatRoom(
                name="فريق مراكز الأوائل",
                description="غرفة عامة لجميع أعضاء الفريق",
                room_type="group",
                created_by=users[0].id,
                max_participants=50,
                allow_file_sharing=True,
                is_encrypted=True
            )
            db.session.add(team_room)
            chat_rooms.append(team_room)
            
            # غرفة الدعم الفني
            support_room = ChatRoom(
                name="الدعم الفني",
                description="غرفة للدعم الفني وحل المشاكل",
                room_type="support",
                created_by=users[1].id,
                max_participants=20,
                allow_file_sharing=True,
                is_encrypted=True
            )
            db.session.add(support_room)
            chat_rooms.append(support_room)
            
            # غرفة خاصة
            private_room = ChatRoom(
                name="مناقشة المشروع الجديد",
                description="مناقشة خاصة حول المشروع الجديد",
                room_type="private",
                created_by=users[0].id,
                max_participants=5,
                allow_file_sharing=True,
                is_encrypted=True
            )
            db.session.add(private_room)
            chat_rooms.append(private_room)
            
            # غرفة الإعلانات
            announcement_room = ChatRoom(
                name="الإعلانات الرسمية",
                description="غرفة للإعلانات والأخبار المهمة",
                room_type="announcement",
                created_by=users[1].id,
                max_participants=100,
                allow_file_sharing=False,
                is_encrypted=False
            )
            db.session.add(announcement_room)
            chat_rooms.append(announcement_room)
            
            # غرفة التدريب
            training_room = ChatRoom(
                name="التدريب والتطوير",
                description="غرفة لمناقشة برامج التدريب والتطوير",
                room_type="group",
                created_by=users[2].id,
                max_participants=30,
                allow_file_sharing=True,
                is_encrypted=False
            )
            db.session.add(training_room)
            chat_rooms.append(training_room)
            
            db.session.commit()
            print(f"✅ تم إنشاء {len(chat_rooms)} غرف دردشة")
            
            # 2. إضافة المشاركين للغرف
            participants = []
            
            # إضافة مشاركين لغرفة الفريق
            for i, user in enumerate(users[:6]):
                participant = ChatParticipant(
                    room_id=team_room.id,
                    user_id=user.id,
                    role="admin" if i == 0 else "member",
                    joined_at=datetime.utcnow() - timedelta(days=random.randint(1, 30))
                )
                db.session.add(participant)
                participants.append(participant)
            
            # إضافة مشاركين لغرفة الدعم
            for i, user in enumerate(users[:4]):
                participant = ChatParticipant(
                    room_id=support_room.id,
                    user_id=user.id,
                    role="admin" if i < 2 else "member",
                    joined_at=datetime.utcnow() - timedelta(days=random.randint(1, 15))
                )
                db.session.add(participant)
                participants.append(participant)
            
            # إضافة مشاركين للغرفة الخاصة
            for i, user in enumerate(users[:3]):
                participant = ChatParticipant(
                    room_id=private_room.id,
                    user_id=user.id,
                    role="admin" if i == 0 else "member",
                    joined_at=datetime.utcnow() - timedelta(days=random.randint(1, 7))
                )
                db.session.add(participant)
                participants.append(participant)
            
            # إضافة مشاركين لغرفة الإعلانات
            for user in users:
                participant = ChatParticipant(
                    room_id=announcement_room.id,
                    user_id=user.id,
                    role="member",
                    joined_at=datetime.utcnow() - timedelta(days=random.randint(1, 60))
                )
                db.session.add(participant)
                participants.append(participant)
            
            # إضافة مشاركين لغرفة التدريب
            for user in users[:5]:
                participant = ChatParticipant(
                    room_id=training_room.id,
                    user_id=user.id,
                    role="admin" if user.id == users[2].id else "member",
                    joined_at=datetime.utcnow() - timedelta(days=random.randint(1, 20))
                )
                db.session.add(participant)
                participants.append(participant)
            
            db.session.commit()
            print(f"✅ تم إضافة {len(participants)} مشارك للغرف")
            
            # 3. إضافة الرسائل
            messages = []
            
            # رسائل غرفة الفريق
            team_messages = [
                "مرحباً بالجميع في غرفة فريق مراكز الأوائل! 👋",
                "هل يمكننا مناقشة خطة العمل للأسبوع القادم؟",
                "تم الانتهاء من تطوير النظام الجديد بنجاح 🎉",
                "يرجى مراجعة التقرير المرفق والتعليق عليه",
                "اجتماع الفريق غداً الساعة 10 صباحاً",
                "شكراً لكم على الجهود المبذولة هذا الأسبوع",
                "هل هناك أي تحديثات على المشروع؟",
                "تم رفع النسخة الجديدة من التطبيق",
                "يرجى التأكد من اختبار الميزات الجديدة",
                "عمل رائع من الجميع! 👏"
            ]
            
            for i, content in enumerate(team_messages):
                message = ChatMessage(
                    room_id=team_room.id,
                    sender_id=users[i % len(users[:6])].id,
                    content=content,
                    message_type="text",
                    created_at=datetime.utcnow() - timedelta(hours=random.randint(1, 72))
                )
                db.session.add(message)
                messages.append(message)
            
            # رسائل غرفة الدعم
            support_messages = [
                "مرحباً، كيف يمكنني مساعدتك اليوم؟",
                "أواجه مشكلة في تسجيل الدخول للنظام",
                "يمكنك إعادة تعيين كلمة المرور من صفحة تسجيل الدخول",
                "شكراً، تم حل المشكلة بنجاح",
                "هل يمكن إضافة ميزة جديدة للنظام؟",
                "سنقوم بدراسة الطلب وإضافته للخطة القادمة",
                "متى سيتم تحديث النظام؟",
                "التحديث مجدول للأسبوع القادم",
                "هل هناك دليل استخدام للميزات الجديدة؟",
                "نعم، يمكنك العثور عليه في قسم المساعدة"
            ]
            
            for i, content in enumerate(support_messages):
                message = ChatMessage(
                    room_id=support_room.id,
                    sender_id=users[i % len(users[:4])].id,
                    content=content,
                    message_type="text",
                    created_at=datetime.utcnow() - timedelta(hours=random.randint(1, 48))
                )
                db.session.add(message)
                messages.append(message)
            
            # رسائل الغرفة الخاصة
            private_messages = [
                "بدأنا العمل على المشروع الجديد",
                "ما هي المتطلبات الأساسية؟",
                "سأرسل لك الوثائق المطلوبة",
                "متى الموعد النهائي للتسليم؟",
                "لدينا شهرين لإكمال المشروع",
                "ممتاز، سنبدأ فوراً",
                "هل تحتاج أي موارد إضافية؟",
                "نعم، نحتاج مطور إضافي للفريق"
            ]
            
            for i, content in enumerate(private_messages):
                message = ChatMessage(
                    room_id=private_room.id,
                    sender_id=users[i % 3].id,
                    content=content,
                    message_type="text",
                    created_at=datetime.utcnow() - timedelta(hours=random.randint(1, 24))
                )
                db.session.add(message)
                messages.append(message)
            
            # رسائل غرفة الإعلانات
            announcement_messages = [
                "🔔 إعلان مهم: سيتم صيانة النظام يوم الجمعة",
                "📢 تم إطلاق الميزات الجديدة في النظام",
                "🎉 تهانينا لفريق التطوير على الإنجاز الرائع",
                "📅 اجتماع عام يوم الأحد الساعة 2 ظهراً",
                "🔧 تم إصلاح جميع المشاكل المبلغ عنها"
            ]
            
            for i, content in enumerate(announcement_messages):
                message = ChatMessage(
                    room_id=announcement_room.id,
                    sender_id=users[1].id,  # المدير يرسل الإعلانات
                    content=content,
                    message_type="text",
                    created_at=datetime.utcnow() - timedelta(days=random.randint(1, 7))
                )
                db.session.add(message)
                messages.append(message)
            
            # رسائل غرفة التدريب
            training_messages = [
                "مرحباً بكم في برنامج التدريب الجديد",
                "ما هي المواضيع التي سنغطيها؟",
                "سنركز على تطوير المهارات التقنية",
                "متى ستبدأ الجلسات؟",
                "الأسبوع القادم، سأرسل الجدول قريباً",
                "هل هناك مواد تدريبية مسبقة؟",
                "نعم، ستجدونها في المكتبة الرقمية"
            ]
            
            for i, content in enumerate(training_messages):
                message = ChatMessage(
                    room_id=training_room.id,
                    sender_id=users[i % 5].id,
                    content=content,
                    message_type="text",
                    created_at=datetime.utcnow() - timedelta(hours=random.randint(1, 36))
                )
                db.session.add(message)
                messages.append(message)
            
            db.session.commit()
            print(f"✅ تم إضافة {len(messages)} رسالة")
            
            # 4. إضافة ملفات مشاركة
            files = []
            
            # ملف في غرفة الفريق
            team_file = ChatFile(
                room_id=team_room.id,
                uploader_id=users[0].id,
                file_name="تقرير_الأداء_الشهري.pdf",
                file_path="/uploads/chat/team_performance_report.pdf",
                file_type="application/pdf",
                file_size=2048576,  # 2MB
                upload_date=datetime.utcnow() - timedelta(days=2)
            )
            db.session.add(team_file)
            files.append(team_file)
            
            # ملف في غرفة الدعم
            support_file = ChatFile(
                room_id=support_room.id,
                uploader_id=users[1].id,
                file_name="دليل_الاستخدام.docx",
                file_path="/uploads/chat/user_manual.docx",
                file_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                file_size=1024000,  # 1MB
                upload_date=datetime.utcnow() - timedelta(days=1)
            )
            db.session.add(support_file)
            files.append(support_file)
            
            # صورة في الغرفة الخاصة
            private_file = ChatFile(
                room_id=private_room.id,
                uploader_id=users[2].id,
                file_name="مخطط_المشروع.png",
                file_path="/uploads/chat/project_diagram.png",
                file_type="image/png",
                file_size=512000,  # 512KB
                upload_date=datetime.utcnow() - timedelta(hours=6)
            )
            db.session.add(private_file)
            files.append(private_file)
            
            db.session.commit()
            print(f"✅ تم إضافة {len(files)} ملف مشارك")
            
            # 5. إضافة إشعارات الدردشة
            notifications = []
            
            for i, user in enumerate(users[:5]):
                # إشعار رسالة جديدة
                notification = ChatNotification(
                    user_id=user.id,
                    room_id=team_room.id,
                    notification_type="new_message",
                    title="رسالة جديدة",
                    message=f"رسالة جديدة في غرفة {team_room.name}",
                    is_read=random.choice([True, False]),
                    created_at=datetime.utcnow() - timedelta(hours=random.randint(1, 12))
                )
                db.session.add(notification)
                notifications.append(notification)
                
                # إشعار انضمام مستخدم
                if i < 3:
                    notification = ChatNotification(
                        user_id=user.id,
                        room_id=support_room.id,
                        notification_type="user_joined",
                        title="عضو جديد",
                        message=f"انضم عضو جديد إلى غرفة {support_room.name}",
                        is_read=True,
                        created_at=datetime.utcnow() - timedelta(days=random.randint(1, 5))
                    )
                    db.session.add(notification)
                    notifications.append(notification)
            
            db.session.commit()
            print(f"✅ تم إضافة {len(notifications)} إشعار")
            
            # 6. إضافة جلسات الدردشة
            sessions = []
            
            for user in users[:6]:
                session = ChatSession(
                    user_id=user.id,
                    room_id=team_room.id,
                    session_start=datetime.utcnow() - timedelta(hours=random.randint(1, 8)),
                    session_end=datetime.utcnow() - timedelta(minutes=random.randint(10, 120)),
                    is_active=random.choice([True, False])
                )
                db.session.add(session)
                sessions.append(session)
            
            db.session.commit()
            print(f"✅ تم إضافة {len(sessions)} جلسة دردشة")
            
            # 7. إضافة إيصالات القراءة
            read_receipts = []
            
            # إضافة إيصالات قراءة لبعض الرسائل
            for message in messages[:20]:  # أول 20 رسالة
                for participant in participants:
                    if (participant.room_id == message.room_id and 
                        participant.user_id != message.sender_id and 
                        random.choice([True, False])):  # 50% احتمال القراءة
                        
                        receipt = ChatReadReceipt(
                            message_id=message.id,
                            user_id=participant.user_id,
                            read_at=message.created_at + timedelta(minutes=random.randint(1, 60))
                        )
                        db.session.add(receipt)
                        read_receipts.append(receipt)
            
            db.session.commit()
            print(f"✅ تم إضافة {len(read_receipts)} إيصال قراءة")
            
            # طباعة ملخص البيانات المضافة
            print("\n" + "="*60)
            print("📊 ملخص البيانات التجريبية المضافة:")
            print("="*60)
            print(f"🏠 غرف الدردشة: {len(chat_rooms)}")
            print(f"👥 المشاركون: {len(participants)}")
            print(f"💬 الرسائل: {len(messages)}")
            print(f"📎 الملفات المشاركة: {len(files)}")
            print(f"🔔 الإشعارات: {len(notifications)}")
            print(f"🔗 الجلسات: {len(sessions)}")
            print(f"✅ إيصالات القراءة: {len(read_receipts)}")
            print("="*60)
            
            print("🎉 تم إضافة جميع البيانات التجريبية بنجاح!")
            return True
            
        except Exception as e:
            print(f"❌ خطأ في إضافة البيانات التجريبية: {str(e)}")
            db.session.rollback()
            return False

def main():
    """تشغيل إضافة البيانات التجريبية"""
    success = add_chat_sample_data()
    if success:
        print("\n✅ تم إكمال إضافة البيانات التجريبية لنظام الدردشة بنجاح!")
        print("🚀 يمكنك الآن استخدام النظام مع البيانات التجريبية")
    else:
        print("\n❌ فشل في إضافة البيانات التجريبية")
        print("🔧 يرجى مراجعة الأخطاء وإعادة المحاولة")

if __name__ == "__main__":
    main()
