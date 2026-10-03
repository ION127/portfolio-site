---
project: stockpulse
order: 5
title: '이미지 태그 커밋 + ArgoCD로 배포하는 GitOps'
context: '서비스 8개와 ml-trainer, 이미지 9개를 빌드해 클러스터에 반영하는 과정을 손으로 하면, 지금 무엇이 어느 버전으로 떠 있는지 추적하기 어렵습니다.'
alternatives:
  - 'CI에서 kubectl apply로 직접 배포'
rationale: 'CI는 변경된 서비스만 빌드해 Harbor에 올리고, 매니페스트의 이미지 태그를 커밋 SHA로 바꿔 커밋합니다([skip ci]로 루프 방지). ArgoCD가 그 커밋을 보고 selfHeal · prune으로 클러스터를 Git과 같게 맞춥니다. 무엇이 배포돼 있는지는 Git 기록이 답해 줍니다.'
tradeoff: '태그 커밋이 저장소 기록에 쌓이고, ArgoCD 쪽에서는 클러스터가 채우는 필드를 비교에서 빼고 annotation 한도(262KB)에 대비해 ServerSideApply를 미리 켜는 등 따로 다룰 것이 생겼습니다(운영 기록 참고).'
---
