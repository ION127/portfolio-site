---
project: baro
order: 2
highlight: true
title: 'Consumer lag hit 2.9M — the culprit was a DB query on the hot path'
symptom: 'dispatch fell behind on positions and Kafka consumer lag grew to 2.9M.'
cause: 'For every position message (about 333 per second), it looked up the vehicle’s active dispatch in the database.'
fix: 'Cached the vehicle → dispatch mapping in memory so message handling no longer touches the database.'
result: 'The per-message query disappeared and the lag cleared.'
lesson: 'On a path that runs hundreds of times a second, even one query is expensive. Clear I/O off the hot path first.'
---
dispatch reads every position from Kafka and, if the car is on a trip, pushes it to the rider app over SSE. The problem was that it asked the database "is this car on a trip?" for every message. With 1,500 cars reporting every few seconds, that meant hundreds of queries per second; consumption fell behind production and the lag ballooned to 2.9M.

Now the mapping is updated only when a dispatch starts or ends, and message handling reads memory only.
