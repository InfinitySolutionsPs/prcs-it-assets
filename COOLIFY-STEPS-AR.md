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
- Compose file: `docker-compose.yml`.

## 3. المتغيرات

أضف القيم الحقيقية التالية داخل Environment Variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `DATABASE_PATH=/app/data/prcs-it.db`

## 4. الدومين

- أضف `https://prcs-it.infinite.ps` إلى Domains.
- اجعل DNS للسجل `prcs-it` يشير إلى IP الخادم.
- فعّل HTTPS من Coolify.

## 5. Supabase

في Authentication → URL Configuration:

- Site URL: `https://prcs-it.infinite.ps`
- Redirect URL: `https://prcs-it.infinite.ps/**`

## 6. النشر

اضغط Deploy، ثم راقب السجل حتى تظهر رسالة تشغيل Next.js على المنفذ 3000.
