import express from "express";
import { getBot } from "./src/bot/bot";
import { logger } from "./src/lib/pino";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const PORT = parseInt(process.env.PORT || "3000", 10);

async function startServer() {
  const app = express();
  const bot = getBot();

  // 1. Webhook Post Route - MUST come before generic express body parsers
  // so that raw stream handles and signatures are properly digestible by Telegraf.
  if (bot) {
    app.post("/telegram/webhook", (req, res, next) => {
      logger.info("Webhook POST request received");
      return bot.webhookCallback("/telegram/webhook")(req, res, next);
    });

    // Auto-register Webhook on start if railway domain is present
    const domain = process.env.RAILWAY_PUBLIC_DOMAIN;
    if (domain) {
      const webhookUrl = `https://${domain}/telegram/webhook`;
      bot.telegram.setWebhook(webhookUrl)
        .then(() => {
          logger.info(`Telegram webhook successfully set to: ${webhookUrl}`);
        })
        .catch((err) => {
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

  // 2. Body Parser for standard API routes
  app.use(express.json());

  // 3. Health Check Endpoint
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
