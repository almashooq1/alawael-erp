import urllib.request
import json

run_id = "23869183425"
url = "https://api.github.com/repos/almashooq1/alawael-erp/actions/runs/" + run_id
req = urllib.request.Request(url, headers={"User-Agent": "python"})
with urllib.request.urlopen(req) as response:
    data = json.loads(response.read())

print("Run #" + str(data["run_number"]))
print("Status: " + str(data["status"]))
print("Conclusion: " + str(data["conclusion"]))
print("Head SHA: " + str(data["head_sha"]))
print("Head Branch: " + str(data["head_branch"]))
print("Created: " + str(data["created_at"]))
print("Updated: " + str(data["updated_at"]))
print("Rerun URL: " + str(data["rerun_url"]))
