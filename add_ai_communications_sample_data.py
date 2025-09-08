#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
إضافة بيانات تجريبية لنظام الذكاء الاصطناعي للاتصالات
Sample Data for AI Communications System
"""

import sys
import os
from datetime import datetime, timedelta
import random

# إضافة المسار الحالي لـ Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from ai_communications_models import (
    AIKnowledgeBase, AIChatbot, AIConversation, AIMessage,
    AISentimentAnalysis, AIAutoResponse, AIMessageClassification,
    AILearningFeedback, AIAnalyticsReport, AIPredictiveModel,
    AIPerformanceMetrics
)
from models import User

def add_ai_communications_sample_data():
    """إضافة بيانات تجريبية شاملة لنظام الذكاء الاصطناعي للاتصالات"""
    
    print("🤖 بدء إضافة البيانات التجريبية لنظام الذكاء الاصطناعي للاتصالات...")
    
    try:
        with app.app_context():
            # إنشاء جداول قاعدة البيانات
            db.create_all()
            
            # الحصول على مستخدم تجريبي
            admin_user = User.query.filter_by(username='admin').first()
            if not admin_user:
                print("⚠️ لم يتم العثور على مستخدم admin. سيتم إنشاء مستخدم تجريبي.")
                admin_user = User(
                    username='admin',
                    email='admin@awail.com',
                    password_hash='hashed_password',
                    role='admin',
                    is_active=True
                )
                db.session.add(admin_user)
                db.session.commit()
            
            # 1. إضافة قاعدة المعرفة
            print("📚 إضافة قاعدة المعرفة...")
            knowledge_items = [
                {
                    'question': 'ما هي ساعات العمل في مراكز الأوائل؟',
                    'answer': 'ساعات العمل من الأحد إلى الخميس من 7:00 صباحاً حتى 3:00 مساءً',
                    'category': 'معلومات عامة',
                    'keywords': ['ساعات العمل', 'الدوام', 'أوقات العمل'],
                    'confidence': 0.95
                },
                {
                    'question': 'كيف يمكنني تسجيل طفلي في المركز؟',
                    'answer': 'يمكنك تسجيل طفلك من خلال زيارة المركز أو الاتصال على الرقم الموحد أو التسجيل عبر الموقع الإلكتروني',
                    'category': 'التسجيل',
                    'keywords': ['تسجيل', 'طفل', 'التحاق'],
                    'confidence': 0.92
                },
                {
                    'question': 'ما هي الخدمات المتوفرة في المركز؟',
                    'answer': 'نقدم خدمات التأهيل الشامل، العلاج الطبيعي، العلاج الوظيفي، علاج النطق واللغة، والدعم النفسي',
                    'category': 'الخدمات',
                    'keywords': ['خدمات', 'تأهيل', 'علاج'],
                    'confidence': 0.98
                },
                {
                    'question': 'هل يوجد خدمة نقل للأطفال؟',
                    'answer': 'نعم، نوفر خدمة النقل المتخصص للأطفال مع سائقين مدربين ومركبات مجهزة',
                    'category': 'النقل',
                    'keywords': ['نقل', 'باص', 'مواصلات'],
                    'confidence': 0.90
                },
                {
                    'question': 'كيف يمكنني متابعة تقدم طفلي؟',
                    'answer': 'يمكنك متابعة تقدم طفلك من خلال التقارير الدورية والتطبيق الإلكتروني ولقاءات المتابعة مع الفريق',
                    'category': 'المتابعة',
                    'keywords': ['تقدم', 'متابعة', 'تقارير'],
                    'confidence': 0.88
                }
            ]
            
            for item in knowledge_items:
                kb_item = AIKnowledgeBase(
                    question=item['question'],
                    answer=item['answer'],
                    category=item['category'],
                    keywords=item['keywords'],
                    confidence=item['confidence'],
                    created_by=admin_user.id,
                    is_active=True
                )
                db.session.add(kb_item)
            
            # 2. إضافة الشات بوتات
            print("🤖 إضافة الشات بوتات...")
            chatbots = [
                {
                    'name': 'المساعد العام',
                    'description': 'مساعد ذكي للإجابة على الاستفسارات العامة',
                    'personality': 'ودود ومساعد',
                    'language': 'ar',
                    'capabilities': ['الأسئلة العامة', 'معلومات المركز', 'الخدمات']
                },
                {
                    'name': 'مساعد الدعم الفني',
                    'description': 'متخصص في حل المشاكل التقنية',
                    'personality': 'تقني ومحترف',
                    'language': 'ar',
                    'capabilities': ['الدعم التقني', 'حل المشاكل', 'الإرشاد التقني']
                },
                {
                    'name': 'مساعد المواعيد',
                    'description': 'متخصص في إدارة وحجز المواعيد',
                    'personality': 'منظم ودقيق',
                    'language': 'ar',
                    'capabilities': ['حجز المواعيد', 'إلغاء المواعيد', 'تعديل المواعيد']
                }
            ]
            
            chatbot_objects = []
            for bot in chatbots:
                chatbot = AIChatbot(
                    name=bot['name'],
                    description=bot['description'],
                    personality=bot['personality'],
                    language=bot['language'],
                    capabilities=bot['capabilities'],
                    created_by=admin_user.id,
                    is_active=True
                )
                db.session.add(chatbot)
                chatbot_objects.append(chatbot)
            
            db.session.commit()
            
            # 3. إضافة المحادثات والرسائل
            print("💬 إضافة المحادثات والرسائل...")
            conversations = []
            for i in range(10):
                conversation = AIConversation(
                    chatbot_id=random.choice(chatbot_objects).id,
                    user_id=admin_user.id,
                    session_id=f'session_{i+1}',
                    start_time=datetime.now() - timedelta(days=random.randint(1, 30)),
                    status='completed' if i < 8 else 'active'
                )
                db.session.add(conversation)
                conversations.append(conversation)
            
            db.session.commit()
            
            # إضافة الرسائل للمحادثات
            sample_messages = [
                ('user', 'مرحباً، أريد معرفة ساعات العمل'),
                ('bot', 'مرحباً بك! ساعات العمل من الأحد إلى الخميس من 7:00 صباحاً حتى 3:00 مساءً'),
                ('user', 'كيف يمكنني تسجيل طفلي؟'),
                ('bot', 'يمكنك تسجيل طفلك من خلال زيارة المركز أو الاتصال على الرقم الموحد'),
                ('user', 'ما هي الخدمات المتوفرة؟'),
                ('bot', 'نقدم خدمات التأهيل الشامل، العلاج الطبيعي، العلاج الوظيفي، وعلاج النطق'),
                ('user', 'شكراً لك'),
                ('bot', 'العفو! أتمنى أن أكون قد ساعدتك. هل لديك أي استفسارات أخرى؟')
            ]
            
            for conv in conversations[:5]:  # إضافة رسائل لأول 5 محادثات
                for i, (sender, content) in enumerate(sample_messages):
                    message = AIMessage(
                        conversation_id=conv.id,
                        sender=sender,
                        content=content,
                        confidence=random.uniform(0.7, 0.98) if sender == 'bot' else None,
                        response_time=random.uniform(0.5, 3.0) if sender == 'bot' else None,
                        intent=random.choice(['greeting', 'question', 'request', 'thanks']) if sender == 'user' else None,
                        entities=['مركز', 'خدمات'] if 'خدمات' in content else [],
                        timestamp=conv.start_time + timedelta(minutes=i*2)
                    )
                    db.session.add(message)
            
            # 4. إضافة تحليلات المشاعر
            print("😊 إضافة تحليلات المشاعر...")
            sentiment_texts = [
                ('أنا سعيد جداً بالخدمة المقدمة', 'positive', 0.92, ['سعادة', 'رضا']),
                ('الخدمة ممتازة وأنصح بها', 'positive', 0.88, ['إعجاب', 'رضا']),
                ('لست راضياً عن التأخير', 'negative', 0.85, ['غضب', 'استياء']),
                ('الخدمة عادية', 'neutral', 0.75, ['حياد']),
                ('شكراً لكم على الاهتمام', 'positive', 0.90, ['امتنان', 'تقدير'])
            ]
            
            for text, sentiment, confidence, emotions in sentiment_texts:
                analysis = AISentimentAnalysis(
                    text=text,
                    sentiment=sentiment,
                    confidence=confidence,
                    emotions=emotions,
                    keywords=['خدمة', 'مركز'] if 'خدمة' in text else [],
                    analyzed_by=admin_user.id,
                    analysis_date=datetime.now() - timedelta(days=random.randint(1, 10))
                )
                db.session.add(analysis)
            
            # 5. إضافة الردود التلقائية
            print("🔄 إضافة الردود التلقائية...")
            auto_responses = [
                {
                    'trigger_message': 'مرحباً',
                    'response': 'مرحباً بك في مراكز الأوائل! كيف يمكنني مساعدتك اليوم؟',
                    'intent': 'greeting',
                    'confidence': 0.95
                },
                {
                    'trigger_message': 'ساعات العمل',
                    'response': 'ساعات العمل من الأحد إلى الخميس من 7:00 صباحاً حتى 3:00 مساءً',
                    'intent': 'working_hours',
                    'confidence': 0.92
                },
                {
                    'trigger_message': 'شكراً',
                    'response': 'العفو! سعدت بمساعدتك. لا تتردد في التواصل معنا إذا كان لديك أي استفسارات أخرى',
                    'intent': 'thanks',
                    'confidence': 0.88
                }
            ]
            
            for response in auto_responses:
                auto_resp = AIAutoResponse(
                    trigger_message=response['trigger_message'],
                    response=response['response'],
                    intent=response['intent'],
                    confidence=response['confidence'],
                    created_by=admin_user.id,
                    is_active=True
                )
                db.session.add(auto_resp)
            
            # 6. إضافة تصنيفات الرسائل
            print("🏷️ إضافة تصنيفات الرسائل...")
            classifications = [
                ('أريد حجز موعد', 'طلب موعد', 'high', 0.90),
                ('لدي شكوى حول الخدمة', 'شكوى', 'urgent', 0.95),
                ('أريد معلومات عن الرسوم', 'استفسار مالي', 'medium', 0.85),
                ('متى يبدأ العلاج؟', 'استفسار عام', 'medium', 0.80),
                ('طفلي لم يحضر اليوم', 'إشعار غياب', 'low', 0.88)
            ]
            
            for message, category, priority, confidence in classifications:
                classification = AIMessageClassification(
                    message=message,
                    category=category,
                    priority=priority,
                    confidence=confidence,
                    keywords=['موعد'] if 'موعد' in message else ['خدمة'] if 'خدمة' in message else [],
                    entities=['طفل'] if 'طفل' in message else [],
                    classified_by=admin_user.id,
                    classification_date=datetime.now() - timedelta(days=random.randint(1, 7))
                )
                db.session.add(classification)
            
            # 7. إضافة ملاحظات التعلم
            print("📝 إضافة ملاحظات التعلم...")
            feedback_items = [
                ('الرد كان مفيداً جداً', 'positive', 5, 'response_quality'),
                ('الرد لم يجب على سؤالي', 'negative', 2, 'response_relevance'),
                ('وقت الاستجابة سريع', 'positive', 4, 'response_time'),
                ('أحتاج مساعدة بشرية', 'neutral', 3, 'human_handoff'),
                ('الشات بوت ذكي ومفيد', 'positive', 5, 'overall_experience')
            ]
            
            for feedback, sentiment, rating, category in feedback_items:
                learning_feedback = AILearningFeedback(
                    feedback_text=feedback,
                    sentiment=sentiment,
                    rating=rating,
                    feedback_category=category,
                    user_id=admin_user.id,
                    feedback_date=datetime.now() - timedelta(days=random.randint(1, 5))
                )
                db.session.add(learning_feedback)
            
            # 8. إضافة تقارير التحليلات
            print("📊 إضافة تقارير التحليلات...")
            analytics_data = {
                'total_conversations': 150,
                'avg_response_time': 2.3,
                'user_satisfaction': 4.2,
                'top_intents': ['greeting', 'working_hours', 'services'],
                'sentiment_distribution': {'positive': 60, 'neutral': 25, 'negative': 15}
            }
            
            analytics_report = AIAnalyticsReport(
                report_type='daily_summary',
                report_data=analytics_data,
                insights=['معدل الرضا مرتفع', 'أكثر الاستفسارات حول ساعات العمل', 'نحتاج تحسين الردود السلبية'],
                recommendations=['إضافة المزيد من المعلومات حول الخدمات', 'تدريب الشات بوت على حالات الشكاوى'],
                generated_by=admin_user.id,
                report_date=datetime.now() - timedelta(days=1)
            )
            db.session.add(analytics_report)
            
            # 9. إضافة النماذج التنبؤية
            print("🔮 إضافة النماذج التنبؤية...")
            predictive_model = AIPredictiveModel(
                model_name='customer_satisfaction_predictor',
                model_type='classification',
                model_version='1.0',
                accuracy=0.85,
                features=['response_time', 'message_length', 'intent_confidence'],
                training_data_size=1000,
                model_parameters={'algorithm': 'random_forest', 'n_estimators': 100},
                created_by=admin_user.id,
                is_active=True
            )
            db.session.add(predictive_model)
            
            # 10. إضافة مقاييس الأداء
            print("📈 إضافة مقاييس الأداء...")
            performance_metrics = AIPerformanceMetrics(
                metric_date=datetime.now().date(),
                total_conversations=150,
                successful_responses=142,
                avg_response_time=2.3,
                avg_confidence_score=0.87,
                user_satisfaction_score=4.2,
                human_intervention_rate=0.08,
                top_intents=['greeting', 'working_hours', 'services'],
                error_rate=0.05,
                uptime_percentage=99.5
            )
            db.session.add(performance_metrics)
            
            # حفظ جميع البيانات
            db.session.commit()
            
            print("✅ تم إضافة جميع البيانات التجريبية بنجاح!")
            print(f"📚 قاعدة المعرفة: {len(knowledge_items)} عنصر")
            print(f"🤖 الشات بوتات: {len(chatbots)} بوت")
            print(f"💬 المحادثات: {len(conversations)} محادثة")
            print(f"😊 تحليلات المشاعر: {len(sentiment_texts)} تحليل")
            print(f"🔄 الردود التلقائية: {len(auto_responses)} رد")
            print(f"🏷️ تصنيفات الرسائل: {len(classifications)} تصنيف")
            print(f"📝 ملاحظات التعلم: {len(feedback_items)} ملاحظة")
            print(f"📊 تقارير التحليلات: 1 تقرير")
            print(f"🔮 النماذج التنبؤية: 1 نموذج")
            print(f"📈 مقاييس الأداء: 1 مقياس")
            
    except Exception as e:
        print(f"❌ خطأ في إضافة البيانات التجريبية: {e}")
        db.session.rollback()
        raise

if __name__ == '__main__':
    add_ai_communications_sample_data()
