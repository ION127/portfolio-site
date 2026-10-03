---
project: baro
order: 3
highlight: false
title: 'At 2,000 vehicles, Mosquitto started dropping messages'
symptom: 'Load tests with more vehicles showed Mosquitto dropping messages past its queue limit, and at 2,000 vehicles the control service’s MQTT connection dropped too.'
cause: 'Messages beyond max_queued_messages (default 1,000, later 10,000) were being discarded.'
fix: 'Raised the limit to 10,000; when that overflowed too, switched to unlimited (0), then within minutes rolled back to a 50,000 cap because of the out-of-memory risk.'
lesson: 'A queue limit is a “drop when full” policy. Even when raising it, I set a ceiling memory can actually hold instead of going unlimited.'
---
At around 1,000 vehicles, messages past the default limit (1,000) were being dropped, so I raised it to 10,000. When the load went up to 2,000 vehicles, 10,000 overflowed as well and the control service’s MQTT connection dropped. I switched the limit to unlimited (0), but unlimited means broker memory grows without bound whenever a subscriber slows down. On a single t3.micro broker that is an OOM risk, so within minutes I rolled back to a 50,000 cap, and staggered vehicle connections by 0.05 s per 10 cars to soften connection storms.
