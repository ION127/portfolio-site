---
project: stockpulse
order: 1
highlight: true
title: 'ArgoCD가 영원히 OutOfSync'
symptom: '배포가 끝나도 일부 리소스가 계속 OutOfSync로 표시되고, 큰 매니페스트는 적용 자체가 실패했어요.'
cause: 'StatefulSet의 volumeClaimTemplates와 CronJob의 status처럼 클러스터가 채우는 필드가 Git과 계속 달랐고, 큰 리소스는 client-side apply가 남기는 last-applied annotation 한도(262KB)를 넘었어요.'
fix: '해당 필드를 ignoreDifferences로 비교에서 빼고, ServerSideApply=true로 바꿔 annotation 없이 적용하게 했어요.'
lesson: 'GitOps에서 "Git과 같다"의 기준에서 클러스터가 관리하는 필드는 빼야 해요. 비교 대상과 적용 방식을 함께 설계해요.'
---
ArgoCD는 selfHeal과 prune이 켜져 있어서, 차이가 남아 있으면 계속 동기화를 시도해요. 클러스터가 채워 넣는 필드 때문에 생긴 차이는 아무리 동기화해도 사라지지 않아 대시보드가 늘 OutOfSync였고, 진짜 차이가 생겨도 알아보기 어려웠어요. 비교에서 뺄 필드를 명시하고, 재시도는 5회(5초부터 최대 3분)로 제한하고, 삭제는 PruneLast로 마지막에 하도록 정리했어요.
