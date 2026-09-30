---
project: stockpulse
order: 1
title: 'A different consumer offset strategy per stage'
context: 'Each pipeline stage wants different behavior after a restart: some must reprocess what they missed, others must not.'
alternatives:
  - 'earliest for every consumer'
  - 'latest for every consumer'
rationale: 'Detection, news fetching and notifications use earliest, so a restart reprocesses missed messages. LLM analysis and api use latest, so a restart doesn’t trigger a burst of LLM costs on the backlog or re-show the same signals on the dashboard.'
tradeoff: 'latest stages skip messages from while they were down. Signals that missed analysis can be re-run with the dashboard’s "reanalyze past" action.'
---
