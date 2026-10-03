---
project: baro
order: 3
highlight: false
title: 'At 2,000 vehicles, Mosquitto dropped messages'
symptom: 'Load tests with more vehicles showed Mosquitto dropping messages past its queue limit, and at 2,000 vehicles the control service’s MQTT connection was cut too.'
cause: 'Messages beyond max_queued_messages (default 1,000, later 10,000) were being discarded.'
fix: 'Raised the limit to 10,000; when that overflowed too, switched to unlimited (0), then within minutes rolled back to a 50,000 cap because of the out-of-memory risk.'
lesson: 'A queue limit is a “drop when full” policy. Even when raising it, I set a ceiling memory can actually hold instead of going unlimited.'
---
During load testing, messages past the default limit (1,000) were being dropped, so the limit was raised to 10,000 and vehicle connections were staggered at 0.05 s per 10 cars. When the load went up to 2,000 vehicles, the 10,000 limit overflowed as well and the control service’s MQTT connection was cut. The limit was switched to unlimited (0), but unlimited means broker memory grows without bound whenever a subscriber slows down. On a single t3.micro broker that is an OOM risk, so within minutes it was rolled back to a 50,000 cap.
