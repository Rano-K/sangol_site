/** CMS 시드용 merge 유틸 (home / brand-intro 공통) */

export type CmsJson = Record<string, unknown>;

export const isEmptyCmsValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value as object).length === 0;
  return false;
};

export const preserveCmsMediaFields = (target: unknown, source: unknown): unknown => {
  if (Array.isArray(target)) {
    const srcArr = Array.isArray(source) ? source : [];
    return target.map((item, index) => preserveCmsMediaFields(item, srcArr[index]));
  }
  if (target && typeof target === 'object') {
    const out = JSON.parse(JSON.stringify(target)) as CmsJson;
    const src =
      source && typeof source === 'object' && !Array.isArray(source) ? (source as CmsJson) : {};
    for (const [key, value] of Object.entries(out)) {
      if (key.endsWith('MediaId') || key === 'certMediaIds') {
        const srcVal = src[key];
        if (srcVal !== undefined && srcVal !== null && srcVal !== '') {
          out[key] = srcVal;
        }
        continue;
      }
      out[key] = preserveCmsMediaFields(value, src[key]);
    }
    return out;
  }
  return target;
};

/** defaults 구조 기준, current에 값이 있으면 current 우선 */
export const mergeFillEmptyCms = (defaults: unknown, current: unknown): unknown => {
  if (Array.isArray(defaults)) {
    const currentArr = Array.isArray(current) ? current : [];
    if (defaults.length === 0) {
      return currentArr.length > 0 ? currentArr : defaults;
    }
    if (currentArr.length > defaults.length) {
      return currentArr.map((item, index) =>
        index < defaults.length ? mergeFillEmptyCms(defaults[index], item) : item
      );
    }
    return defaults.map((item, index) => mergeFillEmptyCms(item, currentArr[index]));
  }
  if (defaults && typeof defaults === 'object') {
    const base = defaults as CmsJson;
    const cur =
      current && typeof current === 'object' && !Array.isArray(current) ? (current as CmsJson) : {};
    const merged: CmsJson = { ...cur };
    for (const [key, value] of Object.entries(base)) {
      if (key.endsWith('MediaId') && cur[key] !== undefined && cur[key] !== null && cur[key] !== '') {
        merged[key] = cur[key];
        continue;
      }
      if (key === 'certMediaIds' && Array.isArray(cur[key]) && (cur[key] as unknown[]).some((v) => v !== '' && v != null)) {
        merged[key] = cur[key];
        continue;
      }
      merged[key] = mergeFillEmptyCms(value, cur[key]);
    }
    return merged;
  }
  if (isEmptyCmsValue(current)) return defaults;
  return current;
};
