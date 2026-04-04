import urllib.request, json, sys, os, time
sys.stdout.reconfigure(encoding='utf-8')

TOKEN = os.environ.get('GITHUB_TOKEN', '')
H = {'Accept': 'application/vnd.github+json', 'User-Agent': 'Mozilla/5.0'}
if TOKEN:
    H['Authorization'] = f'token {TOKEN}'

def api(url, max_retries=5):
    for attempt in range(max_retries):
        try:
            req = urllib.request.Request(url, headers=H)
            r = urllib.request.urlopen(req, timeout=30)
            # check rate limit headers
            rl_remaining = r.headers.get('X-RateLimit-Remaining', '?')
            rl_reset = r.headers.get('X-RateLimit-Reset', '?')
            print(f"  [rate: remaining={rl_remaining}, reset_at={rl_reset}]", flush=True)
            return json.loads(r.read())
        except urllib.error.HTTPError as e:
            if e.code == 403:
                reset_header = e.headers.get('X-RateLimit-Reset', '')
                if reset_header:
                    reset_ts = int(reset_header)
                    wait_sec = max(0, reset_ts - int(time.time())) + 5
                    print(f"Rate limited! Waiting {wait_sec}s until reset...", flush=True)
                    # Wait in chunks so we can see progress
                    for remaining in range(wait_sec, 0, -10):
                        print(f"  {remaining}s remaining...", flush=True)
                        time.sleep(min(10, remaining))
                    print("Retrying...", flush=True)
                else:
                    print(f"403 error, waiting 60s... (attempt {attempt+1}/{max_retries})", flush=True)
                    time.sleep(60)
            else:
                print(f"HTTP Error {e.code}: {e.reason}", flush=True)
                raise
        except Exception as ex:
            print(f"Error: {ex}, waiting 15s...", flush=True)
            time.sleep(15)
    raise Exception("Max retries exceeded")

# Run ID for #386
RID = 23895584189
SHA = 'b565931d8e18ae2835a4001920e65963e269f8ab'

print(f"Fetching check-runs for SHA {SHA}...", flush=True)
checks = api(f'https://api.github.com/repos/almashooq1/alawael-erp/commits/{SHA}/check-runs').get('check_runs', [])

print(f"\nFound {len(checks)} check-runs:", flush=True)
for cr in checks:
    print(f"  - {cr['name']}: {cr.get('conclusion','?')} (id={cr['id']})", flush=True)

# Get annotations for all check runs, especially Backend Tests
for cr in checks:
    print(f"\n=== Annotations for: {cr['name']} ===", flush=True)
    try:
        anns = api(f"https://api.github.com/repos/almashooq1/alawael-erp/check-runs/{cr['id']}/annotations")
        if not anns:
            print("  (no annotations)", flush=True)
        for a in anns:
            lvl = a.get('annotation_level', '')
            title = a.get('title', '')
            msg = a.get('message', '')
            path = a.get('path', '')
            print(f"  [{lvl}] {title}", flush=True)
            print(f"    path: {path}", flush=True)
            # Print full message (up to 5000 chars)
            msg_clean = msg.replace('~', '\n')  # our encoded newlines
            print(f"    message:\n{msg_clean[:5000]}", flush=True)
            print("    ---", flush=True)
    except Exception as ex:
        print(f"  Error getting annotations: {ex}", flush=True)

print("\nDone.", flush=True)
