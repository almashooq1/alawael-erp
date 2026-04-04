import urllib.request
import json
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

TOKEN = os.environ.get('GITHUB_TOKEN', '')
headers = {'Accept': 'application/vnd.github+json'}
if TOKEN:
    headers['Authorization'] = f'token {TOKEN}'

# Check artifacts for Run #381
RUN_ID = 23892780791

url = f'https://api.github.com/repos/almashooq1/alawael-erp/actions/runs/{RUN_ID}/artifacts'
req = urllib.request.Request(url, headers=headers)
r = urllib.request.urlopen(req)
data = json.loads(r.read())

print(f"Artifacts for Run #{RUN_ID}:")
for a in data.get('artifacts', []):
    print(f"  - {a['name']} (ID:{a['id']}, size:{a['size_in_bytes']}b, expired:{a['expired']})")
    print(f"    download_url: {a['archive_download_url']}")
