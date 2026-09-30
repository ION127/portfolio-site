---
project: stockpulse
order: 2
title: 'Classifying signals with ETFs as sector thermometers'
context: 'When one stock jumps, whether it is company news or a sector-wide move changes both the cause and the news worth reading.'
alternatives:
  - 'Judge each stock alone and leave cause-finding to the LLM'
rationale: 'Each sector has ETFs as thermometers: three or more sector ETFs moving the same way means MARKET; the sector’s ETF or peers moving together means SECTOR; otherwise INDIVIDUAL. The class also shifts the LLM prompt’s focus to company, sector or macro issues.'
tradeoff: 'Classification quality depends on ETF coverage and thresholds, which need tuning per market (higher in Korea because of the ±30% daily limit).'
---
