var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);

// src/bot/bot.ts
var import_telegraf2 = require("telegraf");

// src/lib/pino.ts
var import_pino = __toESM(require("pino"), 1);
var logger = (0, import_pino.default)({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname"
    }
  }
});

// src/lib/redis.ts
var import_redis = require("redis");
var redisClient = null;
var isConnected = false;
var inMemoryCache = /* @__PURE__ */ new Map();
async function getRedisClient() {
  if (redisClient) {
    return redisClient;
  }
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    logger.warn("REDIS_URL is not set. Falling back to simple in-memory session and rate-limiting store.");
    redisClient = createInMemoryFallback();
    return redisClient;
  }
  try {
    const client = (0, import_redis.createClient)({ url: redisUrl });
    client.on("error", (err) => {
      logger.error(`Redis Error: ${err.message || err}`);
    });
    client.on("connect", () => {
      logger.info("Connecting to Redis...");
    });
    client.on("ready", () => {
      isConnected = true;
      logger.info("Redis client connected and ready.");
    });
    await client.connect();
    redisClient = client;
  } catch (error) {
    logger.error(`Failed to connect to Redis: ${error?.message || error}. Falling back to in-memory.`);
    redisClient = createInMemoryFallback();
  }
  return redisClient;
}
function createInMemoryFallback() {
  return {
    get: async (key) => inMemoryCache.get(key) || null,
    set: async (key, value, options) => {
      inMemoryCache.set(key, value);
      if (options?.EX) {
        setTimeout(() => inMemoryCache.delete(key), options.EX * 1e3);
      }
      return "OK";
    },
    del: async (key) => {
      const existed = inMemoryCache.has(key);
      inMemoryCache.delete(key);
      return existed ? 1 : 0;
    },
    isMock: true
  };
}

// src/lib/prisma.ts
var import_client = require("@prisma/client");
BigInt.prototype.toJSON = function() {
  return this.toString();
};
var prisma = null;
var initialized = false;
function getPrisma() {
  if (initialized) {
    return prisma;
  }
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    logger.warn("DATABASE_URL env variable is missing. Database features will be disabled.");
    prisma = null;
    initialized = true;
    return prisma;
  }
  try {
    prisma = new import_client.PrismaClient({
      datasources: {
        db: {
          url: dbUrl
        }
      }
    });
    logger.info("Prisma Client initialized.");
  } catch (error) {
    logger.error(`Failed to initialize Prisma Client: ${error.message || error}`);
    prisma = null;
  }
  initialized = true;
  return prisma;
}

