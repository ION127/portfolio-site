import { useEffect, useRef, useState } from 'react';
import type { Locale } from '../i18n';
import type { MiniSceneId } from '../diagrams/ids';
import { MINI_H, MINI_NODE_H, MINI_NODE_W, MINI_SCENES, MINI_W } from '../diagrams/mini';
import { parsePath, pointAt, polylineLength } from '../lib/diagram/routes';
import './miniflow.css';

interface Props {
  scenes: MiniSceneId[];
  locale: Locale;
  mode: 'auto' | 'loop' | 'static';
  caption?: string;
}

const ROTATE_MS = 6000;
const SVG_NS = 'http://www.w3.org/2000/svg';

export default function MiniFlow({ scenes, locale, mode, caption }: Props) {
  const specs = scenes.map((id) => MINI_SCENES[id]);
  const [current, setCurrent] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(true);
  const rootRef = useRef<HTMLElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const read = () => setReduced(mq.matches);
    read();
    mq.addEventListener('change', read);
    return () => mq.removeEventListener('change', read);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => setVisible(entries[0]?.isIntersecting ?? true));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // auto: 6초마다 다음 장면으로. 모션 줄이기면 첫 장면에 머문다.
  useEffect(() => {
    if (mode !== 'auto' || specs.length < 2 || reduced) return;
    const timer = window.setInterval(() => setCurrent((c) => (c + 1) % specs.length), ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [mode, specs.length, reduced]);

  // 보이는 장면의 경로를 따라 점 3개가 흐른다. 화면 밖이거나 모션 줄이기면 멈춘다.
  useEffect(() => {
    if (mode === 'static' || reduced || !visible) return;
    const layer = svgRef.current?.querySelector<SVGGElement>(`[data-scene="${current}"] .mf-pk`);
    if (!layer) return;
    const flows = specs[current].routes.map((d, index) => {
      const pts = parsePath(d);
      const dots = [0, 1, 2].map(() => {
        const c = document.createElementNS(SVG_NS, 'circle');
        c.setAttribute('r', '4');
        c.setAttribute('class', 'mf-dot');
        layer.appendChild(c);
        return c;
      });
      return { pts, len: polylineLength(pts), dur: 3600 + index * 400, dots };
    });
    const t0 = performance.now();
    const draw = (now: number) => {
      for (const f of flows) {
        f.dots.forEach((c, i) => {
          const u = ((((now - t0) / f.dur + i / 3) % 1) + 1) % 1;
          const p = pointAt(f.pts, u * f.len);
          c.setAttribute('cx', p.x.toFixed(1));
          c.setAttribute('cy', p.y.toFixed(1));
        });
      }
    };
    draw(t0);
    let raf = window.requestAnimationFrame(function loop(now) {
      draw(now);
      raf = window.requestAnimationFrame(loop);
    });
    return () => {
      window.cancelAnimationFrame(raf);
      layer.replaceChildren();
    };
    // specs는 props(scenes)에서 매번 새로 만들어지므로 의존성에 넣지 않는다. 장면은 current로 바뀐다.
  }, [current, mode, reduced, visible]);

  return (
    <figure ref={rootRef} className={`miniflow mode-${mode}`}>
      {mode === 'auto' && (
        <figcaption className="mf-head">
          <b>{specs[current].title[locale]}</b>
          <span className="mf-dots" aria-hidden="true">
            {specs.map((s, i) => (
              <i key={s.id} className={i === current ? 'on' : undefined} />
            ))}
          </span>
        </figcaption>
      )}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${MINI_W} ${MINI_H}`}
        role="img"
        aria-label={specs.map((s) => s.title[locale]).join(' / ')}
      >
        {specs.map((s, si) => (
          <g key={s.id} data-scene={si} className={si === current ? 'mf-scene on' : 'mf-scene'}>
            {s.edges.map((d) => (
              <path key={d} d={d} className="mf-e" />
            ))}
            {s.dashed.map((d) => (
              <path key={d} d={d} className="mf-e mf-dashed" />
            ))}
            {s.label && (
              <text x={s.label.x} y={s.label.y} className="mf-l">
                {s.label.text[locale]}
              </text>
            )}
            <g className="mf-pk" />
            {s.nodes.map((n) => (
              <g key={`${n.x},${n.y}`}>
                <rect x={n.x} y={n.y} width={MINI_NODE_W} height={MINI_NODE_H} rx={8} className="mf-b" />
                <text x={n.x + 9} y={n.y + 17} className="mf-t">
                  {n.title[locale]}
                </text>
                <text x={n.x + 9} y={n.y + 31} className="mf-s">
                  {n.sub[locale]}
                </text>
              </g>
            ))}
          </g>
        ))}
      </svg>
      {caption && <p className="mf-cap">{caption}</p>}
    </figure>
  );
}
