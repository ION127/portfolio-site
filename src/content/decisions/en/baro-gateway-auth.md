---
project: baro
order: 5
title: 'Authenticate once at the gateway, block internal paths twice'
context: 'With five services, verifying JWTs in each one would scatter verification logic and key management.'
alternatives:
  - 'Verify JWTs in every service'
rationale: 'JWTs are verified only at the gateway, and user details travel in X-Authenticated-User-* headers; if a client sends headers with those names, the gateway strips them. Service-to-service calls are checked with X-Internal-Api-Key, and internal paths are blocked twice — at the ALB (403) and the gateway (404).'
tradeoff: 'Services trust the headers on the assumption that they sit behind the gateway, so ALB and security group rules must keep internal paths from ever being exposed.'
---