// src/bot/middlewares.ts
var adminMiddleware = async (ctx, next) => {
  const userId = ctx.from?.id;
  if (!userId) return next();
  const adminIdsStr = process.env.ADMIN_IDS || "";
  const adminIds = adminIdsStr.split(",").map((id) => id.trim()).filter((id) => id.length > 0).map((id) => Number(id));
  ctx.isAdmin = adminIds.includes(userId);
  return next();
};
var rateLimitMiddleware = async (ctx, next) => {
  const userId = ctx.from?.id;
  if (!userId) return next();
  if (ctx.isAdmin) return next();
  try {
    const redis = await getRedisClient();
    const rateKey = `rate_limit:${userId}`;
    const limit = 6;
    const duration = 10;
    const currentRequestsStr = await redis.get(rateKey);
    const currentRequests = currentRequestsStr ? parseInt(currentRequestsStr, 10) : 0;
    if (currentRequests >= limit) {
      logger.warn(`Rate limit exceeded for user ${userId}`);
      await ctx.reply("\u26A0\uFE0F \u0644\u0642\u062F \u062A\u062C\u0627\u0648\u0632\u062A \u062D\u062F \u0627\u0644\u0631\u0633\u0627\u0626\u0644 \u0627\u0644\u0645\u0633\u0645\u0648\u062D \u0628\u0647. \u064A\u0631\u062C\u0649 \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631 \u0642\u0644\u064A\u0644\u0627\u064B \u0642\u0628\u0644 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0645\u0632\u064A\u062F \u0645\u0646 \u0627\u0644\u0631\u0633\u0627\u0626\u0644.");
      return;
    }
    if (currentRequests === 0) {
      await redis.set(rateKey, "1", { EX: duration });
    } else {
      await redis.set(rateKey, String(currentRequests + 1), { EX: duration });
    }
  } catch (error) {
    logger.error(`Rate limiting error: ${error.message || error}`);
  }
  return next();
};
var sessionMiddleware = async (ctx, next) => {
  const userId = ctx.from?.id;
  if (!userId) {
    ctx.session = {};
    return next();
  }
  const redisKey = `session:${userId}`;
  let sessionData = {};
  try {
    const redis = await getRedisClient();
    const cachedSession = await redis.get(redisKey);
    if (cachedSession) {
      sessionData = JSON.parse(cachedSession);
    }
  } catch (error) {
    logger.error(`Error loading session from Redis for user ${userId}: ${error.message || error}`);
  }
  ctx.session = sessionData;
  await next();
  try {
    const redis = await getRedisClient();
    ctx.session.lastInteraction = Date.now();
    await redis.set(redisKey, JSON.stringify(ctx.session), { EX: 86400 });
  } catch (error) {
    logger.error(`Error saving session to Redis for user ${userId}: ${error.message || error}`);
  }
};
var messageLoggerMiddleware = async (ctx, next) => {
  const fromUser = ctx.from;
  if (!fromUser) return next();
  try {
    const prisma2 = getPrisma();
    if (prisma2) {
      const text = ctx.text || "";
      const type = ctx.message && "photo" in ctx.message ? "photo" : "text";
      await prisma2.user.upsert({
        where: { id: BigInt(fromUser.id) },
        update: {
          username: fromUser.username,
          firstName: fromUser.first_name,
          lastName: fromUser.last_name,
          isAdmin: ctx.isAdmin
        },
        create: {
          id: BigInt(fromUser.id),
          username: fromUser.username,
          firstName: fromUser.first_name,
          lastName: fromUser.last_name,
          isBot: fromUser.is_bot,
          isAdmin: ctx.isAdmin
        }
      });
      if (ctx.message) {
        await prisma2.messageLog.create({
          data: {
            chatId: String(ctx.chat?.id),
            text,
            type,
            userId: BigInt(fromUser.id)
          }
        });
      }
    }
  } catch (error) {
    logger.error(`Database logging error: ${error.message || error}`);
  }
  return next();
};

