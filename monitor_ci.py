"""Monitor CI #360 every 30 seconds until complete"""
import urllib.request, json, time

REPO = 'almashooq1/alawael-erp'
RUN_ID = '23877180953'
h = {'User-Agent': 'python'}

for attempt in range(30):
    time.sleep(30)
    url = f'https://api.github.com/repos/{REPO}/actions/runs/{RUN_ID}/jobs'
    with urllib.request.urlopen(urllib.request.Request(url, headers=h)) as r:
        d = json.loads(r.read())

    jobs = d.get('jobs', [])
    all_done = all(j['status'] == 'completed' for j in jobs)

    ts = time.strftime('%H:%M:%S')
    print(f'[{ts}] attempt {attempt+1}:')
    for job in jobs:
        name = job['name'].encode('ascii','replace').decode('ascii')
        print(f'  {name} | {job["status"]} | {job["conclusion"]}')

    if all_done:
        print('\n=== FINAL RESULT ===')
        for job in jobs:
            name = job['name'].encode('ascii','replace').decode('ascii')
            icon = '✅' if job['conclusion'] == 'success' else ('⏭️' if job['conclusion'] == 'skipped' else '❌')
            print(f'  {icon} {name}: {job["conclusion"]}')
        break
    print()
