import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import './barosim.css';
import { t, type Locale, type UiKey } from '../i18n';
import { boundsOf } from '../lib/baro-sim/demand';
import { createDirector, SPOTLIGHT_PHASES, type Director, type Phase } from '../lib/baro-sim/director';
import { createSim, DEFAULTS, type CountKey, type Sim } from '../lib/baro-sim/engine';
import { formatDistance } from '../lib/baro-sim/format';
import { haversineMeters, metersToLngDeg, type LatLng } from '../lib/baro-sim/geo';

interface Props {
  locale: Locale;
  /** 정하면 매번 같은 장면이 나온다. 비우면 방문할 때마다 달라진다. */
  seed?: number;
}

interface PanelState {
  counts: Record<CountKey, number>;
  scale: number;
  dispatched: number;
  phase: Phase;
  stepIndex: number;
  text: string;
}

type Leaflet = typeof import('leaflet');

const WARMUP_S = 600;
const PANEL_REFRESH_MS = 250;
const HOVER_RADIUS_PX = 6;
const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const LEAFLET_ATTRIBUTION = '<a href="https://leafletjs.com">Leaflet</a>';
const COUNT_KEYS: CountKey[] = ['idle', 'pickup', 'trip', 'relocating'];
const STATE_LABEL: Record<CountKey, UiKey> = {
  idle: 'sim.state.idle',
  pickup: 'sim.state.pickup',
  trip: 'sim.state.trip',
  relocating: 'sim.state.relocating',
};

function narration(locale: Locale, director: Director, sim: Sim): string {
  const s = director.spotlight;
  if (s?.failed) return t(locale, 'sim.step.failed');
  switch (director.phase) {
    case 'overview':
      return t(locale, 'sim.step.overview');
    case 'call':
      return s?.area ? t(locale, 'sim.step.call').replace('{area}', s.area.name[locale]) : t(locale, 'sim.step.callCity');
    case 'search':
      return t(locale, 'sim.step.search');
    case 'reserve':
      return t(locale, 'sim.step.reserve').replace('{distance}', formatDistance(s?.distanceM ?? 0, locale));
    case 'ack': {
      if (s?.ackFailed && !s.waitingSilent) return t(locale, 'sim.step.ackFailed');
      const call = s ? sim.calls.get(s.callId) : undefined;
      if (s?.waitingSilent && call?.reservedAt != null) {
        const left = Math.max(0, Math.ceil(DEFAULTS.ackTimeoutS - (sim.time - call.reservedAt)));
        return `${t(locale, 'sim.step.ackWait')} · ${t(locale, 'sim.seconds').replace('{n}', String(left))}`;
      }
      return t(locale, 'sim.step.ackWait');
    }
    case 'pickup':
      return t(locale, 'sim.step.pickup');
    case 'trip':
      return t(locale, 'sim.step.trip');
    case 'relocate':
      return t(locale, 'sim.step.relocate');
  }
}