// src/bot/handlers.ts
var import_telegraf = require("telegraf");
function registerHandlers(bot2) {
  bot2.start(async (ctx) => {
    logger.info(`User ${ctx.from.id} started the bot.`);
    const username = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
    const welcomeMsg = `\u{1F44B} \u0623\u0647\u0644\u0627\u064B \u0628\u0643 \u064A\u0627 ${username} \u0641\u064A \u0627\u0644\u0628\u0648\u062A \u0627\u0644\u0627\u062D\u062A\u0631\u0627\u0641\u064A \u0627\u0644\u0645\u062A\u0637\u0648\u0631!

\u26A1 \u0647\u0630\u0627 \u0627\u0644\u0628\u0648\u062A \u0645\u064F\u0647\u064A\u0651\u0623 \u0644\u0644\u062A\u0634\u063A\u064A\u0644 \u0639\u0628\u0631 \u0642\u0646\u0648\u0627\u062A \u0622\u0645\u0646\u0629 \u0648\u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0647\u0648\u064A\u0629.
\u{1F4E6} \u0645\u064F\u062A\u0635\u0644 \u0628\u0642\u0627\u0639\u062F\u0629 \u0628\u064A\u0627\u0646\u0627\u062A PostgreSQL \u0648\u0645\u064F\u062D\u0633\u0651\u064E\u0646 \u0628\u0640 Redis \u0644\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062C\u0644\u0633\u0627\u062A \u0648\u062A\u0646\u0641\u064A\u0630 \u062D\u062F\u0648\u062F \u0627\u0644\u062A\u0641\u0627\u0639\u0644.

\u{1F50D} \u062C\u0631\u0628 \u0627\u0644\u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u062A\u0627\u0644\u064A\u0629 \u0644\u0627\u0633\u062A\u0643\u0634\u0627\u0641 \u0627\u0644\u0645\u0632\u0627\u064A\u0627:
\u2022 /profile - \u0639\u0631\u0636 \u0645\u0644\u0641\u0643 \u0627\u0644\u0634\u062E\u0635\u064A \u0648\u0625\u062D\u0635\u0627\u0621\u0627\u062A\u0643 \u0645\u0646 \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A.
\u2022 /survey - \u062A\u0634\u063A\u064A\u0644 \u0645\u0639\u0627\u0644\u062C \u062A\u0633\u062C\u064A\u0644 \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u062A\u0641\u0627\u0639\u0644\u064A \u0645\u064F\u062A\u0639\u062F\u062F \u0627\u0644\u062E\u0637\u0648\u0627\u062A (\u064A\u0639\u062A\u0645\u062F \u0639\u0644\u0649 Redis).
\u2022 /help - \u0639\u0631\u0636 \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u0645\u0633\u0627\u0639\u062F\u0629.
\u2022 /admin - \u0644\u0648\u062D\u0629 \u0627\u0644\u0625\u0634\u0631\u0627\u0641 (\u062A\u062A\u0637\u0644\u0628 \u0635\u0644\u0627\u062D\u064A\u0627\u062A \u0623\u062F\u0645\u0646).`;
    await ctx.reply(
      welcomeMsg,
      import_telegraf.Markup.keyboard([
        ["\u{1F464} \u0645\u0644\u0641\u064A \u0627\u0644\u0634\u062E\u0635\u064A", "\u{1F4CB} \u0627\u0644\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062A\u0641\u0627\u0639\u0644\u064A"],
        ["\u2753 \u0627\u0644\u0645\u0633\u0627\u0639\u062F\u0629", "\u2699\uFE0F \u0627\u0644\u0625\u062F\u0627\u0631\u0629"]
      ]).resize()
    );
  });
  bot2.help(async (ctx) => {
    const helpMsg = `\u2139\uFE0F **\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u062A\u0639\u0644\u064A\u0645\u0627\u062A \u0648\u0627\u0644\u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0645\u062A\u0627\u062D\u0629**:

\u{1F680} /start - \u0625\u0639\u0627\u062F\u0629 \u062A\u0634\u063A\u064A\u0644 \u0627\u0644\u0628\u0648\u062A \u0648\u062A\u0647\u064A\u0626\u0629 \u0627\u0644\u0623\u0632\u0631\u0627\u0631.
\u{1F464} /profile - \u0639\u0631\u0636 \u0645\u0644\u0641\u0643 \u0627\u0644\u0634\u062E\u0635\u064A \u0628\u0645\u0627 \u0641\u064A \u0630\u0644\u0643 \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u062A\u0633\u062C\u064A\u0644 \u0648\u0639\u062F\u062F \u0627\u0644\u0631\u0633\u0627\u0626\u0644 \u0627\u0644\u062A\u064A \u0623\u0631\u0633\u0644\u062A\u0647\u0627 \u0644\u0644\u0628\u0648\u062A.
\u{1F4CB} /survey - \u0628\u062F\u0621 \u0645\u0639\u0627\u0644\u062C \u0627\u0644\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062A\u0641\u0627\u0639\u0644\u064A \u0627\u0644\u0645\u0643\u0648\u0646 \u0645\u0646 \u062E\u0637\u0648\u0627\u062A \u0644\u062D\u0641\u0638 \u062A\u0641\u0636\u064A\u0644\u0627\u062A\u0643.
\u2699\uFE0F /admin - \u0644\u0648\u062D\u0629 \u062A\u062D\u0643\u0645 \u0627\u0644\u0645\u0633\u0624\u0648\u0644 \u0644\u0639\u0631\u0636 \u062D\u0627\u0644\u0629 \u0627\u0644\u0646\u0638\u0627\u0645 \u0648\u0625\u062D\u0635\u0627\u0621\u0627\u062A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0648\u0627\u0644\u0640 API.

\u26A0\uFE0F \u062D\u062F \u0627\u0644\u062A\u0641\u0627\u0639\u0644: \u064A\u0645\u0646\u0639 \u0627\u0644\u0628\u0648\u062A \u0625\u0631\u0633\u0627\u0644 \u0623\u0643\u062B\u0631 \u0645\u0646 6 \u0631\u0633\u0627\u0626\u0644 \u0643\u0644 10 \u062B\u0648\u0627\u0646\u064D \u0644\u062D\u0645\u0627\u064A\u0629 \u0627\u0644\u062E\u0627\u062F\u0645 \u0645\u0646 \u0627\u0644\u0647\u062C\u0645\u0627\u062A.`;
    await ctx.reply(helpMsg, { parse_mode: "Markdown" });
  });
  const showProfile = async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    await ctx.reply("\u231B \u062C\u0627\u0631\u064A \u0627\u0633\u062A\u0639\u0644\u0627\u0645 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0645\u0646 \u062E\u0627\u062F\u0645 PostgreSQL...");
    try {
      const prisma2 = getPrisma();
      if (!prisma2) {
        await ctx.reply("\u274C \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0645\u062A\u0635\u0644\u0629. \u064A\u0631\u062C\u0649 \u062A\u0632\u0648\u064A\u062F \u062E\u0627\u062F\u0645 \u0627\u0644\u0628\u0648\u062A \u0628\u0645\u062A\u063A\u064A\u0631 DATABASE_URL \u0644\u062A\u0634\u063A\u064A\u0644 \u0647\u0630\u0647 \u0627\u0644\u0645\u064A\u0632\u0629.");
        return;
      }
      const userDb = await prisma2.user.findUnique({
        where: { id: BigInt(userId) },
        include: { _count: { select: { messages: true } } }
      });
      if (!userDb) {
        await ctx.reply("\u274C \u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0633\u062C\u0644 \u062E\u0627\u0635 \u0628\u0643\u060C \u064A\u0631\u062C\u0649 \u0625\u0631\u0633\u0627\u0644 \u0623\u064A \u0631\u0633\u0627\u0644\u0629 \u0644\u062A\u0633\u062C\u064A\u0644 \u062D\u0633\u0627\u0628\u0643.");
        return;
      }
      const adminStr = userDb.isAdmin ? "\u{1F451} \u0645\u062F\u064A\u0631 \u0627\u0644\u0646\u0638\u0627\u0645" : "\u{1F464} \u0645\u0633\u062A\u062E\u062F\u0645 \u0639\u0627\u062F\u064A";
      const regDate = userDb.createdAt.toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "long",
        day: "numeric"
      });
      const profileMsg = `\u{1F464} **\u0645\u0644\u0641\u0643 \u0627\u0644\u0634\u062E\u0635\u064A \u0627\u0644\u0645\u0648\u062B\u0642**:

\u{1F194} \u0645\u0639\u0631\u0641 \u062A\u064A\u0644\u064A\u062C\u0631\u0627\u0645: \`${userDb.id}\`
\u{1F3F7}\uFE0F \u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645: ${userDb.username ? `@${userDb.username}` : "\u0644\u0627 \u064A\u0648\u062C\u062F"}
\u{1F3AD} \u0627\u0644\u0627\u0633\u0645: ${userDb.firstName || ""} ${userDb.lastName || ""}
\u{1F6E1}\uFE0F \u0627\u0644\u062F\u0648\u0631: **${adminStr}**
\u{1F4C5} \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u062A\u0633\u062C\u064A\u0644: ${regDate}
\u{1F4CA} \u0631\u0633\u0627\u0626\u0644\u0643 \u0627\u0644\u0645\u0633\u062C\u0644\u0629: **${userDb._count.messages}** \u0631\u0633\u0627\u0644\u0629.`;
      await ctx.reply(profileMsg, { parse_mode: "Markdown" });
    } catch (error) {
      logger.error(`Error fetching user profile: ${error.message || error}`);
      await ctx.reply("\u274C \u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A. \u062A\u064A\u0642\u0646 \u0645\u0646 \u0636\u0628\u0637 DATABASE_URL.");
    }
  };
  bot2.command("profile", showProfile);
  bot2.hears("\u{1F464} \u0645\u0644\u0641\u064A \u0627\u0644\u0634\u062E\u0635\u064A", showProfile);
  const startSurvey = async (ctx) => {
    ctx.session.step = "awaiting_name";
    ctx.session.answers = {};
    await ctx.reply("\u{1F4CB} \u0644\u0646\u0628\u062F\u0623 \u0627\u0644\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062A\u0641\u0627\u0639\u0644\u064A \u0627\u0644\u0633\u0631\u064A\u0639. \u0623\u0648\u0644\u0627\u064B: \u0645\u0627 \u0647\u0648 \u0627\u0633\u0645\u0643 \u0627\u0644\u0643\u0627\u0645\u0644\u061F", import_telegraf.Markup.removeKeyboard());
  };
  bot2.command("survey", startSurvey);
  bot2.hears("\u{1F4CB} \u0627\u0644\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062A\u0641\u0627\u0639\u0644\u064A", startSurvey);
  const showAdmin = async (ctx) => {
    if (!ctx.isAdmin) {
      await ctx.reply("\u26D4 \u0639\u0630\u0631\u064B\u0627\u060C \u0623\u0646\u062A \u0644\u0627 \u062A\u0645\u0644\u0643 \u0635\u0644\u0627\u062D\u064A\u0627\u062A \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0646\u0638\u0627\u0645. \u0645\u0639\u0631\u0641\u0643 \u063A\u064A\u0631 \u0645\u062A\u0648\u0627\u062C\u062F \u0641\u064A ADMIN_IDS.");
      return;
    }
    await ctx.reply("\u231B \u062C\u0627\u0631\u064A \u062A\u0648\u0644\u064A\u062F \u062A\u0642\u0631\u064A\u0631 \u062D\u0627\u0644\u0629 \u0627\u0644\u0646\u0638\u0627\u0645 \u0648\u0627\u0644\u0639\u062F \u0648\u0627\u0644\u062D\u0633\u0627\u0628 \u0627\u0644\u0641\u0648\u0631\u064A...");
    try {
      const prisma2 = getPrisma();
      const redis = await getRedisClient();
      const totalUsers = prisma2 ? await prisma2.user.count() : 0;
      const totalMessages = prisma2 ? await prisma2.messageLog.count() : 0;
      const redisStatus = redis.isMock ? "\u26A0\uFE0F \u0645\u062D\u0627\u0643\u064A \u062F\u0627\u062E\u0644\u064A (InMemory)" : "\u{1F7E2} \u0645\u062A\u0635\u0644 \u0628\u062E\u0627\u062F\u0645 Redis \u062E\u0627\u0631\u062C\u064A";
      const adminMsg = `\u{1F4CA} **\u062A\u0642\u0631\u064A\u0631 \u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u0648\u0627\u0644\u0646\u0638\u0627\u0645 \u0627\u0644\u0645\u0648\u062D\u062F**:

\u{1F4C8} \u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0623\u0639\u0636\u0627\u0621 \u0627\u0644\u0645\u0633\u062C\u0644\u064A\u0646: **${totalUsers}** \u0645\u0633\u062A\u062E\u062F\u0645.
\u2709\uFE0F \u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0631\u0633\u0627\u0626\u0644 \u0627\u0644\u0645\u0641\u0647\u0631\u0633\u0629: **${totalMessages}** \u0631\u0633\u0627\u0644\u0629.
\u{1F5C3}\uFE0F \u062E\u0627\u062F\u0645 \u0627\u0644\u062A\u062E\u0632\u064A\u0646 \u0627\u0644\u0645\u0624\u0642\u062A (Redis): **${redisStatus}**
\u{1F6E1}\uFE0F \u0628\u0648\u0627\u0628\u0627\u062A \u0627\u0644\u0640 Webhook \u0627\u0644\u0646\u0634\u0637\u0629: \`POST /telegram/webhook\`
\u2699\uFE0F \u0645\u0641\u062A\u0627\u062D \u0645\u0648\u062C\u0647 \u0627\u0644\u0648\u0643\u064A\u0644: **${process.env.AGENTROUTER_API_KEY ? "\u{1F7E2} \u0645\u0636\u0628\u0648\u0637 \u0648\u0645\u0624\u0645\u0646" : "\u{1F534} \u063A\u064A\u0631 \u0645\u0636\u0628\u0648\u0637"}**

\u{1F4BB} \u064A\u0639\u0645\u0644 \u0627\u0644\u062E\u0627\u062F\u0645 \u0628\u0643\u0641\u0627\u0621\u0629 \u0641\u064A \u0628\u064A\u0626\u0629 Docker \u0645\u062A\u0648\u0627\u0641\u0642\u0629 \u0628\u0627\u0644\u0643\u0627\u0645\u0644 \u0645\u0639 Railway.`;
      await ctx.reply(adminMsg, {
        parse_mode: "Markdown",
        ...import_telegraf.Markup.keyboard([
          ["\u{1F464} \u0645\u0644\u0641\u064A \u0627\u0644\u0634\u062E\u0635\u064A", "\u{1F4CB} \u0627\u0644\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062A\u0641\u0627\u0639\u0644\u064A"],
          ["\u2753 \u0627\u0644\u0645\u0633\u0627\u0639\u062F\u0629", "\u2699\uFE0F \u0627\u0644\u0625\u062F\u0627\u0631\u0629"]
        ]).resize()
      });
    } catch (error) {
      logger.error(`Admin screen generation error: ${error.message || error}`);
      await ctx.reply("\u274C \u062A\u0639\u0630\u0631 \u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u062A\u0642\u0631\u064A\u0631 \u0627\u0644\u0644\u062D\u0638\u064A \u0644\u0644\u0645\u0633\u0624\u0648\u0644 \u0628\u0633\u0628\u0628 \u062E\u0637\u0623 \u0641\u064A \u0627\u0644\u0625\u062A\u0635\u0627\u0644 \u0628\u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u062E\u0644\u0641\u064A\u0629.");
    }
  };
  bot2.command("admin", showAdmin);
  bot2.hears("\u2699\uFE0F \u0627\u0644\u0625\u062F\u0627\u0631\u0629", showAdmin);
  bot2.hears("\u2753 \u0627\u0644\u0645\u0633\u0627\u0639\u062F\u0629", async (ctx) => {
    ctx.reply(
      `\u2139\uFE0F **\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u062A\u0639\u0644\u064A\u0645\u0627\u062A \u0648\u0627\u0644\u0623\u0648\u0627\u0645\u0631 \u0627\u0644\u0645\u062A\u0627\u062D\u0629**:

\u{1F680} /start - \u0625\u0639\u0627\u062F\u0629 \u062A\u0634\u063A\u064A\u0644 \u0627\u0644\u0628\u0648\u062A \u0648\u062A\u0647\u064A\u0626\u0629 \u0627\u0644\u0623\u0632\u0631\u0627\u0631.
\u{1F464} /profile - \u0639\u0631\u0636 \u0645\u0644\u0641\u0643 \u0627\u0644\u0634\u062E\u0635\u064A \u0628\u0645\u0627 \u0641\u064A \u0630\u0644\u0643 \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u062A\u0633\u062C\u064A\u0644 \u0648\u0639\u062F\u062F \u0627\u0644\u0631\u0633\u0627\u0626\u0644 \u0627\u0644\u062A\u064A \u0623\u0631\u0633\u0644\u062A\u0647\u0627 \u0644\u0644\u0628\u0648\u062A.
\u{1F4CB} /survey - \u0628\u062F\u0621 \u0645\u0639\u0627\u0644\u062C \u0627\u0644\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062A\u0641\u0627\u0639\u0644\u064A \u0627\u0644\u0645\u0643\u0648\u0646 \u0645\u0646 \u062E\u0637\u0648\u0627\u062A \u0644\u062D\u0641\u0638 \u062A\u0641\u0636\u064A\u0644\u0627\u062A\u0643.
\u2699\uFE0F /admin - \u0644\u0648\u062D\u0629 \u062A\u062D\u0643\u0645 \u0627\u0644\u0645\u0633\u0624\u0648\u0644 \u0644\u0639\u0631\u0636 \u062D\u0627\u0644\u0629 \u0627\u0644\u0646\u0638\u0627\u0645 \u0648\u0625\u062D\u0635\u0627\u0621\u0627\u062A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0648\u0627\u0644\u0640 API.

\u26A0\uFE0F \u062D\u062F \u0627\u0644\u062A\u0641\u0627\u0639\u0644: \u064A\u0645\u0646\u0639 \u0627\u0644\u0628\u0648\u062A \u0625\u0631\u0633\u0627\u0644 \u0623\u0643\u062B\u0631 \u0645\u0646 6 \u0631\u0633\u0627\u0626\u0644 \u0643\u0644 10 \u062B\u0648\u0627\u0646\u064D \u0644\u062D\u0645\u0627\u064A\u0629 \u0627\u0644\u062E\u0627\u062F\u0645 \u0645\u0646 \u0627\u0644\u0647\u062C\u0645\u0627\u062A.`,
      { parse_mode: "Markdown" }
    );
  });
  bot2.on("text", async (ctx) => {
    const text = ctx.text;
    const step = ctx.session?.step;
    if (step === "awaiting_name") {
      ctx.session.answers = ctx.session.answers || {};
      ctx.session.answers.name = text;
      ctx.session.step = "awaiting_field";
      await ctx.reply("\u2705 \u062A\u0634\u0631\u0641\u0646\u0627 \u0628\u062D\u0636\u0631\u062A\u0643! \u062B\u0627\u0646\u064A\u0627\u064B: \u0645\u0627 \u0647\u0648 \u0645\u062C\u0627\u0644 \u0639\u0645\u0644\u0643 \u0623\u0648 \u062F\u0631\u0627\u0633\u062A\u0643\u061F");
      return;
    }
    if (step === "awaiting_field") {
      ctx.session.answers = ctx.session.answers || {};
      ctx.session.answers.field = text;
      ctx.session.step = "awaiting_confirm";
      await ctx.reply(
        `\u{1F4CB} \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u062F\u062E\u0644\u0629:
\u2022 \u0627\u0644\u0625\u0633\u0645: ${ctx.session.answers.name}
\u2022 \u0627\u0644\u0645\u062C\u0627\u0644: ${ctx.session.answers.field}

\u0647\u0644 \u062A\u0631\u063A\u0628 \u0641\u064A \u062D\u0641\u0638 \u0647\u0630\u0647 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0648\u062A\u062B\u0628\u064A\u062A\u0647\u0627\u061F`,
        import_telegraf.Markup.keyboard([
          ["\u{1F44D} \u062A\u0623\u0643\u064A\u062F \u0627\u0644\u062D\u0641\u0638 \u0648\u0627\u0644\u0627\u0633\u062A\u0645\u0631\u0627\u0631", "\u274C \u0625\u0644\u063A\u0627\u0621 \u0648\u062A\u0631\u0627\u062C\u0639"]
        ]).oneTime().resize()
      );
      return;
    }
    if (step === "awaiting_confirm") {
      if (text === "\u{1F44D} \u062A\u0623\u0643\u064A\u062F \u0627\u0644\u062D\u0641\u0638 \u0648\u0627\u0644\u0627\u0633\u062A\u0645\u0631\u0627\u0631") {
        ctx.session.step = void 0;
        await ctx.reply(
          "\u{1F389} \u0645\u0645\u062A\u0627\u0632! \u062A\u0645 \u062D\u0641\u0638 \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u062A\u0641\u0636\u064A\u0644\u0627\u062A\u0643 \u0628\u0646\u062C\u0627\u062D \u0641\u064A \u062C\u0644\u0633\u0629 \u062E\u0627\u062F\u0645 Redis \u0627\u0644\u0622\u0645\u0646\u0629.",
          import_telegraf.Markup.keyboard([
            ["\u{1F464} \u0645\u0644\u0641\u064A \u0627\u0644\u0634\u062E\u0635\u064A", "\u{1F4CB} \u0627\u0644\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062A\u0641\u0627\u0639\u0644\u064A"],
            ["\u2753 \u0627\u0644\u0645\u0633\u0627\u0639\u062F\u0629", "\u2699\uFE0F \u0627\u0644\u0625\u062F\u0627\u0631\u0629"]
          ]).resize()
        );
      } else {
        ctx.session.step = void 0;
        ctx.session.answers = {};
        await ctx.reply(
          "\u26A0\uFE0F \u062A\u0645 \u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u062A\u0633\u062C\u064A\u0644 \u0648\u0645\u0633\u062D \u0627\u0644\u0645\u062F\u062E\u0644\u0627\u062A \u0627\u0644\u0645\u0624\u0642\u062A\u0629 \u0628\u0646\u062C\u0627\u062D.",
          import_telegraf.Markup.keyboard([
            ["\u{1F464} \u0645\u0644\u0641\u064A \u0627\u0644\u0634\u062E\u0635\u064A", "\u{1F4CB} \u0627\u0644\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062A\u0641\u0627\u0639\u0644\u064A"],
            ["\u2753 \u0627\u0644\u0645\u0633\u0627\u0639\u062F\u0629", "\u2699\uFE0F \u0627\u0644\u0625\u062F\u0627\u0631\u0629"]
          ]).resize()
        );
      }
      return;
    }
    await ctx.reply(
      "\u{1F916} \u0623\u0647\u0644\u0627\u064B \u0628\u0643! \u0644\u0642\u062F \u0627\u0633\u062A\u0644\u0645\u062A \u0631\u0633\u0627\u0644\u062A\u0643 \u0648\u0633\u064A\u062A\u0645 \u0623\u0631\u0634\u0641\u062A\u0647\u0627 \u0628\u0646\u062C\u0627\u062D \u0641\u064A \u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A PostgreSQL.\n\u0627\u0633\u062A\u062E\u062F\u0645 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0623\u0632\u0631\u0627\u0631 \u0628\u0627\u0644\u0623\u0633\u0641\u0644 \u0644\u062A\u0646\u0641\u064A\u0630 \u0627\u0644\u0625\u062C\u0631\u0627\u0621\u0627\u062A.",
      import_telegraf.Markup.keyboard([
        ["\u{1F464} \u0645\u0644\u0641\u064A \u0627\u0644\u0634\u062E\u0635\u064A", "\u{1F4CB} \u0627\u0644\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062A\u0641\u0627\u0639\u0644\u064A"],
        ["\u2753 \u0627\u0644\u0645\u0633\u0627\u0639\u062F\u0629", "\u2699\uFE0F \u0627\u0644\u0625\u062F\u0627\u0631\u0629"]
      ]).resize()
    );
  });
}

