// 배포 뒤 확인. 사용법: node scripts/smoke.mjs <site_url>
// 사이트 주소로 핵심 동작(도메인이면 www까지)을 확인하고, 하나라도 어긋나면 종료 코드 1로 끝난다.
import { pathToFileURL } from 'node:url';

/**
 * @param {string} siteUrl 예: https://d111111abcdef8.cloudfront.net
 * @param {typeof fetch} fetchImpl 테스트에서 가짜 fetch를 넣는다
 * @returns {Promise<string[]>} 실패 목록. 비어 있으면 통과
 */
export async function smoke(siteUrl, fetchImpl = fetch) {
  const base = siteUrl.replace(/\/+$/, '');
  const failures = [];
  const get = (path) => fetchImpl(`${base}${path}`, { redirect: 'manual' });

  const home = await get('/');
  if (home.status !== 200) failures.push(`/ returned ${home.status}, expected 200`);
  else if (!(await home.text()).includes(`<link rel="canonical" href="${base}/"`)) {
    failures.push(`/ canonical is not ${base}/`);
  }

  const en = await get('/en/projects/baro/');
  if (en.status !== 200) failures.push(`/en/projects/baro/ returned ${en.status}, expected 200`);

  const noSlash = await get('/projects/baro');
  const location = noSlash.headers.get('location') ?? '';
  if (noSlash.status !== 301 || new URL(location, `${base}/`).pathname !== '/projects/baro/') {
    const to = location ? ` to ${location}` : '';
    failures.push(`/projects/baro returned ${noSlash.status}${to}, expected 301 to /projects/baro/`);
  }

  const missing = await get('/does-not-exist/');
  if (missing.status !== 404) failures.push(`/does-not-exist/ returned ${missing.status}, expected 404`);

  const robots = await get('/robots.txt');
  if (robots.status !== 200 || !(await robots.text()).includes(`Sitemap: ${base}/sitemap-index.xml`)) {
    failures.push(`/robots.txt does not point to ${base}/sitemap-index.xml`);
  }

  // 도메인이 있으면 www도 인증서·별칭·DNS가 붙어 기본 도메인으로 301해야 한다.
  const { hostname, origin } = new URL(base);
  if (!hostname.endsWith('.cloudfront.net')) {
    const wwwUrl = `${origin.replace('://', '://www.')}/`;
    const expected = `${origin}/`;
    const www = await fetchImpl(wwwUrl, { redirect: 'manual' });
    const to = www.headers.get('location') ?? '';
    if (www.status !== 301 || to !== expected) {
      failures.push(`${wwwUrl} returned ${www.status}${to ? ` to ${to}` : ''}, expected 301 to ${expected}`);
    }
  }
  return failures;
}

// process.exit()를 부르면 Windows에서 열린 fetch 연결을 닫는 도중 libuv 단언 오류로 죽는다.
// 종료 코드만 정하고 연결이 닫히며 자연스럽게 끝나게 한다.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const url = process.argv[2];
  if (!url) {
    console.error('usage: node scripts/smoke.mjs <site_url>');
    process.exitCode = 2;
  } else {
    const failures = await smoke(url);
    for (const failure of failures) console.error(`FAIL ${failure}`);
    console.log(failures.length === 0 ? `smoke OK: ${url}` : `smoke failed: ${failures.length} check(s)`);
    process.exitCode = failures.length === 0 ? 0 : 1;
  }
}
