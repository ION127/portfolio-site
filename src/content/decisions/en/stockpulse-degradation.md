---
project: stockpulse
order: 4
title: 'A daily-bar path that runs without Kafka'
context: 'If the service works only when Kafka, the collectors and the detector are all up, losing any part of the infrastructure stops everything — and even checking a feature locally needs the full stack.'
alternatives:
  - 'Refuse to start without Kafka'
rationale: 'Regardless of the Kafka settings, the api runs a daily-bar pipeline (detect → news → analyze → store) itself with APScheduler every hour and right after startup, and when KAFKA_BOOTSTRAP_SERVERS is set it also starts an analysis.completed consumer. So daily-bar results keep accumulating even without Kafka, the collectors or the detector. Both paths use the same detection and analysis modules (core/), so the logic doesn’t drift.'
tradeoff: 'The daily-bar path isn’t real time, and in production it runs every hour alongside the streaming path, adding that many LLM calls.'
---
