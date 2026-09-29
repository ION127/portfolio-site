---
project: baro
order: 6
title: 'RDS 한 대에 서비스별 스키마'
context: '서비스마다 DB 인스턴스를 따로 두면 비용이 서비스 수만큼 늘어나요.'
alternatives:
  - '서비스마다 RDS 인스턴스'
rationale: 'RDS PostgreSQL 한 대(db.t4g.micro)에 user · dispatch · relocation · control 스키마를 나눠, 서비스가 서로의 테이블을 직접 건드리지 않게 했어요. 스키마는 일회성 ECS 태스크(db-init)가 만들어요.'
tradeoff: 'DB 장애와 부하는 모든 서비스가 함께 겪어요. 트래픽이 늘면 서비스별 인스턴스로 나누는 게 다음 단계예요.'
---
