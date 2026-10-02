import type { I18n } from '../diagram/types';

export type Market = 'us' | 'kr';

export interface Sector {
  id: string;
  name: I18n;
  /** 뉴스 수집에 쓰는 섹터 키워드(원본 keywords_kr · keywords_en의 앞 세 개) */
  keywords: I18n;
}

export interface Instrument {
  /** 미국은 티커, 한국은 원본처럼 'KR:' + 종목 코드 */
  symbol: string;
  market: Market;
  sector: string;
  etf: boolean;
  name: I18n;
  /** 타일에 쓰는 짧은 이름 */
  label: I18n;
}

// 출처: ION127/StockPulse core/stock_categories.py의 STOCK_CATEGORIES.
export const SECTORS: readonly Sector[] = [
  { id: 'semi', name: { ko: '반도체', en: 'Semiconductor' }, keywords: { ko: '반도체 · 칩 · GPU', en: 'semiconductor · chip · GPU' } },
  { id: 'tech', name: { ko: '기술', en: 'Technology' }, keywords: { ko: '소프트웨어 · 클라우드 · AI', en: 'software · cloud · AI' } },
  { id: 'fin', name: { ko: '금융', en: 'Financials' }, keywords: { ko: '금융 · 금리 · 한국은행', en: 'bank · Fed · interest rate' } },
  { id: 'energy', name: { ko: '에너지', en: 'Energy' }, keywords: { ko: '원유 · 정유 · OPEC', en: 'oil · gas · crude' } },
  { id: 'health', name: { ko: '헬스케어', en: 'Healthcare' }, keywords: { ko: '바이오 · 신약 · 임상', en: 'FDA · drug approval · clinical trial' } },
  { id: 'ev', name: { ko: '전기차', en: 'EV & Battery' }, keywords: { ko: '전기차 · 배터리 · 리튬', en: 'EV · electric vehicle · battery' } },
  { id: 'defense', name: { ko: '방산', en: 'Defense' }, keywords: { ko: '방산 · 무기 · 미사일', en: 'defense · military · NATO' } },
  { id: 'materials', name: { ko: '소재', en: 'Materials' }, keywords: { ko: '철강 · 구리 · 포스코', en: 'steel · copper · iron' } },
  { id: 'realestate', name: { ko: '부동산', en: 'Real Estate' }, keywords: { ko: '리츠 · 부동산 · 아파트', en: 'REIT · real estate · mortgage' } },
  { id: 'consumer', name: { ko: '소비재', en: 'Consumer' }, keywords: { ko: '소비재 · 유통 · 소비', en: 'consumer · retail · spending' } },
];

const us = (symbol: string, sector: string, name: string, etf = false): Instrument => ({
  symbol,
  market: 'us',
  sector,
  etf,
  name: { ko: name, en: name },
  label: { ko: symbol, en: symbol },
});
const kr = (code: string, sector: string, ko: string, en: string, etf = false): Instrument => ({
  symbol: `KR:${code}`,
  market: 'kr',
  sector,
  etf,
  name: { ko, en },
  label: { ko, en },
});

