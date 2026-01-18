import json
import threading
import time
from http.server import HTTPServer
import urllib.request
import urllib.error

from secretary_ai.server import SecretaryHandler

HOST = '127.0.0.1'
PORT = 8090  # use a test port to avoid conflicts
BASE = f'http://{HOST}:{PORT}'


def start_server():
    server = HTTPServer((HOST, PORT), SecretaryHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, thread


def wait_health(timeout_seconds=10):
    deadline = time.time() + timeout_seconds
    url = BASE + '/health'
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=2) as resp:
                if resp.status == 200:
                    body = resp.read().decode('utf-8')
                    if 'ok' in body:
                        return True
        except Exception:
            time.sleep(0.5)
    return False


def post_json(path, payload):
    data = json.dumps(payload, ensure_ascii=False).encode('utf-8')
    req = urllib.request.Request(BASE + path, data=data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=5) as resp:
        return resp.status, resp.read().decode('utf-8')


if __name__ == '__main__':
    server, thread = start_server()
    try:
        if not wait_health(10):
            raise RuntimeError('Health check failed')

        with open('data/appointments_sample.json', 'r', encoding='utf-8') as f:
            appointments = json.load(f)
        with open('data/tasks_sample.json', 'r', encoding='utf-8') as f:
            tasks = json.load(f)

        # Suggestions
        status, body = post_json('/api/secretary/suggestions', {
            'date': '2026-01-18T00:00:00',
            'appointments': appointments,
            'tasks': tasks,
        })
        print('Suggestions status:', status)
        print(body)

        # Invite
        status2, body2 = post_json('/api/secretary/invite', {
            'appointment': appointments[0],
            'organizer': 'السكرتير الذكي',
        })
        print('Invite status:', status2)
        print(body2)
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)
        print('Server shutdown complete')
