# إعداد ربط ميتا (Facebook) مع خطوات PRM

بعد رفع المشروع وربط الدومين، تحتاج تطبيق في **Meta for Developers** وضبط المتغيرات على السيرفر.

---

## 1) إنشاء تطبيق ميتا

1. ادخل إلى: **https://developers.facebook.com/**
2. سجّل الدخول بحساب فيسبوك ثم من القائمة: **My Apps** → **Create App** → **Other** (أو **Business** حسب النوع).
3. اختر **Business** ثم **Next**، أدخل اسم التطبيق (مثلاً: **خطوات PRM**) ثم **Create App**.

---

## 2) إضافة منتج "Facebook Login"

1. من لوحة التطبيق: **Add Product** أو **Set up** بجانب **Facebook Login**.
2. اختر **Web** (المنصة).
3. في **Site URL** ضع: `https://prm.khtwat.com`
4. في **Valid OAuth Redirect URIs** أضف **بالضبط**:
   ```
   https://api.prm.khtwat.com/api/meta/callback
   ```
5. احفظ (**Save**).

---

## 3) أخذ App ID و App Secret

1. من الصفحة الرئيسية للتطبيق: **Settings** → **Basic**.
2. انسخ:
   - **App ID**
   - **App Secret** (اضغط **Show** إن لزم).

---

## 4) صلاحيات التطبيق (للإنتاج)

لتشغيل الربط مع الإعلانات والتقارير، التطبيق يحتاج صلاحيات:

- **ads_read**
- **business_management**
- **read_insights**

في **App Review** يمكنك طلب هذه الصلاحيات. للتجربة أولاً يمكنك استخدام التطبيق في وضع **Development** وإضافة نفسك كمُختبر (Roles → Test Users أو إضافة حسابك كـ Admin/Tester).

---

## 5) ضبط المتغيرات على السيرفر

على السيرفر عدّل ملف `.env` في مجلد الباك اند:

```bash
nano /root/prm/backend/.env
```

اضبط أو أضف (مع استبدال القيم الحقيقية):

```env
META_APP_ID=رقم_التطبيق_من_ميتا
META_APP_SECRET=المفتاح_السري_من_ميتا
META_REDIRECT_URI=https://api.prm.khtwat.com/api/meta/callback
FRONTEND_URL=https://prm.khtwat.com
```

احفظ الملف (في nano: `Ctrl+O` ثم `Enter` ثم `Ctrl+X`).

ثم حدّث الكاش:

```bash
cd /root/prm/backend && php artisan config:cache
```

---

## 6) التحقق من الواجهة

1. ادخل كـ **عميل** إلى: https://prm.khtwat.com
2. من القائمة اذهب إلى **إعدادات الربط** (أو **Dashboard** → **Settings**).
3. اضغط **ربط حساب Meta** — يفترض أن يُوجّهك لفيسبوك للموافقة ثم يعود إلى إعدادات الربط.
4. بعد الربط اختر **الحساب الإعلاني (Ad Account)** من القائمة واحفظ.

بعدها يمكنك استخدام لوحة التحليلات وسحب الصرف وعدد الرسائل من ميتا.
