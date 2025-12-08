import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';

// Load environment variables - try .env first, then .env.local
// Use process.cwd() which works in both ESM and CJS contexts
const envPath = path.resolve(process.cwd(), '.env');
const envLocalPath = path.resolve(process.cwd(), '.env.local');

if (fs.existsSync(envPath)) {
  dotenvConfig({ path: envPath });
} else if (fs.existsSync(envLocalPath)) {
  dotenvConfig({ path: envLocalPath });
} else {
  // Try default .env loading
  dotenvConfig();
}

/**
 * Environment configuration schema with validation
 * Follows: Fail-fast principle - app won't start with invalid config
 */
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('4000'),
  HOST: z.string().default('0.0.0.0'),
  API_VERSION: z.string().default('v1'),
  
  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().optional(),
  
  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  
  // Privy
  PRIVY_APP_ID: z.string().optional(),
  PRIVY_APP_SECRET: z.string().optional(),
  PRIVY_JWKS_ENDPOINT: z.string().optional(),
  
  // Encryption & Security
  ENCRYPTION_KEY: z.string().optional(),
  IDRX_ENC_KEY: z.string().optional(),
  API_CREDENTIALS_KEY: z.string().optional(),
  USER_SECRETS_KEY: z.string().optional(),
  API_KEY_SALT: z.string().optional(),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
  
  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'http', 'debug', 'trace']).default('info'),
  LOG_FORMAT: z.enum(['combined', 'dev', 'tiny']).default('combined'),
  
  // IDRX
  IDRXCO_API_KEY: z.string().optional(),
  IDRXCO_SECRET_KEY: z.string().optional(),
  IDRXCO_API_URL: z.string().default('https://idrx.co/api'),
  
  // Yellow Card
  YELLOWCARD_API_KEY: z.string().optional(),
  YELLOWCARD_SECRET_KEY: z.string().optional(),
  YELLOWCARD_API_URL: z.string().default('https://api.yellowcard.io'),
  
  // Paycrest
  PAYCREST_CLIENT_ID: z.string().optional(),
  PAYCREST_CLIENT_SECRET: z.string().optional(),
  PAYCREST_API_URL: z.string().default('https://api.paycrest.io'),
  
  // Smile ID
  SMILE_ID_PARTNER_ID: z.string().optional(),
  SMILE_ID_API_KEY: z.string().optional(),
  SMILE_ID_SID_SERVER: z.string().default('https://api.smileidentity.com'),
  
  // Sumsub
  SUMSUB_APP_TOKEN: z.string().optional(),
  SUMSUB_SECRET_KEY: z.string().optional(),
  SUMSUB_BASE_URL: z.string().default('https://api.sumsub.com'),
  
  // cNGN
  CNGN_API_KEY: z.string().optional(),
  CNGN_SECRET_KEY: z.string().optional(),
  CNGN_API_URL: z.string().default('https://api.cngn.io'),
  
  // Email
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().default('noreply@nedapay.xyz'),
  RESEND_FROM_NAME: z.string().default('NedaPay'),
  
  // Redis
  REDIS_URL: z.string().optional(),
  KV_REST_API_URL: z.string().optional(),
  KV_REST_API_TOKEN: z.string().optional(),
  
  // Admin
  ADMIN_WALLET_1: z.string().optional(),
  ADMIN_WALLET_2: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  
  // Webhook
  WEBHOOK_BASE_URL: z.string().optional(),
});

/**
 * Parse and validate environment variables
 */
const parseEnv = () => {
  const result = envSchema.safeParse(process.env);
  
  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.format());
    process.exit(1);
  }
  
  return result.data;
};

const env = parseEnv();

/**
 * Application configuration object
 * Single source of truth for all config values
 */
export const config = {
  // Server
  env: env.NODE_ENV,
  isDev: env.NODE_ENV === 'development',
  isProd: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  port: env.PORT,
  host: env.HOST,
  apiVersion: env.API_VERSION,
  
  // CORS
  cors: {
    origins: env.CORS_ORIGINS.split(',').map(s => s.trim()),
  },
  
  // Database
  database: {
    url: env.DATABASE_URL,
    directUrl: env.DIRECT_URL,
  },
  
  // JWT
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },
  
  // Privy
  privy: {
    appId: env.PRIVY_APP_ID,
    appSecret: env.PRIVY_APP_SECRET,
    jwksEndpoint: env.PRIVY_JWKS_ENDPOINT,
  },
  
  // Encryption & Security
  encryption: {
    masterKey: env.ENCRYPTION_KEY,
    idrxKey: env.IDRX_ENC_KEY,
    apiCredentialsKey: env.API_CREDENTIALS_KEY,
    userSecretsKey: env.USER_SECRETS_KEY,
  },
  
  // API Keys
  apiKeys: {
    salt: env.API_KEY_SALT,
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_REQUESTS,
  },
  
  // Logging
  log: {
    level: env.LOG_LEVEL,
    format: env.LOG_FORMAT,
  },
  
  // External Services
  services: {
    idrx: {
      apiKey: env.IDRXCO_API_KEY,
      secretKey: env.IDRXCO_SECRET_KEY,
      apiUrl: env.IDRXCO_API_URL,
    },
    yellowCard: {
      apiKey: env.YELLOWCARD_API_KEY,
      secretKey: env.YELLOWCARD_SECRET_KEY,
      apiUrl: env.YELLOWCARD_API_URL,
    },
    paycrest: {
      clientId: env.PAYCREST_CLIENT_ID,
      clientSecret: env.PAYCREST_CLIENT_SECRET,
      apiUrl: env.PAYCREST_API_URL,
    },
    smileId: {
      partnerId: env.SMILE_ID_PARTNER_ID,
      apiKey: env.SMILE_ID_API_KEY,
      serverUrl: env.SMILE_ID_SID_SERVER,
    },
    sumsub: {
      appToken: env.SUMSUB_APP_TOKEN,
      secretKey: env.SUMSUB_SECRET_KEY,
      baseUrl: env.SUMSUB_BASE_URL,
    },
    cngn: {
      apiKey: env.CNGN_API_KEY,
      secretKey: env.CNGN_SECRET_KEY,
      apiUrl: env.CNGN_API_URL,
    },
  },
  
  // Email
  email: {
    resendApiKey: env.RESEND_API_KEY,
    fromEmail: env.RESEND_FROM_EMAIL,
    fromName: env.RESEND_FROM_NAME,
  },
  
  // Redis
  redis: {
    url: env.REDIS_URL,
    kvRestUrl: env.KV_REST_API_URL,
    kvRestToken: env.KV_REST_API_TOKEN,
  },
  
  // Admin
  admin: {
    wallets: [env.ADMIN_WALLET_1, env.ADMIN_WALLET_2].filter(Boolean) as string[],
    password: env.ADMIN_PASSWORD,
  },
  
  // Webhook
  webhook: {
    baseUrl: env.WEBHOOK_BASE_URL,
  },
} as const;

export type Config = typeof config;
export default config;
