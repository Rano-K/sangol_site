import { env } from '../config/env';

export const publicApiBaseUrl = env.PUBLIC_API_BASE_URL.replace(/\/+$/, '');
export const publicOriginUrl = publicApiBaseUrl.replace(/\/api$/, '');

export const buildPublicApiUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${publicApiBaseUrl}${normalizedPath}`;
};

export const buildPublicAssetUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${publicOriginUrl}${normalizedPath}`;
};
