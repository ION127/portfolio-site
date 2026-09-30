---
project: stockpulse
order: 2
highlight: false
title: '브로커 3대가 작은 노드의 메모리를 넘본다'
symptom: '브로커 3대의 힙을 합치면 6Gi에 가까워, 작은 워커 노드에서는 OOMKill이 날 수 있었어요.'
cause: '스테이트풀 워크로드의 기본 JVM 설정이 작은 노드 기준으로는 컸고, 기동 · 종료 시간도 고려돼 있지 않았어요.'
fix: '브로커 · ZooKeeper 힙을 -Xmx256m으로 제한하고, 재시작 때 __consumer_offsets 로딩을 기다리도록 startupProbe를 최대 630초로, 정상 종료를 위해 terminationGracePeriodSeconds를 90초로 늘렸어요.'
lesson: '스테이트풀 워크로드는 "뜨는 시간"과 "내려가는 시간"까지가 리소스 설계예요.'
---
Kafka는 브로커 3대(RF 3, min ISR 2)로 운영해요. 메모리와 함께 기동 · 종료 시간도 맞췄어요. 브로커가 뜰 때는 `__consumer_offsets`를 읽는 시간이 필요한데, probe가 그보다 먼저 실패로 판정하면 파드가 다시 시작되며 같은 일을 반복할 수 있어요. 그래서 startupProbe로 충분한 시간을 주고, 내려갈 때도 controlled shutdown이 끝날 때까지 기다리게 했어요.
