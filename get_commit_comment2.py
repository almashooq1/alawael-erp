import urllib.request
import json
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

TOKEN = os.environ.get('GITHUB_TOKEN', '')
headers = {'Accept': 'application/vnd.github+json'}
if TOKEN:
    headers['Authorization'] = f'token {TOKEN}'

# Get commit comments for commit 70f7771c3969
COMMIT_SHA = '70f7771c3969c54e09a5db55b5e21b7bc28daa47'

url = f'https://api.github.com/repos/almashooq1/alawael-erp/commits/{COMMIT_SHA}/comments'
req = urllib.request.Request(url, headers=headers)
r = urllib.request.urlopen(req)
data = json.loads(r.read())

print(f"Comments for commit {COMMIT_SHA[:12]}:")
print(f"Total: {len(data)}")
for c in data:
    print(f"\n--- Comment #{c['id']} by {c['user']['login']} at {c['created_at']} ---")
    # Print first 8000 chars
    body = c['body']
    print(body[:8000])
    if len(body) > 8000:
        print(f"\n... (truncated, total {len(body)} chars)")
