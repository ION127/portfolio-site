---
project: baro
order: 1
title: 'Running Mosquitto on EC2 instead of AWS IoT Core'
context: 'Vehicles first talked to AWS IoT Core (mTLS, X.509 certificates). As the simulated fleet grew, connection rate limits forced a 1.2 s delay per 10 cars, and costs scaled with the number of vehicles.'
alternatives:
  - 'Keep AWS IoT Core (the original setup)'
rationale: 'The broker’s settings (queue limits, auth, sessions) are fully tunable, and without a connection rate limit, 1,000 cars connect in about 5 seconds at 0.05 s per 10 cars.'
tradeoff: 'Availability, patching and monitoring are on us. Credentials live in Secrets Manager and deployment is automated through SSM to reduce the operational burden.'
---
