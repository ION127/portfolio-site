---
project: baro
order: 2
highlight: true
title: 'Consumer lag hit 2.9M — the culprit was a DB query on the hot path'
symptom: 'The dispatch service fell behind on positions, and Kafka consumer lag grew to 2.9M.'
cause: 'For every position message, it looked up the vehicle’s active dispatch in the database.'
fix: 'Cached the vehicle → dispatch mapping in memory so message handling no longer touches the database.'
result: 'The per-message query disappeared and the lag cleared.'
lesson: 'On a path that runs for every message, even one query is expensive. I move I/O off the hot path first.'
---
The dispatch service reads every position from Kafka and, if the car is currently dispatched, pushes it to the rider app over SSE. The problem was that it asked the database “is this car dispatched?” for every message. With 1,000 cars at the time, each reporting once a second, that meant close to 1,000 queries per second; consumption couldn’t keep up with the publish rate, and the lag ballooned to 2.9M.

Now the mapping is registered when the rider app opens its position stream (SSE) and removed when the last connection closes, and message handling reads memory only.
