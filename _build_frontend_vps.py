"""Build frontend on VPS."""
import paramiko
import time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.60.84.56', username='root', password='Be@1010101010', timeout=30)

cmd = (
    'cd /home/alawael/app/frontend && rm -rf build && '
    'sudo -u alawael env NODE_OPTIONS="--max-old-space-size=4096" '
    'GENERATE_SOURCEMAP=false CI=false npm run build 2>&1 && '
    'echo "=== VERIFY ===" && ls -la build/index.html && '
    'ls build/static/js/*.js 2>/dev/null | wc -l'
)

print(">>> Building frontend on VPS (this takes 3-5 minutes)...")
stdin, stdout, stderr = ssh.exec_command(cmd, timeout=600)

# Stream output
for line in stdout:
    print(line.strip())

err = stderr.read().decode().strip()
if err:
    print(f"STDERR: {err}")

ssh.close()
print("BUILD SCRIPT DONE")
