---
project: stockpulse
order: 2
title: 'Classifying signals with ETFs as sector thermometers'
context: 'When one stock jumps, the likely cause, and the news worth looking up, depends on whether the move is company-specific or sector-wide.'
alternatives:
  - 'Judge each stock alone and leave cause-finding to the LLM'
rationale: 'Each sector has ETFs as thermometers. If same-direction sector ETFs span three or more sectors, or three or more sectors move the same way, it is MARKET; if the mover is the sector ETF itself, or the sector’s ETF or peers move with it, it is SECTOR; otherwise INDIVIDUAL. The event type also shifts the LLM prompt’s focus to company, sector or macro issues.'
tradeoff: 'Classification quality depends on ETF coverage and thresholds, which need tuning per market (higher in Korea because of the ±30% daily price limit).'
---
