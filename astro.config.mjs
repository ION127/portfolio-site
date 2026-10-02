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
  // 페이지마다 CSP <meta>를 넣는다. script-src·style-src는 Astro가 'self'와 인라인 코드의 해시로 채운다.
  // meta라서 frame-ancestors는 안 되고, 그 역할은 CloudFront 보안 헤더의 X-Frame-Options가 맡는다.
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        // 지도 데모의 OpenStreetMap 타일(사이트의 유일한 외부 요청). data:는 Leaflet이 줌을 바꿀 때
        // 받다 만 타일에 넣는 빈 이미지다. 이미지라 스크립트를 실행할 수 없다.
        "img-src 'self' data: https://tile.openstreetmap.org",
        "font-src 'self'",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ],
    },
  },
  integrations: [
    react(),
    mdx(),
    sitemap({ i18n: { defaultLocale: 'ko', locales: { ko: 'ko-KR', en: 'en-US' } } }),
  ],
});
