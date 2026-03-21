"""Clean checkout on VPS and rebuild frontend."""
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.60.84.56', username='root', password='Be@1010101010', timeout=30)

cmds = [
    # Force clean checkout and pull
    'cd /home/alawael/app && su - alawael -c "cd /home/alawael/app && git checkout -- . && git pull origin main 2>&1"',
    # Verify the apiClient imports
    'grep apiClient /home/alawael/app/frontend/src/services/assetManagement.service.js',
    'grep apiClient /home/alawael/app/frontend/src/services/internalAudit.service.js',
    'grep apiClient /home/alawael/app/frontend/src/services/helpdesk.service.js',
    # Verify meetings import
    'grep pages/ /home/alawael/app/frontend/src/routes/MeetingsRoutes.jsx',
    'grep pages/ /home/alawael/app/frontend/src/routes/DocumentManagementRoutes.jsx | head -2',
]

for cmd in cmds:
    print(f">>> {cmd[:90]}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=120)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out:
        print(out)
    if err:
        print(f"ERR: {err}")
    print("---")

ssh.close()
print("CLEAN CHECKOUT DONE")
