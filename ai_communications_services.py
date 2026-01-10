#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
خدمات الذكاء الاصطناعي للاتصالات
AI Communications Services
"""

import re
import json
import random
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
from textblob import TextBlob
import nltk
from collections import Counter

class AIChatbotService:
    """خدمة الشات بوت الذكي"""
    
    def __init__(self):
        self.confidence_threshold = 0.7
        self.fallback_responses = [
            "عذراً، لم أفهم سؤالك. هل يمكنك إعادة صياغته؟",
            "أحتاج مزيد من التوضيح لأتمكن من مساعدتك",
            "يمكنك التواصل مع أحد موظفينا للحصول على مساعدة مخصصة"
        ]
    
    def process_message(self, message: str, user_context: Dict = None) -> Dict:
        """معالجة رسالة المستخدم وإنتاج رد ذكي"""
        try:
            # تحليل النية
            intent = self._detect_intent(message)
            
            # استخراج الكيانات
            entities = self._extract_entities(message)
            
            # البحث في قاعدة المعرفة
            knowledge_match = self._search_knowledge_base(message, intent)
            
            # إنتاج الرد
            response = self._generate_response(message, intent, entities, knowledge_match, user_context)
            
            return {
                'response': response['text'],
                'intent': intent,
                'entities': entities,
                'confidence': response['confidence'],
                'knowledge_base_id': knowledge_match.get('id') if knowledge_match else None,
                'response_type': response['type']
            }
        except Exception as e:
            return {
                'response': random.choice(self.fallback_responses),
                'intent': 'unknown',
                'entities': [],
                'confidence': 0.0,
                'error': str(e)
            }
    
    def _detect_intent(self, message: str) -> str:
        """كشف النية من الرسالة"""
        message_lower = message.lower()
        
        # قواعد بسيطة لكشف النية
        intent_patterns = {
            'greeting': ['مرحبا', 'السلام عليكم', 'أهلا', 'صباح الخير'],
            'question': ['ما هو', 'كيف', 'متى', 'أين', 'لماذا', 'هل'],
            'complaint': ['مشكلة', 'خطأ', 'لا يعمل', 'معطل', 'شكوى'],
            'request': ['أريد', 'أحتاج', 'يمكن', 'طلب', 'رغبة'],
            'appointment': ['موعد', 'حجز', 'جلسة', 'لقاء'],
            'information': ['معلومات', 'تفاصيل', 'شرح', 'وضح']
        }
        
        for intent, keywords in intent_patterns.items():
            if any(keyword in message_lower for keyword in keywords):
                return intent
        
        return 'general'
    
    def _extract_entities(self, message: str) -> List[Dict]:
        """استخراج الكيانات من الرسالة"""
        entities = []
        
        # استخراج التواريخ
        date_patterns = [
            r'\d{1,2}/\d{1,2}/\d{4}',
            r'\d{1,2}-\d{1,2}-\d{4}',
            r'اليوم|غدا|أمس|الأسبوع القادم'
        ]
        
        for pattern in date_patterns:
            matches = re.findall(pattern, message)
            for match in matches:
                entities.append({'type': 'date', 'value': match})
        
        # استخراج الأرقام
        numbers = re.findall(r'\d+', message)
        for number in numbers:
            entities.append({'type': 'number', 'value': int(number)})
        
        return entities
    
    def _search_knowledge_base(self, message: str, intent: str) -> Optional[Dict]:
        """البحث في قاعدة المعرفة"""
        # محاكاة البحث في قاعدة المعرفة
        knowledge_base = [
            {
                'id': 1,
                'question': 'ما هي ساعات العمل؟',
                'answer': 'ساعات العمل من 8 صباحاً حتى 5 مساءً من السبت إلى الخميس',
                'keywords': ['ساعات', 'عمل', 'وقت', 'دوام'],
                'confidence': 0.9
            },
            {
                'id': 2,
                'question': 'كيف أحجز موعد؟',
                'answer': 'يمكنك حجز موعد من خلال الاتصال على الرقم أو عبر الموقع الإلكتروني',
                'keywords': ['حجز', 'موعد', 'جلسة'],
                'confidence': 0.85
            }
        ]
        
        best_match = None
        highest_score = 0
        
        for item in knowledge_base:
            score = self._calculate_similarity(message, item['keywords'])
            if score > highest_score and score > self.confidence_threshold:
                highest_score = score
                best_match = item
                best_match['confidence'] = score
        
        return best_match
    
    def _calculate_similarity(self, message: str, keywords: List[str]) -> float:
        """حساب التشابه بين الرسالة والكلمات المفتاحية"""
        message_words = set(message.lower().split())
        keyword_words = set([kw.lower() for kw in keywords])
        
        intersection = message_words.intersection(keyword_words)
        union = message_words.union(keyword_words)
        
        return len(intersection) / len(union) if union else 0
    
    def _generate_response(self, message: str, intent: str, entities: List, 
                          knowledge_match: Optional[Dict], user_context: Dict = None) -> Dict:
        """إنتاج الرد المناسب"""
        
        if knowledge_match:
            return {
                'text': knowledge_match['answer'],
                'confidence': knowledge_match['confidence'],
                'type': 'knowledge_base'
            }
        
        # ردود حسب النية
        intent_responses = {
            'greeting': [
                'مرحباً بك! كيف يمكنني مساعدتك اليوم؟',
                'أهلاً وسهلاً! أنا هنا لمساعدتك'
            ],
            'question': [
                'سؤال ممتاز! دعني أبحث عن الإجابة لك',
                'أحاول العثور على المعلومات المطلوبة'
            ],
            'complaint': [
                'أعتذر عن هذه المشكلة. سأحولك لأحد المختصين',
                'نأسف لهذا الإزعاج. دعنا نحل هذه المشكلة'
            ]
        }
        
        responses = intent_responses.get(intent, self.fallback_responses)
        
        return {
            'text': random.choice(responses),
            'confidence': 0.6,
            'type': 'intent_based'
        }

class AISentimentAnalysisService:
    """خدمة تحليل المشاعر"""
    
    def __init__(self):
        self.positive_words = [
            'ممتاز', 'رائع', 'جيد', 'مفيد', 'شكرا', 'أحب', 'سعيد', 'راضي'
        ]
        self.negative_words = [
            'سيء', 'مشكلة', 'خطأ', 'غاضب', 'محبط', 'صعب', 'معقد', 'بطيء'
        ]
    
    def analyze_sentiment(self, text: str) -> Dict:
        """تحليل مشاعر النص"""
        try:
            # تحليل بسيط باللغة العربية
            positive_count = sum(1 for word in self.positive_words if word in text.lower())
            negative_count = sum(1 for word in self.negative_words if word in text.lower())
            
            total_words = len(text.split())
            
            if positive_count > negative_count:
                sentiment = 'positive'
                score = min(positive_count / max(total_words, 1), 1.0)
            elif negative_count > positive_count:
                sentiment = 'negative'
                score = -min(negative_count / max(total_words, 1), 1.0)
            else:
                sentiment = 'neutral'
                score = 0.0
            
            # تحليل المشاعر المفصلة
            emotions = self._detect_emotions(text)
            
            return {
                'sentiment': sentiment,
                'score': score,
                'confidence': abs(score),
                'emotions': emotions,
                'positive_indicators': positive_count,
                'negative_indicators': negative_count
            }
        except Exception as e:
            return {
                'sentiment': 'neutral',
                'score': 0.0,
                'confidence': 0.0,
                'error': str(e)
            }
    
    def _detect_emotions(self, text: str) -> Dict:
        """كشف المشاعر المفصلة"""
        emotion_keywords = {
            'joy': ['سعيد', 'فرح', 'مبسوط', 'مسرور'],
            'anger': ['غاضب', 'زعلان', 'محبط', 'منزعج'],
            'fear': ['خائف', 'قلق', 'متوتر', 'مرتبك'],
            'sadness': ['حزين', 'مكتئب', 'يائس', 'محزون'],
            'surprise': ['مندهش', 'متفاجئ', 'مصدوم'],
            'trust': ['أثق', 'أؤمن', 'متأكد', 'واثق']
        }
        
        emotions = {}
        text_lower = text.lower()
        
        for emotion, keywords in emotion_keywords.items():
            count = sum(1 for keyword in keywords if keyword in text_lower)
            if count > 0:
                emotions[emotion] = count / len(keywords)
        
        return emotions

class AIAutoResponseService:
    """خدمة الردود التلقائية المقترحة"""
    
    def __init__(self):
        self.response_templates = {
            'greeting': [
                'مرحباً {name}، كيف يمكنني مساعدتك؟',
                'أهلاً وسهلاً، نحن سعداء بتواصلك معنا'
            ],
            'appointment': [
                'سأساعدك في حجز موعد. ما هو التاريخ المفضل لك؟',
                'يمكنني ترتيب موعد لك. هل لديك وقت محدد تفضله؟'
            ],
            'complaint': [
                'نعتذر عن هذه المشكلة. سنعمل على حلها فوراً',
                'شكراً لإبلاغنا بهذه المشكلة. سنتابع الأمر'
            ]
        }
    
    def suggest_responses(self, message: str, context: Dict = None) -> List[Dict]:
        """اقتراح ردود مناسبة"""
        try:
            # تحليل الرسالة
            intent = self._detect_message_intent(message)
            sentiment = self._quick_sentiment_check(message)
            
            # اختيار القوالب المناسبة
            templates = self.response_templates.get(intent, [])
            
            suggestions = []
            for template in templates:
                response = self._personalize_response(template, context)
                suggestions.append({
                    'text': response,
                    'intent': intent,
                    'confidence': 0.8,
                    'type': 'template'
                })
            
            # إضافة ردود ذكية إضافية
            if sentiment == 'negative':
                suggestions.append({
                    'text': 'نتفهم شعورك ونعتذر عن أي إزعاج. دعنا نحل هذا الأمر معاً',
                    'intent': 'empathy',
                    'confidence': 0.9,
                    'type': 'sentiment_based'
                })
            
            return suggestions[:3]  # أفضل 3 اقتراحات
        except Exception as e:
            return [{
                'text': 'شكراً لتواصلك معنا. سنرد عليك قريباً',
                'intent': 'general',
                'confidence': 0.5,
                'type': 'fallback'
            }]
    
    def _detect_message_intent(self, message: str) -> str:
        """كشف نية الرسالة"""
        message_lower = message.lower()
        
        if any(word in message_lower for word in ['مرحبا', 'السلام', 'أهلا']):
            return 'greeting'
        elif any(word in message_lower for word in ['موعد', 'حجز', 'جلسة']):
            return 'appointment'
        elif any(word in message_lower for word in ['مشكلة', 'خطأ', 'شكوى']):
            return 'complaint'
        else:
            return 'general'
    
    def _quick_sentiment_check(self, message: str) -> str:
        """فحص سريع للمشاعر"""
        positive_words = ['شكرا', 'ممتاز', 'جيد', 'راضي']
        negative_words = ['مشكلة', 'سيء', 'غاضب', 'محبط']
        
        message_lower = message.lower()
        
        positive_count = sum(1 for word in positive_words if word in message_lower)
        negative_count = sum(1 for word in negative_words if word in message_lower)
        
        if positive_count > negative_count:
            return 'positive'
        elif negative_count > positive_count:
            return 'negative'
        else:
            return 'neutral'
    
    def _personalize_response(self, template: str, context: Dict = None) -> str:
        """تخصيص الرد حسب السياق"""
        if not context:
            return template
        
        # استبدال المتغيرات في القالب
        personalized = template
        if '{name}' in template and 'user_name' in context:
            personalized = personalized.replace('{name}', context['user_name'])
        
        return personalized

class AIMessageClassificationService:
    """خدمة تصنيف الرسائل التلقائي"""
    
    def __init__(self):
        self.priority_keywords = {
            'urgent': ['عاجل', 'طارئ', 'فوري', 'مستعجل', 'ضروري'],
            'high': ['مهم', 'أولوية', 'سريع', 'عاجل نسبياً'],
            'medium': ['عادي', 'متوسط', 'وقت مناسب'],
            'low': ['غير مستعجل', 'وقت فراغ', 'متى تيسر']
        }
        
        self.category_keywords = {
            'technical_support': ['مشكلة تقنية', 'خطأ', 'لا يعمل', 'معطل'],
            'appointment': ['موعد', 'حجز', 'جلسة', 'لقاء'],
            'billing': ['فاتورة', 'دفع', 'رسوم', 'تكلفة'],
            'general_inquiry': ['استفسار', 'سؤال', 'معلومات'],
            'complaint': ['شكوى', 'اعتراض', 'غير راضي']
        }
    
    def classify_message(self, message: str, metadata: Dict = None) -> Dict:
        """تصنيف الرسالة حسب المحتوى والأولوية"""
        try:
            message_lower = message.lower()
            
            # تحديد الأولوية
            priority = self._determine_priority(message_lower)
            
            # تحديد الفئة
            category = self._determine_category(message_lower)
            
            # استخراج العلامات
            tags = self._extract_tags(message_lower)
            
            # تحديد إذا كان يحتاج تدخل بشري
            requires_human = self._requires_human_intervention(message_lower, priority, category)
            
            return {
                'priority_level': priority['level'],
                'priority_score': priority['score'],
                'category': category['name'],
                'category_confidence': category['confidence'],
                'tags': tags,
                'requires_human': requires_human['required'],
                'escalation_reason': requires_human['reason'],
                'confidence_score': (priority['score'] + category['confidence']) / 2
            }
        except Exception as e:
            return {
                'priority_level': 'medium',
                'category': 'general_inquiry',
                'tags': [],
                'requires_human': False,
                'error': str(e)
            }
    
    def _determine_priority(self, message: str) -> Dict:
        """تحديد أولوية الرسالة"""
        priority_scores = {}
        
        for priority, keywords in self.priority_keywords.items():
            score = sum(1 for keyword in keywords if keyword in message)
            if score > 0:
                priority_scores[priority] = score / len(keywords)
        
        if not priority_scores:
            return {'level': 'medium', 'score': 0.5}
        
        top_priority = max(priority_scores, key=priority_scores.get)
        return {'level': top_priority, 'score': priority_scores[top_priority]}
    
    def _determine_category(self, message: str) -> Dict:
        """تحديد فئة الرسالة"""
        category_scores = {}
        
        for category, keywords in self.category_keywords.items():
            score = sum(1 for keyword in keywords if keyword in message)
            if score > 0:
                category_scores[category] = score / len(keywords)
        
        if not category_scores:
            return {'name': 'general_inquiry', 'confidence': 0.5}
        
        top_category = max(category_scores, key=category_scores.get)
        return {'name': top_category, 'confidence': category_scores[top_category]}
    
    def _extract_tags(self, message: str) -> List[str]:
        """استخراج العلامات من الرسالة"""
        tags = []
        
        # علامات تقنية
        if any(word in message for word in ['تقني', 'برنامج', 'نظام']):
            tags.append('technical')
        
        # علامات الخدمة
        if any(word in message for word in ['خدمة', 'مساعدة', 'دعم']):
            tags.append('service')
        
        # علامات المشاعر
        if any(word in message for word in ['غاضب', 'محبط', 'منزعج']):
            tags.append('negative_emotion')
        elif any(word in message for word in ['سعيد', 'راضي', 'شكرا']):
            tags.append('positive_emotion')
        
        return tags
    
    def _requires_human_intervention(self, message: str, priority: Dict, category: Dict) -> Dict:
        """تحديد إذا كانت الرسالة تحتاج تدخل بشري"""
        reasons = []
        
        # أولوية عالية أو عاجلة
        if priority['level'] in ['urgent', 'high']:
            reasons.append('high_priority')
        
        # شكاوى معقدة
        if category['name'] == 'complaint' and any(word in message for word in ['معقد', 'صعب', 'متكرر']):
            reasons.append('complex_complaint')
        
        # طلبات تقنية متقدمة
        if 'technical' in message and any(word in message for word in ['متقدم', 'مخصص', 'تطوير']):
            reasons.append('advanced_technical')
        
        # مشاعر سلبية قوية
        negative_indicators = sum(1 for word in ['غاضب جداً', 'محبط للغاية', 'غير مقبول'] if word in message)
        if negative_indicators > 0:
            reasons.append('strong_negative_sentiment')
        
        return {
            'required': len(reasons) > 0,
            'reason': ', '.join(reasons) if reasons else None
        }

class AIAnalyticsService:
    """خدمة التحليلات المتقدمة"""
    
    def generate_communication_insights(self, data: Dict) -> Dict:
        """توليد رؤى من بيانات الاتصالات"""
        try:
            insights = {
                'summary': self._generate_summary(data),
                'trends': self._analyze_trends(data),
                'patterns': self._identify_patterns(data),
                'recommendations': self._generate_recommendations(data),
                'predictions': self._make_predictions(data)
            }
            
            return insights
        except Exception as e:
            return {'error': str(e)}
    
    def _generate_summary(self, data: Dict) -> Dict:
        """توليد ملخص البيانات"""
        return {
            'total_messages': data.get('message_count', 0),
            'response_rate': data.get('response_rate', 0),
            'avg_response_time': data.get('avg_response_time', 0),
            'satisfaction_score': data.get('satisfaction_score', 0),
            'top_channels': data.get('top_channels', [])
        }
    
    def _analyze_trends(self, data: Dict) -> List[Dict]:
        """تحليل الاتجاهات"""
        trends = []
        
        # اتجاه حجم الرسائل
        if 'daily_messages' in data:
            daily_data = data['daily_messages']
            if len(daily_data) >= 7:
                recent_avg = sum(daily_data[-7:]) / 7
                previous_avg = sum(daily_data[-14:-7]) / 7 if len(daily_data) >= 14 else recent_avg
                
                change = ((recent_avg - previous_avg) / previous_avg * 100) if previous_avg > 0 else 0
                
                trends.append({
                    'metric': 'message_volume',
                    'direction': 'increasing' if change > 5 else 'decreasing' if change < -5 else 'stable',
                    'change_percentage': round(change, 2),
                    'description': f'حجم الرسائل {"زاد" if change > 0 else "قل"} بنسبة {abs(change):.1f}%'
                })
        
        return trends
    
    def _identify_patterns(self, data: Dict) -> List[Dict]:
        """تحديد الأنماط"""
        patterns = []
        
        # نمط الأوقات الذروة
        if 'hourly_distribution' in data:
            hourly_data = data['hourly_distribution']
            peak_hour = max(hourly_data, key=hourly_data.get)
            
            patterns.append({
                'type': 'peak_hours',
                'description': f'ساعة الذروة هي {peak_hour}:00',
                'value': peak_hour,
                'confidence': 0.8
            })
        
        return patterns
    
    def _generate_recommendations(self, data: Dict) -> List[Dict]:
        """توليد التوصيات"""
        recommendations = []
        
        # توصيات بناءً على وقت الاستجابة
        avg_response_time = data.get('avg_response_time', 0)
        if avg_response_time > 60:  # أكثر من دقيقة
            recommendations.append({
                'type': 'response_time',
                'priority': 'high',
                'title': 'تحسين وقت الاستجابة',
                'description': 'وقت الاستجابة الحالي مرتفع، يُنصح بزيادة عدد الموظفين أو تحسين العمليات',
                'expected_impact': 'تحسين رضا العملاء بنسبة 25%'
            })
        
        return recommendations
    
    def _make_predictions(self, data: Dict) -> List[Dict]:
        """عمل تنبؤات"""
        predictions = []
        
        # تنبؤ بحجم الرسائل القادم
        if 'daily_messages' in data and len(data['daily_messages']) >= 30:
            recent_data = data['daily_messages'][-30:]
            avg_daily = sum(recent_data) / len(recent_data)
            
            # تنبؤ بسيط بناءً على المتوسط والاتجاه
            trend = (recent_data[-7:] and sum(recent_data[-7:]) / 7) - (sum(recent_data[-14:-7]) / 7)
            predicted_next_week = avg_daily + trend
            
            predictions.append({
                'metric': 'daily_messages',
                'period': 'next_week',
                'predicted_value': round(predicted_next_week),
                'confidence': 0.7,
                'description': f'متوقع {predicted_next_week:.0f} رسالة يومياً الأسبوع القادم'
            })
        
        return predictions
