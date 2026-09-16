# External Runtime Deployment

Production mode runs `server.js` directly on a Linux host that already has Docker installed. Do not mount `/var/run/docker.sock` into the executor as a containerized production shortcut.

## Install

```bash
sudo apt-get update
sudo apt-get install -y git nodejs docker.io
sudo mkdir -p /opt/mastermind-runtime
sudo git clone --depth 1 https://github.com/ahmedwwaw1/my.git /opt/mastermind-runtime
cd /opt/mastermind-runtime
sudo mkdir -p /etc/mastermind-runtime /var/lib/mastermind-runtime
sudo install -m 0600 cloud_runtime_executor/.env.example /etc/mastermind-runtime/runtime.env
sudo nano /etc/mastermind-runtime/runtime.env
```

Set a long random `RUNTIME_SHARED_SECRET`, then install the systemd unit:

```bash
sudo install -m 0644 cloud_runtime_executor/deploy/mastermind-runtime.service /etc/systemd/system/mastermind-runtime.service
sudo systemctl daemon-reload
sudo systemctl enable --now mastermind-runtime.service
```

Check it:

```bash
curl http://127.0.0.1:8787/health
```

Run the authenticated end-to-end smoke test:

```bash
cd /opt/mastermind-runtime
RUNTIME_SHARED_SECRET="$(sudo awk -F= '$1==\"RUNTIME_SHARED_SECRET\"{print substr($0,index($0,$2))}' /etc/mastermind-runtime/runtime.env)" node cloud_runtime_executor/smoke-test.js
```

The smoke test only passes when the executor returns verified runtime evidence for the Docker isolation properties it promises.

## Supabase Gateway

Configure these two Supabase Edge Function environment values, using the same secret on both sides:

```text
RUNTIME_EXECUTOR_URL=https://your-runtime-host.example
RUNTIME_EXECUTOR_SECRET=<same value as RUNTIME_SHARED_SECRET>
```

Never put `RUNTIME_EXECUTOR_SECRET` in browser configuration. The browser only calls the Supabase gateway.
