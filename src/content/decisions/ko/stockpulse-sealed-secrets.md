---
project: stockpulse
order: 6
title: '비밀값도 Git에 — Sealed Secrets'
context: 'GitOps로 모든 매니페스트를 Git에 두면, 비밀값을 어디에 둘지가 문제예요.'
alternatives:
  - 'kubectl로 Secret을 손으로 생성'
  - '외부 시크릿 저장소(Vault 등)'
rationale: '수동 실행 워크플로가 GitHub Secrets로 .env를 만들고, kubeseal로 암호화한 SealedSecret 6개를 커밋해요. 클러스터 안의 컨트롤러만 복호화할 수 있어서 Git에 올려도 안전해요. 컨트롤러도 ArgoCD Application으로 관리해요.'
tradeoff: '컨트롤러 키를 잃으면 모든 SealedSecret을 다시 만들어야 해서, 키 백업이 운영 절차에 들어가야 해요.'
---
