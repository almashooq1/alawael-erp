import urllib.request
import json
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

TOKEN = os.environ.get('GITHUB_TOKEN', '')
headers = {'Accept': 'application/vnd.github+json'}
if TOKEN:
    headers['Authorization'] = f'token {TOKEN}'

# Full SHA for cb26121e
COMMIT_SHA = 'cb26121e41eb1a9835e8f8860bf9a5eef8956d96'

url = f'https://api.github.com/repos/almashooq1/alawael-erp/commits/{COMMIT_SHA}/comments'
req = urllib.request.Request(url, headers=headers)
r = urllib.request.urlopen(req)
data = json.loads(r.read())

print(f"Comments for commit cb26121e ({len(data)} total):")
for c in data:
    print(f"\n--- Comment #{c['id']} at {c['created_at']} ---")
    body = c['body']
    print(body[:10000])
    if len(body) > 10000:
        print(f"\n...(truncated, {len(body)} total chars)")

# Also check if there's a step summary via annotations
# Check annotations for the run
run_id = 23894209863
ann_url = f'https://api.github.com/repos/almashooq1/alawael-erp/check-runs'
# Get check runs for this commit
check_url = f'https://api.github.com/repos/almashooq1/alawael-erp/commits/{COMMIT_SHA}/check-runs'
req2 = urllib.request.Request(check_url, headers=headers)
r2 = urllib.request.urlopen(req2)
checks = json.loads(r2.read())
print(f"\n=== Check Runs ({checks.get('total_count',0)} total) ===")
for cr in checks.get('check_runs', []):
    print(f"\n  Check: {cr['name']} | {cr['status']} | {cr.get('conclusion','pending')}")
    # Get annotations for failed checks
    if cr.get('conclusion') == 'failure':
        ann_url2 = f"https://api.github.com/repos/almashooq1/alawael-erp/check-runs/{cr['id']}/annotations"
        try:
            req3 = urllib.request.Request(ann_url2, headers=headers)
            r3 = urllib.request.urlopen(req3)
            annotations = json.loads(r3.read())
            if annotations:
                print(f"  Annotations ({len(annotations)}):")
                for ann in annotations[:10]:
                    print(f"    [{ann['annotation_level']}] {ann.get('title','')}: {ann.get('message','')[:200]}")
        except Exception as e:
            print(f"  Could not get annotations: {e}")
