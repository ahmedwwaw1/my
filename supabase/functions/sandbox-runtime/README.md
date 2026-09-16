# sandbox-runtime

Authenticated Supabase gateway for the Mastermind external Docker runtime.

Required secrets/environment values:

- `RUNTIME_EXECUTOR_URL`: private HTTPS URL of the external runtime service.
- `RUNTIME_EXECUTOR_SECRET`: same secret configured as `RUNTIME_SHARED_SECRET` on the executor host.

The browser must never receive `RUNTIME_EXECUTOR_SECRET`.
