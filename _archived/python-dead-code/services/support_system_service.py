"""
🎫 Enhanced Support System Service
نظام الدعم المحسّن المتقدم

المميزات:
1. إدارة التذاكر (Ticketing System)
2. Chat مباشر مع فريق الدعم
3. قاعدة معارف ذكية
4. تتبع الحالة وقت فعلي
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional
from enum import Enum

class TicketPriority(Enum):
    """أولويات التذاكر"""
    LOW = 1
    NORMAL = 2
    HIGH = 3
    CRITICAL = 4

class TicketStatus(Enum):
    """حالات التذاكر"""
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    WAITING_CUSTOMER = "waiting_customer"
    RESOLVED = "resolved"
    CLOSED = "closed"


class EnhancedSupportService:
    """خدمة الدعم المحسّنة المتقدمة"""

    def __init__(self, db):
        self.db = db

    # ==========================================
    # 1. إدارة التذاكر
    # ==========================================

    def create_support_ticket(self, ticket_data: Dict) -> Dict:
        """
        إنشاء تذكرة دعم جديدة

        Args:
            ticket_data: بيانات التذكرة
                - user_id: معرف المستخدم
                - subject: موضوع المشكلة
                - description: وصف المشكلة
                - priority: الأولوية
                - category: فئة المشكلة
                - attachments: المرفقات (اختياري)
        """

        ticket_id = self._generate_ticket_id()

        ticket = {
            'id': ticket_id,
            'user_id': ticket_data.get('user_id'),
            'subject': ticket_data.get('subject'),
            'description': ticket_data.get('description'),
            'priority': ticket_data.get('priority', TicketPriority.NORMAL.value),
            'category': ticket_data.get('category'),
            'status': TicketStatus.OPEN.value,
            'assigned_to': None,
            'attachments': ticket_data.get('attachments', []),
            'messages': [],
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat(),
            'resolved_at': None,
            'resolution_time': None,
            'satisfaction_rating': None
        }

        self.db['support_tickets'].insert_one(ticket)

        # إشعار الدعم بالتذكرة الجديدة
        self._notify_support_team(ticket_id, 'new_ticket')

        return {
            'ticket_id': ticket_id,
            'status': 'created',
            'message': f'Ticket {ticket_id} created successfully'
        }

    def update_ticket_status(self, ticket_id: str,
                            new_status: str,
                            notes: str = '') -> Dict:
        """تحديث حالة التذكرة"""

        ticket = self.db['support_tickets'].find_one({'_id': ticket_id})

        if not ticket:
            return {'status': 'error', 'message': 'Ticket not found'}

        update_data = {
            'status': new_status,
            'updated_at': datetime.now().isoformat()
        }

        # إذا تم إغلاق التذكرة، احسب وقت الحل
        if new_status == TicketStatus.RESOLVED.value:
            created_at = datetime.fromisoformat(ticket['created_at'])
            update_data['resolved_at'] = datetime.now().isoformat()
            update_data['resolution_time'] = (datetime.now() - created_at).total_seconds() / 3600  # ساعات

        self.db['support_tickets'].update_one(
            {'_id': ticket_id},
            {'$set': update_data}
        )

        # إضافة رسالة النظام
        if notes:
            self._add_ticket_message(ticket_id, {
                'sender_type': 'system',
                'content': notes
            })

        return {'status': 'success', 'message': 'Ticket status updated'}

    def assign_ticket(self, ticket_id: str, support_agent_id: str) -> Dict:
        """تعيين التذكرة لموظف دعم"""

        self.db['support_tickets'].update_one(
            {'_id': ticket_id},
            {
                '$set': {
                    'assigned_to': support_agent_id,
                    'updated_at': datetime.now().isoformat()
                }
            }
        )

        # إشعار الموظف بالتعيين
        self._notify_support_agent(support_agent_id, ticket_id, 'ticket_assigned')

        return {'status': 'success', 'message': 'Ticket assigned'}

    def get_ticket_details(self, ticket_id: str) -> Dict:
        """الحصول على تفاصيل التذكرة الكاملة"""

        ticket = self.db['support_tickets'].find_one({'_id': ticket_id})

        if not ticket:
            return {'status': 'error', 'message': 'Ticket not found'}

        # الحصول على معلومات المستخدم
        user = self.db['users'].find_one({'_id': ticket['user_id']})

        # الحصول على معلومات الموظف المعين
        assigned_agent = None
        if ticket.get('assigned_to'):
            assigned_agent = self.db['users'].find_one({'_id': ticket['assigned_to']})

        return {
            'ticket': ticket,
            'user_info': {
                'id': user['_id'],
                'name': user.get('name'),
                'email': user.get('email'),
                'phone': user.get('phone')
            },
            'assigned_agent': assigned_agent,
            'messages_count': len(ticket.get('messages', [])),
            'can_close': ticket['status'] != TicketStatus.CLOSED.value
        }

    def list_support_tickets(self, filters: Optional[Dict] = None) -> List[Dict]:
        """الحصول على قائمة التذاكر مع الفلاتر"""

        query = {}

        if filters:
            if 'status' in filters:
                query['status'] = filters['status']
            if 'priority' in filters:
                query['priority'] = filters['priority']
            if 'category' in filters:
                query['category'] = filters['category']
            if 'user_id' in filters:
                query['user_id'] = filters['user_id']
            if 'assigned_to' in filters:
                query['assigned_to'] = filters['assigned_to']

        tickets = list(
            self.db['support_tickets'].find(query).sort('created_at', -1)
        )

        return tickets

    # ==========================================
    # 2. الرسائل والتواصل
    # ==========================================

    def add_ticket_message(self, ticket_id: str, message_data: Dict) -> Dict:
        """إضافة رسالة إلى التذكرة"""

        return self._add_ticket_message(ticket_id, message_data)

    def _add_ticket_message(self, ticket_id: str, message_data: Dict) -> Dict:
        """إضافة رسالة داخلية"""

        message = {
            'id': self._generate_message_id(),
            'sender_id': message_data.get('sender_id'),
            'sender_type': message_data.get('sender_type', 'user'),
            'content': message_data.get('content'),
            'attachments': message_data.get('attachments', []),
            'created_at': datetime.now().isoformat(),
            'is_internal': message_data.get('is_internal', False)
        }

        # إضافة الرسالة
        self.db['support_tickets'].update_one(
            {'_id': ticket_id},
            {
                '$push': {'messages': message},
                '$set': {'updated_at': datetime.now().isoformat()}
            }
        )

        # إشعارات بناءً على نوع الرسالة
        if message['sender_type'] == 'user':
            # إشعار فريق الدعم
            ticket = self.db['support_tickets'].find_one({'_id': ticket_id})
            if ticket.get('assigned_to'):
                self._notify_support_agent(
                    ticket['assigned_to'],
                    ticket_id,
                    'new_message'
                )
        elif message['sender_type'] == 'agent':
            # إشعار المستخدم
            ticket = self.db['support_tickets'].find_one({'_id': ticket_id})
            self._notify_user(
                ticket['user_id'],
                ticket_id,
                'new_response'
            )

        return {
            'message_id': message['id'],
            'status': 'sent',
            'created_at': message['created_at']
        }

    def get_ticket_messages(self, ticket_id: str) -> List[Dict]:
        """الحصول على رسائل التذكرة"""

        ticket = self.db['support_tickets'].find_one({'_id': ticket_id})

        if not ticket:
            return []

        return ticket.get('messages', [])

    # ==========================================
    # 3. قاعدة المعارف
    # ==========================================

    def add_knowledge_base_article(self, article_data: Dict) -> Dict:
        """إضافة مقالة جديدة لقاعدة المعارف"""

        article_id = self._generate_article_id()

        article = {
            'id': article_id,
            'title': article_data.get('title'),
            'content': article_data.get('content'),
            'category': article_data.get('category'),
            'tags': article_data.get('tags', []),
            'author_id': article_data.get('author_id'),
            'helpful_count': 0,
            'unhelpful_count': 0,
            'views': 0,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat(),
            'is_published': True
        }

        self.db['knowledge_base'].insert_one(article)

        return {
            'article_id': article_id,
            'status': 'created',
            'message': 'Article added to knowledge base'
        }

    def search_knowledge_base(self, query: str) -> List[Dict]:
        """البحث في قاعدة المعارف"""

        articles = list(
            self.db['knowledge_base'].find({
                '$or': [
                    {'title': {'$regex': query, '$options': 'i'}},
                    {'content': {'$regex': query, '$options': 'i'}},
                    {'tags': query}
                ],
                'is_published': True
            }).sort('helpful_count', -1)
        )

        return articles

    def get_articles_by_category(self, category: str) -> List[Dict]:
        """الحصول على المقالات حسب الفئة"""

        articles = list(
            self.db['knowledge_base'].find({
                'category': category,
                'is_published': True
            }).sort('updated_at', -1)
        )

        return articles

    def rate_article(self, article_id: str, rating: str) -> Dict:
        """تقييم مقالة (مفيدة / غير مفيدة)"""

        if rating == 'helpful':
            self.db['knowledge_base'].update_one(
                {'_id': article_id},
                {'$inc': {'helpful_count': 1}}
            )
        elif rating == 'unhelpful':
            self.db['knowledge_base'].update_one(
                {'_id': article_id},
                {'$inc': {'unhelpful_count': 1}}
            )

        return {'status': 'success', 'message': 'Rating saved'}

    # ==========================================
    # 4. التقارير والإحصائيات
    # ==========================================

    def get_support_statistics(self, date_from: str,
                              date_to: str) -> Dict:
        """الحصول على إحصائيات الدعم"""

        tickets = list(
            self.db['support_tickets'].find({
                'created_at': {
                    '$gte': date_from,
                    '$lte': date_to
                }
            })
        )

        stats = {
            'total_tickets': len(tickets),
            'open_tickets': sum(1 for t in tickets if t['status'] == 'open'),
            'in_progress': sum(1 for t in tickets if t['status'] == 'in_progress'),
            'resolved': sum(1 for t in tickets if t['status'] == 'resolved'),
            'closed': sum(1 for t in tickets if t['status'] == 'closed'),
            'average_resolution_time': self._calculate_average_resolution_time(tickets),
            'average_satisfaction': self._calculate_average_satisfaction(tickets),
            'by_priority': self._group_by_priority(tickets),
            'by_category': self._group_by_category(tickets),
            'by_agent': self._group_by_agent(tickets)
        }

        return stats

    def get_support_agent_performance(self, agent_id: str,
                                     date_from: str,
                                     date_to: str) -> Dict:
        """الحصول على أداء موظف الدعم"""

        tickets = list(
            self.db['support_tickets'].find({
                'assigned_to': agent_id,
                'created_at': {
                    '$gte': date_from,
                    '$lte': date_to
                }
            })
        )

        performance = {
            'total_tickets': len(tickets),
            'resolved_tickets': sum(1 for t in tickets if t['status'] == 'resolved'),
            'average_resolution_time': self._calculate_average_resolution_time(tickets),
            'average_satisfaction': self._calculate_average_satisfaction(tickets),
            'average_response_time': self._calculate_average_response_time(tickets),
            'customer_satisfaction_rate': self._calculate_satisfaction_rate(tickets)
        }

        return performance

    # ==========================================
    # Helper Methods
    # ==========================================

    def _generate_ticket_id(self) -> str:
        """توليد معرف التذكرة"""
        return f"TKT_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    def _generate_message_id(self) -> str:
        """توليد معرف الرسالة"""
        return f"MSG_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    def _generate_article_id(self) -> str:
        """توليد معرف المقالة"""
        return f"ART_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    def _notify_support_team(self, ticket_id: str, event_type: str):
        """إشعار فريق الدعم"""
        # يمكن إرسال إشعار عبر البريد الإلكتروني أو أنظمة أخرى
        pass

    def _notify_support_agent(self, agent_id: str, ticket_id: str, event_type: str):
        """إشعار موظف الدعم"""
        pass

    def _notify_user(self, user_id: str, ticket_id: str, event_type: str):
        """إشعار المستخدم"""
        pass

    def _calculate_average_resolution_time(self, tickets: List[Dict]) -> float:
        """حساب متوسط وقت الحل (بالساعات)"""
        resolved = [t for t in tickets if t.get('resolution_time')]
        if not resolved:
            return 0
        return sum(t['resolution_time'] for t in resolved) / len(resolved)

    def _calculate_average_satisfaction(self, tickets: List[Dict]) -> float:
        """حساب متوسط رضا العملاء"""
        rated = [t for t in tickets if t.get('satisfaction_rating')]
        if not rated:
            return 0
        return sum(t['satisfaction_rating'] for t in rated) / len(rated)

    def _group_by_priority(self, tickets: List[Dict]) -> Dict:
        """تجميع حسب الأولوية"""
        return {
            'critical': sum(1 for t in tickets if t.get('priority') == 4),
            'high': sum(1 for t in tickets if t.get('priority') == 3),
            'normal': sum(1 for t in tickets if t.get('priority') == 2),
            'low': sum(1 for t in tickets if t.get('priority') == 1)
        }

    def _group_by_category(self, tickets: List[Dict]) -> Dict:
        """تجميع حسب الفئة"""
        groups = {}
        for ticket in tickets:
            category = ticket.get('category', 'Other')
            groups[category] = groups.get(category, 0) + 1
        return groups

    def _group_by_agent(self, tickets: List[Dict]) -> Dict:
        """تجميع حسب الموظف"""
        groups = {}
        for ticket in tickets:
            agent_id = ticket.get('assigned_to', 'Unassigned')
            groups[agent_id] = groups.get(agent_id, 0) + 1
        return groups

    def _calculate_average_response_time(self, tickets: List[Dict]) -> float:
        """حساب متوسط وقت الرد (بالدقائق)"""
        return 0  # يمكن تحسين هذا الحساب

    def _calculate_satisfaction_rate(self, tickets: List[Dict]) -> float:
        """حساب نسبة رضا العملاء (%)"""
        rated = [t for t in tickets if t.get('satisfaction_rating')]
        if not rated:
            return 0
        satisfied = sum(1 for t in rated if t['satisfaction_rating'] >= 4)
        return (satisfied / len(rated)) * 100
