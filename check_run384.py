import urllib.request
import json
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

TOKEN = os.environ.get('GITHUB_TOKEN', '')
headers = {'Accept': 'application/vnd.github+json'}
if TOKEN:
    headers['Authorization'] = f'token {TOKEN}'

RUN_ID = 23894398881  # Run #384 for commit 5c4236c1

# Get jobs
jobs_url = f'https://api.github.com/repos/almashooq1/alawael-erp/actions/runs/{RUN_ID}/jobs'
req = urllib.request.Request(jobs_url, headers=headers)
r = urllib.request.urlopen(req)
jobs_data = json.loads(r.read())

print(f"=== Jobs for Run #384 (ID: {RUN_ID}) ===")
for job in jobs_data.get('jobs', []):
    print(f"\n  Job: {job['name']} | {job['status']} | {job.get('conclusion','pending')}")
    for step in job.get('steps', []):
        icon = '✅' if step.get('conclusion') == 'success' else ('❌' if step.get('conclusion') == 'failure' else '⏸')
        print(f"    {icon} [{step.get('conclusion','pending')}] {step['name']}")

# Get artifacts
art_url = f'https://api.github.com/repos/almashooq1/alawael-erp/actions/runs/{RUN_ID}/artifacts'
req2 = urllib.request.Request(art_url, headers=headers)
r2 = urllib.request.urlopen(req2)
arts = json.loads(r2.read())
print(f"\n=== Artifacts ===")
for a in arts.get('artifacts', []):
    print(f"  {a['name']} (compressed size:{a['size_in_bytes']}b) ID:{a['id']}")
    print(f"  URL: {a['archive_download_url']}")

# Get commit comment
COMMIT_SHA = '5c4236c1f3f03ae3d749e9a0f2cbb4f2c51dc32f'
comment_url = f'https://api.github.com/repos/almashooq1/alawael-erp/commits/{COMMIT_SHA}/comments'
req3 = urllib.request.Request(comment_url, headers=headers)
r3 = urllib.request.urlopen(req3)
comments = json.loads(r3.read())
print(f"\n=== Commit Comments ({len(comments)}) ===")
for c in comments:
    print(f"\n--- by {c['user']['login']} at {c['created_at']} ---")
    print(c['body'][:8000])

# Get check run annotations
check_url = f'https://api.github.com/repos/almashooq1/alawael-erp/commits/{COMMIT_SHA}/check-runs'
req4 = urllib.request.Request(check_url, headers=headers)
r4 = urllib.request.urlopen(req4)
checks = json.loads(r4.read())
print(f"\n=== Check Run Annotations ===")
for cr in checks.get('check_runs', []):
    if cr.get('conclusion') == 'failure' and 'Backend' in cr['name']:
        ann_url = f"https://api.github.com/repos/almashooq1/alawael-erp/check-runs/{cr['id']}/annotations"
        req5 = urllib.request.Request(ann_url, headers=headers)
        r5 = urllib.request.urlopen(req5)
        annotations = json.loads(r5.read())
        print(f"\nAnnotations for '{cr['name']}' ({len(annotations)}):")
        for ann in annotations:
            print(f"  [{ann['annotation_level']}] {ann.get('title','')}: {ann.get('message','')[:500]}")
