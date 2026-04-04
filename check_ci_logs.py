import urllib.request
import json
import re

# Find the latest CI Tests run
url = "https://api.github.com/repos/almashooq1/alawael-erp/actions/runs?per_page=10"
req = urllib.request.Request(url, headers={"User-Agent": "python"})
with urllib.request.urlopen(req) as response:
    data = json.loads(response.read())

ci_run = None
for r in data["workflow_runs"]:
    name = r["name"].encode("ascii", errors="replace").decode("ascii")
    if "CI" in name and "Tests" in name:
        ci_run = r
        break

run_id = str(ci_run["id"])
print("Checking run #" + str(ci_run["run_number"]) + " (id=" + run_id + ")")

# Get jobs
jobs_url = "https://api.github.com/repos/almashooq1/alawael-erp/actions/runs/" + run_id + "/jobs"
req = urllib.request.Request(jobs_url, headers={"User-Agent": "python"})
with urllib.request.urlopen(req) as response:
    jobs_data = json.loads(response.read())

# Find the failing job
for job in jobs_data.get("jobs", []):
    if job["conclusion"] == "failure":
        job_id = job["id"]
        job_name = job["name"].encode("ascii", errors="replace").decode("ascii")
        print("Failed job: " + job_name)
        print("Steps:")
        for step in job.get("steps", []):
            step_name = step.get("name", "").encode("ascii", errors="replace").decode("ascii")
            step_conclusion = step.get("conclusion") or "in_progress"
            marker = " FAIL" if step_conclusion == "failure" else ""
            print("  " + step_name + " | " + step_conclusion + marker)

# Try to get artifact
art_url = "https://api.github.com/repos/almashooq1/alawael-erp/actions/runs/" + run_id + "/artifacts"
req2 = urllib.request.Request(art_url, headers={"User-Agent": "python"})
with urllib.request.urlopen(req2) as r2:
    art_data = json.loads(r2.read())

print("\nArtifacts:")
for a in art_data.get("artifacts", []):
    name = a["name"].encode("ascii", errors="replace").decode("ascii")
    print("  " + name + " | " + str(a["size_in_bytes"]) + " bytes")
