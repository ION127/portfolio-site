---
project: baro
order: 1
title: 'AWS IoT Core 대신 EC2에서 Mosquitto를 직접 운영'
context: '처음에는 AWS IoT Core(mTLS, X.509 인증서)로 차량과 통신했어요. 시뮬레이터 차량을 늘리자 연결 속도 제한 때문에 접속을 10대마다 1.2초씩 늦춰야 했고, 비용도 차량 수에 비례해 늘었어요.'
alternatives:
  - 'AWS IoT Core 유지(기존 구성)'
rationale: '브로커 설정(큐 한도 · 인증 · 세션)을 직접 조정할 수 있고, 연결 속도 제한이 없어 10대마다 0.05초 간격으로 1,000대를 약 5초 만에 붙일 수 있어요.'
tradeoff: '가용성 · 패치 · 모니터링을 직접 책임져야 해요. 인증 정보는 Secrets Manager에 두고, 배포는 SSM으로 자동화해 운영 부담을 줄였어요.'
---
