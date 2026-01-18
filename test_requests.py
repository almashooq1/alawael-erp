import json
import urllib.request

BASE = 'http://localhost:8080'

with open('data/appointments_sample.json', 'r', encoding='utf-8') as f:
    appointments = json.load(f)
with open('data/tasks_sample.json', 'r', encoding='utf-8') as f:
    tasks = json.load(f)

# Suggestions
suggestions_body = json.dumps({
    'date': '2026-01-18T00:00:00',
    'appointments': appointments,
    'tasks': tasks
}, ensure_ascii=False).encode('utf-8')
req = urllib.request.Request(BASE + '/api/secretary/suggestions', data=suggestions_body, headers={'Content-Type': 'application/json'})
with urllib.request.urlopen(req) as resp:
    print('Suggestions:', resp.status)
    print(resp.read().decode('utf-8'))

# Invite
invite_body = json.dumps({
    'appointment': appointments[0],
    'organizer': 'السكرتير الذكي'
}, ensure_ascii=False).encode('utf-8')
req2 = urllib.request.Request(BASE + '/api/secretary/invite', data=invite_body, headers={'Content-Type': 'application/json'})
with urllib.request.urlopen(req2) as resp2:
    print('Invite:', resp2.status)
    print(resp2.read().decode('utf-8'))
