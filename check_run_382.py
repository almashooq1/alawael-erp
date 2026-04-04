import urllib.request
import json
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

TOKEN = os.environ.get('GITHUB_TOKEN', '')
headers = {'Accept': 'application/vnd.github+json'}
if TOKEN:
    headers['Authorization'] = f'token {TOKEN}'

# Check Run #382 (ID: 23893864502) - the CI Tests run for commit 70f7771c
RUN_ID = 23893864502

jobs_url = f'https://api.github.com/repos/almashooq1/alawael-erp/actions/runs/{RUN_ID}/jobs'
req = urllib.request.Request(jobs_url, headers=headers)
r = urllib.request.urlopen(req)
jobs = json.loads(r.read())

print(f"=== Jobs for Run #382 (ID: {RUN_ID}) ===")
for job in jobs.get('jobs', []):
    print(f"\n  Job: {job['name']}")
    print(f"  Status: {job['status']} | Conclusion: {job.get('conclusion','pending')}")
    for step in job.get('steps', []):
        icon = '✅' if step.get('conclusion') == 'success' else ('❌' if step.get('conclusion') == 'failure' else '⏸')
        print(f"    {icon} [{step.get('conclusion','pending')}] {step['name']}")

# Also check artifacts
art_url = f'https://api.github.com/repos/almashooq1/alawael-erp/actions/runs/{RUN_ID}/artifacts'
req2 = urllib.request.Request(art_url, headers=headers)
r2 = urllib.request.urlopen(req2)
arts = json.loads(r2.read())
print(f"\n=== Artifacts for Run #382 ===")
for a in arts.get('artifacts', []):
    print(f"  - {a['name']} (size:{a['size_in_bytes']}b) ID:{a['id']}")
    print(f"    {a['archive_download_url']}")
