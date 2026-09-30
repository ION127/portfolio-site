---
project: baro
order: 1
highlight: true
title: 'When Kafka stalled, the control console stalled too'
symptom: 'The control console showed only one vehicle, and Mosquitto logs filled with broken pipes.'
cause: 'The Kafka producer’s default wait (max.block.ms, 60 s) held the MQTT receive thread, and the broker’s queue overflowed.'
fix: 'Cut max.block.ms to 500 ms and retries to 0 so a Kafka outage can no longer spill into MQTT receiving.'
result: 'With Kafka down, MQTT receiving and the console’s SSE keep working.'
lesson: 'A default timeout on a synchronous call can carry a failure into the next system. I set timeouts per path instead of trusting defaults.'
---
control-service fans each MQTT position out to two places: the control console (SSE) and Kafka. When the Kafka broker dropped, the producer waited for metadata and blocked in `send()` for up to 60 seconds — inside the MQTT receive thread. While receiving stalled, Mosquitto’s queue filled up and the connection broke (broken pipe), leaving the console with only the last vehicle it had heard from.

Kafka only stores positions, so losing a few briefly is acceptable; the console must never freeze. Publishing now fails fast when it takes too long, and failures are visible as a metric (`baro_control_telemetry_kafka_publish_failed_total`).
