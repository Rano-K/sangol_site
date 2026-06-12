const DURATION_PATTERN = /^(\d+)\s*([smhd])$/i;

export const parseDurationToMs = (raw: string, label: string): number => {
  const normalized = raw.trim();
  const match = DURATION_PATTERN.exec(normalized);
  if (!match) {
    throw new Error(`[ENV] ${label} must use a value like 15m, 1h, 7d. received=${raw}`);
  }
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const unitMs: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return amount * unitMs[unit];
};
