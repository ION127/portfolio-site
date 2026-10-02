import type { Locale } from '../../i18n';

/** 1km 미만은 10m 단위 미터로, 그 이상은 소수 한 자리 km로 보여 준다. */
export function formatDistance(m: number, locale: Locale): string {
  const gap = locale === 'ko' ? '' : ' ';
  if (m < 995) return `${Math.max(10, Math.round(m / 10) * 10)}${gap}m`;
  return `${(m / 1000).toFixed(1)}${gap}km`;
}
