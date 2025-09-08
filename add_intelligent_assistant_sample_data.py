# -*- coding: utf-8 -*-
"""
إضافة بيانات تجريبية للمساعد الذكي المتقدم
نظام ERP مراكز الأوائل للتأهيل الشامل لذوي الاحتياجات الخاصة
"""

from database import db
from intelligent_assistant_models import (
    AIKnowledgeBase, AIIntentPattern, AIUserPreference, 
    AIAnalytics, AIAssistantConversation, AIAssistantMessage
)
from datetime import datetime, date, timedelta
import json

def add_intelligent_assistant_sample_data():
    """إضافة بيانات تجريبية شاملة للمساعد الذكي"""
    
    print("إضافة بيانات تجريبية للمساعد الذكي...")
    
    # 1. إضافة قاعدة المعرفة
    knowledge_entries = [
        {
            'category': 'medical',
            'subcategory': 'تأهيل حركي',
            'title': 'العلاج الطبيعي للأطفال ذوي الإعاقة الحركية',
            'content': 'العلاج الطبيعي يساعد الأطفال ذوي الإعاقة الحركية على تحسين قدراتهم الحركية وتطوير عضلاتهم. يشمل العلاج تمارين التقوية والمرونة والتوازن.',
            'keywords': ['علاج طبيعي', 'إعاقة حركية', 'تمارين', 'تأهيل'],
            'source_reference': 'دليل العلاج الطبيعي - مراكز الأوائل'
        },
        {
            'category': 'educational',
            'subcategory': 'تعليم خاص',
            'title': 'استراتيجيات التعليم للأطفال ذوي صعوبات التعلم',
            'content': 'يحتاج الأطفال ذوو صعوبات التعلم إلى استراتيجيات تعليمية مخصصة تشمل التعلم البصري والسمعي والحركي لتحقيق أفضل النتائج.',
            'keywords': ['صعوبات تعلم', 'استراتيجيات تعليم', 'تعليم خاص'],
            'source_reference': 'منهج التعليم الخاص - وزارة التعليم'
        },
        {
            'category': 'behavioral',
            'subcategory': 'تعديل سلوك',
            'title': 'تقنيات تعديل السلوك للأطفال ذوي التوحد',
            'content': 'تعديل السلوك يستخدم مبادئ التعلم لتحسين السلوكيات المرغوبة وتقليل السلوكيات غير المرغوبة. يشمل التعزيز الإيجابي والتشكيل.',
            'keywords': ['تعديل سلوك', 'توحد', 'تعزيز إيجابي', 'تشكيل'],
            'source_reference': 'دليل تعديل السلوك - الجمعية السعودية للتوحد'
        },
        {
            'category': 'medical',
            'subcategory': 'نطق وتخاطب',
            'title': 'علاج اضطرابات النطق واللغة',
            'content': 'علاج النطق يساعد الأطفال على تطوير مهارات التواصل اللفظي وغير اللفظي. يشمل تمارين النطق وتطوير المفردات.',
            'keywords': ['نطق', 'تخاطب', 'اضطرابات لغة', 'تواصل'],
            'source_reference': 'دليل علاج النطق - مراكز الأوائل'
        },
        {
            'category': 'administrative',
            'subcategory': 'إجراءات',
            'title': 'إجراءات التسجيل في المركز',
            'content': 'للتسجيل في المركز، يجب إحضار التقارير الطبية وشهادة الميلاد وصور شخصية. يتم تقييم الحالة أولاً قبل وضع الخطة العلاجية.',
            'keywords': ['تسجيل', 'إجراءات', 'تقارير طبية', 'تقييم'],
            'source_reference': 'دليل الإجراءات - مراكز الأوائل'
        },
        {
            'category': 'medical',
            'subcategory': 'تقييم',
            'title': 'أدوات التقييم المستخدمة في المركز',
            'content': 'يستخدم المركز مجموعة من أدوات التقييم المعيارية مثل مقياس فاينلاند ومقياس بيلي لتقييم مختلف جوانب النمو.',
            'keywords': ['تقييم', 'مقاييس', 'فاينلاند', 'بيلي', 'نمو'],
            'source_reference': 'دليل التقييم - قسم التقييم النفسي'
        },
        {
            'category': 'educational',
            'subcategory': 'مناهج',
            'title': 'المناهج التعليمية المطبقة',
            'content': 'يطبق المركز مناهج تعليمية متخصصة تشمل منهج تيتش للتوحد ومنهج مونتيسوري المعدل للأطفال ذوي الاحتياجات الخاصة.',
            'keywords': ['مناهج', 'تيتش', 'مونتيسوري', 'تعليم خاص'],
            'source_reference': 'دليل المناهج - قسم التعليم'
        },
        {
            'category': 'behavioral',
            'subcategory': 'مهارات اجتماعية',
            'title': 'تنمية المهارات الاجتماعية',
            'content': 'تنمية المهارات الاجتماعية تشمل تعليم الأطفال كيفية التفاعل مع الآخرين والتعبير عن المشاعر بطريقة مناسبة.',
            'keywords': ['مهارات اجتماعية', 'تفاعل', 'مشاعر', 'تواصل اجتماعي'],
            'source_reference': 'برنامج المهارات الاجتماعية - مراكز الأوائل'
        }
    ]
    
    for entry_data in knowledge_entries:
        knowledge = AIKnowledgeBase(
            category=entry_data['category'],
            subcategory=entry_data['subcategory'],
            title=entry_data['title'],
            content=entry_data['content'],
            keywords=json.dumps(entry_data['keywords']),
            language='ar',
            source_type='manual',
            source_reference=entry_data['source_reference'],
            accuracy_score=0.95,
            usage_count=0,
            is_active=True,
            created_by=1
        )
        db.session.add(knowledge)
    
    # 2. إضافة أنماط النوايا
    intent_patterns = [
        {
            'intent_name': 'greeting',
            'pattern_text': 'مرحبا,أهلا,السلام عليكم,صباح الخير,مساء الخير',
            'pattern_type': 'keyword',
            'confidence_threshold': 0.8,
            'response_template': 'مرحباً بك! كيف يمكنني مساعدتك اليوم؟',
            'action_type': 'response',
            'priority': 5
        },
        {
            'intent_name': 'program_inquiry',
            'pattern_text': 'برنامج,برامج,علاج,تأهيل,خدمات,ما هي البرامج',
            'pattern_type': 'keyword',
            'confidence_threshold': 0.7,
            'response_template': 'يمكنني مساعدتك في معرفة البرامج المتاحة',
            'action_type': 'query_db',
            'action_parameters': json.dumps({'table': 'rehabilitation_programs'}),
            'priority': 4
        },
        {
            'intent_name': 'progress_inquiry',
            'pattern_text': 'تقدم,تطور,نتائج,تحسن,كيف حال',
            'pattern_type': 'keyword',
            'confidence_threshold': 0.7,
            'response_template': 'سأساعدك في معرفة تقدم الطالب',
            'action_type': 'query_db',
            'action_parameters': json.dumps({'table': 'assessments'}),
            'priority': 4
        },
        {
            'intent_name': 'appointment_inquiry',
            'pattern_text': 'موعد,مواعيد,جلسة,جلسات,متى الموعد',
            'pattern_type': 'keyword',
            'confidence_threshold': 0.8,
            'response_template': 'سأعرض لك المواعيد القادمة',
            'action_type': 'query_db',
            'action_parameters': json.dumps({'table': 'appointments'}),
            'priority': 4
        },
        {
            'intent_name': 'general_info',
            'pattern_text': 'معلومات,ما هو,كيف,لماذا,أين,متى',
            'pattern_type': 'keyword',
            'confidence_threshold': 0.5,
            'response_template': 'سأبحث عن المعلومات المطلوبة',
            'action_type': 'search_knowledge',
            'priority': 2
        },
        {
            'intent_name': 'contact_info',
            'pattern_text': 'اتصال,هاتف,عنوان,موقع,كيف أتواصل',
            'pattern_type': 'keyword',
            'confidence_threshold': 0.8,
            'response_template': 'معلومات التواصل مع المركز',
            'action_type': 'response',
            'priority': 3
        },
        {
            'intent_name': 'complaint',
            'pattern_text': 'شكوى,مشكلة,غير راضي,سيء,لا يعجبني',
            'pattern_type': 'keyword',
            'confidence_threshold': 0.7,
            'response_template': 'أعتذر عن أي إزعاج، سأوجهك للشخص المناسب',
            'action_type': 'escalate',
            'priority': 5
        },
        {
            'intent_name': 'thanks',
            'pattern_text': 'شكرا,شكراً,ممتاز,رائع,مفيد',
            'pattern_type': 'keyword',
            'confidence_threshold': 0.8,
            'response_template': 'العفو! سعيد لمساعدتك',
            'action_type': 'response',
            'priority': 3
        }
    ]
    
    for pattern_data in intent_patterns:
        pattern = AIIntentPattern(
            intent_name=pattern_data['intent_name'],
            pattern_text=pattern_data['pattern_text'],
            pattern_type=pattern_data['pattern_type'],
            language='ar',
            confidence_threshold=pattern_data['confidence_threshold'],
            response_template=pattern_data['response_template'],
            action_type=pattern_data['action_type'],
            action_parameters=pattern_data.get('action_parameters'),
            priority=pattern_data['priority'],
            is_active=True,
            success_count=0,
            failure_count=0
        )
        db.session.add(pattern)
    
    # 3. إضافة تفضيلات المستخدمين
    user_preferences = [
        {
            'user_id': 1,
            'preferred_language': 'ar',
            'communication_style': 'formal',
            'response_length': 'medium',
            'topics_of_interest': ['medical', 'educational'],
            'notification_preferences': {'email': True, 'sms': False},
            'accessibility_settings': {'font_size': 'medium', 'high_contrast': False},
            'privacy_level': 'standard',
            'learning_mode': True
        },
        {
            'user_id': 2,
            'preferred_language': 'ar',
            'communication_style': 'casual',
            'response_length': 'short',
            'topics_of_interest': ['behavioral', 'administrative'],
            'notification_preferences': {'email': True, 'sms': True},
            'accessibility_settings': {'font_size': 'large', 'high_contrast': True},
            'privacy_level': 'full',
            'learning_mode': False
        }
    ]
    
    for pref_data in user_preferences:
        preference = AIUserPreference(
            user_id=pref_data['user_id'],
            preferred_language=pref_data['preferred_language'],
            communication_style=pref_data['communication_style'],
            response_length=pref_data['response_length'],
            topics_of_interest=json.dumps(pref_data['topics_of_interest']),
            notification_preferences=json.dumps(pref_data['notification_preferences']),
            accessibility_settings=json.dumps(pref_data['accessibility_settings']),
            privacy_level=pref_data['privacy_level'],
            learning_mode=pref_data['learning_mode']
        )
        db.session.add(preference)
    
    # 4. إضافة بيانات تحليلية
    # إنشاء بيانات للأيام الـ 30 الماضية
    end_date = date.today()
    start_date = end_date - timedelta(days=30)
    
    current_date = start_date
    while current_date <= end_date:
        # رسائل يومية
        daily_messages = AIAnalytics(
            date=current_date,
            metric_type='messages',
            metric_value=15 + (current_date.weekday() * 3),  # أكثر في أيام العمل
            category='daily',
            user_type='all'
        )
        db.session.add(daily_messages)
        
        # محادثات يومية
        daily_conversations = AIAnalytics(
            date=current_date,
            metric_type='conversations',
            metric_value=5 + (current_date.weekday() * 1),
            category='daily',
            user_type='all'
        )
        db.session.add(daily_conversations)
        
        current_date += timedelta(days=1)
    
    # إحصائيات النوايا
    intent_stats = [
        ('greeting', 45), ('program_inquiry', 32), ('progress_inquiry', 28),
        ('appointment_inquiry', 25), ('general_info', 38), ('contact_info', 15),
        ('complaint', 8), ('thanks', 22)
    ]
    
    for intent, count in intent_stats:
        analytic = AIAnalytics(
            date=date.today(),
            metric_type='intents',
            metric_value=count,
            category=intent,
            user_type='all'
        )
        db.session.add(analytic)
    
    # 5. إضافة محادثات تجريبية
    sample_conversations = [
        {
            'user_id': 1,
            'conversation_type': 'general',
            'satisfaction_rating': 5,
            'messages': [
                ('user', 'مرحباً، أريد معلومات عن البرامج المتاحة'),
                ('assistant', 'مرحباً بك! يسعدني مساعدتك. لدينا عدة برامج متخصصة...', 'program_inquiry', 0.85),
                ('user', 'شكراً لك، هذا مفيد جداً'),
                ('assistant', 'العفو! هل تحتاج معلومات إضافية؟', 'thanks', 0.92)
            ]
        },
        {
            'user_id': 2,
            'conversation_type': 'medical',
            'satisfaction_rating': 4,
            'messages': [
                ('user', 'كيف يمكنني معرفة تقدم طفلي؟'),
                ('assistant', 'يمكنك متابعة تقدم طفلك من خلال التقييمات الدورية...', 'progress_inquiry', 0.78),
                ('user', 'متى الموعد القادم؟'),
                ('assistant', 'الموعد القادم مجدول يوم الأحد الساعة 10 صباحاً', 'appointment_inquiry', 0.88)
            ]
        }
    ]
    
    for conv_data in sample_conversations:
        conversation = AIAssistantConversation(
            user_id=conv_data['user_id'],
            session_id=f"session_{conv_data['user_id']}_{datetime.now().timestamp()}",
            conversation_type=conv_data['conversation_type'],
            context_data=json.dumps({'sample': True}),
            language='ar',
            is_active=False,
            satisfaction_rating=conv_data['satisfaction_rating']
        )
        db.session.add(conversation)
        db.session.flush()  # للحصول على ID
        
        for msg_data in conv_data['messages']:
            message = AIAssistantMessage(
                conversation_id=conversation.id,
                message_type=msg_data[0],
                content=msg_data[1],
                intent=msg_data[2] if len(msg_data) > 2 else None,
                confidence_score=msg_data[3] if len(msg_data) > 3 else None,
                response_time=0.5 if msg_data[0] == 'assistant' else None,
                is_helpful=True if msg_data[0] == 'assistant' else None
            )
            db.session.add(message)
    
    # حفظ جميع البيانات
    try:
        db.session.commit()
        print("✅ تم إضافة بيانات المساعد الذكي بنجاح!")
        print(f"   - {len(knowledge_entries)} إدخال في قاعدة المعرفة")
        print(f"   - {len(intent_patterns)} نمط نية")
        print(f"   - {len(user_preferences)} تفضيلات مستخدم")
        print(f"   - 30 يوم من البيانات التحليلية")
        print(f"   - {len(sample_conversations)} محادثة تجريبية")
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ خطأ في إضافة البيانات: {str(e)}")
        raise e

if __name__ == '__main__':
    add_intelligent_assistant_sample_data()
