---
project: baro
order: 6
title: 'RDS 한 대에 서비스별 스키마'
context: '서비스마다 DB 인스턴스를 따로 두면 비용이 서비스 수만큼 늘어납니다.'
alternatives:
  - '서비스마다 RDS 인스턴스'
rationale: 'RDS PostgreSQL 한 대(db.t4g.micro)에 user · dispatch · relocation · control 스키마를 만들고, user · dispatch · relocation 서비스가 접속 URL의 currentSchema로 자기 스키마만 쓰게 했습니다(control 스키마는 만들어 두었지만 control 서비스는 DB를 쓰지 않습니다). 스키마는 일회성 ECS 태스크(db-init)가 만듭니다.'
tradeoff: '접속 계정은 공용이라 다른 스키마 접근을 권한으로 막지는 않고, DB 장애와 부하도 모든 서비스가 함께 겪습니다. 서비스별 계정과 인스턴스로 나누는 게 다음 단계입니다.'
---
