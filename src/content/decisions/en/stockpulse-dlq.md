---
project: stockpulse
order: 3
title: 'Wait, cut off and quarantine external API failures in a DLQ'
context: 'External APIs like the LLM and Slack can slow down or return 429 at any time. One message’s failure must not block the whole pipeline.'
alternatives:
  - 'Retry a failed message until it succeeds'
  - 'Drop failed messages'
rationale: 'ai-analyzer reads the wait time in a 429 response and retries after it, and after five consecutive failures it stops calling for 60 seconds (circuit breaker). Messages that still fail go to news.fetched.dlq with the original topic, error and timestamp. notifier likewise sends to analysis.completed.dlq after three Slack retries.'
tradeoff: 'There is no tool yet to replay messages from the DLQs.'
---
