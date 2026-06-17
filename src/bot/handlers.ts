import { Telegraf, Markup } from "telegraf";
import { BotContext } from "../types";
import { getPrisma } from "../lib/prisma";
import { getRedisClient } from "../lib/redis";
import { logger } from "../lib/pino";

export function registerHandlers(bot: Telegraf<BotContext>) {
  // Command: /start
  bot.start(async (ctx) => {
    logger.info(`User ${ctx.from.id} started the bot.`);
    const username = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;

    const welcomeMsg = 
      `👋 أهلاً بك يا ${username} في البوت الاحترافي المتطور!\n\n` +
      `⚡ هذا البوت مُهيّأ للتشغيل عبر قنوات آمنة والتحقق من الهوية.\n` +
      `📦 مُتصل بقاعدة بيانات PostgreSQL ومُحسَّن بـ Redis لتسجيل الجلسات وتنفيذ حدود التفاعل.\n\n` +
      `🔍 جرب الأوامر التالية لاستكشاف المزايا:\n` +
      `• /profile - عرض ملفك الشخصي وإحصاءاتك من قاعدة البيانات.\n` +
      `• /survey - تشغيل معالج تسجيل معلومات تفاعلي مُتعدد الخطوات (يعتمد على Redis).\n` +
      `• /help - عرض معلومات المساعدة.\n` +
      `• /admin - لوحة الإشراف (تتطلب صلاحيات أدمن).`;

    await ctx.reply(
      welcomeMsg,
      Markup.keyboard([
        ["👤 ملفي الشخصي", "📋 التسجيل التفاعلي"],
        ["❓ المساعدة", "⚙️ الإدارة"]
      ]).resize()
    );
  });

  // Command: /help
  bot.help(async (ctx) => {
    const helpMsg =
      `ℹ️ **قائمة التعليمات والأوامر المتاحة**:\n\n` +
      `🚀 /start - إعادة تشغيل البوت وتهيئة الأزرار.\n` +
      `👤 /profile - عرض ملفك الشخصي بما في ذلك تاريخ التسجيل وعدد الرسائل التي أرسلتها للبوت.\n` +
      `📋 /survey - بدء معالج التسجيل التفاعلي المكون من خطوات لحفظ تفضيلاتك.\n` +
      `⚙️ /admin - لوحة تحكم المسؤول لعرض حالة النظام وإحصاءات قاعدة البيانات والـ API.\n\n` +
      `⚠️ حد التفاعل: يمنع البوت إرسال أكثر من 6 رسائل كل 10 ثوانٍ لحماية الخادم من الهجمات.`;

    await ctx.reply(helpMsg, { parse_mode: "Markdown" });
  });

  // Command: /profile
  const showProfile = async (ctx: BotContext) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    await ctx.reply("⌛ جاري استعلام البيانات من خادم PostgreSQL...");

    try {
      const prisma = getPrisma();
      if (!prisma) {
        await ctx.reply("❌ قاعدة البيانات غير متصلة. يرجى تزويد خادم البوت بمتغير DATABASE_URL لتشغيل هذه الميزة.");
        return;
      }
      const userDb = await prisma.user.findUnique({
        where: { id: BigInt(userId) },
        include: { _count: { select: { messages: true } } },
      });

      if (!userDb) {
        await ctx.reply("❌ لم يتم العثور على سجل خاص بك، يرجى إرسال أي رسالة لتسجيل حسابك.");
        return;
      }

      const adminStr = userDb.isAdmin ? "👑 مدير النظام" : "👤 مستخدم عادي";
      const regDate = userDb.createdAt.toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const profileMsg =
        `👤 **ملفك الشخصي الموثق**:\n\n` +
        `🆔 معرف تيليجرام: \`${userDb.id}\`\n` +
        `🏷️ اسم المستخدم: ${userDb.username ? `@${userDb.username}` : "لا يوجد"}\n` +
        `🎭 الاسم: ${userDb.firstName || ""} ${userDb.lastName || ""}\n` +
        `🛡️ الدور: **${adminStr}**\n` +
        `📅 تاريخ التسجيل: ${regDate}\n` +
        `📊 رسائلك المسجلة: **${userDb._count.messages}** رسالة.`;

      await ctx.reply(profileMsg, { parse_mode: "Markdown" });
    } catch (error: any) {
      logger.error(`Error fetching user profile: ${error.message || error}`);
      await ctx.reply("❌ حدث خطأ أثناء الاتصال بقاعدة البيانات. تيقن من ضبط DATABASE_URL.");
    }
  };

  bot.command("profile", showProfile);
  bot.hears("👤 ملفي الشخصي", showProfile);

  // Command: /survey (Interactive Multi-step workflow stored in Redis)
  const startSurvey = async (ctx: BotContext) => {
    ctx.session.step = "awaiting_name";
    ctx.session.answers = {};
    await ctx.reply("📋 لنبدأ التسجيل التفاعلي السريع. أولاً: ما هو اسمك الكامل؟", Markup.removeKeyboard());
  };

  bot.command("survey", startSurvey);
  bot.hears("📋 التسجيل التفاعلي", startSurvey);

  // Command: /admin dashboard
  const showAdmin = async (ctx: BotContext) => {
    if (!ctx.isAdmin) {
      await ctx.reply("⛔ عذرًا، أنت لا تملك صلاحيات إدارة النظام. معرفك غير متواجد في ADMIN_IDS.");
      return;
    }

    await ctx.reply("⌛ جاري توليد تقرير حالة النظام والعد والحساب الفوري...");

    try {
      const prisma = getPrisma();
      const redis = await getRedisClient();

      const totalUsers = prisma ? await prisma.user.count() : 0;
      const totalMessages = prisma ? await prisma.messageLog.count() : 0;
      const redisStatus = redis.isMock ? "⚠️ محاكي داخلي (InMemory)" : "🟢 متصل بخادم Redis خارجي";

      const adminMsg =
        `📊 **تقرير الإدارة والنظام الموحد**:\n\n` +
        `📈 إجمالي الأعضاء المسجلين: **${totalUsers}** مستخدم.\n` +
        `✉️ إجمالي الرسائل المفهرسة: **${totalMessages}** رسالة.\n` +
        `🗃️ خادم التخزين المؤقت (Redis): **${redisStatus}**\n` +
        `🛡️ بوابات الـ Webhook النشطة: \`POST /telegram/webhook\`\n` +
        `⚙️ مفتاح موجه الوكيل: **${process.env.AGENTROUTER_API_KEY ? "🟢 مضبوط ومؤمن" : "🔴 غير مضبوط"}**\n\n` +
        `💻 يعمل الخادم بكفاءة في بيئة Docker متوافقة بالكامل مع Railway.`;

      await ctx.reply(adminMsg, {
        parse_mode: "Markdown",
        ...Markup.keyboard([
          ["👤 ملفي الشخصي", "📋 التسجيل التفاعلي"],
          ["❓ المساعدة", "⚙️ الإدارة"]
        ]).resize()
      });
    } catch (error: any) {
      logger.error(`Admin screen generation error: ${error.message || error}`);
      await ctx.reply("❌ تعذر تحميل التقرير اللحظي للمسؤول بسبب خطأ في الإتصال بالخدمات الخلفية.");
    }
  };

  bot.command("admin", showAdmin);
  bot.hears("⚙️ الإدارة", showAdmin);

  // hears helper for help
  bot.hears("❓ المساعدة", async (ctx) => {
    ctx.reply(
      `ℹ️ **قائمة التعليمات والأوامر المتاحة**:\n\n` +
      `🚀 /start - إعادة تشغيل البوت وتهيئة الأزرار.\n` +
      `👤 /profile - عرض ملفك الشخصي بما في ذلك تاريخ التسجيل وعدد الرسائل التي أرسلتها للبوت.\n` +
      `📋 /survey - بدء معالج التسجيل التفاعلي المكون من خطوات لحفظ تفضيلاتك.\n` +
      `⚙️ /admin - لوحة تحكم المسؤول لعرض حالة النظام وإحصاءات قاعدة البيانات والـ API.\n\n` +
      `⚠️ حد التفاعل: يمنع البوت إرسال أكثر من 6 رسائل كل 10 ثوانٍ لحماية الخادم من الهجمات.`,
      { parse_mode: "Markdown" }
    );
  });

  // Handle generic text messages (including surveys)
  bot.on("text", async (ctx) => {
    const text = ctx.text;
    const step = ctx.session?.step;

    if (step === "awaiting_name") {
      ctx.session.answers = ctx.session.answers || {};
      ctx.session.answers.name = text;
      ctx.session.step = "awaiting_field";
      await ctx.reply("✅ تشرفنا بحضرتك! ثانياً: ما هو مجال عملك أو دراستك؟");
      return;
    }

    if (step === "awaiting_field") {
      ctx.session.answers = ctx.session.answers || {};
      ctx.session.answers.field = text;
      ctx.session.step = "awaiting_confirm";
      await ctx.reply(
        `📋 البيانات المدخلة:\n• الإسم: ${ctx.session.answers.name}\n• المجال: ${ctx.session.answers.field}\n\nهل ترغب في حفظ هذه البيانات وتثبيتها؟`,
        Markup.keyboard([
          ["👍 تأكيد الحفظ والاستمرار", "❌ إلغاء وتراجع"]
        ]).oneTime().resize()
      );
      return;
    }

    if (step === "awaiting_confirm") {
      if (text === "👍 تأكيد الحفظ والاستمرار") {
        ctx.session.step = undefined;
        await ctx.reply(
          "🎉 ممتاز! تم حفظ معلومات تفضيلاتك بنجاح في جلسة خادم Redis الآمنة.",
          Markup.keyboard([
            ["👤 ملفي الشخصي", "📋 التسجيل التفاعلي"],
            ["❓ المساعدة", "⚙️ الإدارة"]
          ]).resize()
        );
      } else {
        ctx.session.step = undefined;
        ctx.session.answers = {};
        await ctx.reply(
          "⚠️ تم إلغاء التسجيل ومسح المدخلات المؤقتة بنجاح.",
          Markup.keyboard([
            ["👤 ملفي الشخصي", "📋 التسجيل التفاعلي"],
            ["❓ المساعدة", "⚙️ الإدارة"]
          ]).resize()
        );
      }
      return;
    }

    // Default reply if no command matched
    await ctx.reply(
      "🤖 أهلاً بك! لقد استلمت رسالتك وسيتم أرشفتها بنجاح في قاعدة البيانات PostgreSQL.\nاستخدم قائمة الأزرار بالأسفل لتنفيذ الإجراءات.",
      Markup.keyboard([
        ["👤 ملفي الشخصي", "📋 التسجيل التفاعلي"],
        ["❓ المساعدة", "⚙️ الإدارة"]
      ]).resize()
    );
  });
}
