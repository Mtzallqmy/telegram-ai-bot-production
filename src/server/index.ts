import express from 'express';
import { config } from '../config';
import { bot } from '../bot';
import logger from '../utils/logger';

const app = express();
const port = config.PORT;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start the bot
const startBot = async () => {
  try {
    await bot.launch();
    logger.info('🤖 Telegram Bot started successfully');
  } catch (error) {
    logger.error('❌ Error starting Telegram Bot:', error);
    process.exit(1);
  }
};

app.listen(port, () => {
  logger.info(`🚀 Server is running on port ${port}`);
  startBot();
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
