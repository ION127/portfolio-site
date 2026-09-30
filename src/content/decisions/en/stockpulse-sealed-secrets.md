---
project: stockpulse
order: 6
title: 'Secrets in Git, too — Sealed Secrets'
context: 'With every manifest in Git for GitOps, the question is where secrets go.'
alternatives:
  - 'Create Secrets by hand with kubectl'
  - 'An external secret store (e.g. Vault)'
rationale: 'A manually triggered workflow builds a .env from GitHub Secrets, encrypts six SealedSecrets with kubeseal and commits them. Only the in-cluster controller can decrypt them, so they are safe in Git. The controller itself is managed as an ArgoCD Application.'
tradeoff: 'Losing the controller key means recreating every SealedSecret, so key backup has to be part of operations.'
---
