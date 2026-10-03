---
project: stockpulse
order: 3
title: 'External API failures: back off, break the circuit, park in a DLQ'
context: 'External APIs like the LLM and Slack can slow down or return 429 at any time. One message’s failure must not block the whole pipeline.'
alternatives:
  - 'Retry a failed message until it succeeds'
  - 'Drop failed messages'
rationale: 'ai-analyzer reads the wait time in a 429 response and retries after it (up to three attempts), and after five consecutive failures it stops calling for 60 seconds (circuit breaker). Messages that arrive while the circuit is open go to news.fetched.dlq with the original topic, error and timestamp. Other failures flow on to analysis.completed as an “analysis failed” note and can be re-run with the dashboard’s “reanalyze past” action. The notifier likewise tries Slack up to three times, 5 seconds apart, before sending to analysis.completed.dlq.'
tradeoff: 'There is no tool yet to replay messages from the DLQs.'
---
