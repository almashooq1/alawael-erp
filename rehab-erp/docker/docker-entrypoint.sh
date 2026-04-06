#!/bin/sh
set -e

cd /var/www/html

# Create .env if not exists
if [ ! -f .env ]; then
cat > .env << 'EOF'
APP_NAME="Rehab ERP"
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_TIMEZONE=Asia/Riyadh
APP_URL=https://alaweal.org/rehab
ASSET_URL=/rehab
APP_LOCALE=ar
APP_FALLBACK_LOCALE=en

LOG_CHANNEL=stderr
LOG_LEVEL=error

DB_CONNECTION=sqlite
DB_DATABASE=/var/www/html/database/database.sqlite

SESSION_DRIVER=file
SESSION_LIFETIME=120
CACHE_STORE=file
QUEUE_CONNECTION=sync
EOF
fi

# Ensure APP_KEY line exists
if ! grep -q '^APP_KEY=' .env; then
    echo 'APP_KEY=' >> .env
fi

# Ensure ASSET_URL exists
if ! grep -q '^ASSET_URL=' .env; then
    echo 'ASSET_URL=/rehab' >> .env
fi

# Generate app key if not set
php artisan key:generate --force 2>/dev/null || true

# Run migrations
php artisan migrate --force 2>/dev/null || true

# Create default admin user
php artisan tinker --execute="if(!\App\Models\User::where('email','admin@alawael.com')->exists()){\App\Models\User::create(['name'=>'Admin','email'=>'admin@alawael.com','password'=>bcrypt('Admin@2026'),'role'=>'admin']);}" 2>/dev/null || true

# Clear and rebuild caches
php artisan config:clear 2>/dev/null || true
php artisan route:clear 2>/dev/null || true
php artisan view:clear 2>/dev/null || true
php artisan config:cache 2>/dev/null || true
php artisan route:cache 2>/dev/null || true
php artisan view:cache 2>/dev/null || true

exec /usr/bin/supervisord -c /etc/supervisord.conf
