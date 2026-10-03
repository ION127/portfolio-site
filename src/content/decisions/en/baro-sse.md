---
project: baro
order: 4
title: 'SSE instead of WebSocket for live updates'
context: 'The rider app and the control console only need to receive positions and status from the server.'
alternatives:
  - 'WebSocket'
rationale: 'SSE is enough for one-way push, and because it is plain HTTP it passes through nginx and the Vercel function proxy unchanged. When the connection drops, the rider app reconnects with exponential backoff (1 s up to 10 s) and the control console relies on the browser’s built-in EventSource reconnect.'
tradeoff: 'SSE connections live in server memory, so scaling out splits them across instances (see Limits & retrospective).'
---
