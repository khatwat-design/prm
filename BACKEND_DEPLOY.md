# نشر الباك اند فقط — خطوة بخطوة

نفّذ على السيرفر بالترتيب. الدومين: **api.prm.khtwat.com**.

---

## 1) استنساخ المشروع

```bash
cd /root
mkdir -p prm
cd prm
git clone https://github.com/khatwat-design/prm.git .
```

---

## 2) تثبيت MySQL وإضافة PHP (إن لم تكن مثبتة)

```bash
apt update
apt install -y mysql-server php8.3-mysql php8.3-fpm php8.3-cli php8.3-mbstring php8.3-xml php8.3-curl php8.3-zip unzip git curl
```

*(إن كان السيرفر يستخدم PHP 8.2 استبدل 8.3 بـ 8.2.)*

```bash
systemctl start mysql
systemctl enable mysql
```

Composer (إن لم يكن مثبتاً):

```bash
curl -sS https://getcomposer.org/installer | php && mv composer.phar /usr/local/bin/composer
```

---

## 3) إنشاء قاعدة البيانات والمستخدم

استبدل `YOUR_MYSQL_PASSWORD` بكلمة مرور قوية واحفظها:

```bash
mysql -u root -e "
CREATE DATABASE prm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'prm'@'localhost' IDENTIFIED BY 'YOUR_MYSQL_PASSWORD';
GRANT ALL ON prm.* TO 'prm'@'localhost';
FLUSH PRIVILEGES;
"
```

*(إذا طلب MySQL كلمة مرور لـ root استخدم: `mysql -u root -p` ثم أدخلها ونفّذ الأوامر يدوياً.)*

---

## 4) إعداد Laravel (Backend)

```bash
cd /root/prm/backend
composer install --no-dev --optimize-autoloader
cp .env.example .env
php artisan key:generate
```

ضبط الإنتاج و MySQL — استبدل `YOUR_MYSQL_PASSWORD` بنفس كلمة المرور:

```bash
sed -i 's|APP_ENV=.*|APP_ENV=production|' .env
sed -i 's|APP_DEBUG=.*|APP_DEBUG=false|' .env
sed -i "s|APP_URL=.*|APP_URL=https://api.prm.khtwat.com|" .env
sed -i 's|DB_CONNECTION=.*|DB_CONNECTION=mysql|' .env
sed -i 's|SESSION_DRIVER=.*|SESSION_DRIVER=file|' .env
sed -i 's|CACHE_STORE=.*|CACHE_STORE=file|' .env
sed -i "s|META_REDIRECT_URI=.*|META_REDIRECT_URI=https://api.prm.khtwat.com/api/meta/callback|" .env
sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=https://prm.khtwat.com|" .env
```

إضافة أسطر MySQL إن لم تكن موجودة:

```bash
grep -q '^DB_HOST=' .env || echo -e "\nDB_HOST=127.0.0.1\nDB_PORT=3306\nDB_DATABASE=prm\nDB_USERNAME=prm\nDB_PASSWORD=YOUR_MYSQL_PASSWORD" >> .env
```

إن كانت الأسطر موجودة كتعليق (`# DB_HOST=...`) عدّل كلمة المرور يدوياً:

```bash
nano .env
```

ثم الهجرة والـ seed (Faker يحتاج حزم dev مؤقتاً):

```bash
php artisan config:clear
composer install --optimize-autoloader
php artisan migrate --force
php artisan db:seed
composer install --no-dev --optimize-autoloader
php artisan config:cache
php artisan route:cache
```

صلاحيات التخزين:

```bash
chown -R www-data:www-data /root/prm/backend/storage /root/prm/backend/bootstrap/cache
chmod -R 775 /root/prm/backend/storage /root/prm/backend/bootstrap/cache
```

---

## 5) Nginx — موقع API فقط

تأكد من وجود مقبس PHP-FPM (غالباً 8.2 أو 8.3):

```bash
ls /var/run/php/
```

ثم أنشئ موقع API. إذا كان المقبس `php8.3-fpm.sock` استبدل السطر في الملف أدناه إلى `php8.3-fpm.sock`:

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
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
EOF
```

*(إن كان عندك فقط php8.2-fpm.sock عدّل السطر إلى php8.2-fpm.sock.)*

```bash
ln -sf /etc/nginx/sites-available/prm-api /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

---

## 6) SSL للـ API (اختياري لكن موصى به)

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d api.prm.khtwat.com
```

بعد نجاح Certbot:

```bash
cd /root/prm/backend
php artisan config:cache
```

---

## 7) التحقق

- افتح في المتصفح: **https://api.prm.khtwat.com** — يفترض أن تظهر صفحة Laravel أو رسالة ترحيب.
- أو من الطرفية: `curl -I https://api.prm.khtwat.com` — يفترض أن ترى `200` أو `302`.
- للتأكد من الـ API: `curl https://api.prm.khtwat.com/api/login` (يفترض أن يرجع ردّاً مثل "validation error" أو "Unauthenticated" وليس خطأ من السيرفر).

بعد التأكد أن الباك اند يعمل، انشر الفرونت اند حسب `SERVER_COMMANDS.md` (قسم 4 و 5 و 6 و 7).
