import urllib.request
import json

# Get runs and find CI Tests run
url = "https://api.github.com/repos/almashooq1/alawael-erp/actions/runs?per_page=10"
req = urllib.request.Request(url, headers={"User-Agent": "python"})
with urllib.request.urlopen(req) as response:
    data = json.loads(response.read())

# Find the latest CI Tests run
ci_run = None
for r in data["workflow_runs"]:
    name = r["name"].encode("ascii", errors="replace").decode("ascii")
    if "CI" in name and "Tests" in name:
        ci_run = r
        break

if not ci_run:
    print("No CI Tests run found")
    exit(1)

run_id = ci_run["id"]
run_num = ci_run["run_number"]
print("Run #" + str(run_num) + " | status=" + str(ci_run["status"]) + " | conclusion=" + str(ci_run["conclusion"]))
print("Run ID: " + str(run_id))
print("")

# Get jobs
jobs_url = "https://api.github.com/repos/almashooq1/alawael-erp/actions/runs/" + str(run_id) + "/jobs"
req2 = urllib.request.Request(jobs_url, headers={"User-Agent": "python"})
with urllib.request.urlopen(req2) as response2:
    jobs_data = json.loads(response2.read())

for job in jobs_data.get("jobs", []):
    name = job["name"].encode("ascii", errors="replace").decode("ascii")
    status = job["status"] or "None"
    conclusion = job["conclusion"] or "in_progress"
    print("  Job: " + name + " | " + status + " | " + conclusion)
