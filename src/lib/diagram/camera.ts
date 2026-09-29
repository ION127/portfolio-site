import type { Rect, ViewBox } from './types';

export interface CameraOptions {
  width: number;
  height: number;
  /** 좌우 배치 0.7, 상하 배치 0.45 */
  minWidthRatio: number;
  pad?: { x: number; top: number; bottom: number };
}

export const CAMERA_PAD = { x: 40, top: 48, bottom: 36 } as const;
export const MIN_WIDTH_RATIO = { side: 0.7, stacked: 0.45 } as const;

export function fullView(width: number, height: number): ViewBox {
  return [0, 0, width, height];
}

/** 강조할 사각형들을 여백과 함께 감싸고, 캔버스 비율을 유지한 채 캔버스 안에 맞춘 viewBox. */
export function boxFor(rects: Rect[], opts: CameraOptions): ViewBox {
  const W = opts.width;
  const H = opts.height;
  if (rects.length === 0) return fullView(W, H);
  const pad = opts.pad ?? CAMERA_PAD;
  let x1 = Math.min(...rects.map((r) => r.x)) - pad.x;
  let y1 = Math.min(...rects.map((r) => r.y)) - pad.top;
  const x2 = Math.max(...rects.map((r) => r.x + r.w)) + pad.x;
  const y2 = Math.max(...rects.map((r) => r.y + r.h)) + pad.bottom;
  let w = x2 - x1;
  let h = y2 - y1;
  const minW = W * opts.minWidthRatio;
  if (w < minW) {
    x1 -= (minW - w) / 2;
    w = minW;
  }
  const aspect = W / H;
  if (w / h < aspect) {
    const nw = h * aspect;
    x1 -= (nw - w) / 2;
    w = nw;
  } else {
    const nh = w / aspect;
    y1 -= (nh - h) / 2;
    h = nh;
  }
  if (w >= W || h >= H) return fullView(W, H);
  x1 = Math.max(0, Math.min(x1, W - w));
  y1 = Math.max(0, Math.min(y1, H - h));
  return [x1, y1, w, h];
}

/** ease-in-out quad 보간. t는 0~1로 고정한다. */
export function lerpView(from: ViewBox, to: ViewBox, t: number): ViewBox {
  const c = Math.min(1, Math.max(0, t));
  const k = c < 0.5 ? 2 * c * c : 1 - Math.pow(-2 * c + 2, 2) / 2;
  return from.map((v, i) => v + (to[i] - v) * k) as ViewBox;
}
