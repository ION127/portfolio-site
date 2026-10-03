---
project: stockpulse
order: 2
highlight: false
title: '브로커 3대가 작은 노드의 메모리를 넘본다'
symptom: '힙을 지정하지 않으면 브로커마다 메모리 limit(2Gi) 기준으로 잡혀 세 대가 최대 6Gi를 쓸 수 있었고, 2코어 8GB 노드에서는 OOMKill 위험이 있었습니다.'
cause: '스테이트풀 워크로드의 기본 JVM 설정이 작은 노드 기준으로는 컸고, 기동 · 종료 시간도 고려돼 있지 않았습니다.'
fix: '브로커 · ZooKeeper 힙을 -Xmx256m으로 제한하고, 재시작 때 __consumer_offsets 로딩을 기다리도록 startupProbe를 최대 630초로, 정상 종료를 위해 terminationGracePeriodSeconds를 90초로 늘렸습니다.'
lesson: '스테이트풀 워크로드는 "뜨는 시간"과 "내려가는 시간"까지가 리소스 설계입니다.'
---
Kafka는 브로커 3대로 운영합니다. 복제 계수 3은 컨슈머 오프셋 · 트랜잭션 로그 토픽에만 지정했고, 애플리케이션 토픽은 자동 생성에 맡겨 브로커 기본값을 따릅니다. 메모리와 함께 기동 · 종료 시간도 맞췄습니다. 브로커가 뜰 때는 `__consumer_offsets`를 읽는 시간이 필요한데, 파티션 54개를 읽는 동안 liveness probe(60초)가 먼저 실패해 파드가 CrashLoopBackOff에 빠졌습니다. 내려갈 때도 기본 30초 유예로는 controlled shutdown이 끝나지 않아 강제 종료가 반복됐습니다. 그래서 startupProbe로 충분한 시간을 주고, 종료 때도 controlled shutdown이 끝날 때까지 기다리게 했습니다.
