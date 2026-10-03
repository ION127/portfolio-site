---
project: baro
order: 4
highlight: false
title: 'VPN 터널은 살아 있는데 AWS로 가는 트래픽이 사라졌다'
symptom: 'StrongSwan 터널은 ESTABLISHED인데, 온프레미스에서 AWS 사설 엔드포인트로 연결이 되지 않았습니다.'
cause: 'StrongSwan(charon)이 SA를 맺을 때 Linux routing table 220에 policy route를 자동으로 넣는데, table 220은 main table보다 먼저 평가돼 AWS 대역 트래픽이 VTI가 아닌 Wi-Fi 기본 경로로 나갔습니다.'
fix: '터널 상태가 바뀔 때마다 호스트 VPN 스크립트가 충돌하는 table 220 경로를 지우도록 했습니다.'
lesson: '터널이 붙었다는 것과 트래픽이 터널로 간다는 것은 다릅니다. ip route get으로 실제로 선택되는 경로와 source IP를 먼저 확인합니다.'
---
AWS VPC와 온프레미스(OpenStack)는 Site-to-Site VPN으로 이어져 있고, 온프레미스 쪽 끝은 OpenStack 호스트의 StrongSwan VTI 터널입니다. 터널 상태만 보면 정상인데 AWS 쪽 사설 엔드포인트로 가는 연결이 실패했습니다. `ip route get <AWS 사설 IP>`를 보니 경로가 VTI가 아니라 Wi-Fi 인터페이스로 잡혀 있었고, `ip route show table 220`에 AWS 대역 경로가 들어 있었습니다. charon이 자동으로 넣은 경로가 main table의 VTI 경로보다 먼저 적용된 것입니다.

이제 호스트 스크립트가 터널 상태가 바뀔 때마다 이 경로를 정리합니다. 재부팅 뒤에도 `br-ex` · 경로 · iptables를 먼저 복구한 다음 터널과 VTI 경로를 올리는 순서를 지키도록 운영 절차로 정리했습니다.
