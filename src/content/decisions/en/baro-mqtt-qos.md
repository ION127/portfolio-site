---
project: baro
order: 3
title: 'QoS 0 for positions, QoS 1 for commands — plus shared subscriptions'
context: 'Positions pour in from every car every second or so and are soon replaced by newer ones, while a single lost dispatch command, arrival event or ACK breaks a dispatch. The control service also had to scale to several instances.'
alternatives:
  - 'QoS 1 for every message'
  - 'Every control instance subscribing to all topics'
rationale: 'Positions are sent at QoS 0 to stay lightweight; commands, events and ACKs use QoS 1 for at-least-once delivery. The control service uses a shared subscription ($share/control-service/…) and a per-instance clientId, so with several instances each message is handled by only one.'
tradeoff: 'QoS 0 positions are lost while a connection is down. Each one is soon replaced by a newer position, so that loss was accepted.'
---
