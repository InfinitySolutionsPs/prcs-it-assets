# PRCS IT Assets

## Local authentication environment variables

Set `AUTH_SECRET` to a random value of at least 32 characters. Set `LOCAL_AUTH_SETUP_TOKEN` to a separate temporary secret used only for the first administrator setup. Supabase variables are no longer required.

نظام إدارة الأصول والعهد التقنية، مجهّز للنشر على Coolify باستخدام Docker.

## المتطلبات

- Coolify مع Persistent Storage.
- الدومين: `prcs-it.infinite.ps`.

## متغيرات التشغيل

أضف في Coolify:

```env
AUTH_SECRET=RANDOM_VALUE_OF_AT_LEAST_32_CHARACTERS
LOCAL_AUTH_SETUP_TOKEN=SEPARATE_ONE_TIME_SETUP_TOKEN
DATABASE_PATH=/app/data/prcs-it.db
```

المتغيران سريان للخادم فقط؛ لا تضعهما في GitHub ولا تفعّل لهما Buildtime. يُستخدم `LOCAL_AUTH_SETUP_TOKEN` مرة واحدة لتجهيز بيانات دخول مدير النظام الموجود في قاعدة البيانات.

## إعداد Coolify

1. أنشئ Resource جديد من مستودع GitHub.
2. اختر Docker Compose.
3. اختر الفرع `main` والملف `docker-compose.yaml`.
4. أضف المتغيرات السابقة.
5. تأكد من وجود التخزين الدائم `prcs_it_data` على `/app/data`.
6. اربط الدومين `prcs-it.infinite.ps` بالمنفذ `3000`.
7. شغّل Deploy.

تُطبّق ترقيات قاعدة البيانات تلقائيًا عند تشغيل الحاوية، وتبقى البيانات داخل التخزين الدائم.

## ملاحظة تسجيل الدخول

عند أول تشغيل بعد التحديث ستظهر شاشة تهيئة لمرة واحدة. أدخل بريد مدير النظام الموجود، واسم دخول وكلمة مرور جديدين، ورمز `LOCAL_AUTH_SETUP_TOKEN`. بعد ذلك يضيف المدير بيانات دخول المستخدمين الآخرين من شاشة إدارة المستخدمين.
