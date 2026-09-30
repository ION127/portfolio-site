---
project: stockpulse
order: 4
title: 'Kafka가 없어도 도는 폴백 경로'
context: 'Kafka · 수집기 · 탐지기가 모두 떠 있어야만 동작하면, 인프라 일부가 내려갔을 때 서비스 전체가 멈춰요. 로컬에서 기능을 확인할 때도 전체 스택이 필요해져요.'
alternatives:
  - 'Kafka 없이는 기동하지 않기'
rationale: 'KAFKA_BOOTSTRAP_SERVERS가 비어 있으면 api가 APScheduler로 한 시간마다 일봉 기반 파이프라인(탐지 → 뉴스 → 분석 → 저장)을 직접 돌려요. 두 경로는 같은 탐지 · 분석 모듈(core/)을 써서 로직이 갈라지지 않아요.'
tradeoff: '폴백은 일봉 기준이라 실시간성이 없어요. 운영에서는 스트리밍 경로가 기본이에요.'
---
