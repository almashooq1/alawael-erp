"""
نظام Task Queue & Job Scheduler للعمليات في الخلفية
Advanced Task Queue & Job Scheduler System
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Callable, Any
from enum import Enum
import json
import logging
import uuid
import threading
from queue import Queue, PriorityQueue
from abc import ABC, abstractmethod
import traceback
from functools import wraps

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ==================== تعريفات النظام ====================

class TaskStatus(Enum):
    """حالات المهام"""
    PENDING = "pending"
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRYING = "retrying"
    CANCELLED = "cancelled"


class TaskPriority(Enum):
    """أولويات المهام"""
    CRITICAL = 1
    HIGH = 2
    NORMAL = 3
    LOW = 4
    BACKGROUND = 5


class JobType(Enum):
    """أنواع الوظائف"""
    EMAIL_SEND = "email.send"
    REPORT_GENERATE = "report.generate"
    DATA_EXPORT = "data.export"
    CLEANUP = "cleanup"
    BACKUP = "backup"
    ANALYSIS = "analysis"
    NOTIFICATION = "notification"
    SYNC = "sync"


class RecurrencePattern(Enum):
    """أنماط التكرار"""
    ONCE = "once"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    HOURLY = "hourly"


# ==================== نظام المهام ====================

class Task:
    """كلاس المهمة الأساسية"""
    
    def __init__(self, task_id: str, job_type: JobType, 
                 data: Dict[str, Any], priority: TaskPriority = TaskPriority.NORMAL):
        self.id = task_id
        self.job_type = job_type
        self.data = data
        self.priority = priority
        self.status = TaskStatus.PENDING
        
        self.created_at = datetime.now()
        self.started_at = None
        self.completed_at = None
        self.failed_at = None
        
        self.attempts = 0
        self.max_attempts = 3
        
        self.result = None
        self.error = None
        self.error_traceback = None
    
    def __lt__(self, other):
        """المقارنة للأولوية في PriorityQueue"""
        if self.priority.value != other.priority.value:
            return self.priority.value < other.priority.value
        return self.created_at < other.created_at
    
    def start(self):
        """بدء المهمة"""
        self.status = TaskStatus.RUNNING
        self.started_at = datetime.now()
    
    def complete(self, result: Any = None):
        """إكمال المهمة بنجاح"""
        self.status = TaskStatus.COMPLETED
        self.completed_at = datetime.now()
        self.result = result
        logger.info(f"✅ أكملت المهمة: {self.id}")
    
    def fail(self, error: Exception = None):
        """فشل المهمة"""
        self.attempts += 1
        self.failed_at = datetime.now()
        
        if error:
            self.error = str(error)
            self.error_traceback = traceback.format_exc()
        
        if self.attempts >= self.max_attempts:
            self.status = TaskStatus.FAILED
            logger.error(f"❌ فشلت المهمة بعد {self.attempts} محاولات: {self.id}")
        else:
            self.status = TaskStatus.RETRYING
            logger.warning(f"🔄 إعادة محاولة المهمة: {self.id}")
    
    def cancel(self):
        """إلغاء المهمة"""
        self.status = TaskStatus.CANCELLED
        logger.info(f"❌ تم إلغاء المهمة: {self.id}")
    
    def to_dict(self) -> Dict:
        """تحويل إلى قاموس"""
        return {
            'id': self.id,
            'job_type': self.job_type.value,
            'priority': self.priority.name,
            'status': self.status.value,
            'created_at': self.created_at.isoformat(),
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'attempts': self.attempts,
            'max_attempts': self.max_attempts,
            'result': self.result,
            'error': self.error,
            'duration_seconds': (
                (self.completed_at - self.started_at).total_seconds()
                if self.completed_at and self.started_at else None
            )
        }


# ==================== نظام الجدولة ====================

class ScheduledJob:
    """وظيفة مجدولة"""
    
    def __init__(self, job_id: str, job_type: JobType, 
                 data: Dict[str, Any], 
                 schedule_time: datetime = None,
                 recurrence: RecurrencePattern = RecurrencePattern.ONCE):
        self.id = job_id
        self.job_type = job_type
        self.data = data
        self.schedule_time = schedule_time or datetime.now()
        self.recurrence = recurrence
        
        self.created_at = datetime.now()
        self.last_run = None
        self.next_run = self.schedule_time
        self.is_active = True
        self.run_count = 0
    
    def should_run(self) -> bool:
        """يجب تشغيل الوظيفة الآن؟"""
        if not self.is_active:
            return False
        
        return datetime.now() >= self.next_run
    
    def execute(self, on_complete: Callable = None):
        """تنفيذ الوظيفة"""
        logger.info(f"⏰ تنفيذ الوظيفة المجدولة: {self.id}")
        
        self.last_run = datetime.now()
        self.run_count += 1
        
        # حساب التشغيل التالي
        if self.recurrence == RecurrencePattern.DAILY:
            self.next_run = self.last_run + timedelta(days=1)
        elif self.recurrence == RecurrencePattern.WEEKLY:
            self.next_run = self.last_run + timedelta(weeks=1)
        elif self.recurrence == RecurrencePattern.MONTHLY:
            self.next_run = self.last_run + timedelta(days=30)
        elif self.recurrence == RecurrencePattern.HOURLY:
            self.next_run = self.last_run + timedelta(hours=1)
        
        if on_complete:
            on_complete(self)
    
    def to_dict(self) -> Dict:
        """تحويل إلى قاموس"""
        return {
            'id': self.id,
            'job_type': self.job_type.value,
            'recurrence': self.recurrence.value,
            'next_run': self.next_run.isoformat(),
            'last_run': self.last_run.isoformat() if self.last_run else None,
            'run_count': self.run_count,
            'is_active': self.is_active
        }


# ==================== مدير قائمة الانتظار ====================

class TaskQueue:
    """مدير قائمة انتظار المهام"""
    
    def __init__(self, num_workers: int = 4):
        self.queue = PriorityQueue()
        self.tasks: Dict[str, Task] = {}
        self.results: Dict[str, Any] = {}
        self.num_workers = num_workers
        self.is_running = False
        self.workers = []
        
        # إحصائيات
        self.stats = {
            'total': 0,
            'completed': 0,
            'failed': 0,
            'retrying': 0
        }
    
    def submit(self, task: Task) -> str:
        """إرسال مهمة"""
        
        task.status = TaskStatus.QUEUED
        self.tasks[task.id] = task
        self.queue.put((task.priority.value, task))
        
        self.stats['total'] += 1
        logger.info(f"📝 مهمة أُضيفت: {task.id}")
        
        return task.id
    
    def start(self):
        """بدء معالجة المهام"""
        
        if self.is_running:
            logger.warning("معالج المهام يعمل بالفعل")
            return
        
        self.is_running = True
        
        # إنشاء عمال
        for i in range(self.num_workers):
            worker = threading.Thread(
                target=self._worker_loop,
                args=(i,),
                daemon=True
            )
            self.workers.append(worker)
            worker.start()
        
        logger.info(f"✅ معالج المهام بدأ مع {self.num_workers} عمال")
    
    def stop(self):
        """إيقاف معالجة المهام"""
        
        self.is_running = False
        
        # الانتظار حتى ينتهي العمال
        for worker in self.workers:
            worker.join(timeout=5)
        
        logger.info("⏹️ تم إيقاف معالج المهام")
    
    def _worker_loop(self, worker_id: int):
        """حلقة معالج العامل"""
        
        logger.info(f"👷 عامل #{worker_id} بدأ العمل")
        
        while self.is_running:
            try:
                # الحصول على المهمة
                priority, task = self.queue.get(timeout=2)
                
                # تنفيذ المهمة
                self._execute_task(task)
                
            except Exception as e:
                logger.debug(f"خطأ في العامل: {e}")
        
        logger.info(f"👷 عامل #{worker_id} انتهى")
    
    def _execute_task(self, task: Task):
        """تنفيذ المهمة"""
        
        try:
            task.start()
            
            # محاكاة المعالجة
            result = self._process_job(task)
            
            task.complete(result)
            self.stats['completed'] += 1
            self.results[task.id] = result
        
        except Exception as e:
            task.fail(e)
            
            # إعادة المحاولة إذا كانت ممكنة
            if task.status == TaskStatus.RETRYING:
                self.queue.put((task.priority.value, task))
                self.stats['retrying'] += 1
            else:
                self.stats['failed'] += 1
    
    def _process_job(self, task: Task) -> Any:
        """معالجة الوظيفة"""
        
        logger.info(f"⚙️ معالجة {task.job_type.value}: {task.id}")
        
        if task.job_type == JobType.EMAIL_SEND:
            return self._send_email(task.data)
        elif task.job_type == JobType.REPORT_GENERATE:
            return self._generate_report(task.data)
        elif task.job_type == JobType.DATA_EXPORT:
            return self._export_data(task.data)
        elif task.job_type == JobType.ANALYSIS:
            return self._run_analysis(task.data)
        else:
            return {"status": "processed"}
    
    def _send_email(self, data: Dict) -> Dict:
        """إرسال بريد إلكتروني"""
        logger.info(f"📧 إرسال بريد إلى {data.get('to')}")
        return {"sent": True, "email": data.get('to')}
    
    def _generate_report(self, data: Dict) -> Dict:
        """توليد تقرير"""
        logger.info(f"📊 توليد تقرير: {data.get('type')}")
        return {"report_id": str(uuid.uuid4()), "type": data.get('type')}
    
    def _export_data(self, data: Dict) -> Dict:
        """تصدير البيانات"""
        logger.info(f"💾 تصدير {data.get('format')}")
        return {"file_id": str(uuid.uuid4()), "format": data.get('format')}
    
    def _run_analysis(self, data: Dict) -> Dict:
        """تشغيل التحليل"""
        logger.info(f"🔬 تحليل: {data.get('type')}")
        return {"analysis_id": str(uuid.uuid4()), "results": {}}
    
    def get_task_status(self, task_id: str) -> Optional[Dict]:
        """الحصول على حالة المهمة"""
        
        if task_id in self.tasks:
            return self.tasks[task_id].to_dict()
        
        return None
    
    def get_statistics(self) -> Dict:
        """الحصول على الإحصائيات"""
        
        return {
            'total_tasks': self.stats['total'],
            'completed': self.stats['completed'],
            'failed': self.stats['failed'],
            'retrying': self.stats['retrying'],
            'pending': self.queue.qsize(),
            'success_rate': (
                (self.stats['completed'] / self.stats['total'] * 100)
                if self.stats['total'] > 0 else 0
            )
        }


# ==================== مدير الجدولة ====================

class Scheduler:
    """مدير الجدولة"""
    
    def __init__(self, task_queue: TaskQueue):
        self.task_queue = task_queue
        self.scheduled_jobs: Dict[str, ScheduledJob] = {}
        self.is_running = False
        self.scheduler_thread = None
    
    def schedule_job(self, job_type: JobType, 
                    data: Dict[str, Any],
                    schedule_time: datetime = None,
                    recurrence: RecurrencePattern = RecurrencePattern.ONCE) -> str:
        """جدولة وظيفة جديدة"""
        
        job_id = str(uuid.uuid4())
        job = ScheduledJob(
            job_id=job_id,
            job_type=job_type,
            data=data,
            schedule_time=schedule_time,
            recurrence=recurrence
        )
        
        self.scheduled_jobs[job_id] = job
        
        logger.info(f"📅 جدولة وظيفة: {job_id} - {job_type.value}")
        
        return job_id
    
    def start(self):
        """بدء الجدولة"""
        
        if self.is_running:
            return
        
        self.is_running = True
        self.scheduler_thread = threading.Thread(
            target=self._scheduler_loop,
            daemon=True
        )
        self.scheduler_thread.start()
        
        logger.info("✅ مدير الجدولة بدأ")
    
    def stop(self):
        """إيقاف الجدولة"""
        
        self.is_running = False
        if self.scheduler_thread:
            self.scheduler_thread.join(timeout=5)
        
        logger.info("⏹️ تم إيقاف مدير الجدولة")
    
    def _scheduler_loop(self):
        """حلقة الجدول"""
        
        while self.is_running:
            for job_id, job in list(self.scheduled_jobs.items()):
                if job.should_run():
                    # إنشاء مهمة
                    task = Task(
                        str(uuid.uuid4()),
                        job.job_type,
                        job.data,
                        TaskPriority.NORMAL
                    )
                    
                    # إرسال المهمة
                    self.task_queue.submit(task)
                    
                    # تحديث الوظيفة
                    job.execute()
                    
                    # إزالة إذا كانت لمرة واحدة
                    if job.recurrence == RecurrencePattern.ONCE:
                        del self.scheduled_jobs[job_id]
            
            threading.Event().wait(1)  # الانتظار قبل الفحص التالي
    
    def get_scheduled_jobs(self) -> List[Dict]:
        """قائمة الوظائف المجدولة"""
        
        return [job.to_dict() for job in self.scheduled_jobs.values()]


# ==================== عرض توضيحي ====================

def demo_task_queue_and_scheduler():
    """عرض توضيحي للنظام"""
    
    print("⚙️ عرض توضيحي لـ Task Queue و Scheduler\n")
    
    # 1. إنشاء قائمة الانتظار
    print("1️⃣ إنشاء قائمة الانتظار:")
    task_queue = TaskQueue(num_workers=2)
    task_queue.start()
    
    # 2. إضافة مهام
    print("\n2️⃣ إضافة مهام:")
    
    tasks = [
        Task("task_1", JobType.EMAIL_SEND, {'to': 'student@example.com'}),
        Task("task_2", JobType.REPORT_GENERATE, {'type': 'performance'}),
        Task("task_3", JobType.DATA_EXPORT, {'format': 'excel'}),
    ]
    
    for task in tasks:
        task_queue.submit(task)
    
    print(f"   {len(tasks)} مهام تم إضافتها")
    
    # 3. مدير الجدولة
    print("\n3️⃣ مدير الجدولة:")
    scheduler = Scheduler(task_queue)
    scheduler.start()
    
    scheduler.schedule_job(
        JobType.BACKUP,
        {'target': 'database'},
        schedule_time=datetime.now() + timedelta(minutes=1),
        recurrence=RecurrencePattern.DAILY
    )
    
    print(f"   وظيفة مجدولة")
    
    # الانتظار قليلاً
    import time
    time.sleep(3)
    
    # 4. الإحصائيات
    print("\n4️⃣ الإحصائيات:")
    stats = task_queue.get_statistics()
    print(f"   المجموع: {stats['total_tasks']}")
    print(f"   مكتملة: {stats['completed']}")
    print(f"   معدل النجاح: {stats['success_rate']:.1f}%")
    
    # الإيقاف
    task_queue.stop()
    scheduler.stop()


if __name__ == '__main__':
    demo_task_queue_and_scheduler()
