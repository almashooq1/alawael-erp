import urllib.request
import json
import sys
import os
import gzip

sys.stdout.reconfigure(encoding='utf-8')

TOKEN = os.environ.get('GITHUB_TOKEN', '')
headers = {'Accept': 'application/vnd.github+json'}
if TOKEN:
    headers['Authorization'] = f'token {TOKEN}'

RUN_ID = 23893864502

# Step 1: Get the job ID for backend-tests job
jobs_url = f'https://api.github.com/repos/almashooq1/alawael-erp/actions/runs/{RUN_ID}/jobs'
req = urllib.request.Request(jobs_url, headers=headers)
r = urllib.request.urlopen(req)
jobs_data = json.loads(r.read())

backend_job = None
for job in jobs_data.get('jobs', []):
    if 'Backend Tests' in job['name']:
        backend_job = job
        break

if not backend_job:
    print("Backend Tests job not found!")
    sys.exit(1)

JOB_ID = backend_job['id']
print(f"Backend Tests Job ID: {JOB_ID}")

# Step 2: Get the logs for this job
logs_url = f'https://api.github.com/repos/almashooq1/alawael-erp/actions/jobs/{JOB_ID}/logs'
log_headers = dict(headers)
log_headers['Accept'] = 'application/vnd.github+json'

try:
    req2 = urllib.request.Request(logs_url, headers=log_headers)
    # Don't auto-follow redirect — we need the URL
    import urllib.error
    try:
        r2 = urllib.request.urlopen(req2)
        content = r2.read()
        # Try to decode
        try:
            text = content.decode('utf-8')
        except:
            try:
                text = gzip.decompress(content).decode('utf-8')
            except:
                text = content.decode('latin-1')

        # Find the "Run Jest tests" section
        lines = text.split('\n')
        in_jest = False
        jest_lines = []
        for line in lines:
            if 'Run Jest tests' in line or 'Jest Run Attempt' in line:
                in_jest = True
            if in_jest:
                jest_lines.append(line)
            if in_jest and len(jest_lines) > 300:
                break

        if jest_lines:
            print("\n=== Run Jest Tests Step (first 300 lines) ===")
            print('\n'.join(jest_lines[:300]))
        else:
            print("\n=== Full Logs (first 500 lines) ===")
            print('\n'.join(lines[:500]))

    except urllib.error.HTTPError as e:
        print(f"HTTP Error: {e.code} - {e.reason}")
        if e.code == 302 or e.code == 301:
            redirect_url = e.headers.get('Location')
            print(f"Redirect to: {redirect_url}")
            if redirect_url:
                r3 = urllib.request.urlopen(redirect_url)
                content = r3.read()
                try:
                    text = content.decode('utf-8')
                except:
                    text = gzip.decompress(content).decode('utf-8')
                lines = text.split('\n')
                # Find Jest section
                in_jest = False
                jest_lines = []
                for line in lines:
                    if 'Run Jest tests' in line or 'Jest Run Attempt' in line or 'JEST EXIT CODE' in line:
                        in_jest = True
                    if in_jest:
                        jest_lines.append(line)
                    if in_jest and len(jest_lines) > 400:
                        jest_lines.append('... (truncated at 400 lines)')
                        break

                if jest_lines:
                    print("\n=== Run Jest Tests Step ===")
                    print('\n'.join(jest_lines))
                else:
                    print("=== Full Logs (first 600 lines) ===")
                    print('\n'.join(lines[:600]))
        else:
            print(f"Response body: {e.read().decode('utf-8', errors='replace')[:2000]}")
except Exception as ex:
    print(f"Exception: {ex}")
