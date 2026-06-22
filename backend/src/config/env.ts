import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().transform((v) => parseInt(v, 10)).default('5000'),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/whatsapp_clone'),
  JWT_SECRET: z.string().default('super_secret_whatsapp_token'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development')
});

const envParse = envSchema.safeParse(process.env);

if (!envParse.success) {
  console.error('❌ Invalid environment variables:', envParse.error.format());
  process.exit(1);
}

export const env = envParse.data;
