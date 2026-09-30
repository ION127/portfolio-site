import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

interface CfRequest {
  uri: string;
  method: string;
  querystring: Record<string, unknown>;
  headers: Record<string, unknown>;
}
interface CfRedirect {
  statusCode: number;
  statusDescription: string;
  headers: { location: { value: string } };
}
type Handler = (event: { request: CfRequest }) => CfRequest | CfRedirect;

// CloudFront Function은 모듈이 아니라 전역 handler 하나로 된 스크립트라 vm으로 읽는다.
const handler = runInNewContext(`${readFileSync('infra/site/functions/rewrite.js', 'utf8')}\nhandler;`) as Handler;
const run = (uri: string) => handler({ request: { uri, method: 'GET', querystring: {}, headers: {} } });

describe('CloudFront rewrite function', () => {
  it('adds index.html to folder paths', () => {
    expect(run('/')).toMatchObject({ uri: '/index.html' });
    expect(run('/projects/baro/')).toMatchObject({ uri: '/projects/baro/index.html' });
    expect(run('/en/')).toMatchObject({ uri: '/en/index.html' });
  });

  it('redirects page paths without a trailing slash', () => {
    expect(run('/projects/baro')).toEqual({
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: { location: { value: '/projects/baro/' } },
    });
    expect(run('/en')).toMatchObject({ statusCode: 301, headers: { location: { value: '/en/' } } });
  });

  it('leaves file paths alone', () => {
    for (const uri of ['/_astro/client.a1b2c3.js', '/og-ko.png', '/robots.txt', '/sitemap-index.xml', '/404.html']) {
      expect(run(uri)).toMatchObject({ uri });
    }
  });
});
