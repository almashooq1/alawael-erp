import json
from dataclasses import dataclass
from datetime import datetime, timedelta, time
from typing import List, Optional, Dict, Any

AR_WEEKDAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]

@dataclass
class Appointment:
    title: str
    start: datetime
    end: datetime
    location: Optional[str] = None
    attendees: Optional[List[str]] = None

@dataclass
class Task:
    title: str
    priority: str  # High, Medium, Low
    duration_minutes: int
    due: Optional[datetime] = None
    completed: bool = False

@dataclass
class Suggestion:
    message: str
    start: Optional[datetime] = None
    end: Optional[datetime] = None
    context: Optional[Dict[str, Any]] = None

class SmartScheduler:
    def __init__(self, work_start: time = time(9, 0), work_end: time = time(17, 0)) -> None:
        self.work_start = work_start
        self.work_end = work_end

    def _format_dt_ar(self, dt: datetime) -> str:
        wd = AR_WEEKDAYS[dt.weekday()]
        return f"{wd} {dt.strftime('%Y-%m-%d %H:%M')}"

    def _free_slots(self, day: datetime, appointments: List[Appointment]) -> List[tuple]:
        day_start = datetime.combine(day.date(), self.work_start)
        day_end = datetime.combine(day.date(), self.work_end)
        slots = []
        current = day_start
        for ap in sorted([a for a in appointments if a.start.date() == day.date()], key=lambda x: x.start):
            if ap.start > current:
                slots.append((current, ap.start))
            current = max(current, ap.end)
        if current < day_end:
            slots.append((current, day_end))
        return slots

    def suggest_task_slots(self, day: datetime, tasks: List[Task], appointments: List[Appointment]) -> List[Suggestion]:
        suggestions: List[Suggestion] = []
        slots = self._free_slots(day, appointments)
        # Prioritize tasks: High → Medium → Low
        priority_order = {"High": 0, "Medium": 1, "Low": 2}
        tasks_sorted = sorted([t for t in tasks if not t.completed], key=lambda t: (priority_order.get(t.priority, 3), t.due or datetime.max))
        for task in tasks_sorted:
            needed = timedelta(minutes=task.duration_minutes)
            for (s, e) in slots:
                if e - s >= needed:
                    sug = Suggestion(
                        message=f"اقتراح: جدولة المهمة '{task.title}' ({task.priority})",
                        start=s,
                        end=s + needed,
                        context={"task": task.title, "priority": task.priority, "duration_minutes": task.duration_minutes}
                    )
                    suggestions.append(sug)
                    # Update slot start to avoid overlapping suggestions using same slot repeatedly
                    idx = slots.index((s, e))
                    slots[idx] = (s + needed, e)
                    break
        # Overdue follow-ups
        now = datetime.now()
        for t in tasks:
            if t.due and t.due < now and not t.completed:
                suggestions.append(Suggestion(message=f"تذكير: المهمة '{t.title}' متأخرة. يُنصح بالتصرف اليوم."))
        return suggestions

class SmartNotifier:
    def compose_notification(self, suggestion: Suggestion) -> str:
        if suggestion.start and suggestion.end:
            return (
                f"🔔 {suggestion.message}\n"
                f"من: {suggestion.start.strftime('%H:%M')} إلى: {suggestion.end.strftime('%H:%M')}\n"
                f"تاريخ: {suggestion.start.strftime('%Y-%m-%d')} ({AR_WEEKDAYS[suggestion.start.weekday()]})"
            )
        return f"🔔 {suggestion.message}"

class EmailAssistant:
    def compose_meeting_invite(self, appointment: Appointment, organizer: str) -> str:
        date_str = appointment.start.strftime('%Y-%m-%d')
        start_str = appointment.start.strftime('%H:%M')
        end_str = appointment.end.strftime('%H:%M')
        attendees = ', '.join(appointment.attendees or [])
        return (
            f"السلام عليكم،\n\n"
            f"ندعوكم للاجتماع بعنوان: {appointment.title}\n"
            f"التاريخ: {date_str} ({AR_WEEKDAYS[appointment.start.weekday()]})\n"
            f"الوقت: {start_str} - {end_str}\n"
            f"المكان: {appointment.location or 'عن بعد'}\n"
            f"الحضور المتوقع: {attendees}\n\n"
            f"منظم الاجتماع: {organizer}\n"
            f"نرجو تأكيد الحضور.\n"
        )

# Utilities to load sample data

def _parse_datetime(value: str) -> datetime:
    return datetime.fromisoformat(value)

def load_appointments(path: str) -> List[Appointment]:
    with open(path, 'r', encoding='utf-8') as f:
        raw = json.load(f)
    out: List[Appointment] = []
    for r in raw:
        out.append(Appointment(
            title=r['title'],
            start=_parse_datetime(r['start']),
            end=_parse_datetime(r['end']),
            location=r.get('location'),
            attendees=r.get('attendees', [])
        ))
    return out

def load_tasks(path: str) -> List[Task]:
    with open(path, 'r', encoding='utf-8') as f:
        raw = json.load(f)
    out: List[Task] = []
    for r in raw:
        out.append(Task(
            title=r['title'],
            priority=r.get('priority', 'Medium'),
            duration_minutes=int(r.get('duration_minutes', 30)),
            due=_parse_datetime(r['due']) if r.get('due') else None,
            completed=bool(r.get('completed', False))
        ))
    return out

__all__ = [
    'Appointment', 'Task', 'Suggestion', 'SmartScheduler', 'SmartNotifier', 'EmailAssistant',
    'load_appointments', 'load_tasks'
]
