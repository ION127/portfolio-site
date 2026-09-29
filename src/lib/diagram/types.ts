import type { Locale } from '../../i18n';

export type I18n = Record<Locale, string>;

/** 같은 문구를 두 언어에 그대로 쓸 때. */
export const both = (text: string): I18n => ({ ko: text, en: text });

export const NODE_W = 130;
export const NODE_H = 46;

export interface Tip {
  kind: string;
  desc: I18n;
}

export interface Zone {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: I18n;
  tone: 'client' | 'cloud' | 'onprem';
  note?: string;
}

/** VPN 터널·Kafka 버스처럼 세로로 긴 통로. 단계의 nodes에서 id로 강조할 수 있다. */
export interface Tunnel {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  tip?: Tip;
}

export interface DNode {
  id: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  title: I18n;
  sub: I18n;
  tip?: Tip;
  external?: boolean;
}

/** d는 절대 좌표 M/L 명령만 쓴다. lane은 터널·버스 안쪽 경로로, 강조될 때만 보인다. */
export interface Edge {
  id: string;
  d: string;
  lane?: boolean;
}

/** edge id. 앞에 '-'를 붙이면 역방향. */
export type RouteRef = string;

export interface Step {
  chapter: number;
  nodes: string[];
  routes: RouteRef[][];
  text: I18n;
  facts?: string[];
  full?: boolean;
}

export interface DiagramSpec {
  id: string;
  width: number;
  height: number;
  title: I18n;
  zones: Zone[];
  tunnels: Tunnel[];
  nodes: DNode[];
  edges: Edge[];
  chapters: I18n[];
  steps: Step[];
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type ViewBox = [number, number, number, number];