export default function BaroSim({ locale, seed }: Props) {
  const figRef = useRef<HTMLElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(false);
  const snapshotRef = useRef<(() => PanelState) | null>(null);
  const cameraRef = useRef<{ stop(): void; resume(): void } | null>(null);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const [panel, setPanel] = useState<PanelState | null>(null);
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};

    void (async () => {
      // Leaflet 1.9는 UMD 빌드라 번들러에 따라 default로 감싸져 온다.
      const mod = await import('leaflet');
      const L = ((mod as unknown as { default?: Leaflet }).default ?? mod) as Leaflet;
      const fig = figRef.current;
      const mapEl = mapRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (cancelled || !fig || !mapEl || !canvas || !ctx) return;

      const sim = createSim({ seed: seed ?? Math.floor(Math.random() * 2 ** 31) });
      sim.step(WARMUP_S);
      const director = createDirector(sim);
      const reduced = window.matchMedia(REDUCED_QUERY).matches;
      if (reduced) {
        pausedRef.current = true;
        setPaused(true);
      }

      // 방문자가 지도를 직접 움직이지 않는다. 카메라는 연출이 맡고, 페이지 스크롤도 지도에 걸리지 않는다.
      const map = L.map(mapEl, {
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        touchZoom: false,
        zoomSnap: 0.25,
      });
      map.attributionControl.setPrefix(LEAFLET_ATTRIBUTION);
      // 카메라가 날아가는 동안에는 타일을 받지 않고, 멈춘 뒤 보이는 범위만 한 번 받는다(OSM 타일 정책, 중간 취소 방지).
      L.tileLayer(TILE_URL, { maxZoom: 19, attribution: OSM_ATTRIBUTION, updateWhenIdle: true, updateWhenZooming: false }).addTo(map);
      const b = boundsOf(sim.stands);
      const seoul = L.latLngBounds([b.south, b.west], [b.north, b.east]);
      map.fitBounds(seoul, { padding: [12, 12], animate: false });

      // 카메라가 움직이면 차량 화면 좌표가 바뀌니 다시 그린다.
      map.on('move zoom', () => {
        dirty = true;
      });
      const ll = (p: LatLng) => L.latLng(p.lat, p.lng);
      const pt = (p: LatLng) => map.latLngToContainerPoint([p.lat, p.lng]);
      const projected = new Float32Array(sim.vehicles.length * 2);

      // 바뀐 것이 있을 때만 다시 그린다(멈춤 · 설명 중에 매 프레임 그리지 않게).
      let dirty = true;
      let dpr = 1;
      let width = 0;
      let height = 0;
      const resize = () => {
        const r = mapEl.getBoundingClientRect();
        dpr = window.devicePixelRatio || 1;
        width = r.width;
        height = r.height;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        map.invalidateSize({ animate: false });
        dirty = true;
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(mapEl);

      const readColors = () => {
        const cs = getComputedStyle(fig);
        const v = (name: string) => cs.getPropertyValue(name).trim();
        return { idle: v('--muted'), pickup: v('--accent'), trip: v('--sim-trip'), relocating: v('--sim-relocate'), text: v('--text') };
      };
      let colors = readColors();
      const themeObserver = new MutationObserver(() => {
        colors = readColors();
        dirty = true;
      });
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

      const ring = (x: number, y: number, r: number) => {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
      };
      const line = (a: { x: number; y: number }, z: { x: number; y: number }, color: string, dash: number[] = []) => {
        ctx.strokeStyle = color;
        ctx.setLineDash(dash);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(z.x, z.y);
        ctx.stroke();
        ctx.setLineDash([]);
      };

      const drawSpotlight = (r: number) => {
        const s = director.spotlight;
        if (!s) return;
        const phase = director.phase;
        const o = pt(s.origin);
        ctx.lineWidth = 2;
        if (phase === 'search' || phase === 'reserve' || phase === 'ack') {
          // 최대 반경(15km) 안에서 가까운 후보 10대가 들어오는 범위를 원으로 보여 준다.
          const reach = Math.min(
            DEFAULTS.searchRadiusM,
            Math.max(0, ...s.candidateIds.map((id) => {
              const c = sim.vehicleById(id);
              return c ? haversineMeters(s.origin, c.pos) : 0;
            })),
          );
          const edge = pt({ lat: s.origin.lat, lng: s.origin.lng + metersToLngDeg(s.origin.lat, reach) });
          const radius = Math.hypot(edge.x - o.x, edge.y - o.y) + r + 3;
          ctx.strokeStyle = colors.pickup;
          ctx.fillStyle = colors.pickup;
          ctx.globalAlpha = 0.07;
          ctx.beginPath();
          ctx.arc(o.x, o.y, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 0.7;
          ctx.setLineDash([6, 5]);
          ring(o.x, o.y, radius);
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;
        }
        if (phase === 'search') {
          ctx.strokeStyle = colors.pickup;
          for (const id of s.candidateIds) {
            const v = sim.vehicleById(id);
            if (v) {
              const p = pt(v.pos);
              ring(p.x, p.y, r + 3);
            }
          }
        }
        const v = s.vehicleId !== null ? sim.vehicleById(s.vehicleId) : undefined;
        if (v) {
          const p = pt(v.pos);
          if (phase === 'reserve' || phase === 'ack' || phase === 'pickup') line(p, o, colors.pickup);
          if (phase === 'trip') {
            const d = pt(s.destination);
            line(p, d, colors.trip);
            ctx.fillStyle = colors.trip;
            ctx.beginPath();
            ctx.moveTo(d.x, d.y - 7);
            ctx.lineTo(d.x + 7, d.y);
            ctx.lineTo(d.x, d.y + 7);
            ctx.lineTo(d.x - 7, d.y);
            ctx.closePath();
            ctx.fill();
          }
          if (phase === 'relocate' && s.standIndex !== null) {
            const st = pt(sim.stands[s.standIndex]!);
            line(p, st, colors.relocating, [5, 4]);
            ctx.fillStyle = colors.relocating;
            ctx.fillRect(st.x - 5, st.y - 5, 10, 10);
          }
          ctx.strokeStyle = colors.text;
          ring(p.x, p.y, r + 4);
        }
        if (phase !== 'trip' && phase !== 'relocate') {
          ctx.strokeStyle = colors.pickup;
          ctx.lineWidth = 2.5;
          ring(o.x, o.y, 9);
          ctx.fillStyle = colors.pickup;
          ctx.beginPath();
          ctx.arc(o.x, o.y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      };

      const draw = () => {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);
        const zoom = map.getZoom();
        const r = zoom >= 13 ? 2.6 : zoom >= 12 ? 2.1 : 1.6;
        sim.vehicles.forEach((v, i) => {
          const p = pt(v.pos);
          projected[i * 2] = p.x;
          projected[i * 2 + 1] = p.y;
        });
        ctx.lineWidth = 1;
        ctx.strokeStyle = colors.pickup;
        ctx.globalAlpha = 0.4;
        for (const call of sim.calls.values()) {
          if (call.manual || (call.status !== 'reserved' && call.status !== 'pickup')) continue;
          const p = pt(call.origin);
          ring(p.x, p.y, r + 3);
        }
        ctx.globalAlpha = 1;
        for (const key of COUNT_KEYS) {
          ctx.fillStyle = colors[key];
          ctx.beginPath();
          sim.vehicles.forEach((v, i) => {
            if ((v.state === 'reserved' ? 'pickup' : v.state) !== key) return;
            const x = projected[i * 2]!;
            const y = projected[i * 2 + 1]!;
            ctx.moveTo(x + r, y);
            ctx.arc(x, y, r, 0, Math.PI * 2);
          });
          ctx.fill();
        }
        drawSpotlight(r);
      };

      let lastPhase: Phase | null = null;
      const moveCamera = () => {
        const phase = director.phase;
        if (phase === lastPhase) return;
        lastPhase = phase;
        const s = director.spotlight;
        const animate = !reduced;
        const fit = { animate, duration: 1.2, padding: [60, 60] as [number, number], maxZoom: 14 };
        if (phase === 'overview') map.flyToBounds(seoul, { animate, duration: 1.2, padding: [12, 12] });
        else if (phase === 'call' && s) map.flyTo(ll(s.origin), 12, { animate, duration: 1.2 });
        else if (phase === 'pickup' && s && s.vehicleId !== null) {
          const v = sim.vehicleById(s.vehicleId);
          if (v) map.flyToBounds(L.latLngBounds([ll(v.pos), ll(s.origin)]), fit);
        } else if (phase === 'trip' && s) map.flyToBounds(L.latLngBounds([ll(s.origin), ll(s.destination)]), fit);
        else if (phase === 'relocate' && s && s.standIndex !== null) {
          map.flyToBounds(L.latLngBounds([ll(s.destination), ll(sim.stands[s.standIndex]!)]), fit);
        }
      };

      const snapshot = (): PanelState => ({
        counts: sim.counts(),
        scale: director.timeScale,
        dispatched: sim.dispatchedCount,
        phase: director.phase,
        stepIndex: (SPOTLIGHT_PHASES as readonly Phase[]).indexOf(director.phase),
        text: narration(locale, director, sim),
      });

      let visible = true;
      const io = new IntersectionObserver((entries) => {
        visible = entries[0]?.isIntersecting ?? true;
      });
      io.observe(fig);

      let raf = 0;
      let last = performance.now();
      let panelAt = 0;
      let panelPhase: Phase | null = null;
      const frame = (now: number) => {
        raf = window.requestAnimationFrame(frame);
        const wallDt = Math.min(0.1, (now - last) / 1000);
        last = now;
        // 화면 밖이거나 탭이 가려져 있으면 계산도 그리기도 하지 않는다.
        if (!visible || document.hidden) return;
        if (!pausedRef.current) {
          const simTime = sim.time;
          const phase = director.phase;
          director.tick(wallDt);
          if (sim.time !== simTime || director.phase !== phase) dirty = true;
        }
        moveCamera();
        if (dirty) {
          dirty = false;
          draw();
        }
        if (now - panelAt > PANEL_REFRESH_MS || director.phase !== panelPhase) {
          panelAt = now;
          panelPhase = director.phase;
          setPanel(snapshot());
        }
      };
      raf = window.requestAnimationFrame(frame);

      const onMove = (ev: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        const x = ev.clientX - rect.left;
        const y = ev.clientY - rect.top;
        let best = -1;
        let bestD = HOVER_RADIUS_PX * HOVER_RADIUS_PX;
        for (let i = 0; i < sim.vehicles.length; i++) {
          const dx = projected[i * 2]! - x;
          const dy = projected[i * 2 + 1]! - y;
          const d = dx * dx + dy * dy;
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        }
        const v = sim.vehicles[best];
        if (!v) {
          setTip(null);
          return;
        }
        const state = v.state === 'reserved' ? 'pickup' : v.state;
        setTip({ x, y, text: `${t(locale, 'sim.car')} ${v.id} · ${v.plate} · ${t(locale, STATE_LABEL[state])}` });
      };
      const onLeave = () => setTip(null);
      canvas.addEventListener('mousemove', onMove);
      canvas.addEventListener('mouseleave', onLeave);

      snapshotRef.current = snapshot;
      // 일시정지하면 날아가던 카메라도 그 자리에서 멈추고, 다시 재생하면 지금 단계의 장면으로 이어서 간다.
      cameraRef.current = {
        stop: () => map.stop(),
        resume: () => {
          lastPhase = null;
        },
      };
      setPanel(snapshot());
      setReady(true);
      cleanup = () => {
        window.cancelAnimationFrame(raf);
        io.disconnect();
        ro.disconnect();
        themeObserver.disconnect();
        canvas.removeEventListener('mousemove', onMove);
        canvas.removeEventListener('mouseleave', onLeave);
        cameraRef.current = null;
        map.remove();
      };
    })().catch(() => {
      // 지도 라이브러리를 불러오지 못하면 안내 문구와 설명만 남긴다.
    });

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [locale, seed]);

  // 누르는 순간 계산을 멈추고 그때의 숫자를 패널에 함께 반영해, 멈춘 뒤에 숫자가 바뀌지 않게 한다.
  const togglePause = () => {
    const next = !pausedRef.current;
    pausedRef.current = next;
    if (next && snapshotRef.current) setPanel(snapshotRef.current());
    if (next) cameraRef.current?.stop();
    else cameraRef.current?.resume();
    setPaused(next);
  };

  const speed = panel ? (panel.scale === 0 ? t(locale, 'sim.explaining') : `×${panel.scale}`) : '—';
  return (
    <figure ref={figRef} className="barosim" data-phase={panel?.phase ?? 'loading'} data-ready={ready ? 'true' : 'false'}>
      <div className="bs-stage">
        <div ref={mapRef} className="bs-map" />
        {/* 지도 영역에는 출처 링크가 들어가므로 그림 역할(role=img)은 차량을 그리는 캔버스에 둔다. */}
        <canvas ref={canvasRef} className="bs-canvas" role="img" aria-label={t(locale, 'sim.mapLabel')} />
        {tip && (
          <div className="bs-tip" style={{ left: tip.x, top: tip.y }}>
            {tip.text}
          </div>
        )}
      </div>
      <div className="bs-panel">
        <ul className="bs-counts">
          {COUNT_KEYS.map((key) => (
            <li key={key} className={`bs-count is-${key}`}>
              <i aria-hidden="true" />
              <span>{t(locale, STATE_LABEL[key])}</span>
              <b>{panel ? panel.counts[key].toLocaleString('en-US') : '—'}</b>
            </li>
          ))}
        </ul>
        <p className="bs-meta">
          <span>
            {t(locale, 'sim.speed')} <b>{speed}</b>
          </span>
          <span>
            {t(locale, 'sim.dispatched')} <b>{panel ? panel.dispatched.toLocaleString('en-US') : '—'}</b>
          </span>
        </p>
        <div className="bs-story">
          <ol className="bs-steps" aria-hidden="true">
            {SPOTLIGHT_PHASES.map((p, i) => (
              <li key={p} className={panel && panel.stepIndex >= i ? 'on' : undefined} />
            ))}
          </ol>
          <p className="bs-text">{panel ? panel.text : t(locale, 'demo.baro')}</p>
        </div>
        <button type="button" className="bs-toggle" disabled={!ready} onClick={togglePause}>
          {paused ? t(locale, 'sim.play') : t(locale, 'sim.pause')}
        </button>
      </div>
      <figcaption className="bs-note">{t(locale, 'sim.note')}</figcaption>
    </figure>
  );
}
