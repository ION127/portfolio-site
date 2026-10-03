---
project: baro
order: 4
title: '실시간 전달은 WebSocket 대신 SSE'
context: '승객 앱과 관제 화면은 서버가 보내는 위치 · 상태를 받기만 하면 됩니다.'
alternatives:
  - 'WebSocket'
rationale: '단방향 push에는 SSE로 충분하고, 일반 HTTP 위에서 동작해 nginx와 Vercel 함수 프록시를 그대로 통과합니다. 연결이 끊기면 승객 앱은 지수 백오프(1초에서 최대 10초)로, 관제 화면은 브라우저 EventSource 기본 재연결로 다시 붙습니다.'
tradeoff: 'SSE 연결을 서버 메모리가 들고 있어서, 인스턴스를 늘리면 연결이 인스턴스마다 나뉩니다(한계 · 회고 참고).'
---
