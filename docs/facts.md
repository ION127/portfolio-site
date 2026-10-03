# 사실 원장

사이트에 나오는 숫자와 주장의 출처. 사실의 기준은 README가 아니라 **코드**다. 사용자 확인이 끝나면 `확인`을 `확정`으로 바꾼다.

| id | 내용 | 출처 | 확인 |
|---|---|---|---|
| baro.period | 2026-04-14 ~ 06-29, 5인 팀, 역할 BE/DevOps | baro-team/.github `profile/README.md` | 초안 |
| baro.my-prs | 내가 머지한 PR 128개(2026-04-24 ~ 06-26, 6개 저장소: terraform 53 · server 44 · admin 19 · edge 5 · kafka 5 · mobile 2) | GitHub 검색 `author:ION127 org:baro-team is:merged` | 초안 |
| baro.vehicles | 동시 시뮬레이션 차량 1,500대(2026-06-25부터, 2026-06-19~06-25에는 1,000대). 실제 1초마다(시뮬레이션 시간 3초, 3배속) 위치 전송 | baro-edge `vehicle_simulator.py` (`vehicle_count`), `config.py` (`TELEMETRY_INTERVAL` 3, `SIM_SPEED` 3) | 초안 |
| baro.stands | 서울 택시승차대 254곳에서 출발 | baro-edge `config.py` (승차대 좌표) | 초안 |
| baro.demo-speed | 데모 차량 시속 60km, 직선 이동(시뮬레이터 기본값. 실제 시뮬레이터는 배차 · 재배치 명령 때 서버가 보낸 경로 거리 ÷ 시간으로 속도를 정한다) | baro-edge `config.py` (`SIM_VEHICLE_SPEED`), `vehicle_simulator.py` | 초안 |
| baro.demo-roads | 데모 차량은 OSM 도로망(motorway~tertiary와 진입로, 교차로 약 1.8만 개, A*)을 따라 시속 60km로 이동. 출발 · 도착점은 일반 도로가 닿는 가장 가까운 교차로에 붙인다. 배차 후보 · 재배치 점수는 실제처럼 직선거리 | `src/data/seoul-roads.json`(© OpenStreetMap contributors, ODbL 1.0), `scripts/build-roads.mjs` | 초안 |
| baro.demo-radius | 배차 후보: 호출 지점 반경 15km 안에서 가까운 대기 차량 최대 10대, 그중 가장 가까운 차를 예약. 반경 목록(5·10·15km) 중 가장 큰 값으로 한 번 찾는다. 2026-06-15(PR #72) 전에는 반경 5km | baro-server dispatch-service `application.yml` (`idle-car-search-radii-km`), `RedisDispatchableCarProjection.findNearestIdleCars`, `DispatchRedisProperties` (`idleCarMaxCandidates`), `ConfirmDispatchService.reserveNearestIdleCar` | 초안 |
| baro.demo-ack | ACK 10초 안에 없으면 다시 배차 | dispatch-service `application.yml` (`ack-timeout-seconds`) | 초안 |
| baro.demo-relocation | 재배치: 반경 10km(없으면 30km) 승차대 중 0.7 × 정규화 가중치 − 0.3 × 정규화 거리 | relocation-service `RelocationService.assignRelocation` | 초안 |
| baro.lag | Kafka consumer lag 2.9M → hot path DB 조회 제거로 해소 | baro-server PR #89 | 초안 |
| baro.vpn-table220 | StrongSwan(charon)이 table 220에 넣은 policy route가 main table보다 먼저 적용돼 AWS 대역 트래픽이 VTI 대신 Wi-Fi 기본 경로로 나감. 호스트 VPN 스크립트가 터널 상태 변경 때 충돌 경로 제거 | baro-team 내부 문서 `docs/network-vpn.md`(Table 220 충돌) | 초안 |
| baro.lag-rate | 메시지마다 DB 조회. 당시 차량 1,000대 × 초당 1건이라 초당 1,000회 가까이(PR #89 커밋 메시지는 333msg/sec라고 적었지만 3배속을 빼고 계산한 값으로 보인다) | baro-server PR #89, baro-edge `config.py` | 초안 |
| baro.kafka-block | producer `max.block.ms` 60000 → 500, retries 0 | baro-server PR #103 | 초안 |
| baro.mosquitto-queue | `max_queued_messages` 1000(기본) → 10000(PR #67) → 0(무제한, PR #88) → 몇 분 뒤 50000(PR #89, OOM 위험) | baro-terraform PR #67 · #88 · #89, baro-edge `mosquitto.conf` | 초안 |
| baro.stagger | 10대마다 0.05초 간격 접속, IoT Core 시절 1.2초 | baro-edge `vehicle_simulator.py` | 초안 |
| baro.partitions | vehicle-data-topic 4 파티션, 보관 1시간 / 256MB | baro-terraform `envs/dev/kafka-userdata.sh.tpl` | 초안 |
| baro.ecs-services | ECS Fargate 서비스 7개 | baro-terraform `envs/dev/locals.tf` | 초안 |
| baro.dispatch-geo | GEOSEARCH 15km 후보 10대, stale 300초, SETNX 30초 | dispatch-service `ConfirmDispatchService.kt`, `RedisDispatchableCarProjection.kt` | 초안 |
| baro.ack-timeout | ACK 10초 타임아웃, 재배차 스케줄러 5초 | dispatch-service `DispatchRetryService.kt` | 초안 |
| baro.reloc-score | 점수 = 0.7·가중치 − 0.3·거리, ST_DWithin 10km → 30km | relocation-service `RelocationService.kt` | 초안 |
| baro.airflow | 매일 02:00 KST `baro_pipeline`, XGBoost | airflow-dags-repo `dags/baro_pipeline.py` | 초안 |
| baro.iot-core-switch | IoT Core → EC2 Mosquitto 전환 (2026-06-16) | baro-terraform PR #44 | 초안 |
| baro.kafka-ec2 | Kafka ECS+EFS → EC2+EBS 이전 (2026-06-04) | baro-terraform `ec2-kafka.tf` | 초안 |
| stockpulse.tickers | 추적 종목 108개 (미국 68 + 한국 40) | StockPulse `core/stock_categories.py` | 초안 |
| stockpulse.minute-path | 분봉 스트리밍 탐지는 신호를 내지 못한다: 한국은 메시지당 종목별 봉 1개(탐지는 2개 미만이면 건너뜀), 미국은 tz를 뗀 ET 시각을 UTC 컨테이너 시계와 비교해 최근 5분 필터에서 탈락. 실제 신호는 api의 매시간 일봉 경로. 사이트에는 회고로만 쓴다 | StockPulse `services/kis-bridge/main.py`(`_flush_candles`), `services/anomaly-detector/main.py`, `core/stock_fetcher.py`(`detect_anomalies`, tz_localize), `services/api/main.py`(APScheduler) | 초안 |
| stockpulse.sectors | 10개 섹터, 섹터마다 미국 ETF 2 · 종목 5, 한국 ETF 1 · 종목 3(AMZN · TSLA는 두 섹터에 중복) | StockPulse `core/stock_categories.py` | 초안 |
| stockpulse.detect | 이상값: 1분 등락률 미국 3.0% · 한국 4.0% 이상 또는 Z-score 2.0 이상(최근 20개 봉, 둘 중 하나) | StockPulse `k8s/configmap.yaml`(`ANOMALY_THRESHOLD_PERCENT`, `ANOMALY_ZSCORE_THRESHOLD`), `core/stock_fetcher.detect_anomalies` | 초안 |
| stockpulse.classify | 분류: 같은 방향 섹터 ETF 3개 섹터 이상 또는 움직인 섹터 3개 이상 → 시장, ETF 자신 · 자기 섹터 ETF · 같은 섹터 종목 1개 이상 → 업종, 나머지 → 개별 | StockPulse `core/stock_fetcher.classify_event_type` | 초안 |
| stockpulse.workloads | K8s 워크로드 26개 (Deployment 12, StatefulSet 3, DaemonSet 2, CronJob 6, Job 3) | StockPulse `k8s/` | 초안 |
| stockpulse.services | 서비스 8개(Kafka로 이어진 7개 + Next.js 대시보드) + ml-trainer CronJob | StockPulse `services/`(ml-trainer 제외 7개), `frontend/` | 초안 |
| stockpulse.topics | Kafka 토픽 7개(DLQ 2개 포함) | StockPulse `services/*/main.py`, `core/kafka_dlq.py` | 초안 |
| stockpulse.llm | LLM은 Groq `llama-3.3-70b-versatile` (문서의 Gemini 아님) | StockPulse `core/ai_analyzer.py` | 초안 |
| stockpulse.kafka-heap | 브로커 힙 -Xmx256m, startupProbe 최대 630초, grace 90초 | StockPulse `k8s/infrastructure/kafka.yaml` | 초안 |
| stockpulse.retention | 설정에는 압축 1일, 보존 30일(시세) / 90일(분석)이 있지만, 정책이 가리키는 테이블 이름이 앱이 만드는 테이블(anomalies · analysis_results)과 달라 적용되지 않는다. 사이트에는 쓰지 않는다 | StockPulse `k8s/infrastructure/data-retention.yaml`, `services/api/db/connection.py` | 초안 |
| stockpulse.argocd | ignoreDifferences, ServerSideApply, 재시도 5회 | StockPulse `argocd/application.yaml` | 초안 |
| stockpulse.message-size | 수집 기간 K8s 1d / compose 5d, 메시지 최대 10MB(10MB 한도는 처음부터 있었고, 수정 커밋은 기간만 5d → 1d로 줄였다) | StockPulse `k8s/configmap.yaml`(`STOCK_PERIOD`), 커밋 01c6670 · 240204c · 5a1c8ef | 초안 |
| stockpulse.images | CI가 빌드하는 이미지 9종 | StockPulse `.github/workflows/docker-build.yml` | 초안 |
| stockpulse.ml | 한국 25종목, 30일 정확도 52% 미만 또는 7일 경과 시 재학습 | StockPulse `services/ml-trainer/`, `k8s/ml-trainer/cronjob.yaml` | 초안 |
