import fs from 'fs';
import path from 'path';
import { NextFunction, Request, Response } from 'express';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogFormat = 'line' | 'json';

const NODE_ENV = process.env.NODE_ENV || 'development';
const LOG_LEVEL = (process.env.LOG_LEVEL || (NODE_ENV === 'production' ? 'info' : 'debug')) as LogLevel;
const LOG_FORMAT = (process.env.LOG_FORMAT || 'line') as LogFormat;
const LOG_MAX_BODY_LENGTH = Number(process.env.LOG_MAX_BODY_LENGTH || 1000);
const LOG_BODY_ENABLED_ENV = process.env.LOG_BODY_ENABLED === 'true';
const LOG_BODY_ENABLED = NODE_ENV === 'development' ? true : NODE_ENV === 'production' ? false : LOG_BODY_ENABLED_ENV;
const LOG_FILE_ENABLED = process.env.LOG_FILE_ENABLED === 'true';

const logDir = path.resolve(process.cwd(), 'logs');
const logFile = path.resolve(logDir, 'api.log');
if (LOG_FILE_ENABLED) fs.mkdirSync(logDir, { recursive: true });

const levelOrder: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const SENSITIVE_KEYS = [
  'password',
  'passwd',
  'pwd',
  'token',
  'access_token',
  'refresh_token',
  'authorization',
  'email',
  'phone',
  'owner_phone',
  'store_phone',
  'customer_phone',
  'address',
  'cookie',
  'set-cookie',
];

const safeSerialize = (value: unknown): string => {
  try {
    return JSON.stringify(value);
  } catch (_error) {
    return JSON.stringify({ serializationError: true });
  }
};

const shouldLog = (level: LogLevel): boolean => levelOrder[level] >= levelOrder[LOG_LEVEL];
const truncate = (text: string): string => (text.length > LOG_MAX_BODY_LENGTH ? `${text.slice(0, LOG_MAX_BODY_LENGTH)}...(truncated)` : text);

const maskPrimitive = (value: unknown): unknown => {
  if (typeof value === 'string') return value.length <= 2 ? '**' : `${value.slice(0, 1)}***${value.slice(-1)}`;
  if (typeof value === 'number') return -1;
  if (typeof value === 'boolean') return value;
  return '[MASKED]';
};

const isSensitiveKey = (key: string): boolean => {
  const normalized = key.toLowerCase();
  return SENSITIVE_KEYS.some((word) => normalized.includes(word));
};

const maskSensitive = (value: unknown): unknown => {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(maskSensitive);
  if (typeof value === 'object') {
    const next: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      next[key] = isSensitiveKey(key) ? maskPrimitive(nested) : maskSensitive(nested);
    }
    return next;
  }
  return value;
};

const summarizeBody = (payload: unknown): unknown => {
  if (!LOG_BODY_ENABLED || NODE_ENV === 'production') {
    if (payload === null || payload === undefined) return null;
    if (typeof payload === 'string') return `[string length=${payload.length}]`;
    if (Array.isArray(payload)) return `[array length=${payload.length}]`;
    if (typeof payload === 'object') return `[object keys=${Object.keys(payload as Record<string, unknown>).length}]`;
    return `[${typeof payload}]`;
  }
  const masked = maskSensitive(payload);
  const serialized = safeSerialize(masked);
  const shortened = truncate(serialized);
  try {
    return JSON.parse(shortened);
  } catch (_error) {
    return shortened;
  }
};

const writeStructuredLog = (entry: Record<string, unknown>) => {
  if (!shouldLog((entry.level as LogLevel) || 'info')) return;
  const line =
    LOG_FORMAT === 'json'
      ? safeSerialize(entry)
      : [
          `[${String(entry.tag || 'LOG')}]`,
          `${String(entry.method || '')} ${String(entry.path || '')}`.trim(),
          `status=${String(entry.statusCode ?? '-')}`,
          `duration=${String(entry.durationMs ?? '-')}ms`,
          `requestId=${String(entry.requestId ?? '-')}`,
          `time=${String(entry.timestamp ?? '-')}`,
          `ip=${String(entry.ip ?? '-')}`,
          `userAgent=${truncate(String(entry.userAgent ?? '-'))}`,
          `params=${truncate(safeSerialize(entry.params ?? null))}`,
          `query=${truncate(safeSerialize(entry.query ?? null))}`,
          `requestBody=${truncate(safeSerialize(entry.requestBody ?? null))}`,
          `responseBody=${truncate(safeSerialize(entry.responseBody ?? null))}`,
          `userId=${String(entry.userId ?? '-')}`,
          `role=${String(entry.role ?? '-')}`,
          `message=${String(entry.message || '-')}`,
        ]
          .filter(Boolean)
          .join(' | ');

  if (entry.level === 'error') {
    // eslint-disable-next-line no-console
    console.error(line);
  } else {
    // eslint-disable-next-line no-console
    console.log(line);
  }

  if (LOG_FILE_ENABLED) {
    fs.appendFile(logFile, `${safeSerialize(entry)}\n`, () => void 0);
  }
};

const generateRequestId = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const apiLogger = (req: Request, res: Response, next: NextFunction) => {
  if (NODE_ENV === 'test') return next();

  const startedAt = Date.now();
  const requestId = generateRequestId();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  let responseBody: unknown = null;
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  res.json = ((body: unknown) => {
    responseBody = body;
    return originalJson(body);
  }) as Response['json'];

  res.send = ((body: unknown) => {
    if (responseBody === null) responseBody = body;
    return originalSend(body);
  }) as Response['send'];

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    const timestamp = new Date().toISOString();
    const level: LogLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    const userMeta = req.user ? { userId: (req.user as any).id ?? null, role: (req.user as any).role ?? null } : null;
    writeStructuredLog({
      level,
      tag: res.statusCode >= 400 ? 'API ERROR' : 'API OK',
      timestamp,
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
      ip: req.ip,
      userAgent: req.get('user-agent') || null,
      params: summarizeBody(req.params),
      query: summarizeBody(req.query),
      requestBody: summarizeBody(req.body),
      responseBody: summarizeBody(responseBody),
      ...(userMeta || {}),
      message: res.statusCode >= 400 ? 'Request completed with error status' : 'Request completed',
    });
  });

  next();
};

export const logApiError = (
  req: Request,
  res: Response,
  error: unknown,
  statusCode = 500
) => {
  const err = error as { message?: string; stack?: string; name?: string };
  writeStructuredLog({
    level: 'error',
    tag: 'API ERROR',
    timestamp: new Date().toISOString(),
    requestId: req.requestId || null,
    method: req.method,
    path: req.originalUrl,
    statusCode,
    durationMs: null,
    ip: req.ip,
    userAgent: req.get('user-agent') || null,
    params: summarizeBody(req.params),
    query: summarizeBody(req.query),
    requestBody: summarizeBody(req.body),
    errorName: err?.name || 'Error',
    message: err?.message || 'Unknown error',
    stack: NODE_ENV === 'development' ? truncate(err?.stack || '') : undefined,
  });
};

