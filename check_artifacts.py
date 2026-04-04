import urllib.request
import json

run_id = "23869183425"

# Get artifacts
url = "https://api.github.com/repos/almashooq1/alawael-erp/actions/runs/" + run_id + "/artifacts"
req = urllib.request.Request(url, headers={"User-Agent": "python"})
with urllib.request.urlopen(req) as response:
    data = json.loads(response.read())

print("Artifacts:")
for a in data.get("artifacts", []):
    name = a["name"].encode("ascii", errors="replace").decode("ascii")
    print("  " + name + " | " + str(a["size_in_bytes"]) + " bytes | " + a["created_at"])
    print("  Download: " + a["archive_download_url"])
