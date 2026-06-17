import { Telegraf } from "telegraf";
import { BotContext } from "../types";
import { logger } from "../lib/pino";
import { adminMiddleware, rateLimitMiddleware, sessionMiddleware, messageLoggerMiddleware } from "./middlewares";
import { registerHandlers } from "./handlers";

let bot: Telegraf<BotContext> | null = null;

export function getBot(): Telegraf<BotContext> | null {
  if (bot) return bot;

  const token = process.env.BOT_TOKEN;
  if (!token) {
    logger.warn("⚠️ BOT_TOKEN environment variable is missing. Bot cannot start.");
    return null;
  }

  try {
    bot = new Telegraf<BotContext>(token);

    // Register middlewares
    bot.use(adminMiddleware);
    bot.use(rateLimitMiddleware);
    bot.use(sessionMiddleware);
    bot.use(messageLoggerMiddleware);

    // Register Hanlders
    registerHandlers(bot);

    logger.info("🤖 Telegraf Bot instance initialized with middlewares and handlers.");
    return bot;
  } catch (error: any) {
    logger.error(`❌ Failed to initialize Telegraf Bot: ${error.message || error}`);
    return null;
  }
}
