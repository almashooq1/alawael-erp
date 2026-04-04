import urllib.request
import json
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

TOKEN = os.environ.get('GITHUB_TOKEN', '')

RUN_ID = 23892780791

headers = {'Accept': 'application/vnd.github+json'}
if TOKEN:
    headers['Authorization'] = f'token {TOKEN}'

# Get jobs
url = f'https://api.github.com/repos/almashooq1/alawael-erp/actions/runs/{RUN_ID}/jobs'
req = urllib.request.Request(url, headers=headers)
r = urllib.request.urlopen(req)
jobs = json.loads(r.read())

# Find Backend Tests job
backend_job = None
for j in jobs['jobs']:
    if 'Backend Tests' in j['name']:
        backend_job = j
        break

if not backend_job:
    print("Backend Tests job not found!")
    sys.exit(1)

job_id = backend_job['id']
print(f"Job ID: {job_id}")
print(f"Job: {backend_job['name']} => {backend_job['conclusion']}")
print()

# Get logs
log_url = f'https://api.github.com/repos/almashooq1/alawael-erp/actions/jobs/{job_id}/logs'
req2 = urllib.request.Request(log_url, headers=headers)
try:
    r2 = urllib.request.urlopen(req2)
    logs = r2.read().decode('utf-8', errors='replace')
    # Print last 200 lines
    lines = logs.split('\n')
    print(f"Total log lines: {len(lines)}")
    print("\n=== LAST 100 LINES ===")
    for line in lines[-100:]:
        print(line)
except urllib.error.HTTPError as e:
    print(f"HTTP Error: {e.code} - {e.reason}")
    print("Note: You may need a GITHUB_TOKEN with actions:read permission")
    print("Set: set GITHUB_TOKEN=your_token_here")
