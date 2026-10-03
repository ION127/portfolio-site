---
project: stockpulse
order: 2
highlight: false
title: 'Three brokers vs. a small node’s memory'
symptom: 'Without an explicit heap, each broker sized itself from its 2 Gi memory limit, so the three could use up to 6 Gi — an OOMKill risk on 2-core, 8 GB nodes.'
cause: 'The stateful workloads’ default JVM settings were too large for small nodes, and startup and shutdown times weren’t accounted for.'
fix: 'Capped broker and ZooKeeper heaps at -Xmx256m, gave the startupProbe up to 630 s to wait for __consumer_offsets loading, and raised terminationGracePeriodSeconds to 90 s for a clean shutdown.'
lesson: 'For stateful workloads, the time it takes to come up and go down is part of resource design.'
---
Kafka runs three brokers. Replication factor 3 is set only for the consumer-offsets and transaction-log topics; application topics are auto-created and follow the broker defaults. Alongside memory, I tuned startup and shutdown. A starting broker needs time to read `__consumer_offsets`, and while it was loading 54 partitions the liveness probe (60 s) failed first and the pod went into CrashLoopBackOff. On the way down, the default 30-second grace period wasn’t enough for Kafka’s controlled shutdown, so pods repeatedly had to be force-deleted. The startupProbe now allows enough time, and on shutdown the pod waits for the controlled shutdown to finish.
