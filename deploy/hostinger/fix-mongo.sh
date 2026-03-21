#!/bin/bash
set -e
PASS=$(cat /root/.mongo_pass)

echo "=== Disable auth ==="
sed -i 's/^  authorization: enabled/  authorization: disabled/' /etc/mongod.conf
systemctl restart mongod
sleep 3

echo "=== Drop old user if exists ==="
mongosh --quiet admin --eval "db.dropUser('alawael_admin')" 2>/dev/null || true

echo "=== Create user ==="
mongosh --quiet admin --eval "db.createUser({user:'alawael_admin',pwd:'${PASS}',roles:[{role:'readWrite',db:'alawael_erp'},{role:'dbAdmin',db:'alawael_erp'},{role:'userAdmin',db:'alawael_erp'}]})"

echo "=== Re-enable auth ==="
sed -i 's/^  authorization: disabled/  authorization: enabled/' /etc/mongod.conf
systemctl restart mongod
sleep 3

echo "=== Test connection ==="
mongosh --quiet "mongodb://alawael_admin:${PASS}@127.0.0.1:27017/alawael_erp?authSource=admin" --eval "db.getName()"

echo "=== Restart PM2 ==="
su - alawael -c "cd /home/alawael/app && pm2 restart all"
sleep 3

echo "=== Health Check ==="
curl -s http://127.0.0.1:5000/health | python3 -m json.tool
echo "=== DONE ==="
