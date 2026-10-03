// OG 이미지(1200×630)를 src/og/template.svg로 만든다. 문구를 바꿀 때만 다시 돌린다: npm run og
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const template = readFileSync(resolve(root, 'src/og/template.svg'), 'utf8');
// file:// 폰트는 CORS로 막히므로 data URI로 넣는다.
const font = readFileSync(
  resolve(root, 'node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2'),
).toString('base64');

const variants = {
  ko: { name: '신중훈', role: 'CLOUD / INFRA ENGINEER', line: '서비스가 멈추지 않도록 설계하고, 운영합니다.' },
  en: { name: 'Shin JoongHoon', role: 'CLOUD / INFRA ENGINEER', line: 'I design and run systems so services keep running.' },
};

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const [locale, v] of Object.entries(variants)) {
  const svg = template.replace('{{name}}', v.name).replace('{{role}}', v.role).replace('{{line}}', v.line);
  await page.setContent(
    '<!doctype html><html><head><meta charset="utf-8"><style>' +
      `@font-face{font-family:'Pretendard Variable';src:url(data:font/woff2;base64,${font}) format('woff2');font-weight:45 920}` +
      'html,body{margin:0;background:#f7f6f2}</style></head><body>' +
      svg +
      '</body></html>',
  );
  await page.evaluate(async () => {
    await document.fonts.load("800 92px 'Pretendard Variable'", '신중훈A');
    await document.fonts.ready;
  });
  await page.screenshot({ path: resolve(root, `public/og-${locale}.png`) });
  console.log(`wrote public/og-${locale}.png`);
}
await browser.close();
