// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// 배포 주소는 SITE_URL 환경변수로 넘긴다. canonical, sitemap, OG 절대 주소에 쓰인다.
const site = process.env.SITE_URL ?? 'http://localhost:4321';

export default defineConfig({
  site,
  trailingSlash: 'always',
  // Astro 7 기본값('jsx')은 인라인 요소 사이 공백을 지운다. 한국어 문장 속 <b> 앞뒤 띄어쓰기를 지키려고 HTML 방식으로 둔다.
  compressHTML: true,
  i18n: {
    locales: ['ko', 'en'],
    defaultLocale: 'ko',
  },
  integrations: [
    react(),
    mdx(),
    sitemap({ i18n: { defaultLocale: 'ko', locales: { ko: 'ko-KR', en: 'en-US' } } }),
  ],
});
