---
project: baro
order: 6
title: 'One RDS instance, one schema per service'
context: 'A database instance per service multiplies cost by the number of services.'
alternatives:
  - 'An RDS instance per service'
rationale: 'One RDS PostgreSQL instance (db.t4g.micro) holds user, dispatch, relocation and control schemas; the user, dispatch and relocation services each use only their own schema through currentSchema in the connection URL (the control schema exists, but the control service uses no database). A one-off ECS task (db-init) creates the schemas.'
tradeoff: 'The services share one database account, so nothing but convention keeps them out of each other’s schemas, and every service shares database failures and load. Per-service accounts and instances are the next step.'
---
