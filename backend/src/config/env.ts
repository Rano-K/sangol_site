// process.env를 직접 여기저기서 읽지 않고,
// backend/src/config/env.ts에서 한 번 검증한 뒤
// 다른 파일들은 env.JWT_SECRET처럼 가져다 쓰게


import dotenv from 'dotenv';

dotenv.config();

const getRequired = (key: string): string => {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`[ENV] ${key} is required.`);
  }
  return value;
};

const getOptional = (key: string, defaultValue: string): string => {
  const value = process.env[key]?.trim();
  return value || defaultValue;
};

const parsePort = (raw: string): number => {
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`[ENV] PORT must be a valid integer (1-65535). received=${raw}`);
  }
  return port;
};

const parseTrustProxy = (raw: string): boolean | number | string => {
  const value = raw.trim().toLowerCase();
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^\d+$/.test(value)) return Number(value);
  return raw;
};

const ensureJwtSecret = (secret: string): string => {
  const lower = secret.toLowerCase();
  if (secret.length < 32) {
    throw new Error('[ENV] JWT_SECRET must be at least 32 characters.');
  }
  if (
    lower === '원하는값' ||
    lower === 'changeme' ||
    lower === 'change_me' ||
    lower.includes('change_me') ||
    lower.includes('replace_me')
  ) {
    throw new Error('[ENV] JWT_SECRET uses an insecure placeholder value.');
  }
  return secret;
};

export const env = {
  PORT: parsePort(getOptional('PORT', '5101')),
  DB_HOST: getRequired('DB_HOST'),
  DB_PORT: parsePort(getOptional('DB_PORT', '5432')),
  DB_NAME: getRequired('DB_NAME'),
  DB_USER: getRequired('DB_USER'),
  DB_PASSWORD: getRequired('DB_PASSWORD'),
  JWT_SECRET: ensureJwtSecret(getRequired('JWT_SECRET')),
  JWT_EXPIRES_IN: getOptional('JWT_EXPIRES_IN', '7d'),
  FRONTEND_URL: process.env.FRONTEND_URL?.trim() || '',
  ADMIN_URL: process.env.ADMIN_URL?.trim() || '',
  TRUST_PROXY: parseTrustProxy(getOptional('TRUST_PROXY', 'false')),
  PUBLIC_API_BASE_URL: getOptional('PUBLIC_API_BASE_URL', 'http://localhost:5101/api'),
};

export const assertServerEnv = (): void => {
  ensureJwtSecret(env.JWT_SECRET);
};

