# أول نشر على السيرفر — خطوة بخطوة

دليل لأول مرة ترفع فيها المشروع على VPS. **قاعدة البيانات تُنشأ تلقائياً** (SQLite — لا تحتاج تثبيت MySQL).

استبدل في الأوامر:
- `api.yourdomain.com` → دومينك الفرعي للـ API
- `app.yourdomain.com` → دومينك الفرعي للواجهة
- `yourdomain.com` → دومينك من Hostinger

---

## المرحلة 0: الاتصال بالسيرفر

```bash
ssh root@187.77.68.2
```

(أو `ssh root@IP_SERVER` مع كلمة مرور أو مفتاح SSH)

---

## الخطوة 1: التأكد من تثبيت PHP و Composer و Node

```bash
php -v
composer -V
node -v
```

- إن ظهر **command not found** لأي منها:
  - **Ubuntu/Debian:**  
    `apt update && apt install -y php8.2-fpm php8.2-cli php8.2-mbstring php8.2-xml php8.2-curl php8.2-sqlite3 php8.2-zip unzip git curl nginx`  
    ثم Composer:  
    `curl -sS https://getcomposer.org/installer | php && mv composer.phar /usr/local/bin/composer`  
    ثم Node (مثلاً 20):  
    `curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt install -y nodejs`
  - **ملاحظة:** نحتاج `php8.2-fpm` لـ Nginx (الخطوة 5).

---

## الخطوة 2: إنشاء مجلد المشروع واستنساخ من GitHub

```bash
cd /root
mkdir -p prm
cd prm
git clone https://github.com/khatwat-design/prm.git .
```

تأكد أنك داخل مجلد فيه `backend` و `frontend`:

```bash
ls
```

يجب أن ترى: `backend`  `frontend`  `README.md`  إلخ.

---

## الخطوة 3: إعداد الـ Backend (Laravel)

```bash
cd /root/prm/backend
```

### 3.1 تثبيت المكتبات

```bash
composer install --no-dev --optimize-autoloader
```

### 3.2 نسخ ملف البيئة

```bash
cp .env.example .env
```

### 3.3 توليد مفتاح التطبيق

```bash
php artisan key:generate
```

### 3.4 ضبط ملف .env للإنتاج

```bash
nano .env
```

غيّر أو تأكد من هذه الأسطر فقط (باقي الأسطر اتركها كما هي):

```env
APP_NAME=Khtwat
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.yourdomain.com

DB_CONNECTION=sqlite
SESSION_DRIVER=file
CACHE_STORE=file
```

احذف أو علّق أي سطر فيه `DB_HOST` أو `DB_DATABASE` خاص بـ MySQL إن وُجد. مع `DB_CONNECTION=sqlite` Laravel يستخدم ملفاً داخل المشروع. `SESSION_DRIVER=file` و `CACHE_STORE=file` يبقيان الجلسة والكاش بملفات فلا تحتاج جدول sessions.

ثم في نهاية الملف (قسم ميتا):

```env
META_APP_ID=
META_APP_SECRET=
META_REDIRECT_URI=https://api.yourdomain.com/api/meta/callback
FRONTEND_URL=https://app.yourdomain.com
```

احفظ في nano: `Ctrl+O` ثم Enter ثم `Ctrl+X`.

### 3.5 إنشاء قاعدة البيانات تلقائياً وتشغيل الهجرات

مع SQLite لا تحتاج إنشاء قاعدة يدوياً. نفّذ:

```bash
touch database/database.sqlite
php artisan migrate --force
```

ستُنشأ الجداول تلقائياً.

### 3.6 إدخال بيانات التجربة (مستخدمون + زبون)

```bash
php artisan db:seed
```

### 3.7 تخزين الإعدادات مؤقتاً

```bash
php artisan config:cache
php artisan route:cache
```

---

## الخطوة 4: إعداد الـ Frontend (Next.js)

```bash
cd /root/prm/frontend
```

### 4.1 تثبيت الحزم

```bash
npm ci
```

### 4.2 إنشاء ملف البيئة

```bash
echo "NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api" > .env.local
```

(استبدل `api.yourdomain.com` بدومينك الفرعي للـ API)

### 4.3 البناء

```bash
npm run build
```

