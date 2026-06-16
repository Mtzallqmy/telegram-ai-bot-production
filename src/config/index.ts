import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  BOT_TOKEN: z.string(),
  AGENTROUTER_API_KEY: z.string(),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().optional(),
  ADMIN_IDS: z.string().transform((val) => val.split(',').map(Number)),
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  PORT: z.string().default('3000'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;
