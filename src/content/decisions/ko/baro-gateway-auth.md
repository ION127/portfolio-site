---
project: baro
order: 5
title: '인증은 gateway 한 곳에서, 내부 경로는 이중으로 차단'
context: '서비스가 다섯 개로 나뉘면서, 서비스마다 JWT를 검증하면 검증 로직과 키 관리가 흩어져요.'
alternatives:
  - '서비스마다 JWT 검증'
rationale: 'JWT는 gateway에서만 검증하고, 사용자 정보는 X-Authenticated-User-* 헤더로 넘겨요. 클라이언트가 같은 이름의 헤더를 보내면 gateway가 지워요. 서비스 간 호출은 X-Internal-Api-Key로 확인하고, 내부 경로는 ALB(403)와 gateway(404)에서 이중으로 막아요.'
tradeoff: '서비스는 gateway 뒤에 있다는 전제로 헤더를 믿어요. 그래서 내부 경로가 외부에 열리지 않도록 ALB · 보안그룹 규칙을 함께 지켜야 해요.'
---
