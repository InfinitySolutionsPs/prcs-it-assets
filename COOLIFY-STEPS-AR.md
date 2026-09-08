# خطوات النشر على Coolify

## 1. رفع المشروع إلى GitHub

فك ضغط الحزمة، ثم ارفع **محتويات المجلد** إلى المستودع `InfinitySolutionsPs/prcs-it-assets` من خلال:

`Add file` → `Upload files` → `Commit changes`

لا ترفع ملف ZIP نفسه داخل المستودع.

## 2. إنشاء التطبيق

- افتح Coolify.
- اختر المشروع المطلوب ثم `New Resource`.
- اختر `Public Repository` أو GitHub App إذا كان الحساب مربوطًا.
- أدخل: `https://github.com/InfinitySolutionsPs/prcs-it-assets`
- Build Pack: اختر `Docker Compose`.
- Compose file: `docker-compose.yaml`.

## 3. المتغيرات

أضف القيم الحقيقية التالية داخل Environment Variables:

- `AUTH_SECRET` (قيمة عشوائية لا تقل عن 32 حرفًا)
- `LOCAL_AUTH_SETUP_TOKEN` (رمز سري منفصل للتهيئة الأولى)
- `DATABASE_PATH=/app/data/prcs-it.db`

## 4. الدومين

- أضف `https://prcs-it.infinite.ps` إلى Domains.
- اجعل DNS للسجل `prcs-it` يشير إلى IP الخادم.
- فعّل HTTPS من Coolify.

## 5. تهيئة مدير النظام

بعد النشر، أدخل بريد مدير النظام الموجود في قاعدة البيانات واختر اسم دخول وكلمة مرور، ثم أدخل قيمة `LOCAL_AUTH_SETUP_TOKEN`.

## 6. النشر

اضغط Deploy، ثم راقب السجل حتى تظهر رسالة تشغيل Next.js على المنفذ 3000.
