const crypto = require('crypto');
const assert = require('assert');
const secret = 'test-secret';
const payload = JSON.stringify({ command: 'node --check smoke.js', allowCommand: true });
const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
assert.strictEqual(signature.length, 64);
assert.match(signature, /^[0-9a-f]{64}$/);
console.log('signature-contract-ok');
