import { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../lib/apiBaseUrl';

export type CmsPageResponse = {
  pageKey: string;
  title: string | null;
  sections: Record<string, unknown>;
  seo: Record<string, unknown>;
  published: boolean;
};

export const getCmsMediaFileUrl = (mediaId: number | null | undefined): string | null => {
  if (!mediaId || Number.isNaN(Number(mediaId))) return null;
  return `${API_BASE_URL}/content/public/media/${Number(mediaId)}/file`;
};

export function useCmsPage(pageKey: string) {
  const apiBaseUrl = useMemo(() => API_BASE_URL, []);

  const [data, setData] = useState<CmsPageResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const run = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${apiBaseUrl}/content/public/pages/${pageKey}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          setData(null);
          return;
        }

        const payload = (await response.json()) as CmsPageResponse;
        setData(payload);
      } catch (_error) {
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    run();

    return () => controller.abort();
  }, [apiBaseUrl, pageKey]);

  return { data, loading };
}

