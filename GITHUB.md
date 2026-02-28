# رفع المشروع إلى GitHub (khatwat-design/prm)

المستودع: **https://github.com/khatwat-design/prm**

---

## أول مرة — من جهازك الحالي

إذا المشروع عندك محلياً والمستودع على GitHub **فارغ**:

```bash
cd "c:\Users\k2o0r\Desktop\khtwat prm"

# إن لم يكن المجلد مبدوءاً كـ git:
git init
git add .
git commit -m "Initial commit: Khtwat PRM - Laravel + Next.js"

# ربط المستودع البعيد (استبدل باسم المستودع إن اختلف)
git remote add origin https://github.com/khatwat-design/prm.git

# الدفع (الفرع الرئيسي غالباً main أو master)
git branch -M main
git push -u origin main
```

---

## التأكد قبل الرفع

- **لا يرفع:** `backend/.env` و `frontend/.env.local` (مُدرجان في .gitignore).
- **يُرفع:** `backend/.env.example` و `frontend/.env.local.example` كنماذج.
- لا تضف توكنات أو كلمات مرور في الملفات المرفوعة.

---

## بعد التعديلات لاحقاً

```bash
git add .
git commit -m "وصف التعديل"
git push
```

ثم على السيرفر (VPS) تشغيل `git pull` وتحديث Backend و Frontend كما في **DEPLOYMENT.md**.
