# PRCS IT Assets

نظام إدارة الأصول والعهد التقنية، مجهّز للنشر على Coolify باستخدام Docker.

## المتطلبات

- Supabase project لتسجيل الدخول والبريد الإلكتروني.
- Coolify مع Persistent Storage.
- الدومين: `prcs-it.infinite.ps`.

## متغيرات التشغيل

أضف في Coolify:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY=YOUR_SERVER_SECRET_KEY
DATABASE_PATH=/app/data/prcs-it.db
```

`SUPABASE_SECRET_KEY` متغير سري للخادم فقط، ويُستخدم ليتمكن مدير النظام من إنشاء حسابات مؤكدة وجاهزة للدخول. لا تضعه في GitHub، ولا تسمّه باسم يبدأ بـ`NEXT_PUBLIC_`، ولا تفعّل له Buildtime.

## إعداد Coolify

1. أنشئ Resource جديد من مستودع GitHub.
2. اختر Docker Compose.
3. اختر الفرع `main` والملف `docker-compose.yml`.
4. أضف المتغيرات السابقة.
5. تأكد من وجود التخزين الدائم `prcs_it_data` على `/app/data`.
6. اربط الدومين `prcs-it.infinite.ps` بالمنفذ `3000`.
7. شغّل Deploy.

تُطبّق ترقيات قاعدة البيانات تلقائيًا عند تشغيل الحاوية، وتبقى البيانات داخل التخزين الدائم.

## ملاحظة تسجيل الدخول

أضف `https://prcs-it.infinite.ps` إلى Site URL وRedirect URLs في إعدادات Supabase Authentication.
