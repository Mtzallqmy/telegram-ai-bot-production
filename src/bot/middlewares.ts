import { MiddlewareFn } from "telegraf";
import { BotContext, BotSession } from "../types";
import { getRedisClient } from "../lib/redis";
import { getPrisma } from "../lib/prisma";
import { logger } from "../lib/pino";

// 1. Admin ID Parsing Middleware
export const adminMiddleware: MiddlewareFn<BotContext> = async (ctx, next) => {
  const userId = ctx.from?.id;
  if (!userId) return next();

  const adminIdsStr = process.env.ADMIN_IDS || "";
  const adminIds = adminIdsStr
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0)
    .map((id) => Number(id));

  ctx.isAdmin = adminIds.includes(userId);
  return next();
};

// 2. Redis-based Rate Limiter Middleware
export const rateLimitMiddleware: MiddlewareFn<BotContext> = async (ctx, next) => {
  const userId = ctx.from?.id;
  if (!userId) return next();

  // Admins bypass rate limit
  if (ctx.isAdmin) return next();

  try {
    const redis = await getRedisClient();
    const rateKey = `rate_limit:${userId}`;
    const limit = 6; // Max 6 messages per 10 seconds
    const duration = 10; // seconds

    const currentRequestsStr = await redis.get(rateKey);
    const currentRequests = currentRequestsStr ? parseInt(currentRequestsStr, 10) : 0;

    if (currentRequests >= limit) {
      logger.warn(`Rate limit exceeded for user ${userId}`);
      await ctx.reply("⚠️ لقد تجاوزت حد الرسائل المسموح به. يرجى الانتظار قليلاً قبل إرسال المزيد من الرسائل.");
      return; // Stop execution
    }

    // Increment request count
    if (currentRequests === 0) {
      await redis.set(rateKey, "1", { EX: duration });
    } else {
      await redis.set(rateKey, String(currentRequests + 1), { EX: duration });
    }
  } catch (error: any) {
    logger.error(`Rate limiting error: ${error.message || error}`);
  }

  return next();
};

// 3. Redis-based Session Middleware
export const sessionMiddleware: MiddlewareFn<BotContext> = async (ctx, next) => {
  const userId = ctx.from?.id;
  if (!userId) {
    ctx.session = {};
    return next();
  }

  const redisKey = `session:${userId}`;
  let sessionData: BotSession = {};

  try {
    const redis = await getRedisClient();
    const cachedSession = await redis.get(redisKey);
    if (cachedSession) {
      sessionData = JSON.parse(cachedSession);
    }
  } catch (error: any) {
    logger.error(`Error loading session from Redis for user ${userId}: ${error.message || error}`);
  }

  ctx.session = sessionData;

  // Execute bot processing
  await next();

  // Save session back to Redis after processing
  try {
    const redis = await getRedisClient();
    ctx.session.lastInteraction = Date.now();
    await redis.set(redisKey, JSON.stringify(ctx.session), { EX: 86400 }); // Expire in 24 hours
  } catch (error: any) {
    logger.error(`Error saving session to Redis for user ${userId}: ${error.message || error}`);
  }
};

// 4. PostgreSQL Database Message Logging Middleware
export const messageLoggerMiddleware: MiddlewareFn<BotContext> = async (ctx, next) => {
  const fromUser = ctx.from;
  if (!fromUser) return next();

  try {
    const prisma = getPrisma();
    if (prisma) {
      const text = ctx.text || "";
      const type = ctx.message && "photo" in ctx.message ? "photo" : "text";

      // Ensure user exists first
      await prisma.user.upsert({
        where: { id: BigInt(fromUser.id) },
        update: {
          username: fromUser.username,
          firstName: fromUser.first_name,
          lastName: fromUser.last_name,
          isAdmin: ctx.isAdmin,
        },
        create: {
          id: BigInt(fromUser.id),
          username: fromUser.username,
          firstName: fromUser.first_name,
          lastName: fromUser.last_name,
          isBot: fromUser.is_bot,
          isAdmin: ctx.isAdmin,
        },
      });

      // Log message
      if (ctx.message) {
        await prisma.messageLog.create({
          data: {
            chatId: String(ctx.chat?.id),
            text: text,
            type: type,
            userId: BigInt(fromUser.id),
          },
        });
      }
    }
  } catch (error: any) {
    logger.error(`Database logging error: ${error.message || error}`);
  }

  return next();
};
