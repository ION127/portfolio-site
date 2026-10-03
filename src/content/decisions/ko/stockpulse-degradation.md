---
project: stockpulse
order: 4
title: 'Kafka가 없어도 도는 일봉 경로'
context: 'Kafka · 수집기 · 탐지기가 모두 떠 있어야만 동작하면, 인프라 일부가 내려갔을 때 서비스 전체가 멈춥니다. 로컬에서 기능을 확인할 때도 전체 스택이 필요해집니다.'
alternatives:
  - 'Kafka 없이는 기동하지 않기'
rationale: 'api는 Kafka 설정과 상관없이 APScheduler로 한 시간마다(그리고 기동 직후) 일봉 기반 파이프라인(탐지 → 뉴스 → 분석 → 저장)을 직접 돌리고, KAFKA_BOOTSTRAP_SERVERS가 있으면 analysis.completed 컨슈머를 함께 띄웁니다. 그래서 Kafka · 수집기 · 탐지기가 없어도 일봉 기준 결과는 계속 쌓입니다. 두 경로는 같은 탐지 · 분석 모듈(core/)을 써서 로직이 갈라지지 않습니다.'
tradeoff: '일봉 경로는 실시간성이 없고, 운영에서도 스트리밍 경로와 함께 매시간 돌며 아직 분석되지 않은 일봉 신호마다 LLM을 호출합니다.'
---
