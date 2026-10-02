import { useEffect, useRef, useState, type ReactNode } from 'react';
import './spreplay.css';
import { t, type Locale, type UiKey } from '../i18n';
import { RULES, type Classified } from '../lib/sp-replay/detect';
import { createPlayer, STEP_PHASES, type Phase, type Player } from '../lib/sp-replay/player';
import { INSTRUMENTS, SECTORS, instrument, newsSearch, sector, type Instrument, type Market } from '../lib/sp-replay/universe';

interface Props {
  locale: Locale;
}

type Point = [number, number];

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';
const TRAVEL_S = 1.0;
const TYPE_KEY: Record<Classified['eventType'], UiKey> = {
  INDIVIDUAL: 'replay.type.INDIVIDUAL',
  SECTOR: 'replay.type.SECTOR',
  MARKET: 'replay.type.MARKET',
};
// 파이프라인 SVG의 간선. 단계마다 메시지 점이 이 길을 따라간다.
const PATHS: Partial<Record<Phase, Point[]>> = {
  detect: [[80, 40], [80, 80]],
  news: [[80, 110], [80, 150]],
  retry: [[80, 180], [80, 220]],
  analyze: [[80, 180], [80, 220]],
  notify: [[80, 250], [80, 290]],
};
const NODES: { id: string; key: UiKey; y: number; on: Phase[] }[] = [
  { id: 'collector', key: 'replay.node.collector', y: 10, on: ['board', 'detect'] },
  { id: 'detector', key: 'replay.node.detector', y: 80, on: ['detect', 'classify'] },
  { id: 'news', key: 'replay.node.news', y: 150, on: ['news'] },
  { id: 'ai', key: 'replay.node.ai', y: 220, on: ['retry', 'analyze'] },
  { id: 'out', key: 'replay.node.out', y: 290, on: ['notify'] },
];

const fmt = (r: number) => `${r > 0 ? '+' : r < 0 ? '−' : ''}${Math.abs(r).toFixed(1)}%`;
const level = (r: number) => {
  const a = Math.abs(r);
  const n = a < 0.05 ? 0 : a < 0.15 ? 1 : a < 0.4 ? 2 : 3;
  return n === 0 ? 'lv-0' : `lv-${r > 0 ? 'p' : 'm'}${n}`;
};
const clock = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
const fill = (text: string, values: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ''));

function pointOn(path: Point[], f: number): Point {
  const segs = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i]![0], p[1] - path[i]![1]));
  let d = Math.min(1, Math.max(0, f)) * segs.reduce((s, x) => s + x, 0);
  for (let i = 0; i < segs.length; i++) {
    if (d <= segs[i]! || i === segs.length - 1) {
      const k = segs[i]! === 0 ? 0 : Math.min(1, d / segs[i]!);
      const a = path[i]!;
      const b = path[i + 1]!;
      return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
    }
    d -= segs[i]!;
  }
  return path[path.length - 1]!;
}

function story(locale: Locale, p: Player): { title: string; body: ReactNode } {
  const s = p.scene;
  const h = p.headline;
  const marketName = t(locale, s.market === 'us' ? 'replay.market.us' : 'replay.market.kr');
  const nameOf = (ins: Instrument | undefined) => (ins ? ins.label[locale] : '');
  if (p.phase === 'board' || !h) {
    return { title: fill(t(locale, 'replay.board'), { market: marketName }), body: null };
  }
  const hi = instrument(h.symbol);
  const search = newsSearch(h.symbol);
  if (p.phase === 'detect') {
    const more = p.anomalies.length > 1 ? fill(t(locale, 'replay.detectMore'), { n: p.anomalies.length }) : null;
    return {
      title: fill(t(locale, 'replay.detect'), { name: nameOf(hi), ret: fmt(h.returnPct), z: h.zscore.toFixed(1) }),
      body: more && <ul className="sr-body is-text"><li>{more}</li></ul>,
    };
  }
  if (p.phase === 'classify') {
    const etfs = INSTRUMENTS.filter((i) => i.etf && i.market === h.market && i.sector === h.sector);
    const movedEtfs = p.anomalies.filter((a) => a.etf && a.sector === h.sector && a.direction === h.direction);
    const reasons: string[] = [];
    if (h.eventType === 'MARKET') {
      const names = h.movingEtfSectors.map((id) => sector(id)?.name[locale] ?? id).join(', ');
      reasons.push(fill(t(locale, 'replay.reason.market'), { n: h.movingEtfSectors.length, sectors: names }));
    } else if (h.eventType === 'SECTOR') {
      if (movedEtfs.length > 0) {
        reasons.push(fill(t(locale, 'replay.reason.etfMoved'), { etfs: movedEtfs.map((a) => `${nameOf(instrument(a.symbol))} ${fmt(a.returnPct)}`).join(' · ') }));
      }
      const stockPeers = h.peers.filter((sym) => !instrument(sym)?.etf);
      if (stockPeers.length > 0) reasons.push(fill(t(locale, 'replay.reason.peers'), { n: stockPeers.length }));
    } else {
      reasons.push(fill(t(locale, 'replay.reason.etfQuiet'), { etfs: etfs.map((i) => nameOf(i)).join(' · ') }));
      reasons.push(t(locale, 'replay.reason.noPeers'));
    }
    return { title: t(locale, TYPE_KEY[h.eventType]), body: <ul className="sr-body">{reasons.map((r) => <li key={r}>{r}</li>)}</ul> };
  }
  if (p.phase === 'news') {
    return {
      title: fill(t(locale, 'replay.news'), { en: search.en.join(' · '), kr: search.kr.join(' · ') }),
      body: <ul className="sr-body">{s.news[locale].map((n) => <li key={n}>{n}</li>)}</ul>,
    };
  }
  if (p.phase === 'retry') return { title: t(locale, 'replay.retry'), body: null };
  if (p.phase === 'analyze') return { title: t(locale, 'replay.analyze'), body: <p className="sr-body is-text">{s.analysis[locale]}</p> };
  return {
    title: t(locale, 'replay.notify'),
    body: (
      <div className="sr-slack">
        <b>[{t(locale, TYPE_KEY[h.eventType])}] {nameOf(hi)} {fmt(h.returnPct)}</b>
        {s.analysis[locale]}
      </div>
    ),
  };
}

