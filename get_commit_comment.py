import urllib.request
import json
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

TOKEN = os.environ.get('GITHUB_TOKEN', '')
headers = {'Accept': 'application/vnd.github+json'}
if TOKEN:
    headers['Authorization'] = f'token {TOKEN}'

# Get latest commit SHA
url = 'https://api.github.com/repos/almashooq1/alawael-erp/commits/main'
req = urllib.request.Request(url, headers=headers)
r = urllib.request.urlopen(req)
data = json.loads(r.read())
sha = data['sha']
print(f"Latest commit: {sha[:12]} - {data['commit']['message'][:60]}")

# Get commit comments
url2 = f'https://api.github.com/repos/almashooq1/alawael-erp/commits/{sha}/comments'
req2 = urllib.request.Request(url2, headers=headers)
r2 = urllib.request.urlopen(req2)
comments = json.loads(r2.read())

if not comments:
    print("\nNo comments on this commit yet.")
    print("(CI may still be running or the comment step hasn't executed)")
else:
    for c in comments:
        print(f"\n--- Comment by {c['user']['login']} ---")
        # Print first 3000 chars
        body = c['body'][:3000]
        print(body)
        if len(c['body']) > 3000:
            print(f"\n... (truncated, total {len(c['body'])} chars)")
