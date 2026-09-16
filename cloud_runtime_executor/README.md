# Mastermind External Docker Runtime

This directory contains the external runtime boundary used by the Cloud agent.

The runtime is intentionally separate from Supabase Edge Functions: the Edge Function authenticates and authorizes requests, while this service owns Docker process execution and returns signed runtime evidence.

See `server.js` for the HTTP executor and `Dockerfile` for the hardened container image.