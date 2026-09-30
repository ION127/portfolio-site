---
project: stockpulse
order: 4
title: 'A fallback path that runs without Kafka'
context: 'If everything depends on Kafka, the collectors and the detector all being up, losing part of the infrastructure stops the whole service — and checking features locally needs the full stack.'
alternatives:
  - 'Refuse to start without Kafka'
rationale: 'When KAFKA_BOOTSTRAP_SERVERS is empty, api runs a daily-bar pipeline (detect → news → analyze → store) itself every hour with APScheduler. Both paths use the same detection and analysis modules (core/), so the logic doesn’t drift.'
tradeoff: 'The fallback works on daily bars, so it isn’t real time. In production the streaming path is the default.'
---
