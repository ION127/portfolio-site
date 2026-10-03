---
project: baro
order: 4
highlight: false
title: 'The VPN tunnel was up, but traffic to AWS vanished'
symptom: 'The StrongSwan tunnel showed ESTABLISHED, yet on-prem hosts could not reach private endpoints in AWS.'
cause: 'When StrongSwan (charon) brings up an SA it can add policy routes to Linux routing table 220, which is evaluated before the main table, so traffic for the AWS range left through the Wi-Fi default route instead of the VTI.'
fix: 'Made the host VPN script remove the conflicting table 220 routes whenever the tunnel state changes.'
lesson: 'A tunnel being up is not the same as traffic using it. I check the route and source IP that are actually selected with ip route get first.'
---
The AWS VPC and the on-prem OpenStack cloud are joined by a Site-to-Site VPN, and the on-prem end is a StrongSwan VTI tunnel on the OpenStack host. The tunnel looked healthy, but connections to private endpoints in AWS failed. `ip route get <AWS private IP>` showed the route going out the Wi-Fi interface rather than the VTI, and `ip route show table 220` held routes for the AWS range: the routes charon had added were being applied before the VTI routes in the main table.

The host script now cleans up those routes whenever the tunnel state changes. After a reboot, the operating procedure restores `br-ex`, host routes and iptables first, and only then brings up the tunnel and its VTI routes.
