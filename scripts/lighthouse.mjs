// 빌드된 사이트를 미리보기로 띄우고 Lighthouse(모바일 기본값)로 점수를 잰다.
// 기준: 성능 90 이상, 접근성·권장사항·SEO 95 이상. 하나라도 못 넘으면 종료 코드 1.
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';

const PORT = 4321;
const PAGES = [
  ['home', '/'],
  ['baro', '/projects/baro/'],
  ['stockpulse', '/projects/stockpulse/'],
];
const MIN = { performance: 90, accessibility: 95, 'best-practices': 95, seo: 95 };

const preview = spawn('npx', ['astro', 'preview', '--port', String(PORT)], { shell: true, stdio: 'ignore' });

function stopPreview() {
  if (process.platform === 'win32') {
    try {
      execFileSync('taskkill', ['/pid', String(preview.pid), '/T', '/F'], { stdio: 'ignore' });
    } catch {
      // 이미 종료된 경우
    }
  } else {
    preview.kill('SIGTERM');
  }
}

async function waitForServer(url, timeoutMs = 30_000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // 아직 뜨는 중
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`preview did not start: ${url}`);
}

let failed = false;
try {
  await waitForServer(`http://localhost:${PORT}/`);
  mkdirSync('lighthouse', { recursive: true });
  for (const [name, path] of PAGES) {
    const out = `lighthouse/${name}.json`;
    const startedAt = Date.now();
    try {
      execFileSync(
        'npx',
        [
          '--yes',
          'lighthouse@13.5.0',
          `http://localhost:${PORT}${path}`,
          '--output=json',
          `--output-path=${out}`,
          '--only-categories=performance,accessibility,best-practices,seo',
          '--chrome-flags=--headless=new',
          '--quiet',
        ],
        { stdio: 'inherit', shell: true },
      );
    } catch (err) {
      // Windows에서는 보고서를 다 쓴 뒤 임시 Chrome 프로필을 지우다 EPERM으로 끝나는 경우가 있다.
      // 이번 실행에서 보고서가 새로 생겼으면 그대로 채점한다.
      if (!existsSync(out) || statSync(out).mtimeMs < startedAt) throw err;
      console.warn(`(lighthouse exited non-zero after writing ${out}; scoring it anyway)`);
    }
    const report = JSON.parse(readFileSync(out, 'utf8'));
    for (const [key, min] of Object.entries(MIN)) {
      const score = Math.round(report.categories[key].score * 100);
      const ok = score >= min;
      if (!ok) failed = true;
      console.log(`${name.padEnd(6)} ${key.padEnd(15)} ${String(score).padStart(3)} (min ${min}) ${ok ? 'OK' : 'FAIL'}`);
    }
  }
} finally {
  stopPreview();
}
process.exit(failed ? 1 : 0);
