import urllib.request
import json
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

TOKEN = os.environ.get('GITHUB_TOKEN', '')
headers = {'Accept': 'application/vnd.github+json'}
if TOKEN:
    headers['Authorization'] = f'token {TOKEN}'

# Get latest runs
url = 'https://api.github.com/repos/almashooq1/alawael-erp/actions/runs?per_page=5&branch=main'
req = urllib.request.Request(url, headers=headers)
r = urllib.request.urlopen(req)
data = json.loads(r.read())

print("Latest CI Runs:")
for run in data.get('workflow_runs', []):
    print(f"\n  Run #{run['run_number']} (ID: {run['id']})")
    print(f"  Status: {run['status']} | Conclusion: {run.get('conclusion','pending')}")
    print(f"  Commit: {run['head_sha'][:12]} - {run['head_commit']['message'][:60]}")
    print(f"  Created: {run['created_at']}")

# Get jobs for the latest run
if data.get('workflow_runs'):
    latest = data['workflow_runs'][0]
    run_id = latest['id']
    print(f"\n\n=== Jobs for Run #{latest['run_number']} (ID: {run_id}) ===")
    jobs_url = f'https://api.github.com/repos/almashooq1/alawael-erp/actions/runs/{run_id}/jobs'
    req2 = urllib.request.Request(jobs_url, headers=headers)
    r2 = urllib.request.urlopen(req2)
    jobs = json.loads(r2.read())
    for job in jobs.get('jobs', []):
        print(f"\n  Job: {job['name']}")
        print(f"  Status: {job['status']} | Conclusion: {job.get('conclusion','pending')}")
        for step in job.get('steps', []):
            icon = '✅' if step.get('conclusion') == 'success' else ('❌' if step.get('conclusion') == 'failure' else '⏸')
            print(f"    {icon} [{step.get('conclusion','pending')}] {step['name']}")
