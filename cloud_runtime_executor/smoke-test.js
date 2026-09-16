#!/usr/bin/env node
'use strict';

const crypto = require('crypto');

const base = String(process.env.RUNTIME_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');
const secret = String(process.env.RUNTIME_SHARED_SECRET || '');
if (!secret) {
  console.error('RUNTIME_SHARED_SECRET is required');
  process.exit(2);
}

async function main() {
  const health = await fetch(`${base}/health`);
  if (!health.ok) throw new Error(`health_failed:${health.status}`);
  const healthData = await health.json();
  if (healthData.ok !== true) throw new Error('health_not_ok');

  const payload = JSON.stringify({
    command: 'node --check smoke.js',
    allowCommand: true,
    timeoutMs: 10000,
    maxOutputBytes: 32768,
    maxMemoryMb: 256,
    maxCpus: 1,
    maxProcesses: 32,
    image: 'node:20-alpine',
    workspaceFiles: {
      'smoke.js': 'module.exports = 42;\n'
    }
  });

  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const response = await fetch(`${base}/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Runtime-Token': secret,
      'X-Runtime-Signature': signature
    },
    body: payload
  });
  const data = await response.json();

  const verification = data.runtimeVerification || {};
  const required = [
    verification.verified === true,
    verification.networkIsolation === true,
    verification.rootReadOnly === true,
    verification.workspaceIsolation === true,
    verification.memoryLimit === true,
    verification.cpuLimit === true,
    verification.processLimit === true,
    verification.killController === true
  ];

  if (!response.ok || data.ok !== true || required.some(value => !value)) {
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify({
    ok: true,
    status: data.status,
    requestId: data.requestId,
    runtimeVerification: verification
  }, null, 2));
}

main().catch(error => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
