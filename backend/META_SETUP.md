# خطوات إكمال ربط ميتا (Facebook Login for Business)

## ما تم بالفعل
- إنشاء تطبيق ميتا (نوع أعمال)
- تفعيل Facebook Login for Business و Marketing API
- استخدام localtunnel للحصول على رابط HTTPS: `https://old-oranges-check.loca.lt`
- ضبط `APP_URL` و `META_REDIRECT_URI` في `.env`

---

## 1) إضافة رابط الـ Callback في لوحة ميتا

1. ادخل إلى [Meta for Developers](https://developers.facebook.com/) وافتح تطبيقك.
2. من القائمة الجانبية: **Facebook Login for Business** ← **الإعدادات** (Settings).
3. في قسم **Valid OAuth Redirect URIs** أضف هذا الرابط **حرفياً**:
   ```
   https://old-oranges-check.loca.lt/api/meta/callback
   ```
4. احفظ التغييرات (Save).

> مهم: الرابط يجب أن يكون **بالضبط** كما فوق (بدون `/api/auth/` — المسار الصحيح هو `/api/meta/callback`).

---

## 2) تشغيل المشروع عند الاختبار

يجب أن يكون الـ Backend متاحاً عبر الـ tunnel حتى يستطيع فيسبوك استدعاء الـ callback.

**ترمينل 1 — Laravel:**
```bash
cd backend
php artisan serve
```
(يعمل على http://127.0.0.1:8000)

**ترمينل 2 — Tunnel:**
```bash
npx localtunnel --port 8000
```
استخدم الرابط الذي يظهر (مثلاً `https://old-oranges-check.loca.lt`).  
أول مرة تفتح الرابط قد يطلب منك إدخال كلمة المرور من https://loca.lt/mytunnelpassword.

**ترمينل 3 — الفرونت (Next.js):**
```bash
cd frontend
npm run dev
```
(يعمل على http://localhost:3000)

---

## 3) إعدادات إضافية في لوحة ميتا (إن لزم)

- في **Facebook Login for Business** ← **الإعدادات**:
  - **Client OAuth Login**: مفعّل (Yes).
  - **Web OAuth Login**: مفعّل (Yes).
- إذا طُلبت منك **App Domains** يمكنك إضافة: `old-oranges-check.loca.lt` (بدون https://).

### منتج Marketing API (API التسويق)

حتى تظهر **بيانات الحملات** (الصرف، عدد الرسائل، Insights) التطبيق يطلب عند الربط الصلاحيات:

- `ads_read` — قراءة الحسابات الإعلانية وقوائم الحملات.
- `business_management` — إدارة الوصول للأعمال.
- `read_insights` — قراءة بيانات Insights (الصرف، الإجراءات، إلخ).

لا تحتاج عادةً إلى إعدادات إضافية داخل **Marketing API** في القائمة؛ تكفي إضافة المنتج. في وضع **التطوير (Development)** يمكنك الاختبار دون مراجعة التطبيق. إذا غيّرنا الصلاحيات في الكود (مثل إضافة `read_insights`) يجب على المستخدم **إلغاء الربط ثم الربط من جديد** من صفحة إعدادات الربط حتى يصدر توكن جديد بهذه الصلاحيات.

---

## 4) تجربة الربط

1. افتح الواجهة: `http://localhost:3000` وسجّل الدخول كـ **زبون (client)**.
2. اذهب إلى إعدادات الزبون (مثلاً: صفحة الإعدادات أو ربط ميتا).
3. اضغط زر **ربط حساب ميتا** (أو ما يعادله).
4. سيتم توجيهك لفيسبوك للموافقة على الصلاحيات.
5. بعد الموافقة، فيسبوك يوجّه المتصفح إلى:
   `https://old-oranges-check.loca.lt/api/meta/callback?...`
   وهذا يتطلب أن يكون الـ tunnel شغّالاً حتى يصل الطلب إلى Laravel.
6. بعد النجاح يتم توجيهك إلى الواجهة مع `?meta=connected`.

---

## ملاحظة عن عنوان الـ Tunnel

كل مرة تشغّل فيها `npx localtunnel --port 8000` قد يتغيّر الرابط (مثلاً من `old-oranges-check` إلى اسم آخر).  
إذا تغيّر الرابط:

1. حدّث في `.env`:
   - `APP_URL=https://العنوان-الجديد.loca.lt`
   - `META_REDIRECT_URI=https://العنوان-الجديد.loca.lt/api/meta/callback`
2. حدّث **Valid OAuth Redirect URIs** في لوحة ميتا بنفس الرابط الجديد.

---

## في حال ظهور أخطاء

- **redirect_uri mismatch**: تأكد أن الرابط في ميتا مطابق تماماً لـ `META_REDIRECT_URI` في `.env`.
- **invalid_state**: غالباً انتهت صلاحية الجلسة أو تم استدعاء الـ callback من متصفح مختلف؛ أعد المحاولة من نفس المتصفح بعد تسجيل الدخول.
- التأكد من أن التطبيق في لوحة ميتا في وضع **Development** وأن المستخدم الذي تختبر به مضاف كـ **Tester** إن لزم.
