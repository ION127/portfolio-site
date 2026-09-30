import { describe, expect, it } from 'vitest';
import { smoke } from '../../scripts/smoke.mjs';

const BASE = 'https://d111111abcdef8.cloudfront.net';

type Routes = Record<string, { status: number; body?: string; location?: string }>;

const healthy: Routes = {
  '/': { status: 200, body: `<head><link rel="canonical" href="${BASE}/"></head>` },
  '/en/projects/baro/': { status: 200 },
  '/projects/baro': { status: 301, location: '/projects/baro/' },
  '/does-not-exist/': { status: 404 },
  '/robots.txt': { status: 200, body: `User-agent: *\nAllow: /\n\nSitemap: ${BASE}/sitemap-index.xml\n` },
};

/** 경로별로 정해 둔 응답을 돌려주는 가짜 fetch. 목록에 없는 경로는 404. */
function fakeFetch(routes: Routes): typeof fetch {
  return (async (input: string | URL | Request) => {
    const path = new URL(input instanceof Request ? input.url : String(input)).pathname;
    const route = routes[path] ?? { status: 404 };
    const headers: Record<string, string> = route.location ? { location: route.location } : {};
    return new Response(route.body ?? '', { status: route.status, headers });
  }) as typeof fetch;
}

describe('deploy smoke check', () => {
  it('passes a healthy site, with or without a trailing slash on the url', async () => {
    expect(await smoke(BASE, fakeFetch(healthy))).toEqual([]);
    expect(await smoke(`${BASE}/`, fakeFetch(healthy))).toEqual([]);
  });

  it('accepts an absolute redirect location', async () => {
    const routes = { ...healthy, '/projects/baro': { status: 301, location: `${BASE}/projects/baro/` } };
    expect(await smoke(BASE, fakeFetch(routes))).toEqual([]);
  });

  it('catches a build that still points at localhost', async () => {
    const routes = { ...healthy, '/': { status: 200, body: '<link rel="canonical" href="http://localhost:4321/">' } };
    expect(await smoke(BASE, fakeFetch(routes))).toEqual([`/ canonical is not ${BASE}/`]);
  });

  it('catches a missing trailing-slash redirect', async () => {
    const routes = { ...healthy, '/projects/baro': { status: 404 } };
    const failures = await smoke(BASE, fakeFetch(routes));
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain('/projects/baro returned 404');
  });

  it('catches an error page that does not answer 404', async () => {
    const routes = { ...healthy, '/does-not-exist/': { status: 403 } };
    expect(await smoke(BASE, fakeFetch(routes))).toEqual(['/does-not-exist/ returned 403, expected 404']);
  });

  it('catches robots.txt without the sitemap', async () => {
    const routes = { ...healthy, '/robots.txt': { status: 200, body: 'User-agent: *\nAllow: /\n' } };
    expect(await smoke(BASE, fakeFetch(routes))).toEqual([`/robots.txt does not point to ${BASE}/sitemap-index.xml`]);
  });
});
