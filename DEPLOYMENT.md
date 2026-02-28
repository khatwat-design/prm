# نشر خطوات (Khtwat) على VPS — Hostinger ودومين فرعي

دليل نشر المشروع على سيرفر VPS (Hostinger أو غيره) باستخدام **دومين فرعي** من هوستنجر، بحيث يعمل المشروع في **مسار ومجال خاصين** دون تداخل مع مشاريعك الأخرى.

**المستودع:** [github.com/khatwat-design/prm](https://github.com/khatwat-design/prm)

---

## ما ستحتاجه

- **VPS من Hostinger** (أو أي مزود) مع وصول SSH.
- **دومين من Hostinger** (مثلاً `yourdomain.com`).
- **دومينان فرعيان** لنفس الدومين، مثلاً:
  - `app.yourdomain.com` → لوحة المستخدمين (Next.js)
  - `api.yourdomain.com` → الـ API (Laravel)

يمكنك اختيار أسماء أخرى مثل `prm.yourdomain.com` و `api-prm.yourdomain.com` — المهم أن يكون لكل تطبيق دومين فرعي خاص.

---

## 1) إنشاء الدومينات الفرعية في Hostinger

1. ادخل إلى **hPanel** (لوحة Hostinger).
2. من **Domains** اختر الدومين الرئيسي.
3. **Subdomains** (أو إدارة النطاقات الفرعية): أنشئ:
   - `app` → `app.yourdomain.com` (أو الاسم الذي تريده للواجهة)
   - `api` → `api.yourdomain.com` (للـ API)

اترك **A Record** يشير إلى IP السيرفر (عادةً يُضبط تلقائياً عند إنشاء الـ subdomain). لا تحتاج تغيير شيء آخر إن كان السيرفر يستخدم نفس الدومين.

---

## 2) مسار المشروع (بدون تداخل مع مشاريع أخرى)

استخدم مجلداً مخصصاً لهذا المشروع فقط، **خارج** مجلد المشاريع الأخرى (مثلاً لا تضعه داخل `public_html` لمشروعك الحالي).

**مثال على VPS Hostinger:**

```bash
# المسار الشائع لـ Hostinger: منزل المستخدم ثم مجلد للمشروع
cd ~
# أو إن كنت تستخدم /var/www:
# sudo mkdir -p /var/www/prm && sudo chown $USER:$USER /var/www/prm && cd /var/www/prm

mkdir -p prm
cd prm
git clone https://github.com/khatwat-design/prm.git .
```

بعد الاستنساخ سيكون عندك:

- `~/prm/backend` (أو `/var/www/prm/backend`)
- `~/prm/frontend`
- `~/prm/README.md` و `DEPLOYMENT.md`

بهذا الشكل مشروع **prm** معزول عن أي مشروع آخر على السيرفر.

---

## 3) Backend (Laravel)

```bash
cd ~/prm/backend
# أو: cd /var/www/prm/backend

composer install --no-dev --optimize-autoloader

cp .env.example .env
php artisan key:generate
```

**تحرير `.env` للإنتاج** (استخدم دومينك الفرعي الفعلي):

```env
APP_NAME=Khtwat
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.yourdomain.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=khtwat_prm
DB_USERNAME=khtwat_prm
DB_PASSWORD=كلمة_مرور_قوية

SESSION_DRIVER=database
SESSION_SECURE_COOKIE=true

META_APP_ID=...
META_APP_SECRET=...
META_REDIRECT_URI=https://api.yourdomain.com/api/meta/callback
FRONTEND_URL=https://app.yourdomain.com
```

**إنشاء قاعدة البيانات (MySQL):**

```bash
mysql -u root -p
CREATE DATABASE khtwat_prm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'khtwat_prm'@'localhost' IDENTIFIED BY 'كلمة_مرور_قوية';
GRANT ALL ON khtwat_prm.* TO 'khtwat_prm'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

```bash
php artisan migrate --force
php artisan db:seed
php artisan config:cache
php artisan route:cache
```

---

## 4) Frontend (Next.js)

```bash
cd ~/prm/frontend
# أو: cd /var/www/prm/frontend

npm ci
```

**إنشاء `.env.local`:**

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
```

```bash
npm run build
```

**تشغيل الواجهة (مثلاً عبر PM2 حتى تعمل في الخلفية):**

```bash
npm install -g pm2
pm2 start npm --name "khtwat-prm" -- start
pm2 save
pm2 startup
```

يفترض أن Next.js يعمل على المنفذ **3000**. إن كان منفذ 3000 مستخدماً بمشروع آخر، غيّر المنفذ (مثلاً 3001) ثم في Nginx استخدم `proxy_pass http://127.0.0.1:3001`.

---

## 5) Nginx — مواقع منفصلة لدومينين فرعيين فقط

يجب أن يكون لكل من **api** و **app** **server block خاص**، بحيث لا يتداخل مع أي موقع آخر على السيرفر.

**ملف الـ API فقط** (مثلاً `/etc/nginx/sites-available/prm-api`):

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    root /home/username/prm/backend/public;
    # أو: root /var/www/prm/backend/public;
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
```

**ملف الواجهة فقط** (مثلاً `/etc/nginx/sites-available/prm-app`):

```nginx
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
```

**تفعيل المواقع:**

```bash
sudo ln -s /etc/nginx/sites-available/prm-api /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/prm-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

- استبدل `username` و `api.yourdomain.com` و `app.yourdomain.com` ومسار `root` حسب سيرفرك.
- بهذا الشكل **فقط** الطلبات إلى `api.yourdomain.com` و `app.yourdomain.com` تخدم مشروع prm؛ باقي الدومينات أو المواقع لا تتأثر.

---

## 6) SSL (Let's Encrypt)

على Hostinger غالباً يمكن تفعيل SSL من لوحة التحكم. أو من السيرفر:

```bash
sudo certbot --nginx -d api.yourdomain.com -d app.yourdomain.com
```

بعد ذلك تأكد أن في `.env` الـ Backend تستخدم **https** في `APP_URL` و `META_REDIRECT_URI` و `FRONTEND_URL`.

---

## 7) CORS و Sanctum

- في **Backend `.env`**:  
  `FRONTEND_URL=https://app.yourdomain.com` (بدون `/` في النهاية).
- إن استخدمت Sanctum مع cookies: أضف الدومين في `config/sanctum.php` أو عبر `.env`:  
  `SANCTUM_STATEFUL_DOMAINS=app.yourdomain.com`.

---

## 8) التحقق بعد النشر

1. فتح **https://app.yourdomain.com** والتأكد من تحميل الواجهة.
2. تسجيل الدخول (مثلاً client@khtwat.com / password).
3. التأكد من أن الطلبات تذهب إلى **https://api.yourdomain.com/api** (من أدوات المطور → Network).

---

## 9) تحديثات لاحقة (من GitHub)

```bash
cd ~/prm
git pull

cd backend && composer install --no-dev && php artisan migrate --force && php artisan config:cache
cd ../frontend && npm ci && npm run build && pm2 restart khtwat-prm
```

---

## ملخص عدم التداخل

| العنصر        | الاستخدام في prm فقط        |
|---------------|-----------------------------|
| الدومين       | subdomain خاص (api.* و app.*) |
| مسار الملفات  | مجلد مستقل (مثلاً ~/prm)   |
| Nginx         | server_name للدومين الفرعي فقط |
| قاعدة البيانات| قاعدة منفصلة (مثلاً khtwat_prm) |
| PM2           | اسم عملية مختلف (khtwat-prm)  |

بهذا لا يحدث تداخل مع مشاريعك الأخرى على نفس السيرفر.

لتفاصيل ربط ميتا بعد النشر راجع **backend/META_SETUP.md**.
