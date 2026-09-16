# Deployment state

Repository-side integration is complete. The production executor is host-first and expects a Linux machine with Docker installed.

Required live environment configuration:

- `RUNTIME_SHARED_SECRET` on the runtime host.
- `RUNTIME_EXECUTOR_URL` on the Supabase Edge Function.
- `RUNTIME_EXECUTOR_SECRET` on the Supabase Edge Function, matching the runtime secret.

The repository does not contain production secrets. A live external host is required before the Cloud Agent can produce runtime-verified Docker evidence in production.