export default function SpReplay({ locale }: Props) {
  const playerRef = useRef<Player | null>(null);
  if (!playerRef.current) playerRef.current = createPlayer();
  const player = playerRef.current;
  const figRef = useRef<HTMLElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);
  const [, setVersion] = useState(0);

  useEffect(() => {
    const fig = figRef.current;
    if (!fig) return;
    if (window.matchMedia(REDUCED_QUERY).matches) {
      pausedRef.current = true;
      setPaused(true);
    }
    let visible = true;
    const io = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? true;
    });
    io.observe(fig);
    let raf = 0;
    let last = performance.now();
    let seen = player.version;
    const frame = (now: number) => {
      raf = window.requestAnimationFrame(frame);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!visible || document.hidden) return;
      if (!pausedRef.current) player.tick(dt);
      if (player.version !== seen) {
        seen = player.version;
        setVersion(seen);
      }
      const dot = dotRef.current;
      // 429 재시도 장면에서는 메시지가 이미 AI 분석에 와 있으니 분석 단계에서 다시 흐르지 않는다.
      const path = player.phase === 'analyze' && player.scene.retry ? undefined : PATHS[player.phase];
      if (dot) {
        if (path) {
          const [x, y] = pointOn(path, player.phaseElapsed / TRAVEL_S);
          dot.setAttribute('cx', x.toFixed(1));
          dot.setAttribute('cy', y.toFixed(1));
          dot.setAttribute('r', '5');
        } else {
          dot.setAttribute('r', '0');
        }
      }
    };
    raf = window.requestAnimationFrame(frame);
    setReady(true);
    return () => {
      window.cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [player]);

  const togglePause = () => {
    const next = !pausedRef.current;
    pausedRef.current = next;
    setPaused(next);
  };

  const phase = player.phase;
  const active: Market = player.scene.market;
  const hits = new Set(player.anomalies.map((a) => a.symbol));
  const h = player.headline;
  const reasons = new Set<string>();
  if (h && phase !== 'board' && phase !== 'detect') {
    for (const a of player.anomalies) {
      if (a.symbol !== h.symbol && a.direction === h.direction && (h.eventType === 'MARKET' || a.sector === h.sector)) reasons.add(a.symbol);
    }
    if (h.eventType === 'INDIVIDUAL') {
      for (const i of INSTRUMENTS) if (i.etf && i.market === h.market && i.sector === h.sector) reasons.add(i.symbol);
    }
  }
  const cell = (ins: Instrument) => {
    const r = player.market.latest(ins.symbol);
    const cls = ['sr-cell', level(r)];
    if (ins.etf) cls.push('is-etf');
    if (phase !== 'board' && hits.has(ins.symbol)) cls.push('is-hit');
    if (phase !== 'board' && h?.symbol === ins.symbol) cls.push('is-headline');
    if (reasons.has(ins.symbol)) cls.push('is-reason');
    return (
      <span key={ins.symbol} className={cls.join(' ')} title={`${ins.name[locale]} ${fmt(r)}`}>
        {ins.label[locale]}
      </span>
    );
  };
  const { title, body } = story(locale, player);
  const stepIndex = phase === 'retry' ? STEP_PHASES.indexOf('analyze') : (STEP_PHASES as readonly string[]).indexOf(phase);
  const topic = active === 'us' ? 'stock.raw.us' : 'stock.raw.kr';
  const edgeOn = (p: Phase) => phase === p;
  const arriving = edgeOn('retry') || (edgeOn('analyze') && !player.scene.retry);

  return (
    <figure ref={figRef} className={`spreplay is-${locale}`} data-phase={phase} data-scene={player.scene.id} data-ready={ready ? 'true' : 'false'}>
      <div className="sr-board" role="img" aria-label={t(locale, 'replay.boardLabel')}>
        <div className="sr-head">
          {(['us', 'kr'] as const).map((m) => (
            <span key={m} className={`sr-mkt${m === active ? '' : ' is-closed'}`}>
              {t(locale, m === 'us' ? 'replay.market.us' : 'replay.market.kr')}{' '}
              <b>{m === active ? clock(player.minute) : t(locale, 'replay.closed')}</b>
            </span>
          ))}
          <span className="sr-legend">
            <span><i className="sr-swatch is-up" />{t(locale, 'replay.up')}</span>
            <span><i className="sr-swatch is-down" />{t(locale, 'replay.down')}</span>
          </span>
        </div>
        <div className="sr-grid">
          {SECTORS.map((sec) => (
            <div key={sec.id} className="sr-row">
              <span className="sr-sector">{sec.name[locale]}</span>
              {(['us', 'kr'] as const).map((m) => (
                <span key={m} className={`sr-group is-${m}${m === active ? '' : ' is-closed'}`}>
                  {INSTRUMENTS.filter((i) => i.sector === sec.id && i.market === m).map(cell)}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="sr-lower">
        <svg className="sr-pipe" viewBox="0 0 300 330" aria-hidden="true">
          <path className={`eg${edgeOn('detect') ? ' on' : ''}`} d="M80,40 L80,80" />
          <path className={`eg${edgeOn('news') ? ' on' : ''}`} d="M80,110 L80,150" />
          <path className={`eg${arriving ? ' on' : ''}`} d="M80,180 L80,220" />
          <path className={`eg${edgeOn('notify') ? ' on' : ''}`} d="M80,250 L80,290" />
          {/* 서킷브레이커가 열렸을 때만 AI 분석이 메시지를 DLQ로 보낸다. 자동으로 돌아오는 길은 없다. */}
          <path className="eg" d="M140,235 L244,235 L244,215" />
          <text className={`tp${edgeOn('detect') ? ' on' : ''}`} x="92" y="64">{topic}</text>
          <text className={`tp${edgeOn('news') ? ' on' : ''}`} x="92" y="134">anomaly.detected</text>
          <text className={`tp${arriving ? ' on' : ''}`} x="92" y="204">news.fetched</text>
          <text className={`tp${edgeOn('notify') ? ' on' : ''}`} x="92" y="274">analysis.completed</text>
          <g className="dlq">
            <rect x="190" y="185" width="108" height="30" rx="6" />
            <text className="tp" x="196" y="204">news.fetched.dlq</text>
          </g>
          {NODES.map((n) => (
            <g key={n.id} className={`nd${n.on.includes(phase) ? ' on' : ''}`}>
              <rect x="20" y={n.y} width="120" height="30" rx="8" />
              <text x="30" y={n.y + 19}>{t(locale, n.key)}</text>
            </g>
          ))}
          <circle ref={dotRef} className="msg" cx="80" cy="40" r="0" />
        </svg>
        <div className="sr-story">
          <ol className="sr-steps" aria-hidden="true">
            {STEP_PHASES.map((p, i) => (
              <li key={p} className={stepIndex >= i ? 'on' : undefined} />
            ))}
          </ol>
          <p className="sr-title">{title}</p>
          {body}
          <p className="sr-meta">
            <span>{fill(t(locale, 'replay.rule'), { pct: RULES.pct[active].toFixed(1), z: RULES.z.toFixed(1) })}</span>
            <span>
              {t(locale, 'replay.detections')} <b>{player.detections}</b>
            </span>
          </p>
          <button type="button" className="sr-toggle" disabled={!ready} onClick={togglePause}>
            {paused ? t(locale, 'sim.play') : t(locale, 'sim.pause')}
          </button>
        </div>
      </div>
      <figcaption className="sr-note">{t(locale, 'replay.note')}</figcaption>
    </figure>
  );
}
