import { describe, expect, it } from 'vitest';
import { ko } from '../../src/i18n/ko';
import { en } from '../../src/i18n/en';
import { isLocale, localeFromPath, localizePath, stripLocale, switchLocalePath, t } from '../../src/i18n';

describe('dictionaries', () => {
  it('describe the architecture section without assuming a side-by-side layout or a mouse', () => {
    expect(ko['architecture.hint']).not.toMatch(/왼쪽|오른쪽|마우스/);
    expect(en['architecture.hint']).not.toMatch(/left|right|hover/i);
  });

  it('keep no placeholder copy for demos that now exist', () => {
    expect(Object.keys(ko).filter((k) => k.startsWith('demo.'))).toEqual(['demo.baro']);
    expect(Object.values(ko).join(' ')).not.toContain('녹화');
    expect(Object.values(en).join(' ')).not.toContain('recorded prices');
  });

  it('have the same keys and no empty strings', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(ko).sort());
    for (const [key, value] of [...Object.entries(ko), ...Object.entries(en)]) {
      expect(value, key).not.toBe('');
    }
  });

  it('t() reads the right language', () => {
    expect(t('ko', 'nav.projects')).toBe('프로젝트');
    expect(t('en', 'nav.projects')).toBe('Projects');
  });
});

describe('paths', () => {
  it('detects the locale from a path without matching look-alike prefixes', () => {
    expect(localeFromPath('/')).toBe('ko');
    expect(localeFromPath('/projects/baro/')).toBe('ko');
    expect(localeFromPath('/en/')).toBe('en');
    expect(localeFromPath('/en')).toBe('en');
    expect(localeFromPath('/en/projects/baro/')).toBe('en');
    expect(localeFromPath('/enterprise/')).toBe('ko');
  });

  it('strips the English prefix', () => {
    expect(stripLocale('/en/')).toBe('/');
    expect(stripLocale('/en/projects/baro/')).toBe('/projects/baro/');
    expect(stripLocale('/projects/baro/')).toBe('/projects/baro/');
  });

  it('localizes paths with a trailing slash and keeps the hash', () => {
    expect(localizePath('/', 'ko')).toBe('/');
    expect(localizePath('/', 'en')).toBe('/en/');
    expect(localizePath('/projects/baro', 'en')).toBe('/en/projects/baro/');
    expect(localizePath('projects/baro/', 'ko')).toBe('/projects/baro/');
    expect(localizePath('/#ops', 'en')).toBe('/en/#ops');
    expect(localizePath('/projects/baro/#incident-x', 'ko')).toBe('/projects/baro/#incident-x');
  });

  it('switches a page to the same page in the other language', () => {
    expect(switchLocalePath('/', 'en')).toBe('/en/');
    expect(switchLocalePath('/en/', 'ko')).toBe('/');
    expect(switchLocalePath('/en/projects/stockpulse/', 'ko')).toBe('/projects/stockpulse/');
    expect(switchLocalePath('/projects/baro/', 'en')).toBe('/en/projects/baro/');
  });

  it('recognizes locales', () => {
    expect(isLocale('ko')).toBe(true);
    expect(isLocale('en')).toBe(true);
    expect(isLocale('fr')).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });
});
