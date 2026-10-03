---
project: stockpulse
order: 1
highlight: true
title: 'ArgoCD가 영원히 OutOfSync'
symptom: '배포가 끝나도 StatefulSet들이 계속 OutOfSync로 표시됐습니다.'
cause: 'StatefulSet의 volumeClaimTemplates처럼 클러스터가 채워 넣는 필드가 Git과 계속 달랐습니다.'
fix: '해당 필드를 ignoreDifferences로 비교에서 뺐고, 같은 이유로 CronJob의 status도 뺐습니다. ServerSideApply=true는 큰 리소스가 last-applied annotation 한도(262KB)에 걸리지 않도록 미리 켜 두었습니다.'
lesson: 'GitOps에서 "Git과 같다"의 기준에서 클러스터가 관리하는 필드는 빼야 합니다. 비교 대상과 적용 방식을 함께 설계합니다.'
---
ArgoCD는 selfHeal과 prune이 켜져 있어서, 차이가 남아 있으면 계속 동기화를 시도합니다. 클러스터가 채워 넣는 필드 때문에 생긴 차이는 아무리 동기화해도 사라지지 않아 대시보드가 늘 OutOfSync였고, 진짜 차이가 생겨도 알아보기 어려웠습니다. 그래서 비교에서 뺄 필드를 명시했습니다. 재시도 5회(5초부터 최대 3분)와 삭제를 마지막에 하는 PruneLast는 처음부터 설정해 두었습니다.
