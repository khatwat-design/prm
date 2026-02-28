# أوامر السيرفر — انسخ والصق بالترتيب

استبدل قبل التنفيذ:
- `api.yourdomain.com` → دومين الـ API (مثل api.khatwat.sa)
- `app.yourdomain.com` → دومين الواجهة (مثل app.khatwat.sa)

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

```bash
php artisan key:generate
```

**الآن عدّل .env (استبدل الدومينات ثم احفظ):**

```bash
sed -i 's|APP_ENV=local|APP_ENV=production|' .env
sed -i 's|APP_DEBUG=true|APP_DEBUG=false|' .env
sed -i "s|APP_URL=.*|APP_URL=https://api.yourdomain.com|" .env
sed -i 's|DB_CONNECTION=.*|DB_CONNECTION=sqlite|' .env
sed -i 's|SESSION_DRIVER=.*|SESSION_DRIVER=file|' .env
sed -i 's|CACHE_STORE=.*|CACHE_STORE=file|' .env
sed -i "s|META_REDIRECT_URI=.*|META_REDIRECT_URI=https://api.yourdomain.com/api/meta/callback|" .env
sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=https://app.yourdomain.com|" .env
```

*(إن استخدمت دومينات مختلفة عدّل يدوياً: `nano .env`)*

```bash
touch database/database.sqlite
```

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

## 4) Frontend — إعداد Next.js

```bash
cd /root/prm/frontend
```

```bash
npm ci
```

```bash
echo "NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api" > .env.local
```

*(غيّر api.yourdomain.com إن اختلف)*

```bash
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
    server_name api.yourdomain.com;
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

*(ثم عدّل api.yourdomain.com إن اختلف: `nano /etc/nginx/sites-available/prm-api`)*

```bash
ln -sf /etc/nginx/sites-available/prm-api /etc/nginx/sites-enabled/
```

---

## 6) Nginx — موقع الواجهة

```bash
cat > /etc/nginx/sites-available/prm-app << 'EOF'
server {
    listen 80;
    server_name app.yourdomain.com;
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

*(عدّل app.yourdomain.com إن اختلف: `nano /etc/nginx/sites-available/prm-app`)*

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
certbot --nginx -d api.yourdomain.com -d app.yourdomain.com
```

*(استبدل api.yourdomain.com و app.yourdomain.com بدوميناتك ثم أجب عن البريد والموافقة)*

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
- https://app.yourdomain.com
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
