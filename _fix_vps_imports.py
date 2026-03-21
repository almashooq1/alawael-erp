"""Fix case-sensitive import paths on VPS and rebuild frontend."""
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('72.60.84.56', username='root', password='Be@1010101010', timeout=30)

cmds = [
    # Fix case-sensitive imports
    "sed -i 's|pages/Meetings/|pages/meetings/|g' /home/alawael/app/frontend/src/routes/MeetingsRoutes.jsx",
    "sed -i 's|pages/Documents/|pages/documents/|g' /home/alawael/app/frontend/src/routes/DocumentManagementRoutes.jsx",
    # Verify
    "grep 'pages/' /home/alawael/app/frontend/src/routes/MeetingsRoutes.jsx",
    "grep 'pages/' /home/alawael/app/frontend/src/routes/DocumentManagementRoutes.jsx",
]

for cmd in cmds:
    print(f">>> {cmd[:80]}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=60)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out:
        print(out)
    if err:
        print(f"ERR: {err}")
    print("---")

ssh.close()
print("FIXES APPLIED")
