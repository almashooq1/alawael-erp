#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
ADVANCED CHATBOT TESTS
اختبارات شاملة للـ Chatbot الذكي
"""

import unittest
import json
from datetime import datetime, timedelta
import sys
import os

# إضافة المسار للموارد
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../alawael-erp')))

try:
    from advanced_intelligent_assistant import (
        NLPProcessor,
        IntentClassifier,
        ConversationContextManager,
        KnowledgeBaseManager,
        AdvancedIntelligentAssistantService,
        CacheManager,
        ErrorHandler,
        MonitoringService
    )
except ImportError as e:
    print(f"Error importing: {e}")


class TestNLPProcessor(unittest.TestCase):
    """اختبارات معالج اللغة الطبيعية"""

    def setUp(self):
        self.nlp = NLPProcessor()

    def test_language_detection_arabic(self):
        """اختبار كشف اللغة العربية"""
        text = "السلام عليكم ورحمة الله"
        lang = self.nlp.detect_language(text)
        self.assertEqual(lang, 'ar')

    def test_language_detection_english(self):
        """اختبار كشف اللغة الإنجليزية"""
        text = "Hello world"
        lang = self.nlp.detect_language(text)
        self.assertEqual(lang, 'en')

    def test_tokenization(self):
        """اختبار تقسيم النص"""
        text = "هذا نص تجريبي"
        tokens = self.nlp.tokenize(text)
        self.assertIsInstance(tokens, list)
        self.assertGreater(len(tokens), 0)

    def test_entity_extraction(self):
        """اختبار استخراج الكيانات"""
        text = "البريد الإلكتروني: test@example.com والهاتف: 0501234567"
        entities = self.nlp.extract_entities(text)
        self.assertIn('email', entities)
        self.assertIn('phone', entities)

    def test_sentiment_detection(self):
        """اختبار كشف المشاعر"""
        text = "هذا رائع جداً وممتاز"
        sentiment = self.nlp.detect_sentiment(text)
        self.assertIn('dominant_emotion', sentiment)
        self.assertGreater(sentiment['sentiment_score'], 0)

    def test_similarity_calculation(self):
        """اختبار حساب التشابه"""
        text1 = "ما هو الراتب"
        text2 = "كم الراتب"
        similarity = self.nlp.calculate_similarity(text1, text2)
        self.assertGreaterEqual(similarity, 0)
        self.assertLessEqual(similarity, 1)
        self.assertGreater(similarity, 0.5)  # يجب أن يكون متشابهاً

    def test_levenshtein_distance(self):
        """اختبار مسافة Levenshtein"""
        text1 = "salary"
        text2 = "sallary"
        distance = self.nlp.calculate_levenshtein_distance(text1, text2)
        self.assertGreater(distance, 0.5)  # يجب أن يكونا متشابهين


class TestIntentClassifier(unittest.TestCase):
    """اختبارات مصنف النوايا"""

    def setUp(self):
        self.classifier = IntentClassifier()

    def test_salary_intent_classification(self):
        """اختبار تصنيف نية الراتب"""
        text = "ما هو راتبي"
        intent, confidence, nlp_result = self.classifier.classify(text)
        self.assertIn('salary', intent)
        self.assertGreater(confidence, 0.5)

    def test_leave_intent_classification(self):
        """اختبار تصنيف نية الإجازة"""
        text = "أريد أن أطلب إجازة"
        intent, confidence, nlp_result = self.classifier.classify(text)
        self.assertIn('leave', intent)
        self.assertGreater(confidence, 0.5)

    def test_confidence_scores(self):
        """اختبار درجات الثقة"""
        text = "معلومات عامة"
        intent, confidence, nlp_result = self.classifier.classify(text)
        self.assertGreaterEqual(confidence, 0)
        self.assertLessEqual(confidence, 1)

    def test_slot_extraction(self):
        """اختبار استخراج الفتحات"""
        text = "أريد إجازة من 2025-02-20 إلى 2025-02-25"
        intent, confidence, nlp_result = self.classifier.classify(text)
        self.assertIn('slots', nlp_result)


class TestConversationContextManager(unittest.TestCase):
    """اختبارات مدير السياق"""

    def setUp(self):
        self.context_manager = ConversationContextManager()
        self.user_id = "user_123"
        self.session_id = "session_123"

    def test_context_creation(self):
        """اختبار إنشاء السياق"""
        context = self.context_manager.create_context(self.user_id, self.session_id)
        self.assertEqual(context['user_id'], self.user_id)
        self.assertEqual(context['session_id'], self.session_id)

    def test_context_update(self):
        """اختبار تحديث السياق"""
        self.context_manager.create_context(self.user_id, self.session_id)
        updated = self.context_manager.update_context(
            self.session_id,
            message_count=5
        )
        self.assertEqual(updated['message_count'], 5)

    def test_short_term_memory(self):
        """اختبار الذاكرة قصيرة الأجل"""
        self.context_manager.create_context(self.user_id, self.session_id)
        self.context_manager.add_to_short_term_memory(
            self.session_id,
            'salary',
            {'type': 'salary_inquiry'}
        )
        memory = self.context_manager.short_term_memory.get(self.session_id)
        self.assertIsNotNone(memory)
        self.assertGreater(len(memory['recent_topics']), 0)

    def test_long_term_memory(self):
        """اختبار الذاكرة طويلة الأجل"""
        self.context_manager.add_to_long_term_memory(
            self.user_id,
            {'preferred_topics': {'salary': 5, 'leave': 3}}
        )
        memory = self.context_manager.long_term_memory.get(self.user_id)
        self.assertIsNotNone(memory)


class TestKnowledgeBaseManager(unittest.TestCase):
    """اختبارات مدير قاعدة المعارف"""

    def setUp(self):
        self.kb = KnowledgeBaseManager()

    def test_knowledge_search(self):
        """اختبار البحث في قاعدة المعارف"""
        results = self.kb.search("الراتب")
        self.assertIsInstance(results, list)
        self.assertGreater(len(results), 0)

    def test_get_suggestions(self):
        """اختبار الحصول على الاقتراحات"""
        suggestions = self.kb.get_suggestions("hr.salary")
        self.assertIsInstance(suggestions, list)

    def test_get_related_topics(self):
        """اختبار الموضوعات ذات الصلة"""
        related = self.kb.get_related_topics("hr", "salary")
        self.assertIsInstance(related, list)

    def test_get_faq(self):
        """اختبار الأسئلة الشائعة"""
        faq = self.kb.get_faq("hr", "salary")
        self.assertIsInstance(faq, dict)


class TestAdvancedIntelligentAssistant(unittest.TestCase):
    """اختبارات المساعد الذكي المتقدم"""

    def setUp(self):
        self.service = AdvancedIntelligentAssistantService()
        self.user_id = "test_user_123"
        self.session_id = None

    def tearDown(self):
        """تنظيف بعد كل اختبار"""
        if self.session_id and self.session_id in self.service.conversations:
            del self.service.conversations[self.session_id]

    def test_conversation_start(self):
        """اختبار بدء محادثة"""
        self.session_id = self.service.start_conversation(
            self.user_id,
            conversation_type='general'
        )
        self.assertIsNotNone(self.session_id)
        self.assertIn(self.session_id, self.service.conversations)

    def test_message_processing(self):
        """اختبار معالجة الرسالة"""
        self.session_id = self.service.start_conversation(self.user_id)
        result = self.service.process_message(
            self.session_id,
            "كم الراتب",
            user_id=self.user_id
        )
        self.assertTrue(result.get('success'))
        self.assertIn('response', result)
        self.assertIn('intent', result)

    def test_conversation_history(self):
        """اختبار سجل المحادثة"""
        self.session_id = self.service.start_conversation(self.user_id)
        self.service.process_message(self.session_id, "مرحبا")
        
        history = self.service.get_conversation_history(self.session_id)
        self.assertGreater(len(history), 0)

    def test_conversation_rating(self):
        """اختبار تقييم المحادثة"""
        self.session_id = self.service.start_conversation(self.user_id)
        result = self.service.rate_conversation(
            self.session_id,
            rating=5,
            comment="جيد جداً"
        )
        self.assertTrue(result.get('success'))

    def test_escalation(self):
        """اختبار التصعيد"""
        self.session_id = self.service.start_conversation(self.user_id)
        result = self.service.handle_escalation(
            self.session_id,
            reason="مشكلة معقدة"
        )
        self.assertTrue(result.get('success'))
        self.assertIn('ticket_id', result)

    def test_statistics(self):
        """اختبار الإحصائيات"""
        self.session_id = self.service.start_conversation(self.user_id)
        self.service.process_message(self.session_id, "مرحبا بك")
        
        stats = self.service.get_statistics()
        self.assertGreater(stats.get('total_messages', 0), 0)
        self.assertGreater(stats.get('total_conversations', 0), 0)


class TestCacheManager(unittest.TestCase):
    """اختبارات مدير الذاكرة المؤقتة"""

    def setUp(self):
        self.cache = CacheManager(max_cache_size=100, ttl_seconds=3600)

    def test_set_and_get(self):
        """اختبار إضافة والحصول على قيمة"""
        self.cache.set("test_key", "test_value")
        value = self.cache.get("test_key")
        self.assertEqual(value, "test_value")

    def test_cache_miss(self):
        """اختبار عدم وجود مفتاح"""
        value = self.cache.get("non_existent_key")
        self.assertIsNone(value)

    def test_cache_stats(self):
        """اختبار إحصائيات الذاكرة المؤقتة"""
        self.cache.set("key1", "value1")
        self.cache.get("key1")  # hit
        self.cache.get("key2")  # miss
        
        stats = self.cache.get_stats()
        self.assertEqual(stats['hit_count'], 1)
        self.assertEqual(stats['miss_count'], 1)


class TestErrorHandler(unittest.TestCase):
    """اختبارات معالج الأخطاء"""

    def setUp(self):
        self.error_handler = ErrorHandler()

    def test_error_registration(self):
        """اختبار تسجيل الخطأ"""
        error_id = self.error_handler.register_error(
            'test_error',
            'This is a test error'
        )
        self.assertIsNotNone(error_id)
        self.assertGreater(len(self.error_handler.errors), 0)

    def test_error_handling(self):
        """اختبار معالجة الخطأ"""
        result = self.error_handler.handle_error(
            'system_error',
            'Test error message'
        )
        self.assertFalse(result.get('success'))
        self.assertIn('message', result)

    def test_error_stats(self):
        """اختبار إحصائيات الأخطاء"""
        self.error_handler.register_error('error1', 'msg1')
        self.error_handler.register_error('error1', 'msg2')
        self.error_handler.register_error('error2', 'msg3')
        
        stats = self.error_handler.get_error_stats()
        self.assertEqual(stats['total_errors'], 3)
        self.assertEqual(stats['error_types']['error1'], 2)


class TestMonitoringService(unittest.TestCase):
    """اختبارات خدمة المراقبة"""

    def setUp(self):
        self.monitoring = MonitoringService()

    def test_performance_tracking(self):
        """اختبار تتبع الأداء"""
        self.monitoring.track_performance('response_time_ms', 500)
        stats = self.monitoring.get_performance_summary()
        self.assertIn('response_time_ms', stats)

    def test_threshold_alerting(self):
        """اختبار تنبيهات الحدود"""
        self.monitoring.track_performance('response_time_ms', 2000)  # أعلى من الحد
        alerts = self.monitoring.get_alerts()
        self.assertGreater(len(alerts), 0)


class TestIntegration(unittest.TestCase):
    """اختبارات التكامل"""

    def setUp(self):
        self.service = AdvancedIntelligentAssistantService()
        self.user_id = "integration_test_user"
        self.session_id = None

    def tearDown(self):
        if self.session_id and self.session_id in self.service.conversations:
            del self.service.conversations[self.session_id]

    def test_complete_conversation_flow(self):
        """اختبار تدفق محادثة كامل"""
        # 1. بدء محادثة
        self.session_id = self.service.start_conversation(self.user_id)
        self.assertIsNotNone(self.session_id)

        # 2. إرسال رسائل متعددة
        messages = [
            "مرحبا",
            "ما هو الراتب؟",
            "أريد تقرير"
        ]
        
        for message in messages:
            result = self.service.process_message(
                self.session_id,
                message,
                user_id=self.user_id
            )
            self.assertTrue(result.get('success'))

        # 3. الحصول على السجل
        history = self.service.get_conversation_history(self.session_id)
        self.assertGreater(len(history), 0)

        # 4. تقييم المحادثة
        rating_result = self.service.rate_conversation(
            self.session_id,
            rating=4,
            comment="جيد"
        )
        self.assertTrue(rating_result.get('success'))

        # 5. الحصول على الإحصائيات
        stats = self.service.get_statistics()
        self.assertGreater(stats.get('total_messages', 0), 0)


def run_tests():
    """تشغيل جميع الاختبارات"""
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    # إضافة جميع الاختبارات
    suite.addTests(loader.loadTestsFromTestCase(TestNLPProcessor))
    suite.addTests(loader.loadTestsFromTestCase(TestIntentClassifier))
    suite.addTests(loader.loadTestsFromTestCase(TestConversationContextManager))
    suite.addTests(loader.loadTestsFromTestCase(TestKnowledgeBaseManager))
    suite.addTests(loader.loadTestsFromTestCase(TestAdvancedIntelligentAssistant))
    suite.addTests(loader.loadTestsFromTestCase(TestCacheManager))
    suite.addTests(loader.loadTestsFromTestCase(TestErrorHandler))
    suite.addTests(loader.loadTestsFromTestCase(TestMonitoringService))
    suite.addTests(loader.loadTestsFromTestCase(TestIntegration))

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    return result


if __name__ == '__main__':
    result = run_tests()
    exit(0 if result.wasSuccessful() else 1)
