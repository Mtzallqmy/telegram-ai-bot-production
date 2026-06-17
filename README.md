# 🤖 Telegram Webhook Bot for Railway

هذا المستودع يحتوي على خادم بوت تيليجرام احترافي ومثالي معد بالكامل للنشر المباشر والمجاني على منصة **Railway**، مبرمج بلغة **TypeScript** ومبني على إطار عمل **Telegraf**. يشتغل البوت بالكامل عبر بوابات الـ Webhooks السريعة والمحمية دون الحاجة لتقنية Polling المستهلكة للمعالج والذاكرة.

---

## 🚀 المميزات والتقنيات المستخدمة

- ⚡ **Telegraf + Express**: لمعالجة أحداث التفاعل السريعة وبناء بوابات الـ Webhook الآمنة.
- 🗃️ **Prisma + PostgreSQL**: للتتبع الفوري، فهرسة وإحصاء المستخدمين وأرشفة الرسائل بسلاسة وسرعة فائقة.
- 🟥 **Redis integration**: لإدارة تفاعلات الخطوات التفاعلية للمستخدمين (Session Management) وبناء حدود الاستهلاك (Rate Limiters).
- 🌲 **Pino logger**: نظام تسجيل تتبعي احترافي وفائق الأداء.
- 📦 **Docker & Railway deployment**: مهيأ بملف Dockerfile متعدد المراحل لضمان تشغيله ببيئة خفيفة وسريعة.
- 💻 **Health Check Panel**: صفحة تتبع مبسطة مدمجة تمكنك من رؤية حالة اتصال الخوادم المحلية فورياً.

---

## ⚙️ متغيرات البيئة المطلوبة في Railway

يرجى تدوين وتعبئة المتوافق من المتغيرات التالية في لوحة تحكم Railway ليكون الخادم جاهزاً للعمل تلقائياً:

| المتغير | الأهمية | الوصف |
| :--- | :--- | :--- |
| `BOT_TOKEN` | **إلزامي** | رمز تسجيل البوت الخاص بك المستخرج من [@BotFather](https://t.me/BotFather) |
| `DATABASE_URL` | **إلزامي** | رابط الاتصال المباشر بقاعدة PostgreSQL في Railway (نظام الجداول سيبنى تلقائياً عند التشغيل) |
| `REDIS_URL` | *اختياري* | رابط اتصال خادم Redis (في حالة عدم الضبط، سيتحول النظام تلقائياً للذاكرة الوهمية المؤقتة) |
| `ADMIN_IDS` | *اختياري* | معرفات المسؤولين مفصولة بفاصله لتشغيل أوامر لوحة الإشراف والتتبع اللحظي عبر `/admin` |
| `PORT` | *تلقائي* | منفذ الخادم المخصص تلقائياً بواسطة Railway (افتراضي: 3000) |
| `RAILWAY_PUBLIC_DOMAIN` | **إلزامي** | نطاق تطبيقك العام في Railway (مثال: `your-bot.up.railway.app`) ليقوم البوت بتسجيل Webhook تلقائياً به |

---

## 🛠️ أوامر تجربة واستكشاف البوت

يقدم البوت مجموعة متميزة من الأوامر الاحترافية والمدعمة بالاتصالات التزامنية:

- **`/start`** - أهلاً بك، ترحيب تفاعلي وتوليد قائمة أزرار التحكم السريعة.
- **`/help`** - عرض قائمة التعليمات والمساعدة وإحصاءات الأمان المطبقة.
- **`/profile`** - قراءة اللمحة التاريخية الخاصة بك وتاريخ أول تفاعل مع إجمالي الرسائل المرسلة من قاعدة PostgreSQL.
- **`/survey`** - معالج استبيان تفاعلي يتذكر خطوتك الحالية بالاعتماد الكلي على جلسة Redis المخزنة.
- **`/admin`** - خاص بالمسؤولين فقط لعرض تقرير النظام وعداد قواعد البيانات فورياً.

---

## 📦 ملفات تهيئة المنصة

المشروع يحتوي على كل الملفات اللازمة للـ Deploy الفوري:
- `/Dockerfile`: بناء خفيف وصغير يعتمد على Alpine ويدعم توليد schemas على محرك Prisma تلقائياً.
- `/railway.json`: تهيئة منشئ Dockerfile الخاص بـ Railway.
- `/Procfile`: أمر الإقلاع الآمن.
- `/prisma/schema.prisma`: المخطط العلائقي لقاعدة البيانات.

---

# 🤖 English Quickstart Guide

This is a professional, high-performance Telegram Bot built using **TypeScript**, **Telegraf**, and **Express**, made specifically for deployment on **Railway** with **PostgreSQL (Prisma)** and **Redis**. It is fully webhook-driven (polling is disabled).

### Environment Configuration:
Set these variables inside your Railway Service console:
- `BOT_TOKEN`: Telegram Token from `@BotFather`.
- `DATABASE_URL`: Connection string to your Railway PostgreSQL. We auto-run `prisma db push` on start.
- `REDIS_URL`: Connection string to your Railway Redis (falls back to memory if none provided).
- `ADMIN_IDS`: Comma-separated list of Telegram User IDs for the admin dashboard.
- `RAILWAY_PUBLIC_DOMAIN`: Your public app URL (e.g. `your-app.up.railway.app`) so we can auto-register the Webhook endpoint `POST /telegram/webhook`.

### Webhook Route:
The bot webhook securely listens on:
`POST /telegram/webhook`

### Health Check Route:
`GET /health` retrieves `{"status": "ok"}`
