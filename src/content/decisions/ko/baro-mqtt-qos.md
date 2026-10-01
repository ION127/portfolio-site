---
project: baro
order: 3
title: '위치는 QoS0, 명령은 QoS1 — 그리고 공유 구독'
context: '위치는 차량 수만큼 몇 초마다 쏟아지고 곧 새 값으로 바뀝니다. 반면 배차 명령 · 도착 이벤트 · ACK는 한 건만 빠져도 배차가 꼬입니다. 관제 서비스도 여러 대로 늘릴 수 있어야 했습니다.'
alternatives:
  - '모든 메시지를 QoS1로'
  - 'control 인스턴스마다 전체 토픽 구독'
rationale: '위치는 QoS0로 가볍게, 명령 · 이벤트 · ACK는 QoS1로 확실하게 보냅니다. control은 공유 구독($share/control-service/…)과 인스턴스별 clientId를 써서 여러 대가 떠 있어도 한 메시지는 한 인스턴스만 처리합니다.'
tradeoff: 'QoS0 위치는 연결이 끊기면 유실됩니다. 차량 쪽에 최근 200건 버퍼를 두고, 재연결 때 QoS1 토픽(telemetry/buffered)으로 다시 보내 보완했습니다.'
---
