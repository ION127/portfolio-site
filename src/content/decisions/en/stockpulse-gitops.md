---
project: stockpulse
order: 5
title: 'GitOps with image-tag commits and ArgoCD'
context: 'Building nine images — eight services plus ml-trainer — and rolling them out by hand makes it hard to know what is running at which version.'
alternatives:
  - 'Deploy straight from CI with kubectl apply'
rationale: 'CI builds only changed services, pushes their images to Harbor and commits the new image tags (commit SHAs) to the manifests, with [skip ci] preventing loops. ArgoCD picks up the commit and syncs the cluster to Git with selfHeal and prune, so Git history answers what is deployed.'
tradeoff: 'Tag commits pile up in the history, and ArgoCD needed its own handling — leaving cluster-populated fields out of the comparison and turning on ServerSideApply for large resources (see the operations log).'
---
