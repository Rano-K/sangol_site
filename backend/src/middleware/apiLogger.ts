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
const LOG_COLOR_ENABLED = process.env.LOG_COLOR_ENABLED !== 'false';
const LOG_COMPACT = process.env.LOG_COMPACT === 'true';
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
const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
} as const;
const supportsColor = (): boolean => LOG_COLOR_ENABLED && process.stdout.isTTY && NODE_ENV !== 'test' && LOG_FORMAT !== 'json';
const colorize = (text: string, color: string, bold = false): string =>
  supportsColor() ? `${bold ? ANSI.bold : ''}${color}${text}${ANSI.reset}` : text;
const colorByStatus = (statusCode: number): string =>
  statusCode >= 500 ? ANSI.red : statusCode >= 400 ? ANSI.yellow : statusCode >= 300 ? ANSI.cyan : ANSI.green;
const colorByMethod = (method: string): string => {
  if (method === 'GET') return ANSI.blue;
  if (method === 'POST') return ANSI.green;
  if (method === 'PUT' || method === 'PATCH') return ANSI.cyan;
  if (method === 'DELETE') return ANSI.red;
  return ANSI.magenta;
};
const getStatusLabel = (statusCode: number): string => {
  if (statusCode >= 500) return 'SERVER_ERROR';
  if (statusCode >= 400) return 'CLIENT_ERROR';
  if (statusCode >= 300) return 'REDIRECT';
  return 'OK';
};

const summarizeValueForLine = (value: unknown): string => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'string') return truncate(value);
  if (Array.isArray(value)) return `array(${value.length})`;
  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>);
    if (keys.length === 0) return '{}';
    return `object(${keys.slice(0, 6).join(',')}${keys.length > 6 ? ',...' : ''})`;
  }
  return String(value);
};

const formatMultilineDetail = (label: string, value: unknown): string => {
  const serialized = truncate(safeSerialize(value));
  const displayLabel = colorize(label, ANSI.gray, true);
  return `    ${displayLabel}: ${serialized}`;
};

const padRight = (value: string, width: number): string => (value.length >= width ? value : `${value}${' '.repeat(width - value.length)}`);
const formatClock = (timestamp: unknown): string => {
  const date = new Date(String(timestamp || Date.now()));
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
};

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
  const statusCode = Number(entry.statusCode ?? 0);
  const method = String(entry.method || '').toUpperCase();
  const methodWithColor = colorize(method, colorByMethod(method), true);
  const statusWithColor = colorize(`${getStatusLabel(statusCode)}(${String(entry.statusCode ?? '-')})`, colorByStatus(statusCode), true);
  const tagWithColor =
    entry.tag === 'API ERROR'
      ? colorize(String(entry.tag), ANSI.red, true)
      : colorize(String(entry.tag || 'LOG'), ANSI.green, true);
  const durationText = `${String(entry.durationMs ?? '-')}ms`;
  const durationWithColor =
    typeof entry.durationMs === 'number' && Number(entry.durationMs) > 1000
      ? colorize(durationText, ANSI.yellow, true)
      : colorize(durationText, ANSI.cyan);

  const line =
    LOG_FORMAT === 'json'
      ? safeSerialize(entry)
      : [
          `[${tagWithColor}]`,
          colorize(formatClock(entry.timestamp), ANSI.gray),
          `${padRight(methodWithColor, 8)} ${String(entry.path || '')}`.trim(),
          statusWithColor,
          durationWithColor,
          `req=${colorize(String(entry.requestId ?? '-'), ANSI.magenta)}`,
        ].join(' | ');

  const isErrorLike = Number(entry.statusCode ?? 0) >= 400 || entry.level === 'error';
  const showBodyDetail = LOG_BODY_ENABLED && (LOG_LEVEL === 'debug' || isErrorLike);
  const userSummary = entry.userId ? `${String(entry.userId)} (${String(entry.role ?? '-')})` : '-';
  const metaLines = [
    `    ${colorize('user', ANSI.gray, true)}: ${colorize(userSummary, ANSI.blue)}`,
    `    ${colorize('ip', ANSI.gray, true)}: ${colorize(String(entry.ip ?? '-'), ANSI.gray)}`,
    `    ${colorize('query', ANSI.gray, true)}: ${colorize(summarizeValueForLine(entry.query), ANSI.gray)}`,
    `    ${colorize('params', ANSI.gray, true)}: ${colorize(summarizeValueForLine(entry.params), ANSI.gray)}`,
    `    ${colorize('msg', ANSI.gray, true)}: ${colorize(String(entry.message || '-'), ANSI.gray)}`,
  ];
  const detailLines = showBodyDetail
    ? [
        '    ---- details ----',
        formatMultilineDetail('requestBody', entry.requestBody ?? null),
        formatMultilineDetail('responseBody', entry.responseBody ?? null),
      ]
    : [];

  const userAgentDetail = LOG_LEVEL === 'debug' ? `    userAgent: ${truncate(String(entry.userAgent ?? '-'))}` : '';
  const fullBlock = [line, ...metaLines, userAgentDetail, ...detailLines].filter(Boolean).join('\n');
  const finalLine = LOG_COMPACT ? line : fullBlock;

  if (entry.level === 'error') {
    // eslint-disable-next-line no-console
    console.error(finalLine);
  } else {
    // eslint-disable-next-line no-console
    console.log(finalLine);
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

