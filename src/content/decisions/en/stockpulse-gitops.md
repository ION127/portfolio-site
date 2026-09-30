---
project: stockpulse
order: 5
title: 'GitOps with image-tag commits and ArgoCD'
context: 'Building nine services’ images and rolling them out by hand makes it hard to know what is running at which version.'
alternatives:
  - 'Deploy straight from CI with kubectl apply'
rationale: 'CI builds only changed services, pushes them to Harbor and commits the new image tags (commit SHAs) to the manifests, with [skip ci] preventing loops. ArgoCD sees the commit and makes the cluster match Git with selfHeal and prune, so Git history answers what is deployed.'
tradeoff: 'Tag commits pile up in the history, and ArgoCD’s own constraints (annotation limits, cluster-populated fields) needed separate handling (see the operations log).'
---
