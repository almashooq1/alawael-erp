#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
خوارزميات الجدولة التلقائية المتقدمة
Advanced Automated Scheduling Algorithms
"""

from datetime import datetime, date, time, timedelta
from typing import List, Dict, Optional, Tuple
import random
from dataclasses import dataclass
from enum import Enum

from session_scheduling_models import *
from rehabilitation_programs_models import RehabilitationBeneficiary, RehabilitationProgram, Therapist

class SchedulingPriority(Enum):
    """أولويات الجدولة"""
    URGENT = "عاجل"
    HIGH = "عالي"
    MEDIUM = "متوسط"
    LOW = "منخفض"

class OptimizationGoal(Enum):
    """أهداف التحسين"""
    MAXIMIZE_UTILIZATION = "تعظيم الاستخدام"
    MINIMIZE_CONFLICTS = "تقليل التعارضات"
    BALANCE_WORKLOAD = "توازن العبء"
    PATIENT_PREFERENCE = "تفضيل المريض"

@dataclass
class SchedulingConstraint:
    """قيود الجدولة"""
    therapist_id: Optional[int] = None
    room_id: Optional[int] = None
    preferred_times: List[str] = None
    excluded_times: List[str] = None
    max_sessions_per_day: int = 8
    min_break_between_sessions: int = 15  # بالدقائق
    preferred_days: List[int] = None  # 0=الاثنين، 6=الأحد

@dataclass
class SchedulingRequest:
    """طلب جدولة"""
    beneficiary_id: int
    program_id: int
    session_type: SessionType
    duration_minutes: int = 60
    priority: SchedulingPriority = SchedulingPriority.MEDIUM
    preferred_therapist_id: Optional[int] = None
    preferred_room_id: Optional[int] = None
    start_date: date = None
    end_date: date = None
    sessions_per_week: int = 2
    constraints: SchedulingConstraint = None

class AutomatedScheduler:
    """محرك الجدولة التلقائية المتقدم"""
    
    def __init__(self, db_session):
        self.db = db_session
        self.optimization_weights = {
            OptimizationGoal.MAXIMIZE_UTILIZATION: 0.3,
            OptimizationGoal.MINIMIZE_CONFLICTS: 0.4,
            OptimizationGoal.BALANCE_WORKLOAD: 0.2,
            OptimizationGoal.PATIENT_PREFERENCE: 0.1
        }
    
    def schedule_sessions(self, requests: List[SchedulingRequest]) -> Dict:
        """جدولة مجموعة من الجلسات تلقائياً"""
        
        results = {
            'scheduled_sessions': [],
            'conflicts': [],
            'unscheduled_requests': [],
            'optimization_score': 0.0,
            'statistics': {}
        }
        
        # ترتيب الطلبات حسب الأولوية
        sorted_requests = sorted(requests, key=lambda x: self._get_priority_score(x.priority), reverse=True)
        
        for request in sorted_requests:
            try:
                scheduled_session = self._schedule_single_session(request)
                if scheduled_session:
                    results['scheduled_sessions'].append(scheduled_session)
                else:
                    results['unscheduled_requests'].append(request)
            except Exception as e:
                results['conflicts'].append({
                    'request': request,
                    'error': str(e)
                })
        
        # حساب نقاط التحسين
        results['optimization_score'] = self._calculate_optimization_score(results['scheduled_sessions'])
        results['statistics'] = self._generate_statistics(results)
        
        return results
    
    def _schedule_single_session(self, request: SchedulingRequest) -> Optional[Dict]:
        """جدولة جلسة واحدة"""
        
        # الحصول على المعالجين المتاحين
        available_therapists = self._get_available_therapists(request)
        if not available_therapists:
            return None
        
        # الحصول على الغرف المتاحة
        available_rooms = self._get_available_rooms(request)
        if not available_rooms:
            return None
        
        # العثور على أفضل وقت
        best_slot = self._find_optimal_time_slot(request, available_therapists, available_rooms)
        if not best_slot:
            return None
        
        # إنشاء الجلسة المجدولة
        session_data = {
            'beneficiary_id': request.beneficiary_id,
            'program_id': request.program_id,
            'therapist_id': best_slot['therapist_id'],
            'room_id': best_slot['room_id'],
            'session_date': best_slot['date'],
            'start_time': best_slot['start_time'],
            'end_time': best_slot['end_time'],
            'session_type': request.session_type,
            'duration_minutes': request.duration_minutes,
            'priority': request.priority.value,
            'scheduling_algorithm': 'automated',
            'optimization_score': best_slot.get('score', 0.0)
        }
        
        return session_data
    
    def _get_available_therapists(self, request: SchedulingRequest) -> List[Dict]:
        """الحصول على المعالجين المتاحين"""
        
        query = self.db.query(Therapist)
        
        # فلترة حسب التخصص إذا كان محدداً
        if request.preferred_therapist_id:
            query = query.filter(Therapist.id == request.preferred_therapist_id)
        
        therapists = query.filter(Therapist.is_active == True).all()
        
        available_therapists = []
        for therapist in therapists:
            # فحص الجدول الأسبوعي
            schedules = self.db.query(TherapistSchedule).filter(
                TherapistSchedule.therapist_id == therapist.id,
                TherapistSchedule.is_available == True
            ).all()
            
            if schedules:
                available_therapists.append({
                    'therapist': therapist,
                    'schedules': schedules,
                    'workload': self._calculate_therapist_workload(therapist.id)
                })
        
        return available_therapists
    
    def _get_available_rooms(self, request: SchedulingRequest) -> List[Dict]:
        """الحصول على الغرف المتاحة"""
        
        query = self.db.query(TherapyRoom)
        
        # فلترة حسب نوع الغرفة المطلوبة
        if request.session_type == SessionType.PHYSICAL_THERAPY:
            query = query.filter(TherapyRoom.room_type == RoomType.PHYSICAL_THERAPY)
        elif request.session_type == SessionType.SPEECH_THERAPY:
            query = query.filter(TherapyRoom.room_type == RoomType.SPEECH_THERAPY)
        elif request.session_type == SessionType.OCCUPATIONAL_THERAPY:
            query = query.filter(TherapyRoom.room_type == RoomType.OCCUPATIONAL_THERAPY)
        elif request.session_type == SessionType.BEHAVIORAL_THERAPY:
            query = query.filter(TherapyRoom.room_type == RoomType.BEHAVIORAL_THERAPY)
        
        if request.preferred_room_id:
            query = query.filter(TherapyRoom.id == request.preferred_room_id)
        
        rooms = query.filter(TherapyRoom.is_available == True).all()
        
        available_rooms = []
        for room in rooms:
            utilization = self._calculate_room_utilization(room.id)
            available_rooms.append({
                'room': room,
                'utilization': utilization
            })
        
        return available_rooms
    
    def _find_optimal_time_slot(self, request: SchedulingRequest, therapists: List[Dict], rooms: List[Dict]) -> Optional[Dict]:
        """العثور على أفضل فترة زمنية"""
        
        best_slot = None
        best_score = -1
        
        # تحديد نطاق التواريخ
        start_date = request.start_date or date.today() + timedelta(days=1)
        end_date = request.end_date or start_date + timedelta(weeks=4)
        
        current_date = start_date
        while current_date <= end_date:
            # تخطي عطلة نهاية الأسبوع إذا لم تكن مفضلة
            if current_date.weekday() >= 5:  # السبت والأحد
                if not request.constraints or 5 not in (request.constraints.preferred_days or []):
                    current_date += timedelta(days=1)
                    continue
            
            # فحص كل معالج وغرفة
            for therapist_info in therapists:
                for room_info in rooms:
                    # العثور على الأوقات المتاحة
                    available_slots = self._get_available_time_slots(
                        current_date, 
                        therapist_info['therapist'].id,
                        room_info['room'].id,
                        request.duration_minutes
                    )
                    
                    for slot in available_slots:
                        # حساب نقاط هذه الفترة
                        score = self._calculate_slot_score(
                            slot, request, therapist_info, room_info
                        )
                        
                        if score > best_score:
                            best_score = score
                            best_slot = {
                                'date': current_date,
                                'start_time': slot['start_time'],
                                'end_time': slot['end_time'],
                                'therapist_id': therapist_info['therapist'].id,
                                'room_id': room_info['room'].id,
                                'score': score
                            }
            
            current_date += timedelta(days=1)
        
        return best_slot
    
    def _get_available_time_slots(self, session_date: date, therapist_id: int, room_id: int, duration_minutes: int) -> List[Dict]:
        """الحصول على الفترات الزمنية المتاحة"""
        
        # الحصول على جدول المعالج لهذا اليوم
        day_of_week = session_date.weekday()
        therapist_schedule = self.db.query(TherapistSchedule).filter(
            TherapistSchedule.therapist_id == therapist_id,
            TherapistSchedule.day_of_week == day_of_week,
            TherapistSchedule.is_available == True
        ).first()
        
        if not therapist_schedule:
            return []
        
        # الحصول على الجلسات المجدولة مسبقاً
        existing_sessions = self.db.query(SessionSchedule).filter(
            SessionSchedule.session_date == session_date,
            ((SessionSchedule.therapist_id == therapist_id) | (SessionSchedule.room_id == room_id)),
            SessionSchedule.status.in_([SessionStatus.SCHEDULED, SessionStatus.CONFIRMED])
        ).all()
        
        # إنشاء قائمة الأوقات المحجوزة
        blocked_times = []
        for session in existing_sessions:
            blocked_times.append({
                'start': session.start_time,
                'end': session.end_time
            })
        
        # إضافة وقت الاستراحة
        if therapist_schedule.break_start_time and therapist_schedule.break_end_time:
            blocked_times.append({
                'start': therapist_schedule.break_start_time,
                'end': therapist_schedule.break_end_time
            })
        
        # العثور على الفترات المتاحة
        available_slots = []
        current_time = therapist_schedule.start_time
        end_time = therapist_schedule.end_time
        
        while current_time < end_time:
            slot_end_time = self._add_minutes_to_time(current_time, duration_minutes)
            
            if slot_end_time <= end_time:
                # فحص عدم التعارض مع الأوقات المحجوزة
                is_available = True
                for blocked in blocked_times:
                    if self._times_overlap(current_time, slot_end_time, blocked['start'], blocked['end']):
                        is_available = False
                        break
                
                if is_available:
                    available_slots.append({
                        'start_time': current_time,
                        'end_time': slot_end_time
                    })
            
            # الانتقال للفترة التالية (كل 30 دقيقة)
            current_time = self._add_minutes_to_time(current_time, 30)
        
        return available_slots
    
    def _calculate_slot_score(self, slot: Dict, request: SchedulingRequest, therapist_info: Dict, room_info: Dict) -> float:
        """حساب نقاط الفترة الزمنية"""
        
        score = 0.0
        
        # نقاط تفضيل المريض
        if request.constraints and request.constraints.preferred_times:
            slot_time_str = slot['start_time'].strftime('%H:%M')
            if slot_time_str in request.constraints.preferred_times:
                score += 20
        
        # نقاط توازن العبء
        therapist_workload = therapist_info['workload']
        if therapist_workload < 0.7:  # أقل من 70% استخدام
            score += 15
        elif therapist_workload > 0.9:  # أكثر من 90% استخدام
            score -= 10
        
        # نقاط استخدام الغرفة
        room_utilization = room_info['utilization']
        if room_utilization < 0.8:  # أقل من 80% استخدام
            score += 10
        
        # نقاط الوقت المفضل (الصباح أفضل)
        if slot['start_time'].hour < 12:
            score += 5
        
        # نقاط الأولوية
        priority_scores = {
            SchedulingPriority.URGENT: 30,
            SchedulingPriority.HIGH: 20,
            SchedulingPriority.MEDIUM: 10,
            SchedulingPriority.LOW: 0
        }
        score += priority_scores.get(request.priority, 0)
        
        return score
    
    def _calculate_therapist_workload(self, therapist_id: int) -> float:
        """حساب عبء العمل للمعالج"""
        
        # حساب الجلسات المجدولة للأسبوع القادم
        start_date = date.today()
        end_date = start_date + timedelta(weeks=1)
        
        scheduled_sessions = self.db.query(SessionSchedule).filter(
            SessionSchedule.therapist_id == therapist_id,
            SessionSchedule.session_date.between(start_date, end_date),
            SessionSchedule.status.in_([SessionStatus.SCHEDULED, SessionStatus.CONFIRMED])
        ).count()
        
        # حساب الحد الأقصى للجلسات الأسبوعية
        therapist_schedules = self.db.query(TherapistSchedule).filter(
            TherapistSchedule.therapist_id == therapist_id,
            TherapistSchedule.is_available == True
        ).all()
        
        max_weekly_sessions = sum(schedule.max_sessions_per_day for schedule in therapist_schedules)
        
        if max_weekly_sessions == 0:
            return 1.0
        
        return scheduled_sessions / max_weekly_sessions
    
    def _calculate_room_utilization(self, room_id: int) -> float:
        """حساب معدل استخدام الغرفة"""
        
        # حساب الساعات المحجوزة للأسبوع القادم
        start_date = date.today()
        end_date = start_date + timedelta(weeks=1)
        
        bookings = self.db.query(RoomBooking).filter(
            RoomBooking.room_id == room_id,
            RoomBooking.booking_date.between(start_date, end_date),
            RoomBooking.status == BookingStatus.CONFIRMED
        ).all()
        
        total_booked_hours = 0
        for booking in bookings:
            duration = datetime.combine(date.min, booking.end_time) - datetime.combine(date.min, booking.start_time)
            total_booked_hours += duration.total_seconds() / 3600
        
        # افتراض 8 ساعات عمل × 5 أيام = 40 ساعة أسبوعياً
        max_weekly_hours = 40
        
        return total_booked_hours / max_weekly_hours
    
    def _get_priority_score(self, priority: SchedulingPriority) -> int:
        """الحصول على نقاط الأولوية"""
        scores = {
            SchedulingPriority.URGENT: 4,
            SchedulingPriority.HIGH: 3,
            SchedulingPriority.MEDIUM: 2,
            SchedulingPriority.LOW: 1
        }
        return scores.get(priority, 1)
    
    def _calculate_optimization_score(self, scheduled_sessions: List[Dict]) -> float:
        """حساب نقاط التحسين الإجمالية"""
        
        if not scheduled_sessions:
            return 0.0
        
        total_score = sum(session.get('optimization_score', 0) for session in scheduled_sessions)
        return total_score / len(scheduled_sessions)
    
    def _generate_statistics(self, results: Dict) -> Dict:
        """إنتاج إحصائيات الجدولة"""
        
        total_requests = len(results['scheduled_sessions']) + len(results['unscheduled_requests'])
        
        return {
            'total_requests': total_requests,
            'scheduled_count': len(results['scheduled_sessions']),
            'unscheduled_count': len(results['unscheduled_requests']),
            'success_rate': len(results['scheduled_sessions']) / total_requests if total_requests > 0 else 0,
            'conflicts_count': len(results['conflicts']),
            'average_optimization_score': results['optimization_score']
        }
    
    def _add_minutes_to_time(self, time_obj: time, minutes: int) -> time:
        """إضافة دقائق لوقت معين"""
        dt = datetime.combine(date.min, time_obj) + timedelta(minutes=minutes)
        return dt.time()
    
    def _times_overlap(self, start1: time, end1: time, start2: time, end2: time) -> bool:
        """فحص تداخل الأوقات"""
        return start1 < end2 and end1 > start2

class SchedulingOptimizer:
    """محسن الجدولة المتقدم"""
    
    def __init__(self, db_session):
        self.db = db_session
        self.scheduler = AutomatedScheduler(db_session)
    
    def optimize_weekly_schedule(self, week_start_date: date) -> Dict:
        """تحسين الجدول الأسبوعي"""
        
        week_end_date = week_start_date + timedelta(days=6)
        
        # الحصول على جميع الجلسات المجدولة للأسبوع
        existing_sessions = self.db.query(SessionSchedule).filter(
            SessionSchedule.session_date.between(week_start_date, week_end_date),
            SessionSchedule.status.in_([SessionStatus.SCHEDULED, SessionStatus.CONFIRMED])
        ).all()
        
        # تحليل الجدول الحالي
        current_analysis = self._analyze_schedule(existing_sessions)
        
        # اقتراح تحسينات
        optimization_suggestions = self._generate_optimization_suggestions(existing_sessions, current_analysis)
        
        return {
            'week_period': f"{week_start_date} - {week_end_date}",
            'current_analysis': current_analysis,
            'optimization_suggestions': optimization_suggestions,
            'potential_improvements': self._calculate_potential_improvements(optimization_suggestions)
        }
    
    def _analyze_schedule(self, sessions: List[SessionSchedule]) -> Dict:
        """تحليل الجدول الحالي"""
        
        analysis = {
            'total_sessions': len(sessions),
            'therapist_workload': {},
            'room_utilization': {},
            'time_distribution': {},
            'conflicts': [],
            'gaps': []
        }
        
        # تحليل عبء العمل للمعالجين
        therapist_sessions = {}
        for session in sessions:
            therapist_id = session.therapist_id
            if therapist_id not in therapist_sessions:
                therapist_sessions[therapist_id] = []
            therapist_sessions[therapist_id].append(session)
        
        for therapist_id, therapist_session_list in therapist_sessions.items():
            analysis['therapist_workload'][therapist_id] = {
                'session_count': len(therapist_session_list),
                'total_hours': sum(self._calculate_session_duration(s) for s in therapist_session_list),
                'daily_distribution': self._get_daily_distribution(therapist_session_list)
            }
        
        # تحليل استخدام الغرف
        room_sessions = {}
        for session in sessions:
            room_id = session.room_id
            if room_id not in room_sessions:
                room_sessions[room_id] = []
            room_sessions[room_id].append(session)
        
        for room_id, room_session_list in room_sessions.items():
            analysis['room_utilization'][room_id] = {
                'session_count': len(room_session_list),
                'utilization_rate': self._calculate_room_utilization_rate(room_session_list)
            }
        
        return analysis
    
    def _generate_optimization_suggestions(self, sessions: List[SessionSchedule], analysis: Dict) -> List[Dict]:
        """إنتاج اقتراحات التحسين"""
        
        suggestions = []
        
        # اقتراحات توازن العبء
        for therapist_id, workload in analysis['therapist_workload'].items():
            if workload['session_count'] > 8:  # عبء زائد
                suggestions.append({
                    'type': 'workload_balance',
                    'priority': 'high',
                    'description': f'المعالج {therapist_id} لديه عبء عمل زائد ({workload["session_count"]} جلسات)',
                    'recommendation': 'إعادة توزيع بعض الجلسات على معالجين آخرين',
                    'therapist_id': therapist_id
                })
            elif workload['session_count'] < 3:  # عبء قليل
                suggestions.append({
                    'type': 'workload_balance',
                    'priority': 'medium',
                    'description': f'المعالج {therapist_id} لديه عبء عمل قليل ({workload["session_count"]} جلسات)',
                    'recommendation': 'إضافة المزيد من الجلسات لهذا المعالج',
                    'therapist_id': therapist_id
                })
        
        # اقتراحات استخدام الغرف
        for room_id, utilization in analysis['room_utilization'].items():
            if utilization['utilization_rate'] > 0.9:  # استخدام مرتفع
                suggestions.append({
                    'type': 'room_optimization',
                    'priority': 'medium',
                    'description': f'الغرفة {room_id} مستخدمة بكثافة عالية ({utilization["utilization_rate"]:.1%})',
                    'recommendation': 'توزيع بعض الجلسات على غرف أخرى',
                    'room_id': room_id
                })
        
        return suggestions
    
    def _calculate_session_duration(self, session: SessionSchedule) -> float:
        """حساب مدة الجلسة بالساعات"""
        if session.start_time and session.end_time:
            duration = datetime.combine(date.min, session.end_time) - datetime.combine(date.min, session.start_time)
            return duration.total_seconds() / 3600
        return 1.0  # افتراضي ساعة واحدة
    
    def _get_daily_distribution(self, sessions: List[SessionSchedule]) -> Dict:
        """الحصول على التوزيع اليومي للجلسات"""
        daily_count = {}
        for session in sessions:
            day = session.session_date.strftime('%A')
            daily_count[day] = daily_count.get(day, 0) + 1
        return daily_count
    
    def _calculate_room_utilization_rate(self, sessions: List[SessionSchedule]) -> float:
        """حساب معدل استخدام الغرفة"""
        total_hours = sum(self._calculate_session_duration(s) for s in sessions)
        # افتراض 8 ساعات عمل يومياً × 5 أيام = 40 ساعة أسبوعياً
        max_hours = 40
        return total_hours / max_hours
    
    def _calculate_potential_improvements(self, suggestions: List[Dict]) -> Dict:
        """حساب التحسينات المحتملة"""
        
        high_priority_count = len([s for s in suggestions if s['priority'] == 'high'])
        medium_priority_count = len([s for s in suggestions if s['priority'] == 'medium'])
        
        potential_score = 100 - (high_priority_count * 15) - (medium_priority_count * 5)
        
        return {
            'optimization_score': max(potential_score, 0),
            'high_priority_issues': high_priority_count,
            'medium_priority_issues': medium_priority_count,
            'estimated_improvement': min(high_priority_count * 10 + medium_priority_count * 5, 50)
        }

# دوال مساعدة للاستخدام في API
def create_scheduling_request(beneficiary_id: int, program_id: int, **kwargs) -> SchedulingRequest:
    """إنشاء طلب جدولة جديد"""
    return SchedulingRequest(
        beneficiary_id=beneficiary_id,
        program_id=program_id,
        **kwargs
    )

def schedule_bulk_sessions(db_session, requests: List[SchedulingRequest]) -> Dict:
    """جدولة مجموعة من الجلسات"""
    scheduler = AutomatedScheduler(db_session)
    return scheduler.schedule_sessions(requests)

def optimize_schedule(db_session, week_start_date: date) -> Dict:
    """تحسين الجدول الأسبوعي"""
    optimizer = SchedulingOptimizer(db_session)
    return optimizer.optimize_weekly_schedule(week_start_date)
