type ClientLogLevel = 'debug' | 'info' | 'warn' | 'error';

const NODE_ENV = import.meta.env.MODE || 'development';
const API_LOG_ENABLED = import.meta.env.VITE_API_LOG_ENABLED !== 'false';
const MAX_LEN = Number(import.meta.env.VITE_API_LOG_MAX_LENGTH || 600);

const SENSITIVE_KEYS = [
  'password',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'email',
  'phone',
  'address',
  'owner_phone',
  'store_phone',
  'customer_phone',
];

const truncate = (text: string): string => (text.length > MAX_LEN ? `${text.slice(0, MAX_LEN)}...(truncated)` : text);

const isSensitive = (key: string): boolean => SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s));

const mask = (value: unknown): unknown => {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(mask);
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([k, v]) => {
      out[k] = isSensitive(k) ? '[MASKED]' : mask(v);
    });
    return out;
  }
  if (typeof value === 'string') return truncate(value);
  return value;
};

const summarizeTextBody = (raw: string): unknown => {
  try {
    return mask(JSON.parse(raw));
  } catch (_error) {
    return truncate(raw);
  }
};

const log = (level: ClientLogLevel, parts: string[], meta?: Record<string, unknown>) => {
  if (!API_LOG_ENABLED || NODE_ENV === 'test') return;
  const line = parts.join(' | ');
  if (level === 'error') {
    // eslint-disable-next-line no-console
    console.error(line, meta || '');
  } else {
    // eslint-disable-next-line no-console
    console.log(line, meta || '');
  }
};

export const installApiLoggingInterceptor = (): void => {
  if (!API_LOG_ENABLED) return;
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const startedAt = Date.now();
    const method = (init?.method || 'GET').toUpperCase();
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const requestPayload = typeof init?.body === 'string' ? summarizeTextBody(init.body) : '[non-string body]';

    log('debug', ['[CLIENT API START]', `${method} ${url}`], {
      requestPayload,
    });

    try {
      const response = await originalFetch(input, init);
      const durationMs = Date.now() - startedAt;
      const requestId = response.headers.get('X-Request-Id') || '-';

      let responsePayload: unknown = '[omitted]';
      if (NODE_ENV === 'development') {
        const cloned = response.clone();
        const text = await cloned.text();
        responsePayload = summarizeTextBody(text);
      }

      if (response.ok) {
        log('info', ['[CLIENT API OK]', `${method} ${url}`, `status=${response.status}`, `duration=${durationMs}ms`, `requestId=${requestId}`], {
          requestPayload,
          responsePayload,
        });
      } else {
        const errorTag = response.status === 401 ? 'UNAUTHORIZED' : response.status === 403 ? 'FORBIDDEN' : response.status === 400 || response.status === 422 ? 'VALIDATION' : 'ERROR';
        log('warn', [`[CLIENT API ${errorTag}]`, `${method} ${url}`, `status=${response.status}`, `duration=${durationMs}ms`, `requestId=${requestId}`], {
          requestPayload,
          responsePayload,
        });
      }
      return response;
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      log('error', ['[CLIENT API NETWORK ERROR]', `${method} ${url}`, `duration=${durationMs}ms`], {
        requestPayload,
        message: error instanceof Error ? error.message : 'Unknown network error',
      });
      throw error;
    }
  };
};
