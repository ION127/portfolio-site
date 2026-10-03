---
project: stockpulse
order: 3
title: '외부 API 실패는 기다리고, 끊고, DLQ로 격리'
context: 'LLM과 Slack 같은 외부 API는 언제든 느려지거나 429를 돌려줍니다. 메시지 하나의 실패가 파이프라인 전체를 막으면 안 됩니다.'
alternatives:
  - '실패한 메시지를 성공할 때까지 계속 재시도'
  - '실패한 메시지 버리기'
rationale: 'ai-analyzer는 429 응답에 적힌 대기 시간을 읽어 기다렸다 다시 부르고(최대 3번), 연속 5번 실패하면 60초 동안 호출을 끊습니다(서킷브레이커). 서킷이 열린 동안 들어온 메시지는 원래 토픽 · 에러 · 시각을 담아 news.fetched.dlq로 보냅니다. 그 밖의 실패는 "분석 실패" 문구로 analysis.completed에 흘려보내고, 대시보드의 "과거 재분석"으로 다시 분석할 수 있습니다. notifier도 Slack 전송을 5초 간격으로 최대 3번 시도한 뒤 analysis.completed.dlq로 보냅니다.'
tradeoff: 'DLQ에 쌓인 메시지를 다시 흘려보내는 도구는 아직 없습니다.'
---
