"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    BOT_TOKEN: zod_1.z.string(),
    AGENTROUTER_API_KEY: zod_1.z.string(),
    DATABASE_URL: zod_1.z.string(),
    REDIS_URL: zod_1.z.string().optional(),
    ADMIN_IDS: zod_1.z.string().transform((val) => val.split(',').map(Number)),
    NODE_ENV: zod_1.z.enum(['development', 'production']).default('development'),
    PORT: zod_1.z.string().default('3000'),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.format());
    process.exit(1);
}
exports.config = parsed.data;
//# sourceMappingURL=index.js.map