---
project: baro
order: 6
title: 'One RDS instance, one schema per service'
context: 'A database instance per service multiplies cost by the number of services.'
alternatives:
  - 'An RDS instance per service'
rationale: 'One RDS PostgreSQL instance (db.t4g.micro) holds separate user, dispatch, relocation and control schemas so services don’t touch each other’s tables. A one-off ECS task (db-init) creates the schemas.'
tradeoff: 'Every service shares database failures and load. Splitting into per-service instances is the next step as traffic grows.'
---
