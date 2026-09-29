---
project: baro
order: 1
highlight: true
title: 'Kafka가 멈추자 관제 화면도 멈췄다'
symptom: '관제 화면에 차량이 1대만 보이고, Mosquitto 로그에 Broken pipe가 쌓였어요.'
cause: 'Kafka producer의 기본 대기 시간(max.block.ms 60초) 동안 MQTT 수신 스레드가 붙잡혀 브로커 큐가 넘쳤어요.'
fix: 'max.block.ms를 500ms로, 재시도를 0으로 줄여 Kafka 장애가 MQTT 수신까지 번지지 않게 격리했어요.'
result: 'Kafka가 끊겨도 MQTT 수신과 관제 화면 SSE는 계속 동작해요.'
lesson: '동기 호출의 기본 타임아웃은 장애를 옆 시스템으로 옮기는 통로가 될 수 있어요. 기본값을 그대로 믿지 않고 경로마다 타임아웃을 정해요.'
---
control-service는 MQTT로 받은 위치를 두 곳으로 보내요. 관제 화면(SSE)과 Kafka예요. Kafka 브로커가 끊기자 producer가 메타데이터를 기다리며 `send()`에서 최대 60초 동안 멈췄고, 이 호출은 MQTT 수신 스레드 안에서 일어나고 있었어요. 수신이 멈춘 사이 Mosquitto 쪽 큐가 가득 차 연결이 끊겼고(Broken pipe), 관제 화면에는 마지막으로 들어온 차량 1대만 남았어요.

Kafka는 위치를 쌓아 두는 용도라 잠깐 유실돼도 괜찮지만, 관제 화면은 멈추면 안 돼요. 그래서 발행이 오래 걸리면 바로 실패하도록 바꾸고, 실패 수는 메트릭(`baro_control_telemetry_kafka_publish_failed_total`)으로 보이게 했어요.
