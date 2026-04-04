import urllib.request, json, sys

headers = {'User-Agent': 'Mozilla/5.0', 'Accept': 'application/vnd.github+json'}

# Get latest runs
req = urllib.request.Request('https://api.github.com/repos/almashooq1/alawael-erp/actions/runs?per_page=5', headers=headers)
r = json.loads(urllib.request.urlopen(req).read())

for x in r['workflow_runs']:
    print(f"run_number={x['run_number']} run_id={x['id']} status={x['status']} conclusion={x['conclusion']} sha={x['head_sha'][:7]} workflow={x.get('name','?')[:30]}")

# Get jobs for latest run
latest = r['workflow_runs'][0]
run_id = latest['id']
print(f"\n=== Jobs for Run #{latest['run_number']} (id={run_id}) ===")
req2 = urllib.request.Request(f'https://api.github.com/repos/almashooq1/alawael-erp/actions/runs/{run_id}/jobs', headers=headers)
jobs = json.loads(urllib.request.urlopen(req2).read())
for j in jobs.get('jobs', []):
    print(f"  JOB: {j['name']} conclusion={j['conclusion']}")
    for s in j.get('steps', []):
        icon = '✅' if s['conclusion'] == 'success' else ('⏭️' if s['conclusion'] == 'skipped' else '❌')
        if s['conclusion'] not in ('success', 'skipped', None):
            print(f"    {icon} FAIL STEP: {s['name']} => {s['conclusion']}")
