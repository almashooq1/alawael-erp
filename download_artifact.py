import urllib.request
import urllib.error
import json
import sys
import os
import zipfile

sys.stdout.reconfigure(encoding='utf-8')

TOKEN = os.environ.get('GITHUB_TOKEN', '')

headers = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'Python/3'
}
if TOKEN:
    headers['Authorization'] = f'token {TOKEN}'
    print(f"Using token: {TOKEN[:8]}...")
else:
    print("No GITHUB_TOKEN set - trying without auth (may fail for artifacts)")

# Try to download the artifact
ARTIFACT_ID = 6238223907
url = f'https://api.github.com/repos/almashooq1/alawael-erp/actions/artifacts/{ARTIFACT_ID}/zip'

try:
    req = urllib.request.Request(url, headers=headers)
    # Need to follow redirects for artifact downloads
    import urllib.request as ur
    opener = ur.build_opener(ur.HTTPRedirectHandler)
    r = opener.open(req)
    data = r.read()

    # Save zip
    with open('artifact.zip', 'wb') as f:
        f.write(data)
    print(f"Downloaded artifact: {len(data)} bytes")

    # Extract and show contents
    with zipfile.ZipFile('artifact.zip', 'r') as zf:
        print("\nFiles in artifact:")
        for name in zf.namelist():
            info = zf.getinfo(name)
            print(f"  {name}: {info.file_size} bytes")

        # Show jest-output.txt
        if 'jest-output.txt' in zf.namelist():
            content = zf.read('jest-output.txt').decode('utf-8', errors='replace')
            print("\n=== jest-output.txt (last 100 lines) ===")
            lines = content.split('\n')
            for line in lines[-100:]:
                print(line)
        elif 'backend/jest-output.txt' in zf.namelist():
            content = zf.read('backend/jest-output.txt').decode('utf-8', errors='replace')
            print("\n=== backend/jest-output.txt (last 100 lines) ===")
            lines = content.split('\n')
            for line in lines[-100:]:
                print(line)

except urllib.error.HTTPError as e:
    print(f"HTTP Error: {e.code} - {e.reason}")
    print("You need to set GITHUB_TOKEN env var")
    print("Example: set GITHUB_TOKEN=ghp_xxxx")
except Exception as e:
    print(f"Error: {e}")
