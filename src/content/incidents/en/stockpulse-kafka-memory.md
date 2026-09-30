---
project: stockpulse
order: 2
highlight: false
title: 'Three brokers eyeing a small node’s memory'
symptom: 'Three brokers’ heaps added up to nearly 6 Gi, enough to risk OOMKills on small worker nodes.'
cause: 'Default JVM settings for the stateful workloads were sized for bigger machines, and startup and shutdown times weren’t accounted for.'
fix: 'Capped broker and ZooKeeper heaps at -Xmx256m, gave the startupProbe up to 630 s to wait for __consumer_offsets loading, and raised terminationGracePeriodSeconds to 90 s for a clean shutdown.'
lesson: 'For stateful workloads, the time it takes to come up and go down is part of resource design.'
---
Kafka runs three brokers (RF 3, min ISR 2). Alongside memory, I tuned startup and shutdown: a starting broker needs time to read `__consumer_offsets`, and if a probe declares failure first, the pod restarts and repeats the same work. The startupProbe now allows enough time, and shutdown waits for the controlled shutdown to finish.
