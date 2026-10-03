---
project: stockpulse
order: 3
highlight: false
title: 'A service name nearly overwrote Kafka’s config'
symptom: 'Unintended KAFKA_* environment variables could be injected into the Kafka pods.'
cause: 'Kubernetes injects variables such as KAFKA_PORT into pods for every service in the namespace, and the Confluent image reads any KAFKA_-prefixed variable as broker config.'
fix: 'Set enableServiceLinks: false on the Kafka pods to turn off the injection.'
lesson: 'Values a platform injects on its own can collide with an application’s conventions. I check how an image interprets environment variables first.'
---
With a service named `kafka`, Kubernetes adds variables like `KAFKA_PORT=tcp://…` and `KAFKA_SERVICE_HOST` to every pod. To the Confluent image those are just more `KAFKA_` settings, so they can be misread as broker config. With service links disabled, the pod sees only the variables written in the manifest.
