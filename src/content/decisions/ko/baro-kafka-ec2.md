---
project: baro
order: 2
title: 'Kafka를 ECS Fargate에서 EC2 + EBS(KRaft 단일 노드)로 이전'
context: '처음엔 Kafka를 ECS Fargate 태스크로 띄우고 데이터를 EFS에 뒀어요. 클라이언트가 접속할 advertised listener 주소를 안정적으로 고정하기 어려웠고, 로그 저장소도 네트워크 파일시스템 위에 있었어요.'
alternatives:
  - 'ECS Fargate + EFS 유지(기존 구성)'
  - 'Amazon MSK'
rationale: '고정 사설 IP와 Cloud Map 이름(kafka.baro.internal)으로 advertised listener를 고정하고, 로그는 EBS gp3에 둬요. vehicle-data-topic은 4 파티션으로 두어 dispatch 소비 동시성 4와 맞췄어요.'
tradeoff: '브로커 1대(RF=1)라 브로커 장애 시 위치 스트림이 멈춰요. 위치는 1시간만 보관하는 휘발성 데이터라 비용을 우선했어요.'
---
