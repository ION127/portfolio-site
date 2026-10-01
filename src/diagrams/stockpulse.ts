import { both, type DiagramSpec } from '../lib/diagram/types';

// Kafka는 세로 버스(tunnels의 'kafka')로 그린다. 버스 안쪽 경로 k1~k6(lane)이 토픽 흐름이다.
// 버스 높이(336)는 세로 라벨의 중심(y=268)이 토픽 경로 행(133·223·313·403) 사이에 오도록 정했다.
// 서비스는 버스 왼쪽(수집·뉴스·LLM)과 오른쪽(탐지·알림·API)에 붙고, 외부 API는 같은 행에서 가로로 연결된다.
export const stockpulse: DiagramSpec = {
  id: 'stockpulse',
  width: 1100,
  height: 660,
  title: { ko: 'StockPulse 아키텍처 다이어그램', en: 'StockPulse architecture diagram' },
  zones: [
    { id: 'ext', x: 10, y: 76, w: 180, h: 420, tone: 'client', label: { ko: '외부 데이터', en: 'External data' } },
    {
      id: 'k8s', x: 205, y: 76, w: 690, h: 420, tone: 'onprem',
      label: { ko: '온프레미스 쿠버네티스 · namespace stock', en: 'On-prem Kubernetes · namespace stock' },
    },
    { id: 'users', x: 910, y: 76, w: 180, h: 420, tone: 'client', label: { ko: '사용자', en: 'Users' } },
    { id: 'gitops', x: 205, y: 512, w: 690, h: 132, tone: 'cloud', label: both('CI/CD · GitOps') },
  ],
  tunnels: [
    {
      id: 'kafka', x: 375, y: 100, w: 50, h: 336, label: 'KAFKA ×3',
      tip: {
        kind: 'cp-kafka 7.6 · StatefulSet ×3',
        desc: { ko: 'RF 3 · min ISR 2. 토픽 7개(DLQ 2개 포함).', en: 'RF 3 · min ISR 2. Seven topics, two of them DLQs.' },
      },
    },
  ],
  nodes: [
    {
      id: 'yfinance', x: 25, y: 110, w: 150, external: true,
      title: both('yfinance'), sub: { ko: '미국 1분봉 · 60초', en: 'US 1-min bars · 60 s' },
      tip: { kind: 'yfinance (unofficial)', desc: { ko: 'NYSE 장중에만 60초마다 미국 68종목 1분봉을 가져옵니다.', en: 'Fetches 1-minute bars for 68 US tickers every 60 s during NYSE hours.' } },
    },
    {
      id: 'kis', x: 25, y: 200, w: 150, external: true,
      title: both('KIS OpenAPI'), sub: { ko: '한국 실시간 체결', en: 'KR live trades' },
      tip: { kind: 'KIS WebSocket H0STCNT0', desc: { ko: '한국투자증권 실시간 체결을 연결당 최대 40종목까지 받습니다.', en: 'Korea Investment live trades, up to 40 tickers per connection.' } },
    },
    {
      id: 'newsapi', x: 25, y: 290, w: 150, external: true,
      title: both('NewsAPI · RSS'), sub: { ko: '영문 · 한국어 뉴스', en: 'EN · KR news' },
      tip: { kind: 'NewsAPI · Google/Naver RSS', desc: { ko: '최근 3일 뉴스를 언어별로 최대 4건 모읍니다.', en: 'Up to four articles per language from the last three days.' } },
    },
    {
      id: 'groq', x: 25, y: 380, w: 150, external: true,
      title: both('Groq LLM'), sub: both('llama-3.3-70b'),
      tip: { kind: 'Groq · llama-3.3-70b-versatile', desc: { ko: '이벤트 유형별 프롬프트로 한/영 분석을 만듭니다.', en: 'Writes KO/EN analyses with prompts tuned per event type.' } },
    },
    {
      id: 'slack', x: 445, y: 12, external: true,
      title: both('Slack'), sub: { ko: '이상 신호 알림', en: 'Anomaly alerts' },
      tip: { kind: 'Incoming Webhook', desc: { ko: '섹터 · 유형 필터를 통과한 신호만 보냅니다.', en: 'Only signals that pass the sector and type filters.' } },
    },
    {
      id: 'browser', x: 925, y: 290, w: 150,
      title: { ko: '브라우저', en: 'Browser' }, sub: { ko: '실시간 대시보드', en: 'Live dashboard' },
      tip: { kind: 'Next.js dashboard', desc: { ko: '섹터 히트맵 · 차트 · AI 분석 · 예측을 실시간으로 보여줍니다.', en: 'Sector heatmap, charts, AI analysis and predictions, live.' } },
    },
    {
      id: 'collector', x: 225, y: 110,
      title: both('stock-collector'), sub: { ko: 'yfinance · 장중만', en: 'US · market hours' },
      tip: { kind: 'Python · yfinance · confluent-kafka', desc: { ko: '장외에는 개장까지 잠듭니다. 발행 토픽 stock.raw.us.', en: 'Sleeps until the market opens. Publishes stock.raw.us.' } },
    },
    {
      id: 'kisbridge', x: 225, y: 200,
      title: both('kis-bridge'), sub: { ko: '틱 → 1분봉 집계', en: 'ticks → 1-min bars' },
      tip: { kind: 'Python asyncio · websockets', desc: { ko: '토큰 자동 갱신, 재연결 백오프 5→60초. 발행 토픽 stock.raw.kr.', en: 'Renews tokens, reconnects with a 5→60 s backoff. Publishes stock.raw.kr.' } },
    },
    {
      id: 'news', x: 225, y: 290,
      title: both('news-fetcher'), sub: { ko: '언어별 최대 4건', en: 'up to 4 per language' },
      tip: { kind: 'Python · feedparser', desc: { ko: 'anomaly.detected를 받아 news.fetched로 보냅니다.', en: 'Consumes anomaly.detected, publishes news.fetched.' } },
    },
    {
      id: 'ai', x: 225, y: 380,
      title: both('ai-analyzer'), sub: { ko: '한/영 원인 분석', en: 'KO/EN cause analysis' },
      tip: { kind: 'Python · Groq SDK', desc: { ko: '429 대기 시간을 읽어 재시도, 서킷브레이커, 실패 시 DLQ.', en: 'Honors 429 wait times, uses a circuit breaker, DLQ on failure.' } },
    },
    {
      id: 'notifier', x: 445, y: 110,
      title: both('notifier'), sub: { ko: '필터 · 재시도', en: 'filters · retries' },
      tip: { kind: 'Python · requests', desc: { ko: 'Slack 3회 재시도 후 analysis.completed.dlq로 보냅니다.', en: 'Three Slack retries, then analysis.completed.dlq.' } },
    },
    {
      id: 'detector', x: 445, y: 200,
      title: both('anomaly-detector'), sub: { ko: '% · Z · ETF 분류', en: '% · Z · ETF classes' },
      tip: { kind: 'Python · pandas', desc: { ko: '% 또는 Z-score, 최근 5분 bar만, ETF 체온계로 분류합니다.', en: '% or Z-score on the last 5 minutes, classified with ETF thermometers.' } },
    },
    {
      id: 'api', x: 445, y: 290,
      title: both('api'), sub: both('FastAPI · WebSocket'),
      tip: { kind: 'FastAPI · SQLAlchemy async', desc: { ko: '저장 후 /ws/live로 브로드캐스트, REST와 JWT 인증.', en: 'Stores, then broadcasts on /ws/live; REST with JWT auth.' } },
    },
    {
      id: 'tsdb', x: 445, y: 380,
      title: both('TimescaleDB'), sub: { ko: 'hypertable · 압축', en: 'compressed chunks' },
      tip: { kind: 'TimescaleDB 2.25 · pg15', desc: { ko: '1일 뒤 자동 압축, 시세 30일 · 분석 90일 보존.', en: 'Compresses after a day; keeps prices 30 days and analyses 90.' } },
    },
    {
      id: 'frontend', x: 595, y: 200,
      title: both('frontend'), sub: both('Next.js 14'),
      tip: { kind: 'Next.js 14 · Zustand · Recharts', desc: { ko: 'SSR로 첫 화면, WebSocket으로 실시간 갱신.', en: 'SSR for the first paint, live updates over WebSocket.' } },
    },
    {
      id: 'ingress', x: 595, y: 290,
      title: both('Ingress'), sub: both('nginx · MetalLB'),
      tip: { kind: 'nginx Ingress · MetalLB L2', desc: { ko: '/api · /ws · /auth는 api로, 나머지는 frontend로.', en: '/api, /ws and /auth go to api; the rest to frontend.' } },
    },
    {
      id: 'ml', x: 595, y: 380,
      title: both('ml-trainer'), sub: both('CronJob ×3'),
      tip: { kind: 'LightGBM · XGBoost · CatBoost', desc: { ko: '매일 채점하고 필요하면 재학습, 매주 Optuna 튜닝.', en: 'Grades daily and retrains when needed; tunes weekly with Optuna.' } },
    },
    {
      id: 'prom', x: 745, y: 110,
      title: both('Prometheus'), sub: { ko: 'Grafana · 15초 수집', en: 'Grafana · 15 s scrape' },
      tip: { kind: 'Prometheus 2.51 · Grafana 10.4', desc: { ko: 'Kafka lag · API p95 · 탐지 건수 · ML 정확도 대시보드.', en: 'Dashboards for Kafka lag, API p95, detections and ML accuracy.' } },
    },
    {
      id: 'sealed', x: 745, y: 380,
      title: both('Sealed Secrets'), sub: { ko: '시크릿 복호화', en: 'decrypts secrets' },
      tip: { kind: 'sealed-secrets controller', desc: { ko: 'Git에 올린 SealedSecret을 클러스터 안에서만 복호화합니다.', en: 'Decrypts SealedSecrets from Git inside the cluster only.' } },
    },
    {
      id: 'github', x: 225, y: 556,
      title: both('GitHub'), sub: { ko: 'main 브랜치', en: 'main branch' },
      tip: { kind: 'GitHub', desc: { ko: 'main에 푸시하면 파이프라인이 시작됩니다.', en: 'A push to main starts the pipeline.' } },
    },
    {
      id: 'actions', x: 385, y: 556,
      title: both('Actions'), sub: { ko: 'self-hosted · 변경분', en: 'self-hosted runner' },
      tip: { kind: 'GitHub Actions · self-hosted', desc: { ko: '바뀐 경로를 서비스에 매핑해 변경된 서비스만 빌드합니다.', en: 'Maps changed paths to services and builds only those.' } },
    },
    {
      id: 'harbor', x: 545, y: 556,
      title: both('Harbor'), sub: { ko: '사설 레지스트리', en: 'private registry' },
      tip: { kind: 'Harbor', desc: { ko: 'stock/<svc>:<sha7> 이미지를 보관합니다.', en: 'Stores stock/<svc>:<sha7> images.' } },
    },
    {
      id: 'argocd', x: 705, y: 556,
      title: both('ArgoCD'), sub: both('selfHeal · prune'),
      tip: { kind: 'ArgoCD · automated sync', desc: { ko: 'selfHeal · prune · ServerSideApply로 클러스터를 Git과 같게.', en: 'Keeps the cluster equal to Git with selfHeal, prune and SSA.' } },
    },
  ],
  edges: [
    { id: 'yf_col', d: 'M175,133 L225,133' },
    { id: 'kis_kb', d: 'M175,223 L225,223' },
    { id: 'col_bus', d: 'M355,133 L375,133' },
    { id: 'kb_bus', d: 'M355,223 L375,223' },
    { id: 'bus_det', d: 'M425,223 L445,223' },
    { id: 'bus_news', d: 'M375,313 L355,313' },
    { id: 'news_api', d: 'M225,313 L175,313' },
    { id: 'bus_ai', d: 'M375,403 L355,403' },
    { id: 'ai_groq', d: 'M225,403 L175,403' },
    { id: 'bus_api', d: 'M425,313 L445,313' },
    { id: 'bus_not', d: 'M425,133 L445,133' },
    { id: 'not_slack', d: 'M510,110 L510,58' },
    { id: 'api_tsdb', d: 'M510,336 L510,380' },
    { id: 'api_ing', d: 'M575,313 L595,313' },
    { id: 'ing_fe', d: 'M660,290 L660,246' },
    { id: 'ing_br', d: 'M725,313 L925,313' },
    { id: 'ml_tsdb', d: 'M595,403 L575,403' },
    { id: 'prom_det', d: 'M745,133 L585,133 L585,223 L575,223' },
    { id: 'prom_api', d: 'M745,145 L590,145 L590,305 L575,305' },
    { id: 'gh_act', d: 'M355,579 L385,579' },
    { id: 'act_harbor', d: 'M515,579 L545,579' },
    { id: 'act_gh', d: 'M450,602 L450,626 L290,626 L290,602' },
    { id: 'gh_argo', d: 'M290,556 L290,540 L770,540 L770,556' },
    { id: 'argo_k8s', d: 'M800,556 L800,496' },
    { id: 'harbor_k8s', d: 'M610,556 L610,496' },
    { id: 'k1', d: 'M375,133 L393,133 L393,223 L425,223', lane: true },
    { id: 'k2', d: 'M375,223 L425,223', lane: true },
    { id: 'k3', d: 'M425,223 L393,223 L393,313 L375,313', lane: true },
    { id: 'k4', d: 'M375,313 L385,313 L385,403 L375,403', lane: true },
    { id: 'k5', d: 'M375,403 L401,403 L401,133 L425,133', lane: true },
    { id: 'k6', d: 'M375,403 L409,403 L409,313 L425,313', lane: true },
  ],
  chapters: [
    { ko: '한눈에 보기', en: 'At a glance' },
    { ko: '시세가 들어오는 길', en: 'How prices come in' },
    { ko: '급등락 탐지와 분류', en: 'Detecting and classifying moves' },
    { ko: '원인 분석', en: 'Finding the cause' },
    { ko: '사람에게 닿기까지', en: 'Reaching people' },
    { ko: '매일 다시 배우는 모델', en: 'A model that retrains daily' },
    { ko: 'Git 푸시에서 배포까지', en: 'From git push to deploy' },
    { ko: '지켜보는 눈 — 관측', en: 'Keeping watch — observability' },
  ],
  steps: [
    {
      chapter: 0, nodes: [], routes: [],
      text: {
        ko: 'StockPulse는 <b>외부 데이터</b>(시세 · 뉴스 · LLM)를 받아 <b>온프레미스 쿠버네티스</b> 안의 서비스들이 Kafka로 주고받으며 처리하고, 결과를 <b>브라우저와 Slack</b>으로 보냅니다. 배포는 아래쪽 <b>GitOps</b> 흐름이 맡습니다.',
        en: 'StockPulse takes in <b>external data</b> (prices, news, an LLM), processes it with services that talk over Kafka inside an <b>on-prem Kubernetes</b> cluster, and delivers results to the <b>browser and Slack</b>. Deployment runs through the <b>GitOps</b> flow at the bottom.',
      },
      facts: ['services ×8', 'topics ×7', 'Kafka ×3'],
    },
    {
      chapter: 1, nodes: ['yfinance', 'collector', 'kafka'], routes: [['yf_col'], ['col_bus']],
      text: {
        ko: '미국 68종목은 stock-collector가 NYSE 장중에만 60초마다 yfinance에서 1분봉을 가져와 <code>stock.raw.us</code>로 보냅니다. 장이 닫히면 개장까지 잠듭니다.',
        en: 'For 68 US tickers, stock-collector pulls 1-minute bars from yfinance every 60 seconds during NYSE hours and publishes them to <code>stock.raw.us</code>. When the market closes it sleeps until the next open.',
      },
      facts: ['stock.raw.us', 'NYSE calendar'],
    },
    {
      chapter: 1, nodes: ['kis', 'kisbridge', 'kafka'], routes: [['kis_kb'], ['kb_bus']],
      text: {
        ko: '한국 40종목은 kis-bridge가 한국투자증권 WebSocket으로 실시간 체결을 받아 1분봉으로 묶어 <code>stock.raw.kr</code>로 보냅니다. 토큰은 만료 전에 갱신하고, 끊기면 5→60초 백오프로 다시 붙습니다.',
        en: 'For 40 Korean tickers, kis-bridge receives live trades over the Korea Investment WebSocket, rolls them into 1-minute bars and publishes them to <code>stock.raw.kr</code>. It renews tokens before they expire and reconnects with a 5→60 s backoff.',
      },
      facts: ['stock.raw.kr', 'KIS H0STCNT0'],
    },
    {
      chapter: 2, nodes: ['kafka', 'detector'], routes: [['k1', 'bus_det'], ['k2', 'bus_det']],
      text: {
        ko: 'anomaly-detector는 두 토픽을 함께 읽어, 등락률이나 Z-score가 임계값을 넘는 최근 5분 이내의 bar만 골라냅니다. 한국은 상하한 ±30%를 고려해 임계값을 더 높게 둡니다.',
        en: 'anomaly-detector reads both topics and keeps only bars from the last 5 minutes whose change or Z-score crosses a threshold. Korea gets a higher threshold because of its ±30% daily limit.',
      },
      facts: ['% OR Z-score', 'last 5 min'],
    },
    {
      chapter: 2, nodes: ['detector', 'kafka'], routes: [['-bus_det']],
      text: {
        ko: 'ETF를 섹터 체온계로 씁니다. 같은 방향으로 움직인 섹터 ETF가 3개 이상이면 <b>MARKET</b>, 해당 섹터 ETF나 같은 섹터 종목이 함께 움직이면 <b>SECTOR</b>, 아니면 <b>INDIVIDUAL</b>. 결과는 <code>anomaly.detected</code>로 나갑니다.',
        en: 'ETFs act as sector thermometers. Three or more sector ETFs moving the same way means <b>MARKET</b>; the sector’s ETF or its peers moving together means <b>SECTOR</b>; otherwise <b>INDIVIDUAL</b>. Results go out on <code>anomaly.detected</code>.',
      },
      facts: ['INDIVIDUAL', 'SECTOR', 'MARKET'],
    },
    {
      chapter: 3, nodes: ['kafka', 'news', 'newsapi'], routes: [['k3', 'bus_news'], ['news_api'], ['-bus_news']],
      text: {
        ko: 'news-fetcher가 <code>anomaly.detected</code>를 받아, 섹터 키워드와 티커로 NewsAPI · Google News · Naver RSS에서 최근 3일 뉴스를 언어별로 최대 4건 모아 <code>news.fetched</code>로 보냅니다.',
        en: 'news-fetcher consumes <code>anomaly.detected</code>, gathers up to four articles per language from the last three days via NewsAPI, Google News and Naver RSS using sector keywords and the ticker, and publishes <code>news.fetched</code>.',
      },
      facts: ['anomaly.detected', 'news.fetched'],
    },
    {
      chapter: 3, nodes: ['kafka', 'ai', 'groq'], routes: [['k4', 'bus_ai'], ['ai_groq'], ['-bus_ai']],
      text: {
        ko: 'ai-analyzer가 Groq LLM으로 한국어 · 영어 분석을 씁니다. 분류에 따라 프롬프트 초점을 기업 이슈 · 섹터 이슈 · 매크로로 바꾸고, 429가 오면 안내된 시간만큼 기다렸다 다시 부릅니다. 끝내 실패하면 <code>news.fetched.dlq</code>로 보냅니다.',
        en: 'ai-analyzer writes Korean and English analyses with the Groq LLM, shifting the prompt’s focus to company, sector or macro issues by class. On a 429 it waits as instructed and retries; if it still fails, the message goes to <code>news.fetched.dlq</code>.',
      },
      facts: ['llama-3.3-70b', 'circuit breaker 5×/60s', 'news.fetched.dlq'],
    },
    {
      chapter: 4, nodes: ['kafka', 'api', 'tsdb', 'ingress', 'frontend', 'browser'],
      routes: [['k6', 'bus_api'], ['api_tsdb'], ['api_ing'], ['-ing_fe'], ['ing_br']],
      text: {
        ko: 'api가 <code>analysis.completed</code>를 받아 TimescaleDB에 저장하고, WebSocket <code>/ws/live</code>로 열려 있는 대시보드에 바로 밀어줍니다. 브라우저는 nginx Ingress를 거쳐 들어옵니다.',
        en: 'api consumes <code>analysis.completed</code>, stores it in TimescaleDB and pushes it straight to open dashboards over the <code>/ws/live</code> WebSocket. Browsers come in through the nginx Ingress.',
      },
      facts: ['analysis.completed', '/ws/live'],
    },
    {
      chapter: 4, nodes: ['kafka', 'notifier', 'slack'], routes: [['k5', 'bus_not'], ['not_slack']],
      text: {
        ko: 'notifier는 같은 결과를 섹터 · 이벤트 유형 필터로 거른 뒤 Slack으로 보냅니다. 3번 재시도해도 실패하면 <code>analysis.completed.dlq</code>로 옮깁니다.',
        en: 'notifier filters the same results by sector and event type and sends them to Slack. After three failed retries the message moves to <code>analysis.completed.dlq</code>.',
      },
      facts: ['3 retries', 'analysis.completed.dlq'],
    },
    {
      chapter: 4, nodes: ['kafka', 'detector', 'news', 'ai', 'notifier', 'api'], routes: [],
      text: {
        ko: '재시작했을 때의 동작은 단계마다 다릅니다. 탐지 · 뉴스 수집 · 알림은 <code>earliest</code>로 놓친 메시지를 다시 처리하고, LLM 분석과 api는 <code>latest</code>로 두어 밀린 메시지에 LLM 비용이 한꺼번에 나가거나 같은 신호가 다시 뜨지 않게 했습니다.',
        en: 'Restart behavior differs by stage. Detection, news fetching and notifications use <code>earliest</code> to reprocess anything missed; LLM analysis and api use <code>latest</code> so a backlog doesn’t trigger a burst of LLM costs or re-show the same signals.',
      },
      facts: ['earliest', 'latest'],
    },
    {
      chapter: 5, nodes: ['ml', 'tsdb'], routes: [['ml_tsdb'], ['-ml_tsdb']],
      text: {
        ko: 'ml-trainer CronJob이 한국 25종목의 다음 날 방향을 예측합니다. 매일 전날 예측을 채점하고, 30일 정확도가 52% 아래거나 모델이 7일을 넘으면 다시 학습합니다. 매주 한 번은 Optuna로 튜닝하고 walk-forward로 검증합니다.',
        en: 'The ml-trainer CronJobs predict next-day direction for 25 Korean tickers. Each day they grade yesterday’s calls and retrain if 30-day accuracy drops below 52% or the model is older than 7 days. Once a week they tune with Optuna and validate walk-forward.',
      },
      facts: ['LGB 0.4 · XGB 0.35 · Cat 0.25', 'Purged CV'],
    },
    {
      chapter: 6, nodes: ['github', 'actions', 'harbor'], routes: [['gh_act'], ['act_harbor']],
      text: {
        ko: 'main에 푸시하면 self-hosted runner의 GitHub Actions가 바뀐 경로를 서비스에 매핑해 <b>변경된 서비스만</b> 빌드하고, Harbor에 <code>stock/&lt;svc&gt;:&lt;sha7&gt;</code>로 올립니다.',
        en: 'A push to main triggers GitHub Actions on a self-hosted runner, which maps changed paths to services, builds <b>only what changed</b> and pushes <code>stock/&lt;svc&gt;:&lt;sha7&gt;</code> to Harbor.',
      },
      facts: ['path → service map', 'images ×9'],
    },
    {
      chapter: 6, nodes: ['actions', 'github', 'argocd', 'sealed', 'harbor'],
      routes: [['act_gh'], ['gh_argo'], ['argo_k8s'], ['harbor_k8s']],
      text: {
        ko: 'Actions가 매니페스트의 이미지 태그를 바꿔 커밋하면(<code>[skip ci]</code>로 루프 방지), ArgoCD가 60초마다 저장소를 확인해 selfHeal · prune으로 클러스터를 Git과 똑같이 맞춥니다. 이미지는 Harbor에서 받아 오고, 비밀값은 Sealed Secrets로 암호화해 Git에 둡니다.',
        en: 'Actions commits the new image tags to the manifests (<code>[skip ci]</code> prevents loops), and ArgoCD checks the repo every 60 seconds and makes the cluster match Git with selfHeal and prune. Images are pulled from Harbor, and secrets live in Git encrypted with Sealed Secrets.',
      },
      facts: ['selfHeal · prune', 'ServerSideApply'],
    },
    {
      chapter: 7, nodes: ['prom', 'detector', 'api'], routes: [['-prom_det'], ['-prom_api']],
      text: {
        ko: 'Prometheus가 15초마다 api와 anomaly-detector의 지표, 쿠버네티스 · 노드 지표를 모으고, Grafana 대시보드 하나에서 Kafka lag · API p95 지연 · 탐지 건수 · ML 정확도를 봅니다.',
        en: 'Prometheus scrapes api and anomaly-detector metrics plus Kubernetes and node metrics every 15 seconds, and one Grafana dashboard shows Kafka lag, API p95 latency, detections and ML accuracy.',
      },
      facts: ['anomaly_detected_total', 'ml_prediction_accuracy'],
    },
  ],
};
