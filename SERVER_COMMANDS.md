# أوامر السيرفر — انسخ والصق بالترتيب

**دومين المشروع:**
- الواجهة: **prm.khtwat.com** (لديك بالفعل: CNAME أو A لـ prm)
- الـ API: **api.prm.khtwat.com** → أضف في إدارة DNS سجلاً جديداً: النوع **A**، الاسم **api.prm**، الهدف **187.77.68.2** (IP السيرفر)

---

## 0) الاتصال

```bash
ssh root@187.77.68.2
```

---

## 1) تثبيت المتطلبات (نفّذ مرة واحدة إن لم تكن مثبتة)

```bash
apt update && apt install -y php8.2-fpm php8.2-cli php8.2-mbstring php8.2-xml php8.2-curl php8.2-sqlite3 php8.2-zip unzip git curl nginx
```

```bash
curl -sS https://getcomposer.org/installer | php && mv composer.phar /usr/local/bin/composer
```

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt install -y nodejs
```

---

## 2) استنساخ المشروع

```bash
cd /root
mkdir -p prm
cd prm
git clone https://github.com/khatwat-design/prm.git .
```

---

## 3) Backend — إعداد Laravel

```bash
cd /root/prm/backend
```

```bash
composer install --no-dev --optimize-autoloader
```

```bash
cp .env.example .env
```

**إذا ظهر:** `cp: cannot stat '.env.example': No such file or directory` — الملف غير مرفوع في المستودع. أنشئ `.env` يدوياً بهذا الأمر (انسخ الكتلة كاملة ثم الصق في الطرفية):

```bash
cat > /root/prm/backend/.env << 'ENVEOF'
APP_NAME=Laravel
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_TIMEZONE=UTC
APP_URL=https://api.prm.khtwat.com
APP_LOCALE=en
APP_FALLBACK_LOCALE=en
APP_FAKER_LOCALE=en_US
APP_MAINTENANCE_DRIVER=file
APP_MAINTENANCE_STORE=database
BCRYPT_ROUNDS=12
LOG_CHANNEL=stack
LOG_STACK=single
LOG_DEPRECATIONS_CHANNEL=null
LOG_LEVEL=warning
DB_CONNECTION=sqlite
SESSION_DRIVER=file
SESSION_LIFETIME=120
SESSION_ENCRYPT=false
SESSION_PATH=/
SESSION_DOMAIN=null
BROADCAST_CONNECTION=log
FILESYSTEM_DISK=local
QUEUE_CONNECTION=database
CACHE_STORE=file
CACHE_PREFIX=
MAIL_MAILER=log
MAIL_FROM_ADDRESS="hello@example.com"
MAIL_FROM_NAME="${APP_NAME}"
META_APP_ID=
META_APP_SECRET=
META_REDIRECT_URI=https://api.prm.khtwat.com/api/meta/callback
FRONTEND_URL=https://prm.khtwat.com
ENVEOF
```

ثم:

```bash
php artisan key:generate
```

**الآن عدّل .env (استبدل الدومينات ثم احفظ):**

```bash
sed -i 's|APP_ENV=local|APP_ENV=production|' .env
sed -i 's|APP_DEBUG=true|APP_DEBUG=false|' .env
sed -i "s|APP_URL=.*|APP_URL=https://api.prm.khtwat.com|" .env
sed -i 's|DB_CONNECTION=.*|DB_CONNECTION=sqlite|' .env
# للـ MySQL استبدل السطر أعلاه بـ: sed -i 's|DB_CONNECTION=.*|DB_CONNECTION=mysql|' .env ثم أضف DB_HOST و DB_DATABASE و DB_USERNAME و DB_PASSWORD (راجع قسم MySQL أدناه).
sed -i 's|SESSION_DRIVER=.*|SESSION_DRIVER=file|' .env
sed -i 's|CACHE_STORE=.*|CACHE_STORE=file|' .env
sed -i "s|META_REDIRECT_URI=.*|META_REDIRECT_URI=https://api.prm.khtwat.com/api/meta/callback|" .env
sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=https://prm.khtwat.com|" .env
```

*(إن أردت دومينات أخرى عدّل يدوياً: `nano .env`)*

**إذا استخدمت SQLite:**

```bash
touch database/database.sqlite
```

**إذا استخدمت MySQL** — راجع القسم [Backend — خيار MySQL](#backend--خيار-mysql) أدناه.

```bash
php artisan migrate --force
```

```bash
php artisan db:seed
```

```bash
php artisan config:cache
php artisan route:cache
```

---

### Backend — خيار MySQL

إذا أردت استخدام **MySQL** بدلاً من SQLite:

**1) تثبيت MySQL وإضافة PHP:**

```bash
apt install -y mysql-server php8.3-mysql
```

**2) تشغيل الخدمة وتأمين التثبيت (اختياري):**

```bash
systemctl start mysql
systemctl enable mysql
mysql_secure_installation
```

*(يمكنك الضغط Enter للتمرير، وتعيين كلمة مرور root إن رغبت.)*

**3) إنشاء قاعدة بيانات ومستخدم للـ Laravel:**

```bash
mysql -u root -p -e "
CREATE DATABASE prm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'prm'@'localhost' IDENTIFIED BY 'كلمة_مرور_قوية_هنا';
GRANT ALL ON prm.* TO 'prm'@'localhost';
FLUSH PRIVILEGES;
EXIT;
"
```

*(استبدل `كلمة_مرور_قوية_هنا` بكلمة مرور حقيقية واحفظها.)*

**4) ضبط `.env` في الـ backend:**

```bash
cd /root/prm/backend
sed -i 's|DB_CONNECTION=.*|DB_CONNECTION=mysql|' .env
```

ثم أضف أسطر MySQL (إن لم تكن موجودة). استبدل `YOUR_MYSQL_PASSWORD` بكلمة مرور مستخدم قاعدة البيانات:

```bash
grep -q '^DB_HOST=' .env || echo -e "\nDB_HOST=127.0.0.1\nDB_PORT=3306\nDB_DATABASE=prm\nDB_USERNAME=prm\nDB_PASSWORD=YOUR_MYSQL_PASSWORD" >> .env
```

إن كانت الأسطر موجودة كتعليق (`# DB_HOST=...`) فعدّلها يدوياً: `nano .env`

