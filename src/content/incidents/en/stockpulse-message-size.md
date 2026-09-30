---
project: stockpulse
order: 4
highlight: false
title: 'Minute-bar batches outgrew Kafka’s message limit'
symptom: 'Sending 1-minute bars for 68 US tickers as one message hit the message size limit.'
cause: 'The collector packed the whole lookup window (5 days by default locally) into a single batch message.'
fix: 'The Kubernetes deployment uses a 1-day window, and the message limit is set to 10 MB.'
lesson: '"One batch = one message" runs into limits as data grows. Decide how to split messages that can get big.'
---
Every 60 seconds the collector sends all tickers’ minute bars at once under the key `batch`. Locally it sent five days, but in the cluster it sends only one day to stay under the message size limit.
