import urllib.request
import json
import os

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
RUN_ID = "23877420309"
REPO = "almashooq1/alawael-erp"

headers = {"User-Agent": "python", "Accept": "application/vnd.github+json"}
if GITHUB_TOKEN:
    headers["Authorization"] = "Bearer " + GITHUB_TOKEN

# Get jobs to find Backend Tests job ID
jobs_url = f"https://api.github.com/repos/{REPO}/actions/runs/{RUN_ID}/jobs"
req = urllib.request.Request(jobs_url, headers=headers)
with urllib.request.urlopen(req) as r:
    jobs_data = json.loads(r.read())

backend_job = None
for job in jobs_data.get("jobs", []):
    if "Backend Tests" in job["name"]:
        backend_job = job
        break

if not backend_job:
    print("Backend Tests job not found")
    exit(1)

job_id = backend_job["id"]
print(f"Backend Tests Job ID: {job_id}")

# Try to get logs (requires auth)
if GITHUB_TOKEN:
    logs_url = f"https://api.github.com/repos/{REPO}/actions/jobs/{job_id}/logs"
    req2 = urllib.request.Request(logs_url, headers=headers)
    try:
        with urllib.request.urlopen(req2) as r2:
            logs = r2.read().decode("utf-8", errors="replace")
            lines = logs.split("\n")
            relevant = []
            for line in lines:
                if any(x in line for x in ["FAIL ", "PASS ", "Error:", "error:", "SyntaxError",
                                            "ReferenceError", "TypeError", "Cannot find",
                                            "not found", "failed", "Tests:", "RUNS ", "ENOENT",
                                            "MODULE_NOT_FOUND", "Cannot require"]):
                    relevant.append(line)
            print("=== RELEVANT LOG LINES ===")
            for ln in relevant[:100]:
                print(ln)
    except Exception as e:
        print(f"Could not fetch logs: {e}")
else:
    print("No GITHUB_TOKEN - trying annotations...")

# Show annotations
ann_url = f"https://api.github.com/repos/{REPO}/check-runs/{job_id}/annotations"
req3 = urllib.request.Request(ann_url, headers=headers)
try:
    with urllib.request.urlopen(req3) as r3:
        anns = json.loads(r3.read())
    print("=== ANNOTATIONS ===")
    if not anns:
        print("  (no annotations)")
    for a in anns:
        print(f"  [{a.get('annotation_level')}] {a.get('path')}:{a.get('start_line')}")
        print(f"    {a.get('message', '')[:500]}")
except Exception as e:
    print(f"Error getting annotations: {e}")

# Show steps
print("\n=== JOB STEPS ===")
for step in backend_job.get("steps", []):
    status = step.get("conclusion") or step.get("status")
    print(f"  {step['name']} | {status}")
