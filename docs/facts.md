# 사실 원장

사이트에 나오는 숫자와 주장의 출처. 사실의 기준은 README가 아니라 **코드**다. 사용자 확인이 끝나면 `확인`을 `확정`으로 바꾼다.

| id | 내용 | 출처 | 확인 |
|---|---|---|---|
| baro.period | 2026-04-14 ~ 06-29, 5인 팀, 역할 BE/DevOps | baro-team/.github `profile/README.md` | 초안 |
| baro.my-prs | 내가 머지한 PR 128개(2026-04-24 ~ 06-26, 6개 저장소: terraform 53 · server 44 · admin 19 · edge 5 · kafka 5 · mobile 2) | GitHub 검색 `author:ION127 org:baro-team is:merged` | 초안 |
| baro.vehicles | 동시 시뮬레이션 차량 1,500대 | baro-edge `config.py` (`vehicle_count`) | 초안 |
| baro.stands | 서울 택시승차대 254곳에서 출발 | baro-edge `config.py` (승차대 좌표) | 초안 |
| baro.lag | Kafka consumer lag 2.9M → hot path DB 조회 제거로 해소 | baro-server PR #89 | 초안 |
| baro.lag-rate | 메시지마다 DB 조회, 초당 약 333회 | baro-server PR #89 | 초안 |
| baro.kafka-block | producer `max.block.ms` 60000 → 500, retries 0 | baro-server PR #103 | 초안 |
| baro.mosquitto-queue | `max_queued_messages` 1000 → 10000 → 50000, 0(무제한) 기각 | baro-edge `mosquitto.conf`, baro-terraform | 초안 |
| baro.stagger | 10대마다 0.05초 간격 접속, IoT Core 시절 1.2초 | baro-edge `vehicle_simulator.py` | 초안 |
| baro.partitions | vehicle-data-topic 4 파티션, 보관 1시간 / 256MB | baro-terraform `envs/dev/kafka-userdata.sh.tpl` | 초안 |
| baro.ecs-services | ECS Fargate 서비스 7개 | baro-terraform `envs/dev/locals.tf` | 초안 |
| baro.dispatch-geo | GEOSEARCH 15km 후보 10대, stale 300초, SETNX 30초 | dispatch-service `ConfirmDispatchService.kt`, `RedisDispatchableCarProjection.kt` | 초안 |
| baro.ack-timeout | ACK 10초 타임아웃, 재배차 스케줄러 5초 | dispatch-service `DispatchRetryService.kt` | 초안 |
| baro.reloc-score | 점수 = 0.7·가중치 − 0.3·거리, ST_DWithin 10km → 30km | relocation-service `RelocationService.kt` | 초안 |
| baro.airflow | 매일 02:00 KST `baro_pipeline`, XGBoost | airflow-dags-repo `dags/baro_pipeline.py` | 초안 |
| baro.iot-core-switch | IoT Core → EC2 Mosquitto 전환 (2026-06-16) | baro-terraform PR #44 | 초안 |
| baro.kafka-ec2 | Kafka ECS+EFS → EC2+EBS 이전 (2026-06-04) | baro-terraform `ec2-kafka.tf` | 초안 |
| stockpulse.period | 2026.03 (저장소 커밋 2026-03-16 ~ 03-27) | GitHub API `created_at` / `pushed_at` | 초안 |
| stockpulse.my-commits | 내 커밋 119개(2026-03-16 ~ 03-27, 병합 커밋과 github-actions 자동 커밋 제외) | GitHub API `repos/ION127/StockPulse/commits` | 초안 |
| stockpulse.tickers | 추적 종목 108개 (미국 68 + 한국 40) | StockPulse `core/stock_categories.py` | 초안 |
| stockpulse.workloads | K8s 워크로드 26개 (Deployment 12, StatefulSet 3, DaemonSet 2, CronJob 6, Job 3) | StockPulse `k8s/` | 초안 |
| stockpulse.services | 서비스 8개 + ml-trainer CronJob | StockPulse `services/` | 초안 |
| stockpulse.topics | Kafka 토픽 7개(DLQ 2개 포함) | StockPulse `services/*/main.py`, `core/kafka_dlq.py` | 초안 |
| stockpulse.llm | LLM은 Groq `llama-3.3-70b-versatile` (문서의 Gemini 아님) | StockPulse `core/ai_analyzer.py` | 초안 |
| stockpulse.kafka-heap | 브로커 힙 -Xmx256m, startupProbe 최대 630초, grace 90초 | StockPulse `k8s/infrastructure/kafka.yaml` | 초안 |
| stockpulse.retention | 압축 1일, 보존 30일(시세) / 90일(분석) | StockPulse `k8s/infrastructure/data-retention.yaml` | 초안 |
| stockpulse.argocd | ignoreDifferences, ServerSideApply, 재시도 5회 | StockPulse `argocd/application.yaml` | 초안 |
| stockpulse.message-size | 수집 기간 K8s 1d / compose 5d, 메시지 최대 10MB | StockPulse `k8s/stock-collector/deployment.yaml`, `services/stock-collector/` | 초안 |
| stockpulse.images | CI가 빌드하는 이미지 9종 | StockPulse `.github/workflows/docker-build.yml` | 초안 |
| stockpulse.ml | 한국 25종목, 30일 정확도 52% 미만 또는 7일 경과 시 재학습 | StockPulse `services/ml-trainer/`, `k8s/ml-trainer/cronjob.yaml` | 초안 |
