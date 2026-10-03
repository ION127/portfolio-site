---
project: stockpulse
order: 3
highlight: false
title: '서비스 이름이 Kafka 설정을 덮어쓸 뻔했다'
symptom: 'Kafka 파드에 의도하지 않은 KAFKA_* 환경변수가 주입될 수 있었습니다.'
cause: '쿠버네티스는 같은 네임스페이스의 서비스마다 KAFKA_PORT 같은 환경변수를 파드에 자동으로 넣는데, Confluent 이미지는 KAFKA_로 시작하는 환경변수를 브로커 설정으로 읽습니다.'
fix: 'Kafka 파드에 enableServiceLinks: false를 넣어 자동 주입을 껐습니다.'
lesson: '플랫폼이 자동으로 넣어 주는 값이 애플리케이션의 규칙과 부딪힐 수 있습니다. 이미지가 환경변수를 어떻게 해석하는지 먼저 확인합니다.'
---
서비스 이름이 `kafka`이면 쿠버네티스는 `KAFKA_PORT=tcp://…`, `KAFKA_SERVICE_HOST` 같은 변수를 모든 파드에 넣습니다. Confluent 이미지 입장에서는 이것도 `KAFKA_`로 시작하는 설정값이라 브로커 설정으로 잘못 해석될 수 있습니다. 서비스 링크 주입을 끄면 파드에는 매니페스트에 적은 환경변수만 남습니다.
