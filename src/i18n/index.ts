import { ko } from './ko';
import { en } from './en';

export const LOCALES = ['ko', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export type UiKey = keyof typeof ko;

const dictionaries: Record<Locale, Record<UiKey, string>> = { ko, en };

export function t(locale: Locale, key: UiKey): string {
  return dictionaries[locale][key];
}

export function isLocale(value: string | undefined): value is Locale {
  return value === 'ko' || value === 'en';
}

/** '/en' 또는 '/en/...'이면 영어, 그 밖은 한국어. '/enterprise/' 같은 경로는 한국어다. */
export function localeFromPath(pathname: string): Locale {
  return pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'ko';
}

/** 영어 접두사를 뗀 경로. */
export function stripLocale(pathname: string): string {
  if (pathname === '/en' || pathname === '/en/') return '/';
  if (pathname.startsWith('/en/')) return pathname.slice(3);
  return pathname;
}

/** 로케일 없는 경로를 해당 언어 경로로 바꾼다. 결과는 항상 '/'로 끝나고 해시는 뒤에 보존한다. */
export function localizePath(path: string, locale: Locale): string {
  const hashAt = path.indexOf('#');
  const base = hashAt === -1 ? path : path.slice(0, hashAt);
  const hash = hashAt === -1 ? '' : path.slice(hashAt);
  let p = base.startsWith('/') ? base : `/${base}`;
  if (!p.endsWith('/')) p += '/';
  const localized = locale === 'en' ? (p === '/' ? '/en/' : `/en${p}`) : p;
  return `${localized}${hash}`;
}

/** 지금 보고 있는 페이지의 다른 언어판 경로. */
export function switchLocalePath(pathname: string, target: Locale): string {
  return localizePath(stripLocale(pathname), target);
}
