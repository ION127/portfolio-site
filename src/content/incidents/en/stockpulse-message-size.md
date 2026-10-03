---
project: stockpulse
order: 4
highlight: false
title: 'Minute-bar batches outgrew Kafka’s message limit'
symptom: 'Sending 1-minute bars for 68 US tickers as one message hit the message size limit.'
cause: 'The collector packed the whole lookup window (5 days by default) into a single batch message.'
fix: 'Cut the lookup window from 5 days to 1 day in the Kubernetes deployment so the batch fits within the 10 MB message limit that had been set from the start.'
lesson: '“One batch = one message” runs into limits as data grows. For messages that can grow, I decide the split unit up front.'
---
Every 60 seconds the collector sends all tickers’ minute bars at once under the key `batch`. The default five-day window means close to 2,000 bars per ticker, which easily passes 10 MB, so the cluster config sends only one day.