### 4.4 تشغيل الواجهة في الخلفية (PM2)

```bash
npm install -g pm2
pm2 start npm --name "khtwat-prm" -- start
pm2 save
pm2 startup
```

اتبع التعليمات التي يطبعها `pm2 startup` (نسخ ولصق الأمر الذي يبدأ بـ `sudo env` إن طُلِب منك).

تأكد أن التطبيق يعمل:

```bash
pm2 list
```

يجب أن ترى `khtwat-prm` بحالة **online**. Next.js يعمل على المنفذ **3000** افتراضياً.

---

## الخطوة 5: إعداد Nginx (الـ API والواجهة)

### 5.1 التأكد من وجود Nginx

```bash
nginx -v
```

إن لم يكن مثبتاً: `apt install -y nginx`

### 5.2 إنشاء موقع الـ API

```bash
nano /etc/nginx/sites-available/prm-api
```

الصق التالي (ثم غيّر `api.yourdomain.com` ومسار المشروع إن اختلف):

```nginx
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
```

احفظ واخرج.

### 5.3 إنشاء موقع الواجهة

```bash
nano /etc/nginx/sites-available/prm-app
```

الصق (واستبدل `app.yourdomain.com` بدومينك):

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

احفظ واخرج.

### 5.4 تفعيل المواقع واختبار Nginx

```bash
ln -sf /etc/nginx/sites-available/prm-api /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/prm-app /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

إن ظهر `syntax is ok` و `test is successful` فالإعداد صحيح.

---

## الخطوة 6: توجيه الدومينات الفرعية إلى السيرفر

في لوحة **Hostinger** (Domains → Subdomains أو DNS):

- تأكد أن `api.yourdomain.com` و `app.yourdomain.com` يشيران إلى IP السيرفر **187.77.68.2** (سجل A).

انتظر دقائق إن لزم حتى ينتشر الـ DNS ثم جرّب من المتصفح:

- `http://api.yourdomain.com`
- `http://app.yourdomain.com`

---

## الخطوة 7: تفعيل SSL (HTTPS)

على السيرفر:

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d api.yourdomain.com -d app.yourdomain.com
```

اتبع الأسئلة (بريد، موافقة، إلخ). بعدها ستكون الواجهة والـ API يعملان على **https**.

أعد تشغيل الـ cache في Laravel بعد تفعيل HTTPS:

```bash
cd /root/prm/backend
php artisan config:cache
```

---

## الخطوة 8: التحقق من النشر

1. افتح **https://app.yourdomain.com** في المتصفح.
2. يجب أن تظهر صفحة تسجيل الدخول.
3. سجّل الدخول بـ:
   - البريد: `client@khtwat.com`
   - كلمة المرور: `password`
4. تأكد أن لوحة التحليلات تعمل وأن الطلبات تذهب إلى `https://api.yourdomain.com`.

---

## ملخص الأوامر بالترتيب (نسخ سريع)

```bash
# بعد ssh root@187.77.68.2
cd /root && mkdir -p prm && cd prm && git clone https://github.com/khatwat-design/prm.git .

cd /root/prm/backend
composer install --no-dev --optimize-autoloader
cp .env.example .env
php artisan key:generate
# عدّل .env يدوياً (APP_URL, APP_ENV=production, APP_DEBUG=false, الدومينات، ميتا)
touch database/database.sqlite
php artisan migrate --force
php artisan db:seed
php artisan config:cache
php artisan route:cache

cd /root/prm/frontend
npm ci
echo "NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api" > .env.local
npm run build
npm install -g pm2
pm2 start npm --name "khtwat-prm" -- start
pm2 save
pm2 startup

# ثم إعداد Nginx (الخطوة 5) و Certbot (الخطوة 7)
```

---

## استبدال SQLite بـ MySQL لاحقاً (اختياري)

إذا أردت استخدام MySQL لاحقاً:

1. أنشئ قاعدة البيانات والمستخدم من MySQL.
2. عدّل `.env`: ضع `DB_CONNECTION=mysql` و `DB_DATABASE` و `DB_USERNAME` و `DB_PASSWORD`.
3. نفّذ `php artisan migrate --force` من جديد (على MySQL).

الخطوات التفصيلية في **DEPLOYMENT.md**.
