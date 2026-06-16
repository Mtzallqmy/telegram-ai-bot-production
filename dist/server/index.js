"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const config_1 = require("../config");
const bot_1 = require("../bot");
const logger_1 = __importDefault(require("../utils/logger"));
const app = (0, express_1.default)();
const port = config_1.config.PORT;
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Start the bot
const startBot = async () => {
    try {
        await bot_1.bot.launch();
        logger_1.default.info('🤖 Telegram Bot started successfully');
    }
    catch (error) {
        logger_1.default.error('❌ Error starting Telegram Bot:', error);
        process.exit(1);
    }
};
app.listen(port, () => {
    logger_1.default.info(`🚀 Server is running on port ${port}`);
    startBot();
});
// Graceful shutdown
process.once('SIGINT', () => bot_1.bot.stop('SIGINT'));
process.once('SIGTERM', () => bot_1.bot.stop('SIGTERM'));
//# sourceMappingURL=index.js.map