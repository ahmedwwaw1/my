# Runtime security boundary

The executor is the only component allowed to talk to the Docker daemon.

Run it on a dedicated host or isolated VM with a dedicated runtime daemon. Do not expose `/var/run/docker.sock` to the browser, Supabase Edge Functions, or the public internet.

Required controls:

- `RUNTIME_SHARED_SECRET` must be stored only in the runtime host and the authenticated backend gateway.
- The host firewall should expose only the executor HTTPS endpoint to the gateway.
- Run the service without a public admin interface.
- Keep the executor allowlist and approved image list restrictive.
- Do not pass host environment secrets into benchmark containers.
- Treat returned runtime evidence as untrusted until signature verification at the backend boundary.
