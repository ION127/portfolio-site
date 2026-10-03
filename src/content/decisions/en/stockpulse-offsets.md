---
project: stockpulse
order: 1
title: 'A different consumer offset strategy per stage'
context: 'Each pipeline stage wants a different starting point: some must process everything still in the topic, others must not pick up old messages.'
alternatives:
  - 'All consumers on earliest'
  - 'All consumers on latest'
rationale: 'Consumer groups resume from their committed offsets, so this setting decides where a group starts when it has none — on first deploy or after its offsets expire. Detection, news fetching and notifications use earliest and start from what is still in the topic; LLM analysis and the api use latest, so a backlog at that moment doesn’t trigger a burst of LLM costs or re-show old signals on the dashboard.'
tradeoff: 'Stages on latest skip whatever piled up before they first attached, and skipped signals never reach the database. The dashboard’s “reanalyze past” action only re-runs stored signals from the last 7 days whose analysis is missing or failed (up to 30).'
---
