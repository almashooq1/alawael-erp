import urllib.request
import json
import sys
import os
import time

sys.stdout.reconfigure(encoding='utf-8')

TOKEN = os.environ.get('GITHUB_TOKEN', '')
headers = {'Accept': 'application/vnd.github+json'}
if TOKEN:
    headers['Authorization'] = f'token {TOKEN}'

TARGET_SHA = '08ad8c59fed3bdf9d3be1cc76cbdb38d44886405'
TARGET_SHORT = '08ad8c59'

def get_latest_runs():
    url = 'https://api.github.com/repos/almashooq1/alawael-erp/actions/runs?per_page=10&branch=main'
    req = urllib.request.Request(url, headers=headers)
    r = urllib.request.urlopen(req)
    return json.loads(r.read()).get('workflow_runs', [])

def get_jobs(run_id):
    url = f'https://api.github.com/repos/almashooq1/alawael-erp/actions/runs/{run_id}/jobs'
    req = urllib.request.Request(url, headers=headers)
    r = urllib.request.urlopen(req)
    return json.loads(r.read()).get('jobs', [])

def get_artifacts(run_id):
    url = f'https://api.github.com/repos/almashooq1/alawael-erp/actions/runs/{run_id}/artifacts'
    req = urllib.request.Request(url, headers=headers)
    r = urllib.request.urlopen(req)
    return json.loads(r.read()).get('artifacts', [])

def get_annotations(check_run_id):
    url = f'https://api.github.com/repos/almashooq1/alawael-erp/check-runs/{check_run_id}/annotations'
    req = urllib.request.Request(url, headers=headers)
    r = urllib.request.urlopen(req)
    return json.loads(r.read())

# Find CI Tests run for commit 08ad8c59
print(f"Looking for CI Tests run for commit {TARGET_SHORT}...")
ci_run = None
for poll in range(15):
    runs = get_latest_runs()
    for run in runs:
        if (TARGET_SHA in run['head_sha'] or TARGET_SHORT in run['head_sha']) and \
           'CI' in run['name'] and 'Tests' in run['name']:
            ci_run = run
            break
    if ci_run:
        print(f"Found: Run #{ci_run['run_number']} (ID: {ci_run['id']}) - {ci_run['name']}")
        break
    print(f"[Poll {poll+1}] Not found yet, waiting 10s...")
    time.sleep(10)

if not ci_run:
    print("Could not find CI Tests run. Showing all runs:")
    for r in runs[:5]:
        print(f"  #{r['run_number']} ({r['id']}) {r['name']} sha:{r['head_sha'][:12]} status:{r['status']}")
    sys.exit(1)

RUN_ID = ci_run['id']
print(f"\nPolling Run #{ci_run['run_number']} every 30s...")

for poll in range(25):
    url = f'https://api.github.com/repos/almashooq1/alawael-erp/actions/runs/{RUN_ID}'
    req = urllib.request.Request(url, headers=headers)
    r = urllib.request.urlopen(req)
    run_data = json.loads(r.read())
    status = run_data['status']
    conclusion = run_data.get('conclusion')
    print(f"[Poll {poll+1}] {status} | {conclusion or 'pending'}")

    if status == 'completed':
        print(f"\n{'✅' if conclusion=='success' else '❌'} Run #{ci_run['run_number']} completed: {conclusion}")
        jobs = get_jobs(RUN_ID)
        for job in jobs:
            if 'Backend Tests' in job['name']:
                c = job.get('conclusion', 'pending')
                icon = '✅' if c == 'success' else '❌'
                print(f"\n{icon} Backend Tests: {c}")
                for step in job.get('steps', []):
                    si = '✅' if step.get('conclusion') == 'success' else ('❌' if step.get('conclusion') == 'failure' else '⏸')
                    print(f"  {si} {step['name']}: {step.get('conclusion','pending')}")
        arts = get_artifacts(RUN_ID)
        for a in arts:
            print(f"\n📦 Artifact: {a['name']} ({a['size_in_bytes']}b compressed)")
        # Check annotations
        check_url = f'https://api.github.com/repos/almashooq1/alawael-erp/commits/{TARGET_SHA}/check-runs'
        req2 = urllib.request.Request(check_url, headers=headers)
        r2 = urllib.request.urlopen(req2)
        checks = json.loads(r2.read())
        for cr in checks.get('check_runs', []):
            if cr.get('conclusion') in ('failure', 'success') and 'Backend' in cr['name']:
                anns = get_annotations(cr['id'])
                failures = [a for a in anns if a['annotation_level'] == 'failure']
                if failures:
                    print(f"\n❌ Failure Annotations:")
                    for f in failures:
                        print(f"  {f.get('title','')}: {f.get('message','')[:300]}")
                else:
                    print(f"\n✅ No failure annotations!")
        break

    if poll < 24:
        time.sleep(30)
else:
    print("Timeout")
