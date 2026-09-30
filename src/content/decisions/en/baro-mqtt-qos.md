---
project: baro
order: 3
title: 'QoS 0 for positions, QoS 1 for commands — plus shared subscriptions'
context: 'Positions pour in every few seconds from every car and are soon replaced by newer ones, while a single lost dispatch command, arrival event or ACK breaks a dispatch. The control service also had to scale to several instances.'
alternatives:
  - 'QoS 1 for every message'
  - 'Every control instance subscribing to all topics'
rationale: 'Positions go light at QoS 0; commands, events and ACKs go reliably at QoS 1. control uses a shared subscription ($share/control-service/…) and a per-instance clientId, so with several instances each message is handled by only one.'
tradeoff: 'QoS 0 positions are lost while a connection is down. Cars keep the last 200 in a buffer and resend them on reconnect over a QoS 1 topic (telemetry/buffered).'
---