// src/bot/bot.ts
var bot = null;
function getBot() {
  if (bot) return bot;
  const token = process.env.BOT_TOKEN;
  if (!token) {
    logger.warn("\u26A0\uFE0F BOT_TOKEN environment variable is missing. Bot cannot start.");
    return null;
  }
  try {
    bot = new import_telegraf2.Telegraf(token);
    bot.use(adminMiddleware);
    bot.use(rateLimitMiddleware);
    bot.use(sessionMiddleware);
    bot.use(messageLoggerMiddleware);
    registerHandlers(bot);
    logger.info("\u{1F916} Telegraf Bot instance initialized with middlewares and handlers.");
    return bot;
  } catch (error) {
    logger.error(`\u274C Failed to initialize Telegraf Bot: ${error.message || error}`);
    return null;
  }
}

// server.ts
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var PORT = parseInt(process.env.PORT || "3000", 10);
async function startServer() {
  const app = (0, import_express.default)();
  const bot2 = getBot();
  if (bot2) {
    app.post("/telegram/webhook", (req, res, next) => {
      logger.info("Webhook POST request received");
      return bot2.webhookCallback("/telegram/webhook")(req, res, next);
    });
    const domain = process.env.RAILWAY_PUBLIC_DOMAIN;
    if (domain) {
      const webhookUrl = `https://${domain}/telegram/webhook`;
      bot2.telegram.setWebhook(webhookUrl).then(() => {
        logger.info(`Telegram webhook successfully set to: ${webhookUrl}`);
      }).catch((err) => {
        logger.error(`Failed to automatically register Telegram webhook: ${err.message || err}`);
      });
    } else {
      logger.warn("RAILWAY_PUBLIC_DOMAIN is not declared. Skipping automatic webhook registration.");
    }
  } else {
    logger.error("Telegraf Bot failed to initialize. Webhook endpoint will respond with 503.");
    app.post("/telegram/webhook", (req, res) => {
      res.status(503).json({ error: "Telegraf bot not initialized" });
    });
  }
  app.use(import_express.default.json());
  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });
  app.listen(PORT, "0.0.0.0", () => {
    logger.info(`Server successfully bound to host 0.0.0.0 and port ${PORT}`);
  });
}
startServer().catch((err) => {
  logger.error(`Critical server startup crash: ${err.message || err}`);
  process.exit(1);
});
