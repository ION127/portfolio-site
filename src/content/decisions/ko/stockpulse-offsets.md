---
project: stockpulse
order: 1
title: '단계마다 다른 consumer offset 전략'
context: '파이프라인 단계마다 재시작했을 때 바라는 동작이 다릅니다. 놓친 메시지를 다시 처리해야 하는 단계도, 다시 처리하면 곤란한 단계도 있습니다.'
alternatives:
  - '모든 consumer를 earliest로'
  - '모든 consumer를 latest로'
rationale: '탐지 · 뉴스 수집 · 알림은 earliest로 두어 재시작해도 놓친 메시지를 다시 처리합니다. LLM 분석과 api는 latest로 두어, 재시작 때 밀린 메시지에 LLM 비용이 한꺼번에 나가거나 같은 신호가 대시보드에 다시 뜨지 않게 했습니다.'
tradeoff: 'latest 단계는 꺼져 있던 동안의 메시지를 건너뜁니다. 분석이 빠진 신호는 대시보드의 "과거 재분석"으로 다시 돌릴 수 있습니다.'
---
