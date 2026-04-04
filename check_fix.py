import urllib.request, json, sys, os, time
sys.stdout.reconfigure(encoding='utf-8')

TOKEN = os.environ.get('GITHUB_TOKEN', '')
H = {'Accept': 'application/vnd.github+json', 'User-Agent': 'Mozilla/5.0'}
if TOKEN:
    H['Authorization'] = f'token {TOKEN}'

SHA = 'f121cb6a'  # short SHA of the fix commit

def api(url, max_retries=5):
    for attempt in range(max_retries):
        try:
            req = urllib.request.Request(url, headers=H)
            r = urllib.request.urlopen(req, timeout=30)
            return json.loads(r.read())
        except urllib.error.HTTPError as e:
            if e.code == 403:
                reset_header = e.headers.get('X-RateLimit-Reset', '')
                if reset_header:
                    wait_sec = max(0, int(reset_header) - int(time.time())) + 5
                    print(f"Rate limited! Waiting {wait_sec}s...", flush=True)
                    time.sleep(wait_sec)
                else:
                    print(f"403 error, waiting 70s... (attempt {attempt+1}/{max_retries})", flush=True)
                    time.sleep(70)
            else:
                raise
        except Exception as ex:
            print(f"Error: {ex}, retrying in 10s...", flush=True)
            time.sleep(10)
    raise Exception("Max retries exceeded")

print("Waiting for CI run to start...", flush=True)
run = None

for i in range(30):
    runs = api('https://api.github.com/repos/almashooq1/alawael-erp/actions/runs?per_page=5&branch=main').get('workflow_runs', [])
    for r in runs:
        if r['head_sha'].startswith(SHA):
            run = r
            break
    if run:
        print(f"Found Run #{run['run_number']} ID:{run['id']} - status:{run['status']}", flush=True)
        break
    print(f"[{i+1}/30] Not found yet, waiting 15s...", flush=True)
    time.sleep(15)

if not run:
    print("Run not found after 7.5 min", flush=True)
    sys.exit(1)

RID = run['id']
print(f"\nMonitoring Run #{run['run_number']}...", flush=True)

for p in range(40):
    d = api(f'https://api.github.com/repos/almashooq1/alawael-erp/actions/runs/{RID}')
    status = d['status']
    conclusion = d.get('conclusion', '?')
    print(f"[{p+1}] {status} | {conclusion}", flush=True)

    if status == 'completed':
        print(f"\n{'='*50}", flush=True)
        print(f"FINAL RESULT: {conclusion}", flush=True)
        print(f"{'='*50}", flush=True)

        if conclusion == 'success':
            print("🎉 CI PASSED! All tests green!", flush=True)
        else:
            print(f"❌ CI {conclusion} - checking Backend Tests...", flush=True)
            # Get check runs
            try:
                checks = api(f"https://api.github.com/repos/almashooq1/alawael-erp/commits/{d['head_sha']}/check-runs").get('check_runs', [])
                for cr in checks:
                    status_icon = '✅' if cr.get('conclusion') == 'success' else ('❌' if cr.get('conclusion') == 'failure' else '⏭️')
                    print(f"  {status_icon} {cr['name']}: {cr.get('conclusion', cr.get('status', '?'))}", flush=True)
                    if 'Backend' in cr['name'] and cr.get('conclusion') != 'success':
                        anns = api(f"https://api.github.com/repos/almashooq1/alawael-erp/check-runs/{cr['id']}/annotations")
                        for a in anns[:5]:
                            print(f"    [{a.get('annotation_level')}] {a.get('title','')}: {a.get('message','')[:300].replace('~', chr(10))}", flush=True)
            except Exception as ex:
                print(f"Error getting check runs: {ex}", flush=True)
        break

    time.sleep(30)

print("\nDone.", flush=True)
