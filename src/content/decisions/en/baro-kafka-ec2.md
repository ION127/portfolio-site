---
project: baro
order: 2
title: 'Moving Kafka from ECS Fargate to EC2 + EBS (single-node KRaft)'
context: 'Kafka first ran as an ECS Fargate task with data on EFS. The advertised listener address clients connect to was hard to pin down, and the log storage sat on a network file system.'
alternatives:
  - 'Keep ECS Fargate + EFS (the original setup)'
  - 'Amazon MSK'
rationale: 'A fixed private IP and a Cloud Map name (kafka.baro.internal) pin the advertised listener, and logs sit on EBS gp3. vehicle-data-topic has four partitions to match dispatch’s consumer concurrency of four.'
tradeoff: 'With one broker (RF=1), a broker failure stops the position stream. Positions are ephemeral and kept for only an hour, so cost came first.'
---
