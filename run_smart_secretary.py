from datetime import datetime
from secretary_ai.smart_secretary import (
    load_appointments, load_tasks,
    SmartScheduler, SmartNotifier, EmailAssistant, Appointment
)

APPOINTMENTS_PATH = "data/appointments_sample.json"
TASKS_PATH = "data/tasks_sample.json"

if __name__ == "__main__":
    appointments = load_appointments(APPOINTMENTS_PATH)
    tasks = load_tasks(TASKS_PATH)

    # Use today's date or next business day if weekend
    today = datetime(2026, 1, 18)  # fixed for reproducibility; adjust to datetime.now() in real
    scheduler = SmartScheduler()
    notifier = SmartNotifier()
    emailer = EmailAssistant()

    suggestions = scheduler.suggest_task_slots(today, tasks, appointments)

    print("\n=== اقتراحات ذكية لجدولة المهام اليوم ===")
    for s in suggestions:
        print(notifier.compose_notification(s))

    # Compose a sample meeting invite using first appointment if available
    if appointments:
        organizer = "السكرتير الذكي"
        invite = emailer.compose_meeting_invite(appointments[0], organizer)
        print("\n=== نموذج دعوة اجتماع ===")
        print(invite)
