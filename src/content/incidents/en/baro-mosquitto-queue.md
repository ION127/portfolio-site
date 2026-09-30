---
project: baro
order: 3
highlight: false
title: 'At 2,000 vehicles, Mosquitto started dropping messages'
symptom: 'A load test with 2,000 vehicles showed dropped messages.'
cause: 'Messages beyond Mosquitto’s default max_queued_messages (1,000) were being discarded.'
fix: 'Raised the limit to 10,000 and then 50,000. Unlimited (0) was rejected because of the out-of-memory risk.'
lesson: 'A queue limit is a "drop when full" policy. Even when raising it, pick a ceiling memory can actually hold instead of going unlimited.'
---
While raising the vehicle count to 2,000, the broker was trimming undelivered messages at its queue limit. Raising the limit is easy, but unlimited means broker memory grows without bound whenever a subscriber slows down. On a single t3.micro broker I capped it at 50,000, and staggered vehicle connections by 0.05 s per 10 cars to soften connection storms.
