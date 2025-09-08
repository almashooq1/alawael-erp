# -*- coding: utf-8 -*-
"""
خدمات المساعد الذكي المتقدم
نظام ERP مراكز الأوائل للتأهيل الشامل لذوي الاحتياجات الخاصة
"""

import re
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from database import db
from intelligent_assistant_models import (
    AIAssistantConversation, AIAssistantMessage, AIKnowledgeBase,
    AIIntentPattern, AIUserPreference, AIAnalytics, AIFeedback
)

class IntelligentAssistantService:
    """خدمة المساعد الذكي الشاملة"""
    
    def __init__(self):
        self.intent_patterns = self._load_intent_patterns()
        self.knowledge_base = self._load_knowledge_base()
    
    def start_conversation(self, user_id: int, conversation_type: str = 'general', 
                          context_data: Dict = None) -> str:
        """بدء محادثة جديدة مع المساعد الذكي"""
        session_id = str(uuid.uuid4())
        
        conversation = AIAssistantConversation(
            user_id=user_id,
            session_id=session_id,
            conversation_type=conversation_type,
            context_data=json.dumps(context_data or {}),
            language='ar'
        )
        
        db.session.add(conversation)
        db.session.commit()
        
        # رسالة ترحيب
        welcome_message = self._get_welcome_message(conversation_type)
        self.add_message(conversation.id, 'assistant', welcome_message, 'welcome', 0.95)
        
        return session_id
    
    def process_message(self, session_id: str, user_message: str) -> Dict:
        """معالجة رسالة المستخدم وإرجاع الرد"""
        conversation = AIAssistantConversation.query.filter_by(
            session_id=session_id, is_active=True
        ).first()
        
        if not conversation:
            return {'error': 'المحادثة غير موجودة أو منتهية الصلاحية'}
        
        # إضافة رسالة المستخدم
        user_msg = self.add_message(conversation.id, 'user', user_message)
        
        # تحليل النية
        intent, confidence = self._detect_intent(user_message)
        
        # توليد الرد
        response = self._generate_response(conversation, user_message, intent, confidence)
        
        # إضافة رد المساعد
        assistant_msg = self.add_message(
            conversation.id, 'assistant', response['content'], 
            intent, confidence, response.get('response_time', 0)
        )
        
        # تحديث التحليلات
        self._update_analytics(conversation, intent)
        
        return {
            'message_id': assistant_msg.id,
            'content': response['content'],
            'intent': intent,
            'confidence': confidence,
            'suggestions': response.get('suggestions', []),
            'actions': response.get('actions', [])
        }
    
    def add_message(self, conversation_id: int, message_type: str, content: str,
                   intent: str = None, confidence: float = None, 
                   response_time: float = None) -> AIAssistantMessage:
        """إضافة رسالة جديدة للمحادثة"""
        message = AIAssistantMessage(
            conversation_id=conversation_id,
            message_type=message_type,
            content=content,
            intent=intent,
            confidence_score=confidence,
            response_time=response_time
        )
        
        db.session.add(message)
        db.session.commit()
        
        return message
    
    def _detect_intent(self, message: str) -> Tuple[str, float]:
        """كشف نية المستخدم من الرسالة"""
        message_lower = message.lower().strip()
        best_intent = 'general'
        best_confidence = 0.0
        
        for pattern in self.intent_patterns:
            if not pattern.is_active:
                continue
                
            confidence = self._calculate_pattern_match(message_lower, pattern)
            
            if confidence > best_confidence and confidence >= pattern.confidence_threshold:
                best_intent = pattern.intent_name
                best_confidence = confidence
        
        return best_intent, best_confidence
    
    def _calculate_pattern_match(self, message: str, pattern: AIIntentPattern) -> float:
        """حساب درجة تطابق النمط مع الرسالة"""
        if pattern.pattern_type == 'keyword':
            keywords = pattern.pattern_text.lower().split(',')
            matches = sum(1 for keyword in keywords if keyword.strip() in message)
            return matches / len(keywords) if keywords else 0
            
        elif pattern.pattern_type == 'regex':
            try:
                match = re.search(pattern.pattern_text, message, re.IGNORECASE)
                return 1.0 if match else 0.0
            except re.error:
                return 0.0
                
        elif pattern.pattern_type == 'semantic':
            # تحليل دلالي بسيط - يمكن تحسينه بـ NLP متقدم
            pattern_words = set(pattern.pattern_text.lower().split())
            message_words = set(message.split())
            intersection = pattern_words.intersection(message_words)
            return len(intersection) / len(pattern_words) if pattern_words else 0
        
        return 0.0
    
    def _generate_response(self, conversation: AIAssistantConversation, 
                          message: str, intent: str, confidence: float) -> Dict:
        """توليد الرد المناسب"""
        start_time = datetime.now()
        
        # البحث في قاعدة المعرفة
        knowledge_results = self._search_knowledge_base(message, intent)
        
        # الحصول على نمط الرد
        pattern = AIIntentPattern.query.filter_by(
            intent_name=intent, is_active=True
        ).first()
        
        response_content = ""
        suggestions = []
        actions = []
        
        if intent == 'greeting':
            response_content = "مرحباً بك! كيف يمكنني مساعدتك اليوم؟"
            suggestions = [
                "أريد معلومات عن البرامج العلاجية",
                "كيف يمكنني تتبع تقدم طفلي؟",
                "ما هي المواعيد القادمة؟"
            ]
            
        elif intent == 'program_inquiry':
            response_content = self._handle_program_inquiry(conversation, message)
            
        elif intent == 'progress_inquiry':
            response_content = self._handle_progress_inquiry(conversation, message)
            
        elif intent == 'appointment_inquiry':
            response_content = self._handle_appointment_inquiry(conversation, message)
            
        elif intent == 'general_info':
            if knowledge_results:
                response_content = knowledge_results[0]['content']
            else:
                response_content = "عذراً، لم أتمكن من العثور على معلومات محددة حول استفسارك. هل يمكنك إعادة صياغة السؤال؟"
                
        else:
            response_content = "أفهم استفسارك، دعني أبحث عن المعلومات المناسبة لك."
            if knowledge_results:
                response_content += f"\n\n{knowledge_results[0]['content']}"
        
        # حساب وقت الاستجابة
        response_time = (datetime.now() - start_time).total_seconds()
        
        return {
            'content': response_content,
            'response_time': response_time,
            'suggestions': suggestions,
            'actions': actions
        }
    
    def _handle_program_inquiry(self, conversation: AIAssistantConversation, message: str) -> str:
        """معالجة استفسارات البرامج العلاجية"""
        try:
            from models import RehabilitationProgram
            programs = RehabilitationProgram.query.filter_by(is_active=True).limit(5).all()
            
            if programs:
                response = "إليك البرامج العلاجية المتاحة:\n\n"
                for program in programs:
                    response += f"• {program.name}: {program.description[:100]}...\n"
                response += "\nهل تريد معلومات تفصيلية عن برنامج معين؟"
            else:
                response = "لا توجد برامج علاجية متاحة حالياً. يرجى التواصل مع الإدارة."
                
        except Exception as e:
            response = "عذراً، حدث خطأ في استرداد معلومات البرامج. يرجى المحاولة لاحقاً."
            
        return response
    
    def _handle_progress_inquiry(self, conversation: AIAssistantConversation, message: str) -> str:
        """معالجة استفسارات التقدم"""
        try:
            context = json.loads(conversation.context_data or '{}')
            student_id = context.get('student_id')
            
            if not student_id:
                return "لعرض تقدم الطالب، يرجى تحديد الطالب أولاً من خلال لوحة التحكم."
            
            from models import Assessment
            recent_assessments = Assessment.query.filter_by(
                student_id=student_id
            ).order_by(Assessment.assessment_date.desc()).limit(3).all()
            
            if recent_assessments:
                response = "آخر التقييمات:\n\n"
                for assessment in recent_assessments:
                    response += f"• {assessment.assessment_date.strftime('%Y-%m-%d')}: "
                    response += f"النتيجة {assessment.total_score}/{assessment.max_score}\n"
                response += "\nيظهر تقدم إيجابي في المهارات المستهدفة."
            else:
                response = "لا توجد تقييمات حديثة للطالب."
                
        except Exception as e:
            response = "عذراً، حدث خطأ في استرداد معلومات التقدم."
            
        return response
    
    def _handle_appointment_inquiry(self, conversation: AIAssistantConversation, message: str) -> str:
        """معالجة استفسارات المواعيد"""
        try:
            from models import Appointment
            from datetime import date
            
            upcoming_appointments = Appointment.query.filter(
                Appointment.appointment_date >= date.today()
            ).order_by(Appointment.appointment_date).limit(5).all()
            
            if upcoming_appointments:
                response = "المواعيد القادمة:\n\n"
                for appointment in upcoming_appointments:
                    response += f"• {appointment.appointment_date} في {appointment.appointment_time}\n"
                    response += f"  النوع: {appointment.appointment_type}\n\n"
            else:
                response = "لا توجد مواعيد مجدولة حالياً."
                
        except Exception as e:
            response = "عذراً، حدث خطأ في استرداد معلومات المواعيد."
            
        return response
    
    def _search_knowledge_base(self, query: str, intent: str = None) -> List[Dict]:
        """البحث في قاعدة المعرفة"""
        query_words = query.lower().split()
        results = []
        
        knowledge_entries = AIKnowledgeBase.query.filter_by(is_active=True).all()
        
        for entry in knowledge_entries:
            score = 0
            
            # البحث في العنوان
            title_words = entry.title.lower().split()
            title_matches = sum(1 for word in query_words if word in title_words)
            score += title_matches * 3
            
            # البحث في المحتوى
            content_words = entry.content.lower().split()
            content_matches = sum(1 for word in query_words if word in content_words)
            score += content_matches
            
            # البحث في الكلمات المفتاحية
            if entry.keywords:
                keywords = json.loads(entry.keywords)
                keyword_matches = sum(1 for word in query_words if word in [k.lower() for k in keywords])
                score += keyword_matches * 2
            
            if score > 0:
                results.append({
                    'entry': entry,
                    'score': score,
                    'title': entry.title,
                    'content': entry.content,
                    'category': entry.category
                })
        
        # ترتيب النتائج حسب النقاط
        results.sort(key=lambda x: x['score'], reverse=True)
        
        return results[:5]  # أفضل 5 نتائج
    
    def _get_welcome_message(self, conversation_type: str) -> str:
        """الحصول على رسالة الترحيب حسب نوع المحادثة"""
        messages = {
            'general': "مرحباً! أنا المساعد الذكي لمراكز الأوائل. كيف يمكنني مساعدتك اليوم؟",
            'medical': "مرحباً! أنا هنا لمساعدتك في الاستفسارات الطبية والعلاجية. ما الذي تود معرفته؟",
            'educational': "مرحباً! يمكنني مساعدتك في الاستفسارات التعليمية والبرامج الأكاديمية. كيف يمكنني خدمتك؟",
            'behavioral': "مرحباً! أنا متخصص في الاستفسارات السلوكية والتأهيلية. ما الذي يمكنني مساعدتك فيه؟"
        }
        return messages.get(conversation_type, messages['general'])
    
    def _load_intent_patterns(self) -> List[AIIntentPattern]:
        """تحميل أنماط النوايا من قاعدة البيانات"""
        return AIIntentPattern.query.filter_by(is_active=True).order_by(AIIntentPattern.priority.desc()).all()
    
    def _load_knowledge_base(self) -> List[AIKnowledgeBase]:
        """تحميل قاعدة المعرفة من قاعدة البيانات"""
        return AIKnowledgeBase.query.filter_by(is_active=True).all()
    
    def _update_analytics(self, conversation: AIAssistantConversation, intent: str):
        """تحديث تحليلات الاستخدام"""
        today = datetime.now().date()
        
        # تحديث عدد الرسائل
        self._update_metric(today, 'messages', 1, intent, conversation.conversation_type)
        
        # تحديث عدد النوايا
        self._update_metric(today, 'intents', 1, intent, conversation.conversation_type)
    
    def _update_metric(self, date, metric_type: str, value: float, 
                      category: str = None, subcategory: str = None):
        """تحديث مقياس معين"""
        metric = AIAnalytics.query.filter_by(
            date=date,
            metric_type=metric_type,
            category=category,
            subcategory=subcategory
        ).first()
        
        if metric:
            metric.metric_value += value
        else:
            metric = AIAnalytics(
                date=date,
                metric_type=metric_type,
                metric_value=value,
                category=category,
                subcategory=subcategory
            )
            db.session.add(metric)
        
        db.session.commit()
    
    def get_conversation_history(self, session_id: str, limit: int = 50) -> List[Dict]:
        """الحصول على تاريخ المحادثة"""
        conversation = AIAssistantConversation.query.filter_by(session_id=session_id).first()
        
        if not conversation:
            return []
        
        messages = AIAssistantMessage.query.filter_by(
            conversation_id=conversation.id
        ).order_by(AIAssistantMessage.created_at).limit(limit).all()
        
        return [message.to_dict() for message in messages]
    
    def rate_conversation(self, session_id: str, rating: int, comment: str = None) -> bool:
        """تقييم المحادثة"""
        conversation = AIAssistantConversation.query.filter_by(session_id=session_id).first()
        
        if not conversation:
            return False
        
        conversation.satisfaction_rating = rating
        
        if comment:
            feedback = AIFeedback(
                user_id=conversation.user_id,
                conversation_id=conversation.id,
                feedback_type='rating',
                rating=rating,
                comment=comment,
                category='overall'
            )
            db.session.add(feedback)
        
        db.session.commit()
        return True
    
    def get_analytics_summary(self, days: int = 30) -> Dict:
        """الحصول على ملخص التحليلات"""
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=days)
        
        analytics = AIAnalytics.query.filter(
            AIAnalytics.date >= start_date,
            AIAnalytics.date <= end_date
        ).all()
        
        summary = {
            'total_conversations': 0,
            'total_messages': 0,
            'avg_satisfaction': 0,
            'top_intents': {},
            'daily_usage': {}
        }
        
        for analytic in analytics:
            date_str = analytic.date.isoformat()
            
            if analytic.metric_type == 'conversations':
                summary['total_conversations'] += analytic.metric_value
            elif analytic.metric_type == 'messages':
                summary['total_messages'] += analytic.metric_value
            elif analytic.metric_type == 'intents' and analytic.category:
                summary['top_intents'][analytic.category] = summary['top_intents'].get(analytic.category, 0) + analytic.metric_value
            
            if date_str not in summary['daily_usage']:
                summary['daily_usage'][date_str] = 0
            summary['daily_usage'][date_str] += analytic.metric_value
        
        # حساب متوسط الرضا
        conversations = AIAssistantConversation.query.filter(
            AIAssistantConversation.satisfaction_rating.isnot(None)
        ).all()
        
        if conversations:
            total_rating = sum(c.satisfaction_rating for c in conversations)
            summary['avg_satisfaction'] = total_rating / len(conversations)
        
        return summary
