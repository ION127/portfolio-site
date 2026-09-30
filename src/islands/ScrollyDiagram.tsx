import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { FocusEvent, MouseEvent } from 'react';
import type { Locale } from '../i18n';
import { DIAGRAMS, type DiagramId } from '../diagrams';
import { NODE_H, NODE_W, type I18n, type Tip, type ViewBox } from '../lib/diagram/types';
import { fullView, lerpView } from '../lib/diagram/camera';
import { buildRoute, parseRef, pointOnRoute, routeDuration } from '../lib/diagram/routes';
import { activationLine, activeStepIndex } from '../lib/diagram/steps';
import { formatView, targetView } from '../lib/diagram/view';
import './scrolly.css';

interface Props {
  diagram: DiagramId;
  locale: Locale;
}

interface TipState {
  title: string;
  tip: Tip;
  x: number;
  y: number;
}

const STACKED_QUERY = '(max-width: 899px)';
const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';
const CAMERA_MS = 750;
const DOTS_PER_ROUTE = 3;
const SVG_NS = 'http://www.w3.org/2000/svg';

export default function ScrollyDiagram({ diagram, locale }: Props) {
  const spec = DIAGRAMS[diagram];
  if (!spec) throw new Error(`Unknown diagram "${diagram}"`);

  const [active, setActive] = useState(0);
  const [layout, setLayout] = useState({ stacked: false, reduced: false });
  const [visible, setVisible] = useState(true);
  const [tip, setTip] = useState<TipState | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const figRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const packetsRef = useRef<SVGGElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const barRef = useRef<HTMLElement>(null);
  const viewRef = useRef<ViewBox>(fullView(spec.width, spec.height));
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  const step = spec.steps[active];
  const edgesById = useMemo(() => new Map(spec.edges.map((e) => [e.id, e])), [spec]);
  const onEdges = useMemo(() => new Set(step.routes.flat().map((r) => parseRef(r).id)), [step]);
  const onNodes = useMemo(() => new Set(step.nodes), [step]);
  const T = (text: I18n) => text[locale];

  // CSP가 HTML의 style 속성을 막으므로 진행 막대 너비는 하이드레이션 뒤 스크립트로 정한다.
  useEffect(() => {
    if (barRef.current) barRef.current.style.width = `${((active + 1) / spec.steps.length) * 100}%`;
  }, [active, spec.steps.length]);

  // 배치(좌우/상하)와 모션 줄이기 설정을 읽고 바뀌면 따라간다.
  useEffect(() => {
    const stackedMq = window.matchMedia(STACKED_QUERY);
    const reducedMq = window.matchMedia(REDUCED_QUERY);
    const read = () => setLayout({ stacked: stackedMq.matches, reduced: reducedMq.matches });
    read();
    stackedMq.addEventListener('change', read);
    reducedMq.addEventListener('change', read);
    return () => {
      stackedMq.removeEventListener('change', read);
      reducedMq.removeEventListener('change', read);
    };
  }, []);

  // 스크롤 위치 → 현재 단계
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const fig = figRef.current?.getBoundingClientRect();
      const line = activationLine(window.innerHeight, layoutRef.current.stacked, fig ? fig.bottom : 0);
      const tops = cardRefs.current.map((el) => (el ? el.getBoundingClientRect().top : Number.POSITIVE_INFINITY));
      setActive(activeStepIndex(tops, line));
    };
    const schedule = () => {
      if (!raf) raf = window.requestAnimationFrame(measure);
    };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    measure();
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [layout.stacked]);

  // 다이어그램이 화면 밖이면 점 애니메이션을 멈춘다.
  useEffect(() => {
    const el = figRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => setVisible(entries[0]?.isIntersecting ?? true));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // 카메라: 지금 보이는 viewBox에서 목표까지 이동. 중간에 단계가 바뀌면 그 자리에서 새 목표로 간다.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const to = targetView(spec, step, layout.stacked);
    const apply = (v: ViewBox) => {
      viewRef.current = v;
      svg.setAttribute('viewBox', formatView(v));
    };
    if (layout.reduced) {
      apply(to);
      return;
    }
    const from = viewRef.current;
    const t0 = performance.now();
    let raf = window.requestAnimationFrame(function frame(now) {
      const t = Math.min(1, Math.max(0, (now - t0) / CAMERA_MS));
      apply(lerpView(from, to, t));
      if (t < 1) raf = window.requestAnimationFrame(frame);
    });
    return () => window.cancelAnimationFrame(raf);
  }, [spec, step, layout.stacked, layout.reduced]);

  // 흐르는 점: 경로마다 3개, 한 바퀴 max(1200, 길이 × 4.2)ms, 양 끝 6%에서 페이드.
  useEffect(() => {
    const layer = packetsRef.current;
    if (!layer) return;
    layer.replaceChildren();
    if (layout.reduced || !visible || step.routes.length === 0) return;
    const flows = step.routes.map((refs) => {
      const route = buildRoute(refs, edgesById);
      const dots = Array.from({ length: DOTS_PER_ROUTE }, () => {
        const c = document.createElementNS(SVG_NS, 'circle');
        c.setAttribute('r', '4.5');
        c.setAttribute('class', 'pk');
        layer.appendChild(c);
        return c;
      });
      return { route, dur: routeDuration(route), dots };
    });
    const t0 = performance.now();
    const draw = (now: number) => {
      for (const f of flows) {
        const elapsed = (((now - t0) % f.dur) + f.dur) % f.dur;
        const base = elapsed / f.dur;
        f.dots.forEach((c, i) => {
          const u = (base + i / DOTS_PER_ROUTE) % 1;
          const p = pointOnRoute(f.route, u);
          c.setAttribute('cx', p.x.toFixed(1));
          c.setAttribute('cy', p.y.toFixed(1));
          c.setAttribute('opacity', (u < 0.06 ? u / 0.06 : u > 0.94 ? (1 - u) / 0.06 : 1).toFixed(2));
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
  }, [step, edgesById, layout.reduced, visible]);

  // 툴팁은 Esc로 닫는다(WCAG 1.4.13). 마우스로 띄운 경우엔 포커스가 노드에 없으므로 window에서 듣는다.
  const tipOpen = tip !== null;
  useEffect(() => {
    if (!tipOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTip(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tipOpen]);

  const placeTip = (title: string, t: Tip, clientX: number, clientY: number) => {
    const box = innerRef.current?.getBoundingClientRect();
    if (!box) return;
    let x = clientX - box.left + 14;
    const y = clientY - box.top + 14;
    if (x > box.width - 290) x -= 304;
    setTip({ title, tip: t, x: Math.max(4, x), y });
  };

  // 노드 사양은 aria-describedby로 스크린 리더에 전달한다. 설명 요소는 svg 아래의 숨은 목록에 있다.
  const descId = (id: string) => `${spec.id}-desc-${id}`;

  const tipHandlers = (id: string, title: string, t: Tip | undefined) =>
    t
      ? {
          tabIndex: 0,
          'aria-describedby': descId(id),
          onMouseEnter: (e: MouseEvent<SVGGElement>) => placeTip(title, t, e.clientX, e.clientY),
          onMouseMove: (e: MouseEvent<SVGGElement>) => placeTip(title, t, e.clientX, e.clientY),
          onMouseLeave: () => setTip(null),
          onFocus: (e: FocusEvent<SVGGElement>) => {
            const r = e.currentTarget.getBoundingClientRect();
            placeTip(title, t, r.left + r.width / 2, r.bottom);
          },
          onBlur: () => setTip(null),
        }
      : {};

  return (
    <div className="scrolly" data-diagram={spec.id}>
      <div className="s-text">
        {spec.steps.map((s, i) => {
          const first = i === 0 || spec.steps[i - 1].chapter !== s.chapter;
          const last = i === spec.steps.length - 1 || spec.steps[i + 1].chapter !== s.chapter;
          return (
            <Fragment key={i}>
              {first && (
                <h3 className={`chap${step.chapter === s.chapter ? ' act' : ''}`}>
                  {s.chapter > 0 && <em>{s.chapter}</em>}
                  {T(spec.chapters[s.chapter])}
                </h3>
              )}
              <div
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                className={`scard${i === active ? ' act' : ''}${last ? ' chap-end' : ''}`}
                data-step={i}
              >
                <p dangerouslySetInnerHTML={{ __html: T(s.text) }} />
                {s.facts && s.facts.length > 0 && (
                  <div className="facts">
                    {s.facts.map((f) => (
                      <span key={f}>{f}</span>
                    ))}
                  </div>
                )}
              </div>
            </Fragment>
          );
        })}
      </div>

      <div className="s-fig" ref={figRef}>
        <div className="sfig-in" ref={innerRef}>
          <div className="scap">
            <span className="ch">
              {step.chapter > 0 && <em>{step.chapter}</em>}
              {T(spec.chapters[step.chapter])}
            </span>
            <span className="cnt">
              {active + 1} / {spec.steps.length}
            </span>
          </div>
          <div className="sbar" aria-hidden="true">
            <i ref={barRef} />
          </div>
          <svg
            ref={svgRef}
            className={`arch${step.nodes.length > 0 ? ' focus' : ''}`}
            viewBox={`0 0 ${spec.width} ${spec.height}`}
            role="group"
            aria-label={T(spec.title)}
          >
            {spec.zones.map((z) => (
              <g key={z.id}>
                <rect x={z.x} y={z.y} width={z.w} height={z.h} rx={14} className={`zone z-${z.tone}`} />
                <text x={z.x + 12} y={z.y + 19} className="zl">
                  {T(z.label)}
                </text>
                {z.note && (
                  <text x={z.x + z.w - 12} y={z.y + z.h - 10} className="zl2" textAnchor="end">
                    {z.note}
                  </text>
                )}
              </g>
            ))}
            {spec.tunnels.map((tn) => {
              const cx = tn.x + tn.w - 8;
              const cy = tn.y + tn.h / 2;
              return (
                <g
                  key={tn.id}
                  data-tunnel={tn.id}
                  className={`node${onNodes.has(tn.id) ? ' on' : ''}`}
                  role="img"
                  aria-label={tn.label}
                  {...tipHandlers(tn.id, tn.label, tn.tip)}
                >
                  <rect x={tn.x} y={tn.y} width={tn.w} height={tn.h} rx={tn.w / 2} className="tunnel" />
                  <text x={cx} y={cy} className="vpn-t" textAnchor="middle" transform={`rotate(90 ${cx} ${cy})`}>
                    {tn.label}
                  </text>
                </g>
              );
            })}
            <g>
              {spec.edges.map((e) => (
                <path
                  key={e.id}
                  d={e.d}
                  data-edge={e.id}
                  className={`edge${e.lane ? ' lane' : ''}${onEdges.has(e.id) ? ' on' : ''}`}
                />
              ))}
            </g>
            {spec.nodes.map((n) => {
              const w = n.w ?? NODE_W;
              const h = n.h ?? NODE_H;
              const name = T(n.title);
              return (
                <g
                  key={n.id}
                  data-node={n.id}
                  className={`node${n.external ? ' ext' : ''}${onNodes.has(n.id) ? ' on' : ''}`}
                  transform={`translate(${n.x},${n.y})`}
                  role="img"
                  aria-label={`${name} — ${T(n.sub)}`}
                  {...tipHandlers(n.id, name, n.tip)}
                >
                  <rect width={w} height={h} rx={8} className="box" />
                  <text x={11} y={20} className="t">
                    {name}
                  </text>
                  <text x={11} y={36} className="s">
                    {T(n.sub)}
                  </text>
                </g>
              );
            })}
            <g ref={packetsRef} />
          </svg>
          <div hidden>
            {[...spec.tunnels, ...spec.nodes].map((shape) =>
              shape.tip ? (
                <p key={shape.id} id={descId(shape.id)}>
                  {shape.tip.kind} — {T(shape.tip.desc)}
                </p>
              ) : null,
            )}
          </div>
          {tip && (
            <div className="sd-tip" role="tooltip" style={{ left: tip.x, top: tip.y }}>
              <b>{tip.title}</b>
              <span className="k">{tip.tip.kind}</span>
              <span>{T(tip.tip.desc)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
