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

def get_latest_ci_run():
    """Get the latest CI run for commit 5c4236c1"""
    url = 'https://api.github.com/repos/almashooq1/alawael-erp/actions/runs?per_page=5&branch=main'
    req = urllib.request.Request(url, headers=headers)
    r = urllib.request.urlopen(req)
    data = json.loads(r.read())
    for run in data.get('workflow_runs', []):
        if '5c4236c1' in run['head_sha'] or run['head_commit']['message'].startswith('fix(ci): remove --json'):
            return run
    # Return first run if not found by SHA
    runs = data.get('workflow_runs', [])
    if runs:
        return runs[0]
    return None

def get_jobs(run_id):
    url = f'https://api.github.com/repos/almashooq1/alawael-erp/actions/runs/{run_id}/jobs'
    req = urllib.request.Request(url, headers=headers)
    r = urllib.request.urlopen(req)
    return json.loads(r.read())

# First, find the run
print("Looking for CI run for commit 5c4236c1...")
run = None
for attempt in range(5):
    run = get_latest_ci_run()
    if run and '5c4236c1' in run['head_sha']:
        print(f"Found Run #{run['run_number']} (ID: {run['id']})")
        break
    print(f"Waiting 10s for run to appear... (attempt {attempt+1})")
    time.sleep(10)

if not run:
    print("Could not find the run for commit 5c4236c1")
    sys.exit(1)

RUN_ID = run['id']
RUN_NUM = run['run_number']
print(f"\nPolling Run #{RUN_NUM} (ID: {RUN_ID}) every 30 seconds...")

for poll in range(25):  # max 12.5 minutes
    url = f'https://api.github.com/repos/almashooq1/alawael-erp/actions/runs/{RUN_ID}'
    req = urllib.request.Request(url, headers=headers)
    r = urllib.request.urlopen(req)
    run_data = json.loads(r.read())
    status = run_data['status']
    conclusion = run_data.get('conclusion')

    print(f"[Poll {poll+1}] Status: {status} | Conclusion: {conclusion or 'pending'}")

    if status == 'completed':
        print(f"\n✅ Run completed! Conclusion: {conclusion}")
        jobs_data = get_jobs(RUN_ID)
        for job in jobs_data.get('jobs', []):
            if 'Backend Tests' in job['name']:
                print(f"\n=== Backend Tests Job: {job.get('conclusion', 'pending')} ===")
                for step in job.get('steps', []):
                    icon = '✅' if step.get('conclusion') == 'success' else ('❌' if step.get('conclusion') == 'failure' else '⏸')
                    print(f"  {icon} [{step.get('conclusion','pending')}] {step['name']}")
        # Check artifacts
        art_url = f'https://api.github.com/repos/almashooq1/alawael-erp/actions/runs/{RUN_ID}/artifacts'
        req2 = urllib.request.Request(art_url, headers=headers)
        r2 = urllib.request.urlopen(req2)
        arts = json.loads(r2.read())
        print(f"\n=== Artifacts ===")
        for a in arts.get('artifacts', []):
            print(f"  {a['name']} (size:{a['size_in_bytes']}b compressed) ID:{a['id']}")
        # Check commit comment
        commit_sha = run_data['head_sha']
        print(f"\n=== Commit: {commit_sha[:12]} ===")
        comment_url = f'https://api.github.com/repos/almashooq1/alawael-erp/commits/{commit_sha}/comments'
        req3 = urllib.request.Request(comment_url, headers=headers)
        r3 = urllib.request.urlopen(req3)
        comments = json.loads(r3.read())
        print(f"Comments: {len(comments)}")
        for c in comments:
            body = c['body']
            print(f"\n--- Comment by {c['user']['login']} ---")
            print(body[:5000])
        break

    if poll < 24:
        time.sleep(30)
else:
    print("Timeout after 12.5 minutes")
