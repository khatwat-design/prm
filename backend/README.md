# خطوات (Khtwat) — Backend API

Backend Laravel 11 لشركة التسويق **خطوات**.

## المتطلبات

- PHP 8.2+
- Composer
- قاعدة بيانات (MySQL/PostgreSQL/SQLite)

## التثبيت

```bash
composer install
cp .env.example .env
php artisan key:generate
# ضبط DB_* في .env ثم:
php artisan migrate
php artisan db:seed
```

## تشغيل السيرفر

```bash
php artisan serve
```

الـ API متاح على: `http://127.0.0.1:8000/api`

## الصلاحيات (Roles)

| الدور        | الوصف |
|-------------|--------|
| `admin`     | إدارة الزبائن وتحليل البيانات |
| `mediabuyer`| إدارة الزبائن وتحليل البيانات |
| `client`    | إدخال (عدد الطلبات + مبلغ الطلبات) لكل منصة وعرض تقاريره |

## المنصات (Platform)

`tiktok` | `whatsapp` | `messenger` | `facebook` | `website`

## نقاط الـ API

### مصادقة

- **POST** `/api/login`  
  Body: `{ "email": "...", "password": "..." }`  
  يرجع: `{ "token": "...", "user": { "id", "name", "email", "role" } }`

### محمية بـ `Authorization: Bearer {token}`

- **GET** `/api/clients` — قائمة الزبائن (أدمن / ميديا باير فقط)  
  Query: `?search=...&per_page=15`

- **GET** `/api/daily-reports` — تقارير الزبون المسجل (حسب التاريخ والمنصة)  
  Query: `?from=YYYY-MM-DD&to=YYYY-MM-DD&per_page=100`

- **POST** `/api/daily-reports` — إدخال (عدد الطلبات + مبلغ الطلبات) فقط لكل منصة (الزبون)  
  Body: `{ "date": "YYYY-MM-DD", "platform": "whatsapp", "orders_count": 5, "order_value": 150.00 }`  
  ملاحظة: `leads_count` و `ad_spend` يملآن لاحقاً من API ميتا/تيك توك.

- **GET** `/api/reports/daily` — تقرير يومي لزبون (ميديا باير) — جدول مع توتال لكل يوم مثل CSV  
  Query: `?client_id=1&from=YYYY-MM-DD&to=YYYY-MM-DD`

## المعادلات (Accessors في Model)

- **تكلفة الرسالة** `cost_per_lead` = ad_spend / leads_count
- **نسبة التحويل** `conversion_rate` = (orders_count / leads_count) × 100
- **الاستحواذ (CAC)** = ad_spend / orders_count
- **الربح بعد الصرف** = order_value - ad_spend
- **ROAS** = order_value / ad_spend

## مستخدمون تجريبيون (بعد `php artisan db:seed`)

| الدور        | البريد                | كلمة المرور (افتراضي من Factory) |
|-------------|------------------------|-----------------------------------|
| أدمن        | admin@khtwat.com       | password                          |
| ميديا باير  | mediabuyer@khtwat.com  | password                          |
| زبون        | client@khtwat.com      | password                          |

## هيكل قاعدة البيانات

- **users** — مع حقل `role`
- **clients** — user_id, business_name, meta_connected, fb_ad_account_id, long_lived_token
- **daily_reports** — client_id, date, platform, leads_count, orders_count, ad_spend, order_value (فريد: client_id + date + platform)
- **meta_ads_data** — client_id, date, platform, leads_count, spend, clicks, impressions (وسيط لبيانات ميتا/تيك توك لاحقاً)
