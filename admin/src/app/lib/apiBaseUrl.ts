const FALLBACK_API_BASE_URL = 'http://localhost:5101/api';

const normalize = (url: string): string => url.replace(/\/+$/, '');

export const API_BASE_URL = normalize(
  (import.meta.env.PUBLIC_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || FALLBACK_API_BASE_URL) as string
);

