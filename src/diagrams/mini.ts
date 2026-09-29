import { both, type I18n } from '../lib/diagram/types';
import type { MiniSceneId } from './ids';

export const MINI_W = 420;
export const MINI_H = 190;
export const MINI_NODE_W = 100;
export const MINI_NODE_H = 40;

export interface MiniNode {
  x: number;
  y: number;
  title: I18n;
  sub: I18n;
}

export interface MiniScene {
  id: MiniSceneId;
  title: I18n;
  nodes: MiniNode[];
  edges: string[];
  dashed: string[];
  label?: { x: number; y: number; text: I18n };
  /** 점이 흐르는 경로. 노드 아래 층에 그려서 서비스를 통과하듯 보인다. */
  routes: string[];
}

const node = (x: number, y: number, title: I18n, sub: I18n): MiniNode => ({ x, y, title, sub });

// 좌표는 확정 프로토타입을 따른다.
export const MINI_SCENES: Record<MiniSceneId, MiniScene> = {
  'baro-telemetry': {
    id: 'baro-telemetry',
    title: { ko: 'BARO · 차량 위치 흐름', en: 'BARO · vehicle position flow' },
    nodes: [
      node(10, 20, { ko: '차량 ×1500', en: 'Vehicles ×1500' }, { ko: 'asyncio 시뮬레이터', en: 'asyncio simulator' }),
      node(160, 20, both('Mosquitto'), both('MQTT · EC2')),
      node(310, 20, both('control'), { ko: '공유 구독', en: 'shared sub' }),
      node(310, 110, both('Kafka'), { ko: '4 파티션', en: '4 partitions' }),
      node(160, 110, both('dispatch'), { ko: 'GEO 배차', en: 'GEO dispatch' }),
      node(10, 110, both('TimescaleDB'), { ko: '온프렘 · 적재', en: 'on-prem store' }),
    ],
    edges: ['M110,40 L160,40', 'M260,40 L310,40', 'M360,60 L360,110', 'M310,130 L260,130'],
    dashed: ['M360,150 L360,176 L60,176 L60,150'],
    label: { x: 168, y: 172, text: both('Site-to-Site VPN') },
    routes: ['M60,40 L360,40 L360,130 L210,130', 'M360,130 L360,176 L60,176 L60,130'],
  },
  'stockpulse-anomaly': {
    id: 'stockpulse-anomaly',
    title: { ko: 'StockPulse · 이상 탐지 파이프라인', en: 'StockPulse · anomaly pipeline' },
    nodes: [
      node(10, 20, { ko: '시세 수집', en: 'Price feeds' }, both('yfinance · KIS WS')),
      node(160, 20, both('Kafka'), both('stock.raw.*')),
      node(310, 20, { ko: '이상 탐지', en: 'Detection' }, { ko: '% · Z · ETF 분류', en: '% · Z · ETF' }),
      node(310, 110, { ko: '뉴스 수집', en: 'News' }, both('NewsAPI · RSS')),
      node(160, 110, { ko: 'LLM 분석', en: 'LLM analysis' }, both('Groq · DLQ')),
      node(10, 110, { ko: '대시보드 · Slack', en: 'Dashboard' }, { ko: 'WebSocket', en: 'WebSocket · Slack' }),
    ],
    edges: ['M110,40 L160,40', 'M260,40 L310,40', 'M360,60 L360,110', 'M310,130 L260,130', 'M160,130 L110,130'],
    dashed: [],
    routes: ['M60,40 L360,40 L360,130 L60,130'],
  },
  'baro-cicd': {
    id: 'baro-cicd',
    title: { ko: 'BARO · 서버 배포 파이프라인', en: 'BARO · server deploy pipeline' },
    nodes: [
      node(10, 20, both('git push'), both('main')),
      node(160, 20, both('Actions'), { ko: 'GitHub · 경로 감지', en: 'GitHub · path filter' }),
      node(310, 20, { ko: '빌드 · 테스트', en: 'Build · test' }, both('JDK 21 · Gradle')),
      node(310, 110, both('ECR'), { ko: '서비스별 이미지', en: 'image per service' }),
      node(160, 110, { ko: 'ECS 배포', en: 'ECS deploy' }, { ko: 'CI 통과분만', en: 'passing CI only' }),
    ],
    edges: ['M110,40 L160,40', 'M260,40 L310,40', 'M360,60 L360,110', 'M310,130 L260,130'],
    dashed: [],
    routes: ['M60,40 L360,40 L360,130 L210,130'],
  },
  'stockpulse-gitops': {
    id: 'stockpulse-gitops',
    title: { ko: 'StockPulse · GitOps 배포', en: 'StockPulse · GitOps deploy' },
    nodes: [
      node(10, 20, both('git push'), both('main')),
      node(160, 20, both('Actions'), { ko: 'self-hosted · 변경분', en: 'self-hosted runner' }),
      node(310, 20, both('Harbor'), both('stock/<svc>:<sha>')),
      node(310, 110, { ko: '태그 커밋', en: 'Tag commit' }, both('[skip ci]')),
      node(160, 110, both('ArgoCD'), both('selfHeal · prune')),
      node(10, 110, { ko: '클러스터', en: 'Cluster' }, both('namespace stock')),
    ],
    edges: ['M110,40 L160,40', 'M260,40 L310,40', 'M360,60 L360,110', 'M310,130 L260,130', 'M160,130 L110,130'],
    dashed: [],
    routes: ['M60,40 L360,40 L360,130 L60,130'],
  },
};
