import urllib.request, json, sys, os, time
sys.stdout.reconfigure(encoding='utf-8')
TOKEN = os.environ.get('GITHUB_TOKEN', '')
H = {'Accept': 'application/vnd.github+json'}
if TOKEN: H['Authorization'] = f'token {TOKEN}'
SHA = 'b565931d8e18ae2835a4001920e65963e269f8ab'
def api(url):
    r = urllib.request.urlopen(urllib.request.Request(url, headers=H))
    return json.loads(r.read())
# Find run
run = None
for _ in range(20):
    runs = api('https://api.github.com/repos/almashooq1/alawael-erp/actions/runs?per_page=5&branch=main').get('workflow_runs',[])
    for r in runs:
        if SHA[:12] in r['head_sha'] and 'CI' in r['name'] and 'Tests' in r['name']:
            run = r; break
    if run: print(f"Found Run #{run['run_number']} ID:{run['id']}"); break
    print("Waiting..."); time.sleep(10)
if not run: print("NOT FOUND"); sys.exit(1)
RID = run['id']
for p in range(25):
    d = api(f'https://api.github.com/repos/almashooq1/alawael-erp/actions/runs/{RID}')
    print(f"[{p+1}] {d['status']} | {d.get('conclusion','?')}")
    if d['status'] == 'completed':
        print(f"RESULT: {d.get('conclusion')}")
        # Get annotations for Backend Tests check
        checks = api(f'https://api.github.com/repos/almashooq1/alawael-erp/commits/{SHA}/check-runs').get('check_runs',[])
        for cr in checks:
            if 'Backend' in cr['name']:
                print(f"\nBackend Tests: {cr.get('conclusion')}")
                anns = api(f"https://api.github.com/repos/almashooq1/alawael-erp/check-runs/{cr['id']}/annotations")
                for a in anns:
                    lvl = a.get('annotation_level','')
                    title = a.get('title','')
                    msg = a.get('message','')
                    print(f"  [{lvl}] {title}: {msg[:500]}")
        break
    if p < 24: time.sleep(30)
