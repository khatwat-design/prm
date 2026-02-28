# خطوات (Khtwat) — نظام إدارة الحملات والتقارير

نظام لشركة التسويق **خطوات**: إدارة الزبائن، إدخال المبيعات اليومية حسب المنصة، وتحليل الحملات يومياً.

**المستودع:** [github.com/khatwat-design/prm](https://github.com/khatwat-design/prm)

---

## التقنيات

| الجزء | التقنية |
|--------|----------|
| **Backend API** | Laravel 11، PHP 8.2+ |
| **Frontend** | Next.js 14، TypeScript، Tailwind CSS |
| **المصادقة** | Laravel Sanctum (Bearer Token) |
| **قاعدة البيانات** | SQLite / MySQL / PostgreSQL |

---

## هيكل المشروع

```
khtwat prm/
├── backend/          # Laravel 11 API
│   ├── app/
│   │   ├── Enums/Platform.php
│   │   ├── Http/Controllers/Api/
│   │   ├── Models/
│   │   └── ...
│   ├── database/migrations/
│   ├── routes/api.php
│   └── README.md
├── frontend/         # Next.js 14
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard/client/    # لوحة الزبون
│   │   │   ├── login/
│   │   │   └── mediabuyer/
│   │   ├── components/
│   │   └── lib/api.ts
│   └── package.json
└── README.md         # هذا الملف
```

---

## التشغيل والتثبيت

### 1) Backend (Laravel)

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
# ضبط DB_* في .env (SQLite افتراضي)
php artisan migrate
php artisan db:seed
php artisan serve
```

- الـ API: **http://127.0.0.1:8000/api**

### 2) Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

- الواجهة: **http://localhost:3000**

### 3) ربط الواجهة بالـ API

في `frontend` أنشئ ملف `.env.local`:

```
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
```

### 4) ربط ميتا (Meta / فيسبوك) — اختياري

- في [Meta for Developers](https://developers.facebook.com/) أنشئ تطبيق وفعّل تسجيل الدخول عبر فيسبوك.
- أضف في **Valid OAuth Redirect URIs**: `https://عنوان-الباك-اند/api/meta/callback` (مثلاً `http://127.0.0.1:8000/api/meta/callback` للتطوير).
- في `backend/.env` أضف:

```
META_APP_ID=...
META_APP_SECRET=...
META_REDIRECT_URI=http://127.0.0.1:8000/api/meta/callback
FRONTEND_URL=http://localhost:3000
```

- الزبون من لوحة تحكمه يربط حسابه ثم يختار الحساب الإعلاني. **سحب تحليلات ميتا** يتم تلقائياً وباستمرار عند فتح لوحة التحليلات (كل 10 دقائق). ربط ميتا يُضبط لاحقاً على السيرفر (راجع **DEPLOYMENT.md** و `backend/META_SETUP.md`).

---

## النشر على VPS (Hostinger أو غيره)

لنشر المشروع على سيرفر VPS باستخدام **دومين فرعي** (بدون تداخل مع مشاريعك الأخرى)، راجع **[DEPLOYMENT.md](DEPLOYMENT.md)** — يتضمن إعداد Hostinger، Nginx لدومين فرعي، ومسار مستقل للمشروع.

---

## بيانات الدخول للتجربة

كلمة المرور لجميع الحسابات: **`password`**

| الدور | البريد | الاستخدام |
|--------|--------|-----------|
| **زبون** | client@khtwat.com | لوحة تحكم الزبون — تحليل الحملات + إدخال المبيعات |
| **ميديا باير** | mediabuyer@khtwat.com | قائمة الزبائن، إضافة زبون، التقارير اليومية |
| **أدمن** | admin@khtwat.com | نفس صلاحيات الميديا باير |

---

## المميزات الحالية

### واجهة الزبون (`/dashboard/client`)
- **الواجهة الرئيسية:** تحليل الحملات يوم بيوم (آخر 30 يوم) — عدد الطلبات، مبلغ الطلبات، الصرف، الربح، ROAS، وتفصيل المنصات.
- **إدخال المبيعات:** زر "إدخال مبيعات اليوم" ينقل إلى `/dashboard/client/sales` — نموذج إدخال (عدد الطلبات + مبلغ الطلبات) لكل منصة: TikTok, WhatsApp, Messenger, Facebook, Website.

### واجهة الميديا باير (`/mediabuyer`)
- قائمة الزبائن مع بحث.
- **إضافة زبون:** زر يفتح نموذج (الاسم، البريد، كلمة المرور، اسم النشاط).
- تقرير يومي لزبون محدد (من–إلى) — جدول يطابق شكل CSV مع صف "توتال المنصات" لكل يوم.
- تحميل التقرير تلقائياً عند اختيار الزبون والتواريخ.

### الـ API (ملخص)
- `POST /api/login` — تسجيل الدخول وإصدار توكن (محدود: 5 محاولات/دقيقة).
- `POST /api/logout` — تسجيل الخروج وإلغاء التوكن (محمي بـ Sanctum).
- `GET /api/me` — المستخدم الحالي + بيانات الزبون (meta_connected، fb_ad_account_id).
- `GET/POST /api/clients` — قائمة الزبائن وإضافة زبون (ميديا باير/أدمن).
- `GET /api/daily-reports` — تقارير الزبون المسجل.
- `POST /api/daily-sales` — حفظ مبيعات اليوم كمجموعة (مصفوفة من المنصات).
- `GET /api/reports/daily` — تقرير يومي لزبون (ميديا باير).
- `GET /api/meta/redirect` — رابط OAuth لربط حساب ميتا (زبون، محمي بـ Sanctum).
- `GET /api/meta/callback` — استقبال callback من فيسبوك (بدون Sanctum).
- `GET /api/meta/ad-accounts` — قائمة الحسابات الإعلانية (زبون).
- `POST /api/meta/save-account` — حفظ الحساب الإعلاني المختار (زبون).
- `POST /api/meta/sync` — سحب بيانات الحملات من ميتا (يُستدعى تلقائياً من لوحة التحليلات عند ربط الحساب).

---

## الرود ماب (Roadmap)

### تم تنفيذه
- [x] نظام مستخدمين وصلاحيات (Admin / MediaBuyer / Client)
- [x] جداول: users, clients, daily_reports, meta_ads_data مع المنصات (Platform)
- [x] إدخال المبيعات اليومية (عدد الطلبات + مبلغ الطلبات) لكل منصة
- [x] معادلات التحليل: cost_per_lead, conversion_rate, cac, profit_after_spend, roas
- [x] لوحة الزبون: تحليل يوم بيوم + صفحة إدخال المبيعات
- [x] لوحة الميديا باير: قائمة الزبائن، إضافة زبون، تقرير يومي بجدول وتوتال
- [x] ربط الواجهة بالـ API مع Bearer Token
- [x] **ربط ميتا:** OAuth (ads_read, business_management)، Long-Lived Token، قائمة الحسابات الإعلانية وحفظ الاختيار
- [x] **سحب بيانات ميتا:** خدمة MetaAdsService؛ يُستدعى تلقائياً من لوحة التحليلات (كل 10 دقائق) أو عبر `POST /api/meta/sync`
- [x] **أمان:** حد معدل على تسجيل الدخول (5/دقيقة)، تسجيل خروج من الخادم (`POST /api/logout`)، معالجة 401 في الواجهة (توجيه لصفحة الدخول)

### مرحلة لاحقة (مقترحة)
- [ ] سحب الصرف وعدد الرسائل من TikTok API
- [ ] تصدير التقارير (CSV / Excel)
- [ ] إشعارات أو تنبيهات للزبون (مثلاً تذكير بإدخال اليومي)
- [ ] تحسينات أمان (تغيير كلمة المرور، استعادة الحساب)

---

## قاعدة البيانات (ملخص)

| الجدول | الحقول الرئيسية |
|--------|------------------|
| **users** | name, email, password, role (admin / mediabuyer / client) |
| **clients** | user_id, business_name, meta_connected, fb_ad_account_id, long_lived_token |
| **daily_reports** | client_id, date, platform, leads_count, orders_count, ad_spend, order_value |
| **meta_ads_data** | client_id, date, platform, leads_count, spend, clicks, impressions |

---

لتفاصيل الـ API والـ Backend فقط راجع: **`backend/README.md`**
