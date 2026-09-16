# Runtime verification

Run on a Linux Docker host:

```bash
RUNTIME_SHARED_SECRET='...' node smoke-test.js
```

The test requires `/health` and an authenticated `/execute` request. It only passes when the returned `runtimeVerification.verified` and the network, root filesystem, workspace, memory, CPU, and process isolation checks are true.

GitHub Actions also runs the same smoke test on Ubuntu with Docker enabled via `.github/workflows/verify-cloud-runtime-executor.yml`.
