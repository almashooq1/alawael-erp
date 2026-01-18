import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse
from datetime import datetime
from typing import List
import os
import sys

# Ensure parent directory is on sys.path so 'secretary_ai' can be imported when running this file directly
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from secretary_ai.smart_secretary import (
    SmartScheduler, SmartNotifier, EmailAssistant,
    Appointment, Task
)

PORT = 8080

class SecretaryHandler(BaseHTTPRequestHandler):
    scheduler = SmartScheduler()
    notifier = SmartNotifier()
    emailer = EmailAssistant()

    def _send(self, code: int, payload: dict):
        data = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _read_json(self) -> dict:
        length = int(self.headers.get('Content-Length', '0'))
        raw = self.rfile.read(length).decode('utf-8') if length > 0 else '{}'
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return {}

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == '/api/secretary/suggestions':
            self.handle_suggestions()
        elif parsed.path == '/api/secretary/invite':
            self.handle_invite()
        else:
            self._send(404, {"error": "not_found"})

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == '/health':
            self._send(200, {"status": "ok"})
        else:
            self._send(404, {"error": "not_found"})

    def handle_suggestions(self):
        body = self._read_json()
        try:
            date_str = body.get('date')
            if not date_str:
                raise ValueError('date is required (ISO string)')
            day = datetime.fromisoformat(date_str)

            ap_raw: List[dict] = body.get('appointments', [])
            tasks_raw: List[dict] = body.get('tasks', [])

            appointments: List[Appointment] = []
            for r in ap_raw:
                appointments.append(Appointment(
                    title=r['title'],
                    start=datetime.fromisoformat(r['start']),
                    end=datetime.fromisoformat(r['end']),
                    location=r.get('location'),
                    attendees=r.get('attendees', [])
                ))

            tasks: List[Task] = []
            for r in tasks_raw:
                tasks.append(Task(
                    title=r['title'],
                    priority=r.get('priority', 'Medium'),
                    duration_minutes=int(r.get('duration_minutes', 30)),
                    due=datetime.fromisoformat(r['due']) if r.get('due') else None,
                    completed=bool(r.get('completed', False))
                ))

            suggestions = self.scheduler.suggest_task_slots(day, tasks, appointments)
            out = []
            for s in suggestions:
                out.append({
                    'message': s.message,
                    'start': s.start.isoformat() if s.start else None,
                    'end': s.end.isoformat() if s.end else None,
                    'context': s.context or {}
                })
            self._send(200, { 'suggestions': out })
        except Exception as e:
            self._send(400, { 'error': str(e) })

    def handle_invite(self):
        body = self._read_json()
        try:
            ap = body.get('appointment')
            organizer = body.get('organizer', 'السكرتير الذكي')
            if not ap:
                raise ValueError('appointment is required')
            appointment = Appointment(
                title=ap['title'],
                start=datetime.fromisoformat(ap['start']),
                end=datetime.fromisoformat(ap['end']),
                location=ap.get('location'),
                attendees=ap.get('attendees', [])
            )
            invite_text = self.emailer.compose_meeting_invite(appointment, organizer)
            self._send(200, { 'invite': invite_text })
        except Exception as e:
            self._send(400, { 'error': str(e) })

if __name__ == '__main__':
    server = HTTPServer(('0.0.0.0', PORT), SecretaryHandler)
    print(f"Smart Secretary API running on http://localhost:{PORT}")
    server.serve_forever()
