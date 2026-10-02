import type { I18n } from '../diagram/types';
import type { Market } from './universe';

export interface Scene {
  id: 'individual' | 'sector' | 'market';
  market: Market;
  /** 따라갈 종목 */
  headline: string;
  /** 장면 봉에 심을 1분 수익률(%). 분류는 이 값을 실제 규칙에 넣어 계산한다. */
  moves: Readonly<Record<string, number>>;
  /** 장면이 시작하는 장 시각(0시부터 분) */
  startMinute: number;
  news: { ko: readonly string[]; en: readonly string[] };
  analysis: I18n;
  /** AI 분석 호출이 Groq 429를 받아 안내된 시간만큼 기다렸다 다시 부르는 장면인지(원본 _call_groq) */
  retry: boolean;
}

export const SCENES: readonly Scene[] = [
  {
    id: 'individual',
    market: 'us',
    headline: 'NVDA',
    moves: { NVDA: 3.4 },
    startMinute: 10 * 60 + 28,
    news: {
      ko: ['데이터센터용 AI 칩 수요 전망이 높아졌다는 보도 (예시)', '대형 클라우드 업체의 GPU 추가 주문 소식 (예시)'],
      en: ['Report raises the outlook for data-center AI chips (example)', 'A hyperscaler reportedly adds GPU orders (example)'],
    },
    analysis: {
      ko: '반도체 ETF(SMH · SOXX)는 잠잠한데 NVDA만 3.4% 올랐습니다. 업종 전체가 아니라 수요 전망 보도에 따른 개별 종목의 움직임으로 보입니다. (예시)',
      en: 'NVDA rose 3.4% while the semiconductor ETFs (SMH, SOXX) stayed flat — a single-stock move on the demand report rather than a sector-wide one. (example)',
    },
    retry: false,
  },
  {
    id: 'sector',
    market: 'kr',
    headline: 'KR:005930',
    moves: { 'KR:005930': -4.3, 'KR:000660': -4.8, 'KR:091160': -2.6 },
    startMinute: 10 * 60 + 4,
    news: {
      ko: ['메모리 반도체 가격이 내릴 것이라는 전망 (예시)', '해외 반도체 업체의 실적 경고 (예시)'],
      en: ['Memory chip prices expected to fall (example)', 'An overseas chipmaker warns on earnings (example)'],
    },
    analysis: {
      ko: '삼성전자 −4.3%, SK하이닉스 −4.8%와 함께 KODEX 반도체도 −2.6% 내렸습니다. 섹터 ETF가 같이 움직여 업종 이벤트로 분류했고, 메모리 가격 전망이 업종 전반에 영향을 준 것으로 보입니다. (예시)',
      en: 'Samsung Electronics fell 4.3% and SK hynix 4.8%, with KODEX Semiconductor down 2.6% — the sector ETF moved too, so this is a sector event driven by the memory price outlook. (example)',
    },
    retry: true,
  },
  {
    id: 'market',
    market: 'us',
    headline: 'AAPL',
    moves: { XLK: -1.8, XLF: -1.6, SMH: -2.1, XLY: -1.6, AAPL: -3.2, JPM: -2.4 },
    startMinute: 14 * 60 + 2,
    news: {
      ko: ['미국 물가 지표가 예상을 웃돌았다는 발표 (예시)', '미국 국채 금리 급등 (예시)'],
      en: ['US inflation data beats expectations (example)', 'Treasury yields jump (example)'],
    },
    analysis: {
      ko: '기술(XLK), 금융(XLF), 반도체(SMH), 소비재(XLY) ETF가 한꺼번에 1.5% 넘게 내렸습니다. 섹터 ETF 네 개가 같은 방향이라 시장 전체 이벤트로 분류했고, 금리 상승 우려가 넓게 반영된 것으로 보입니다. (예시)',
      en: 'The technology (XLK), financials (XLF), semiconductor (SMH) and consumer (XLY) ETFs all fell more than 1.5% — four sector ETFs moving together make this a market-wide event on rate worries. (example)',
    },
    retry: false,
  },
];
