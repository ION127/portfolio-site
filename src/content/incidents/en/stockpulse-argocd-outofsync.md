---
project: stockpulse
order: 1
highlight: true
title: 'ArgoCD stuck in OutOfSync forever'
symptom: 'Some resources stayed OutOfSync after every deploy, and large manifests failed to apply at all.'
cause: 'Fields the cluster fills in — StatefulSet volumeClaimTemplates, CronJob status — never matched Git, and large resources exceeded the 262 KB limit of the last-applied annotation that client-side apply leaves behind.'
fix: 'Excluded those fields with ignoreDifferences and switched to ServerSideApply=true so resources apply without the annotation.'
lesson: 'In GitOps, "equal to Git" has to leave out fields the cluster owns. Design what you compare and how you apply together.'
---
With selfHeal and prune enabled, ArgoCD keeps syncing as long as a difference remains. Differences caused by cluster-populated fields never go away no matter how often you sync, so the dashboard was always OutOfSync and real drift was hard to spot. I declared which fields to ignore, capped retries at five (from 5 s up to 3 min), and moved deletions last with PruneLast.
