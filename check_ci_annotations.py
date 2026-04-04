import urllib.request
import json

# Get check runs for the commit af39b2e5
commit = "af39b2e5a0d4b552bcc86e0717d3aebb726beae7"
url = "https://api.github.com/repos/almashooq1/alawael-erp/commits/" + commit + "/check-runs"
req = urllib.request.Request(url, headers={"User-Agent": "python", "Accept": "application/vnd.github.v3+json"})
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read())
    for cr in data.get("check_runs", []):
        name = cr["name"].encode("ascii", errors="replace").decode("ascii")
        status = cr["status"] or "None"
        conclusion = cr["conclusion"] or "None"
        print("Check: " + name + " | " + status + " | " + conclusion)
        if conclusion == "failure" and cr.get("output"):
            output = cr["output"]
            title = (output.get("title") or "").encode("ascii", errors="replace").decode("ascii")
            summary = (output.get("summary") or "")[:500].encode("ascii", errors="replace").decode("ascii")
            print("  Title: " + title)
            print("  Summary: " + summary)
except Exception as e:
    print("Error: " + str(e))
