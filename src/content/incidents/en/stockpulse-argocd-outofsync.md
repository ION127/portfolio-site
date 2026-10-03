---
project: stockpulse
order: 1
highlight: true
title: 'ArgoCD stuck in OutOfSync forever'
symptom: 'The StatefulSets stayed OutOfSync after every deploy.'
cause: 'Fields the cluster fills in, such as StatefulSet volumeClaimTemplates, never matched Git.'
fix: 'Excluded those fields with ignoreDifferences, along with CronJob status for the same reason. ServerSideApply=true had been turned on in advance so large resources would never hit the 262 KB limit of the last-applied annotation.'
lesson: 'In GitOps, “in sync with Git” has to leave out fields the cluster owns. I design what gets compared and how it gets applied together.'
---
With selfHeal and prune enabled, ArgoCD keeps syncing as long as a difference remains. Differences caused by cluster-populated fields never go away no matter how often you sync, so the dashboard was always OutOfSync and real drift was hard to spot. I declared which fields to ignore. Five retries (backing off from 5 s up to 3 min) and PruneLast, which runs pruning last, had been set from the start.