**5) تشغيل الهجرة والـ seed:**

```bash
php artisan config:clear
php artisan migrate --force
composer install --optimize-autoloader
php artisan db:seed
composer install --no-dev --optimize-autoloader
php artisan config:cache
php artisan route:cache
```

---

## 4) Frontend — إعداد Next.js

```bash
cd /root/prm/frontend
```

```bash
npm ci
```

```bash
echo "NEXT_PUBLIC_API_URL=https://api.prm.khtwat.com/api" > .env.local
```

```bash
npm run build
```

**إذا فشل البناء بسبب SWC أو lockfile** (مثلاً: `Found lockfile missing swc dependencies` أو `yarn: not found`)، استخدم `npm install` ثم أعد البناء:

```bash
npm install
npm run build
```

```bash
npm install -g pm2
```

```bash
pm2 start npm --name "khtwat-prm" -- start
```

```bash
pm2 save
```

```bash
pm2 startup
```

*(انسخ السطر الذي يظهر ونفّذه إن طُلب منك)*

---

## 5) Nginx — موقع API

```bash
cat > /etc/nginx/sites-available/prm-api << 'EOF'
server {
    listen 80;
    server_name api.prm.khtwat.com;
    root /root/prm/backend/public;
    index index.php;
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
EOF
```


```bash
ln -sf /etc/nginx/sites-available/prm-api /etc/nginx/sites-enabled/
```

---

## 6) Nginx — موقع الواجهة

```bash
cat > /etc/nginx/sites-available/prm-app << 'EOF'
server {
    listen 80;
    server_name prm.khtwat.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
```


```bash
ln -sf /etc/nginx/sites-available/prm-app /etc/nginx/sites-enabled/
```

```bash
nginx -t
```

```bash
systemctl reload nginx
```

---

## 7) SSL (HTTPS)

```bash
apt install -y certbot python3-certbot-nginx
```

```bash
certbot --nginx -d api.prm.khtwat.com -d prm.khtwat.com
```

*(أدخل بريدك ووافق على الشروط)*

```bash
cd /root/prm/backend && php artisan config:cache
```

---

## 8) التحقق

```bash
pm2 list
```

*(يجب أن ترى khtwat-prm online)*

افتح في المتصفح:
- https://prm.khtwat.com
- تسجيل الدخول: `client@khtwat.com` / `password`

---

## تحديث المشروع لاحقاً (بعد تعديلات على GitHub)

```bash
cd /root/prm
git pull
```

```bash
cd /root/prm/backend && composer install --no-dev && php artisan migrate --force && php artisan config:cache
```

```bash
cd /root/prm/frontend && npm ci && npm run build && pm2 restart khtwat-prm
```
