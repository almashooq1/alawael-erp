import urllib.request
import json
import sys

url = "https://api.github.com/repos/almashooq1/alawael-erp/actions/runs?per_page=5"
req = urllib.request.Request(url, headers={"User-Agent": "python"})
with urllib.request.urlopen(req) as response:
    data = json.loads(response.read())

for r in data["workflow_runs"][:5]:
    name = r['name'].encode('ascii', errors='replace').decode('ascii')
    status = r['status'] or 'None'
    conclusion = r['conclusion'] or 'None'
    print("Run #" + str(r['run_number']) + " | " + name + " | status=" + status + " | conclusion=" + conclusion + " | " + r['created_at'])