// AMZN · TSLA는 원본에서 두 섹터에 들어 있지만, 분류 함수(ticker_to_category)는 마지막 섹터인 소비재로 본다. 그대로 한 번만 둔다.
export const INSTRUMENTS: readonly Instrument[] = [
  us('SMH', 'semi', 'VanEck Semiconductor ETF', true),
  us('SOXX', 'semi', 'iShares Semiconductor ETF', true),
  us('NVDA', 'semi', 'NVIDIA'),
  us('TSM', 'semi', 'TSMC'),
  us('AVGO', 'semi', 'Broadcom'),
  us('AMD', 'semi', 'AMD'),
  us('QCOM', 'semi', 'Qualcomm'),
  kr('091160', 'semi', 'KODEX 반도체', 'KODEX Semiconductor', true),
  kr('005930', 'semi', '삼성전자', 'Samsung Electronics'),
  kr('000660', 'semi', 'SK하이닉스', 'SK hynix'),
  kr('042700', 'semi', '한미반도체', 'Hanmi Semiconductor'),

  us('XLK', 'tech', 'Technology Select Sector SPDR', true),
  us('QQQ', 'tech', 'Invesco QQQ', true),
  us('MSFT', 'tech', 'Microsoft'),
  us('AAPL', 'tech', 'Apple'),
  us('GOOGL', 'tech', 'Alphabet'),
  us('META', 'tech', 'Meta'),
  kr('098560', 'tech', 'KODEX IT', 'KODEX IT', true),
  kr('035420', 'tech', 'NAVER', 'NAVER'),
  kr('035720', 'tech', '카카오', 'Kakao'),
  kr('259960', 'tech', '크래프톤', 'Krafton'),

  us('XLF', 'fin', 'Financial Select Sector SPDR', true),
  us('KRE', 'fin', 'SPDR S&P Regional Banking', true),
  us('JPM', 'fin', 'JPMorgan Chase'),
  us('BAC', 'fin', 'Bank of America'),
  us('GS', 'fin', 'Goldman Sachs'),
  us('V', 'fin', 'Visa'),
  us('MA', 'fin', 'Mastercard'),
  kr('091170', 'fin', 'KODEX 은행', 'KODEX Banks', true),
  kr('105560', 'fin', 'KB금융', 'KB Financial'),
  kr('055550', 'fin', '신한지주', 'Shinhan Financial'),
  kr('086790', 'fin', '하나금융', 'Hana Financial'),

  us('XLE', 'energy', 'Energy Select Sector SPDR', true),
  us('XOP', 'energy', 'SPDR S&P Oil & Gas E&P', true),
  us('XOM', 'energy', 'Exxon Mobil'),
  us('CVX', 'energy', 'Chevron'),
  us('COP', 'energy', 'ConocoPhillips'),
  us('SLB', 'energy', 'SLB'),
  us('EOG', 'energy', 'EOG Resources'),
  kr('117460', 'energy', 'KODEX 에너지화학', 'KODEX Energy & Chemicals', true),
  kr('010950', 'energy', 'S-Oil', 'S-Oil'),
  kr('096770', 'energy', 'SK이노베이션', 'SK Innovation'),
  kr('267250', 'energy', 'HD현대중공업', 'HD Hyundai Heavy'),

  us('XLV', 'health', 'Health Care Select Sector SPDR', true),
  us('IBB', 'health', 'iShares Biotechnology ETF', true),
  us('UNH', 'health', 'UnitedHealth'),
  us('LLY', 'health', 'Eli Lilly'),
  us('JNJ', 'health', 'Johnson & Johnson'),
  us('ABBV', 'health', 'AbbVie'),
  us('MRK', 'health', 'Merck'),
  kr('244580', 'health', 'KODEX 바이오', 'KODEX Bio', true),
  kr('207940', 'health', '삼성바이오로직스', 'Samsung Biologics'),
  kr('068270', 'health', '셀트리온', 'Celltrion'),
  kr('326030', 'health', 'SK바이오팜', 'SK Biopharm'),

  us('LIT', 'ev', 'Global X Lithium & Battery Tech', true),
  us('DRIV', 'ev', 'Global X Autonomous & EV', true),
  us('GM', 'ev', 'General Motors'),
  us('F', 'ev', 'Ford'),
  us('RIVN', 'ev', 'Rivian'),
  us('ALB', 'ev', 'Albemarle'),
  kr('305720', 'ev', 'KODEX 2차전지산업', 'KODEX Secondary Battery', true),
  kr('373220', 'ev', 'LG에너지솔루션', 'LG Energy Solution'),
  kr('006400', 'ev', '삼성SDI', 'Samsung SDI'),
  kr('051910', 'ev', 'LG화학', 'LG Chem'),

  us('ITA', 'defense', 'iShares U.S. Aerospace & Defense', true),
  us('XAR', 'defense', 'SPDR S&P Aerospace & Defense', true),
  us('LMT', 'defense', 'Lockheed Martin'),
  us('RTX', 'defense', 'RTX'),
  us('NOC', 'defense', 'Northrop Grumman'),
  us('GD', 'defense', 'General Dynamics'),
  us('BA', 'defense', 'Boeing'),
  kr('475050', 'defense', 'TIGER 우주방산', 'TIGER Aerospace & Defense', true),
  kr('047810', 'defense', '한국항공우주', 'Korea Aerospace'),
  kr('012450', 'defense', '한화에어로스페이스', 'Hanwha Aerospace'),
  kr('000120', 'defense', 'CJ대한통운', 'CJ Logistics'),

  us('XLB', 'materials', 'Materials Select Sector SPDR', true),
  us('PICK', 'materials', 'iShares MSCI Global Metals & Mining', true),
  us('LIN', 'materials', 'Linde'),
  us('FCX', 'materials', 'Freeport-McMoRan'),
  us('NUE', 'materials', 'Nucor'),
  us('APD', 'materials', 'Air Products'),
  us('SHW', 'materials', 'Sherwin-Williams'),
  kr('138540', 'materials', 'KODEX 철강', 'KODEX Steel', true),
  kr('005490', 'materials', 'POSCO홀딩스', 'POSCO Holdings'),
  kr('004020', 'materials', '현대제철', 'Hyundai Steel'),
  kr('010130', 'materials', '고려아연', 'Korea Zinc'),

  us('XLRE', 'realestate', 'Real Estate Select Sector SPDR', true),
  us('VNQ', 'realestate', 'Vanguard Real Estate ETF', true),
  us('AMT', 'realestate', 'American Tower'),
  us('PLD', 'realestate', 'Prologis'),
  us('EQIX', 'realestate', 'Equinix'),
  us('SPG', 'realestate', 'Simon Property'),
  us('O', 'realestate', 'Realty Income'),
  kr('352560', 'realestate', 'TIGER 리츠부동산인프라', 'TIGER REITs & Infra', true),
  kr('000720', 'realestate', '현대건설', 'Hyundai E&C'),
  kr('028260', 'realestate', '삼성물산', 'Samsung C&T'),
  kr('047040', 'realestate', '대우건설', 'Daewoo E&C'),

  us('XLY', 'consumer', 'Consumer Discretionary Select Sector SPDR', true),
  us('XLP', 'consumer', 'Consumer Staples Select Sector SPDR', true),
  us('AMZN', 'consumer', 'Amazon'),
  us('TSLA', 'consumer', 'Tesla'),
  us('HD', 'consumer', 'Home Depot'),
  us('WMT', 'consumer', 'Walmart'),
  us('COST', 'consumer', 'Costco'),
  kr('266390', 'consumer', 'KODEX 200 중소형', 'KODEX 200 Mid-Small Cap', true),
  kr('023530', 'consumer', '롯데쇼핑', 'Lotte Shopping'),
  kr('139480', 'consumer', '이마트', 'E-mart'),
  kr('004170', 'consumer', '신세계', 'Shinsegae'),
];

const bySymbol = new Map(INSTRUMENTS.map((i) => [i.symbol, i]));
export const instrument = (symbol: string): Instrument | undefined => bySymbol.get(symbol);
export const sector = (id: string): Sector | undefined => SECTORS.find((s) => s.id === id);
