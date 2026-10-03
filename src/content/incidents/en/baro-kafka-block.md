---
project: baro
order: 1
highlight: true
title: 'When Kafka stalled, the control console stalled too'
symptom: 'The control console showed only one vehicle, and Mosquitto logs filled with “Broken pipe” errors.'
cause: 'The Kafka producer’s default wait (max.block.ms, 60 s) blocked the MQTT receive thread, and the broker’s queue overflowed.'
fix: 'Cut max.block.ms to 500 ms and retries to 0 so a Kafka outage can no longer spill into MQTT ingestion.'
result: 'Even with Kafka down, MQTT ingestion and the console’s SSE keep working.'
lesson: 'A default timeout on a synchronous call can carry a failure into the next system. I set timeouts per path instead of trusting defaults.'
---
The control service fans each MQTT position out to two places: the control console (SSE) and Kafka. When the Kafka broker went down, the producer waited for metadata and blocked in `send()` for up to 60 seconds — inside the MQTT receive thread. While ingestion stalled, Mosquitto’s queue filled up and the connection broke (“Broken pipe”), and the console showed just one vehicle.

Kafka only stores positions, so losing a few briefly is acceptable; the console must never freeze. Publishing now fails fast when it takes too long, and the failure log is written at most once every 30 seconds. Failures are counted by the existing metric (`baro_control_telemetry_kafka_publish_failed_total`).
