import { both, type DiagramSpec } from '../lib/diagram/types';

// 좌표·경로는 확정 프로토타입에서 옮겼다.
// 4번 단계에는 user 노드와 -E4를 더해 모든 연결선이 한 번 이상 쓰이게 했다.
// 13번 단계의 Kafka → Prometheus 경로는 프로토타입의 '-E20a'(방향이 반대라 점이 순간이동)를 'E20a'로 바로잡았다.
export const baro: DiagramSpec = {
  id: 'baro',
  width: 1100,
  height: 580,
  title: { ko: 'BARO 아키텍처 다이어그램', en: 'BARO architecture diagram' },
  zones: [
    { id: 'client', x: 10, y: 76, w: 180, h: 490, tone: 'client', label: { ko: '클라이언트 · 차량', en: 'Clients · vehicles' } },
    { id: 'aws', x: 205, y: 76, w: 630, h: 490, tone: 'cloud', label: both('AWS · ap-northeast-2'), note: 'VPC 10.20.0.0/16' },
    { id: 'onprem', x: 900, y: 76, w: 190, h: 490, tone: 'onprem', label: { ko: '온프레미스 · K3s', en: 'On-prem · K3s' } },
  ],
  tunnels: [
    {
      id: 'vpn',
      x: 842,
      y: 110,
      w: 50,
      h: 406,
      label: 'SITE-TO-SITE VPN · IPSEC',
      tip: {
        kind: 'AWS VGW ↔ StrongSwan (IPsec)',
        desc: { ko: 'AWS와 온프렘을 사설망으로 연결해요.', en: 'Links AWS and on-prem over a private network.' },
      },
    },
  ],
  nodes: [
    {
      id: 'mobile', x: 25, y: 110, w: 150,
      title: { ko: '승객 모바일 웹', en: 'Rider web app' },
      sub: { ko: 'React · SSE 수신', en: 'React · SSE client' },
      tip: { kind: 'React 18 · Vite', desc: { ko: '호출 → 배차 → 탑승 → 도착 흐름의 승객 앱이에요.', en: 'The rider app for request → dispatch → ride → arrival.' } },
    },
    {
      id: 'admin', x: 25, y: 200, w: 150,
      title: { ko: '관제 화면', en: 'Control console' },
      sub: both('baro-admin · SSE'),
      tip: { kind: 'baro-admin', desc: { ko: '전 차량 위치를 SSE로 실시간 표시해요.', en: 'Shows every vehicle live over SSE.' } },
    },
    {
      id: 'vehicle', x: 25, y: 470, w: 150,
      title: { ko: '차량 ×1500', en: 'Vehicles ×1500' },
      sub: { ko: 'asyncio 시뮬레이터', en: 'asyncio simulator' },
      tip: {
        kind: 'Python 3.11 · asyncio · aiomqtt',
        desc: { ko: '서울 택시승차대 254곳에서 출발하는 차량 1500대를 동시에 띄워요.', en: 'Runs 1,500 vehicles at once, starting from 254 Seoul taxi stands.' },
      },
    },
    {
      id: 'kakao', x: 380, y: 12, external: true,
      title: both('Kakao Mobility'),
      sub: { ko: '외부 경로·요금 API', en: 'Route & fare API' },
      tip: { kind: 'External API', desc: { ko: '경로 · 요금 · 소요시간을 계산해요.', en: 'Computes routes, fares and ETAs.' } },
    },
    {
      id: 'slack', x: 915, y: 12, w: 160, external: true,
      title: both('Slack'),
      sub: { ko: '알림 3채널 분리', en: '3 alert channels' },
      tip: { kind: 'Alertmanager → Slack', desc: { ko: 'AWS · 온프렘 · 서비스 채널로 나눠 받아요.', en: 'Separate AWS, on-prem and service channels.' } },
    },
    {
      id: 'alb', x: 225, y: 110,
      title: both('Public ALB'),
      sub: { ko: 'HTTPS · 경로 라우팅', en: 'HTTPS · path routing' },
      tip: { kind: 'HTTPS · TLS 1.3 · ACM', desc: { ko: '경로 기반 라우팅, */internal/* 는 403이에요.', en: 'Path-based routing; */internal/* returns 403.' } },
    },
    {
      id: 'gateway', x: 225, y: 200,
      title: both('gateway'),
      sub: { ko: 'JWT · 서킷브레이커', en: 'JWT · circuit breaker' },
      tip: { kind: 'Spring Cloud Gateway', desc: { ko: 'JWT 검증 · 서킷브레이커 · 내부 경로 차단.', en: 'JWT checks, circuit breakers, internal path blocking.' } },
    },
    {
      id: 'user', x: 225, y: 290,
      title: both('user'),
      sub: { ko: '회원 · 토큰 발급', en: 'Accounts · tokens' },
      tip: { kind: 'Kotlin · Spring Boot 3', desc: { ko: '회원가입 · 로그인 · 토큰 발급(refresh 14일).', en: 'Sign-up, login and tokens (14-day refresh).' } },
    },
    {
      id: 'mosquitto', x: 225, y: 470,
      title: both('Mosquitto'),
      sub: both('EC2 · MQTT'),
      tip: { kind: 'EC2 t3.micro · :1883', desc: { ko: 'IoT Core에서 자체 운영으로 전환. 큐 한도 1000 → 50000.', en: 'Moved off IoT Core to self-hosted. Queue limit 1000 → 50000.' } },
    },
    {
      id: 'dispatch', x: 380, y: 200,
      title: both('dispatch'),
      sub: { ko: '배차 · 선점 락 · SSE', en: 'Dispatch · locks' },
      tip: { kind: 'Kotlin · Spring Boot 3 · hexagonal', desc: { ko: 'PRE배차 · 배차 · 취소 · 재배차 · 승객 SSE.', en: 'Quotes, dispatch, cancel, re-dispatch, rider SSE.' } },
    },
    {
      id: 'control', x: 380, y: 470,
      title: both('control'),
      sub: { ko: 'MQTT ↔ Kafka · 관제', en: 'MQTT ↔ Kafka hub' },
      tip: { kind: 'Kotlin · Spring Boot 3 · ECS Fargate', desc: { ko: '차량(MQTT)과 서비스(HTTP·Kafka)를 잇는 관제 허브.', en: 'The hub between vehicles (MQTT) and services (HTTP, Kafka).' } },
    },
    {
      id: 'valkey', x: 535, y: 110,
      title: both('Valkey'),
      sub: both('ElastiCache · GEO'),
      tip: { kind: 'ElastiCache · Valkey 7.2', desc: { ko: '빈 차 GEO 인덱스 + 배차 선점 락.', en: 'GEO index of idle cars + dispatch locks.' } },
    },
    {
      id: 'rds', x: 535, y: 200,
      title: both('RDS Postgres'),
      sub: { ko: 'PostGIS · 스키마 분리', en: 'PostGIS · schemas' },
      tip: { kind: 'RDS PostgreSQL 16 · PostGIS', desc: { ko: 'DB 1대 · 서비스별 스키마. 스냅샷 자동 백업·복원.', en: 'One DB with a schema per service. Automatic snapshot backup and restore.' } },
    },
    {
      id: 'kafka', x: 535, y: 470,
      title: both('Kafka'),
      sub: { ko: 'EC2 KRaft · 4 파티션', en: 'KRaft · 4 partitions' },
      tip: { kind: 'EC2 t3.small · KRaft · EBS gp3', desc: { ko: 'ECS+EFS에서 EC2+EBS로 이전. 4 파티션, 보관 1시간.', en: 'Moved from ECS+EFS to EC2+EBS. 4 partitions, 1-hour retention.' } },
    },
    {
      id: 'relocation', x: 690, y: 200,
      title: both('relocation'),
      sub: { ko: '승차대 점수 · 재배치', en: 'Stand scoring' },
      tip: { kind: 'Kotlin · Spring Boot 3 · PostGIS', desc: { ko: '운행을 마친 차량을 수요 높은 승차대로 보내요.', en: 'Sends cars that finish a ride to high-demand stands.' } },
    },
    {
      id: 'ialb', x: 690, y: 320,
      title: both('Internal ALB'),
      sub: { ko: '/internal · 메트릭', en: '/internal · metrics' },
      tip: { kind: 'on-prem CIDR only', desc: { ko: '배치 연동과 메트릭 수집 창구예요.', en: 'Entry point for batch jobs and metrics scraping.' } },
    },
    {
      id: 'prom', x: 915, y: 110, w: 160,
      title: both('Prometheus'),
      sub: { ko: 'Grafana · 알림 룰', en: 'Grafana · alert rules' },
      tip: { kind: 'kube-prometheus-stack', desc: { ko: 'AWS와 온프렘을 한곳에서 관측해요.', en: 'Observes AWS and on-prem in one place.' } },
    },
    {
      id: 'airflow', x: 915, y: 230, w: 160,
      title: both('Airflow'),
      sub: { ko: '매일 02:00 수요 학습', en: 'Daily 02:00 demand model' },
      tip: { kind: 'Airflow 3.2 · GitSync', desc: { ko: '매일 02:00 수요를 학습해 승차대 가중치를 만들어요.', en: 'Learns demand every day at 02:00 and produces stand weights.' } },
    },
    {
      id: 'tsdb', x: 915, y: 350, w: 160,
      title: both('TimescaleDB'),
      sub: { ko: '시계열 hypertable', en: 'Time-series hypertable' },
      tip: { kind: 'TimescaleDB · K3s', desc: { ko: '차량 위치 · 배차 이력 시계열을 저장해요.', en: 'Stores vehicle positions and dispatch history.' } },
    },
    {
      id: 'consumer', x: 915, y: 470, w: 160,
      title: both('kafka-consumer'),
      sub: { ko: 'VPN 너머 소비 · 적재', en: 'Consumes across VPN' },
      tip: { kind: 'Kotlin · Spring Boot · K3s', desc: { ko: 'VPN 너머 Kafka를 소비해 TimescaleDB에 적재해요.', en: 'Consumes Kafka across the VPN into TimescaleDB.' } },
    },
  ],
  edges: [
    { id: 'E1', d: 'M175,133 L225,133' },
    { id: 'E2', d: 'M175,223 L200,223 L200,146 L225,146' },
    { id: 'E3', d: 'M290,156 L290,200' },
    { id: 'E4', d: 'M290,246 L290,290' },
    { id: 'E5', d: 'M355,223 L380,223' },
    { id: 'E6', d: 'M355,238 L367,238 L367,484 L380,484' },
    { id: 'E7', d: 'M175,493 L225,493' },
    { id: 'E8', d: 'M355,498 L380,498' },
    { id: 'E9', d: 'M510,493 L535,493' },
    { id: 'E10', d: 'M560,470 L560,420 L500,420 L500,246' },
    { id: 'E11', d: 'M445,200 L445,58' },
    { id: 'E12', d: 'M485,200 L485,133 L535,133' },
    { id: 'E13', d: 'M510,223 L535,223' },
    { id: 'E14', d: 'M445,246 L445,470' },
    { id: 'E15', d: 'M690,223 L665,223' },
    { id: 'E16', d: 'M755,200 L755,35 L510,35' },
    { id: 'E17', d: 'M755,320 L755,246' },
    { id: 'E18', d: 'M700,320 L700,262 L522,262 L522,238 L510,238' },
    { id: 'E19', d: 'M510,478 L522,478 L522,440 L675,440 L675,236 L690,236' },
    { id: 'E20a', d: 'M665,493 L842,493' },
    { id: 'E20b', d: 'M892,493 L915,493' },
    { id: 'E21', d: 'M995,470 L995,396' },
    { id: 'E22a', d: 'M915,253 L892,253' },
    { id: 'E22b', d: 'M842,343 L820,343' },
    { id: 'E23', d: 'M995,276 L995,350' },
    { id: 'E24', d: 'M915,133 L892,133' },
    { id: 'E25', d: 'M1065,110 L1065,58' },
    { id: 't1', d: 'M842,493 L892,493', lane: true },
    { id: 't2', d: 'M892,253 L856,253 L856,343 L842,343', lane: true },
    { id: 't3', d: 'M892,133 L856,133 L856,343 L842,343', lane: true },
    { id: 't4', d: 'M892,133 L856,133 L856,493 L842,493', lane: true },
  ],
  chapters: [
    { ko: '한눈에 보기', en: 'At a glance' },
    { ko: '차량 위치가 흐르는 길', en: 'How vehicle positions flow' },
    { ko: '호출 한 건이 배차되기까지', en: 'From one request to a dispatched car' },
    { ko: '운행이 끝나면 — 재배치', en: 'After the ride — relocation' },
    { ko: '밤사이 — 수요 학습', en: 'Overnight — learning demand' },
    { ko: '지켜보는 눈 — 관측', en: 'Keeping watch — observability' },
  ],
  steps: [
    {
      chapter: 0, nodes: [], routes: [],
      text: {
        ko: 'BARO는 <b>승객 앱 · 차량</b>, 서비스가 도는 <b>AWS</b>, 분석 · 관측을 맡은 <b>온프레미스(OpenStack K3s)</b>로 나뉘어요. AWS와 온프레미스는 Site-to-Site VPN으로 이어져 있어요.',
        en: 'BARO splits into <b>rider apps and vehicles</b>, <b>AWS</b> where the services run, and <b>on-prem (OpenStack K3s)</b> for analytics and observability. AWS and on-prem are joined by a site-to-site VPN.',
      },
      facts: ['ECS Fargate ×7', 'EC2: Kafka · Mosquitto', 'IPsec VPN'],
    },
    {
      chapter: 1, nodes: ['vehicle', 'mosquitto', 'control'], routes: [['E7', 'E8']],
      text: {
        ko: '차량 1500대가 3초마다 위치를 MQTT(QoS0)로 보내요. control은 <b>공유 구독</b>으로 받아서, 인스턴스를 늘려도 한 메시지는 한 곳에서만 처리돼요.',
        en: '1,500 vehicles publish their position over MQTT (QoS 0) every 3 seconds. control receives them through a <b>shared subscription</b>, so each message goes to only one instance even as it scales out.',
      },
      facts: ['vehicles/{id}/telemetry', '$share/control-service'],
    },
    {
      chapter: 1, nodes: ['control', 'gateway', 'alb', 'admin', 'kafka'], routes: [['-E6', '-E3', '-E2'], ['E9']],
      text: {
        ko: '관제 화면에는 SSE로 곧장 뿌리고, 나머지는 Kafka <code>vehicle-data-topic</code>으로 보내요. key=carId라 같은 차량의 위치는 순서가 보장돼요.',
        en: 'The control console gets positions straight over SSE; everything else goes to the Kafka <code>vehicle-data-topic</code>. Keyed by carId, so each vehicle’s positions stay in order.',
      },
      facts: ['4 partitions', 'key = carId'],
    },
    {
      chapter: 1, nodes: ['kafka', 'dispatch', 'valkey', 'vpn', 'consumer', 'tsdb'], routes: [['E10', 'E12'], ['E20a', 't1', 'E20b', 'E21']],
      text: {
        ko: 'dispatch는 10초 넘은 메시지를 버리고 빈 차만 Valkey GEO에 올려요. 온프레미스 consumer는 VPN 너머에서 같은 토픽을 받아 TimescaleDB에 쌓아요.',
        en: 'dispatch drops messages older than 10 seconds and keeps only idle cars in the Valkey GEO index. The on-prem consumer reads the same topic across the VPN and stores it in TimescaleDB.',
      },
      facts: ['GEO dispatch:cars:idle:geo', 'hypertable vehicle_data'],
    },
    {
      chapter: 2, nodes: ['mobile', 'alb', 'gateway', 'user', 'dispatch', 'kakao'], routes: [['E1', 'E3', 'E5', 'E11'], ['-E4']],
      text: {
        ko: '호출은 ALB → gateway를 지나요. JWT는 user가 발급하고 gateway 한 곳에서만 검증해요. dispatch는 Kakao로 요금 · 경로를 먼저 계산해 보여줘요(PRE배차).',
        en: 'A request passes the ALB and then the gateway. JWTs are issued by user and verified only at the gateway. dispatch first shows a fare and route from Kakao (the pre-dispatch quote).',
      },
      facts: ['X-Authenticated-User-Id', 'quote TTL 10 min'],
    },
    {
      chapter: 2, nodes: ['dispatch', 'valkey', 'rds'], routes: [['E12'], ['E13']],
      text: {
        ko: '확정하면 15km 안 후보 10대를 찾고, 300초 넘게 소식 없는 차는 빼고, <b>SETNX 선점 락(30초)</b>으로 두 승객이 같은 차를 잡지 못하게 해요. 배차는 트랜잭션으로 저장해요.',
        en: 'On confirmation it finds 10 candidates within 15 km, skips cars silent for over 300 seconds, and takes a <b>SETNX lock (30 s)</b> so two riders can’t grab the same car. The dispatch is saved in a transaction.',
      },
      facts: ['GEOSEARCH 15km', 'SETNX TTL 30s'],
    },
    {
      chapter: 2, nodes: ['dispatch', 'control', 'mosquitto', 'vehicle'], routes: [['E14', '-E8', '-E7', 'E7', 'E8', '-E14']],
      text: {
        ko: '명령은 MQTT(QoS1)로 차량에 가고 ACK가 돌아와요. <b>10초 안에 ACK가 없으면</b> 다음 차량으로 자동 재배차해요.',
        en: 'The command reaches the car over MQTT (QoS 1) and an ACK comes back. <b>If no ACK arrives within 10 seconds</b>, the next car is dispatched automatically.',
      },
      facts: ['vehicles/{id}/commands', 'ACK timeout 10s'],
    },
    {
      chapter: 2, nodes: ['dispatch', 'gateway', 'alb', 'mobile'], routes: [['-E5', '-E3', '-E1']],
      text: {
        ko: '승객 앱엔 SSE로 차량 위치와 도착 상태(픽업 → 목적지)를 실시간으로 밀어줘요.',
        en: 'The rider app gets live vehicle positions and arrival status (pickup → destination) over SSE.',
      },
      facts: ['SSE vehicle-location'],
    },
    {
      chapter: 3, nodes: ['vehicle', 'mosquitto', 'control', 'relocation'], routes: [['E7', 'E8', 'E19']],
      text: {
        ko: '목적지 도착 이벤트를 받은 control이 relocation에 비동기로 알려요. 배차 흐름과 엮이지 않도록 분리한 구조예요.',
        en: 'When a car reports arriving at its destination, control notifies relocation asynchronously, kept separate from the dispatch flow.',
      },
      facts: ['ARRIVED(to_dest)', '202 Accepted'],
    },
    {
      chapter: 3, nodes: ['relocation', 'rds', 'kakao', 'control', 'mosquitto', 'vehicle'], routes: [['E15'], ['E16'], ['-E19', '-E8', '-E7']],
      text: {
        ko: 'PostGIS로 주변 승차대에 점수(0.7 · 수요 − 0.3 · 거리)를 매겨 가장 좋은 곳으로 RELOCATE. 이동 중에도 배차 가능한 상태라 호출이 오면 바로 받아요.',
        en: 'PostGIS scores nearby stands (0.7 · demand − 0.3 · distance) and the car is sent to the best one with RELOCATE. It stays dispatchable while moving, so it can take a new request right away.',
      },
      facts: ['ST_DWithin 10→30km', 'status = relocating'],
    },
    {
      chapter: 4, nodes: ['dispatch', 'ialb', 'vpn', 'airflow', 'tsdb'], routes: [['-E18', '-E22b', '-t2', '-E22a'], ['E23']],
      text: {
        ko: '매일 02:00, Airflow가 VPN 너머 internal ALB로 전날 배차 데이터를 가져와 승차대 × 요일 × 시간대 수요를 집계해요.',
        en: 'Every day at 02:00, Airflow pulls the previous day’s dispatch data through the internal ALB across the VPN and aggregates demand by stand × weekday × time slot.',
      },
      facts: ['gzip CSV export', 'X-Internal-Api-Key'],
    },
    {
      chapter: 4, nodes: ['airflow', 'vpn', 'ialb', 'relocation'], routes: [['E22a', 't2', 'E22b', 'E17']],
      text: {
        ko: 'XGBoost로 학습한 승차대 가중치를 relocation에 보내면, 다음 재배치부터 바로 반영돼요.',
        en: 'Stand weights learned with XGBoost are sent to relocation and apply from the next relocation onward.',
      },
      facts: ['weights 0–1'],
    },
    {
      chapter: 5, nodes: ['ialb', 'kafka', 'vpn', 'prom', 'slack'], routes: [['-E22b', '-t3', '-E24'], ['E20a', '-t4', '-E24'], ['E25']],
      text: {
        ko: '온프레미스 Prometheus가 VPN 너머 서비스 · Kafka · EC2 지표를 모으고, 알림은 AWS · 온프레미스 · 서비스 3개 Slack 채널로 나눠 보내요.',
        en: 'On-prem Prometheus scrapes service, Kafka and EC2 metrics across the VPN, and alerts go to three Slack channels: AWS, on-prem and services.',
      },
      facts: ['JMX :9404', 'CloudWatch exporter', 'Alertmanager → Slack'],
    },
  ],
};
