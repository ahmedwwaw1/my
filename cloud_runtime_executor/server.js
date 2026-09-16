const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const PORT = Number(process.env.PORT || 8787);
const SHARED_SECRET = String(process.env.RUNTIME_SHARED_SECRET || '');
const MAX_REQUEST_BYTES = Number(process.env.MAX_REQUEST_BYTES || 1024 * 1024);
const DEFAULT_TIMEOUT_MS = 15000;
const MAX_TIMEOUT_MS = 120000;
const DEFAULT_OUTPUT_BYTES = 128 * 1024;
const MAX_OUTPUT_BYTES = 1024 * 1024;
const MAX_FILES = 2500;
const MAX_FILE_BYTES = 256 * 1024;
const WORK_ROOT = path.resolve(process.env.RUNTIME_WORK_ROOT || path.join(os.tmpdir(), 'mastermind-runtime'));
const APPROVED_IMAGES = new Set([
  'node:20-alpine',
  'python:3.12-alpine',
  'python:3.13-alpine'
]);

if (!SHARED_SECRET) {
  console.error('RUNTIME_SHARED_SECRET is required');
  process.exit(1);
}

fs.mkdirSync(WORK_ROOT, { recursive: true });

const COMMAND_ALLOWLIST = [
  /^node\s+--check\s+[^\s]+$/i,
  /^npm\s+(?:test|run\s+(?:test|lint|build|typecheck))$/i,
  /^python(?:3)?\s+-m\s+pytest(?:\s+[^\s]+)*$/i,
  /^pytest(?:\s+[^\s]+)*$/i
];

function allowedCommand(command) {
  const text = String(command || '').trim();
  return COMMAND_ALLOWLIST.some(pattern => pattern.test(text));
}

function safeNumber(value, fallback, min, max) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

function timingSafeEqualHex(a, b) {
  const left = Buffer.from(String(a || ''), 'hex');
  const right = Buffer.from(String(b || ''), 'hex');
  return left.length === right.length && left.length > 0 && crypto.timingSafeEqual(left, right);
}

function signatureFor(body) {
  return crypto.createHmac('sha256', SHARED_SECRET).update(body).digest('hex');
}

function requestId() {
  return crypto.randomUUID();
}

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_REQUEST_BYTES) {
        reject(Object.assign(new Error('request_too_large'), { code: 'REQUEST_TOO_LARGE' }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function sanitizeRelativePath(input) {
  const value = String(input || '').replaceAll('\\', '/');
  if (!value || value.startsWith('/') || value.includes('\0')) return null;
  const normalized = path.posix.normalize(value);
  if (normalized === '.' || normalized === '..' || normalized.startsWith('../') || normalized.includes('/../')) return null;
  return normalized;
}

function materializeWorkspace(root, files) {
  const entries = files && typeof files === 'object' ? Object.entries(files) : [];
  if (entries.length > MAX_FILES) throw new Error('max_files_exceeded');
  let count = 0;
  for (const [relative, content] of entries) {
    const safe = sanitizeRelativePath(relative);
    if (!safe) throw new Error(`invalid_workspace_path:${relative}`);
    const value = Buffer.from(String(content), 'utf8');
    if (value.length > MAX_FILE_BYTES) throw new Error(`workspace_file_too_large:${safe}`);
    const target = path.join(root, safe);
    if (!target.startsWith(root + path.sep)) throw new Error(`workspace_escape:${safe}`);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, value, { flag: 'wx' });
    count += 1;
  }
  return count;
}

function outputCollector(limit) {
  let value = '';
  let truncated = false;
  const append = chunk => {
    if (value.length >= limit) { truncated = true; return; }
    const text = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
    const remaining = limit - value.length;
    if (text.length > remaining) {
      value += text.slice(0, remaining);
      truncated = true;
    } else {
      value += text;
    }
  };
  return { append, get value() { return value; }, get truncated() { return truncated; } };
}

function dockerProbe(containerName, workingDirectory, limits) {
  return new Promise((resolve) => {
    const script = [
      `const fs=require('fs');`,
      `const out={containerStarted:true,networkIsolation:false,rootReadOnly:false,memoryLimit:false,cpuLimit:false,processLimit:false};`,
      `try{const nets=fs.existsSync('/sys/class/net')?fs.readdirSync('/sys/class/net'):[];out.networkIsolation=!nets.some(n=>n!=='lo')}catch(_){};`,
      `try{const mounts=fs.readFileSync('/proc/mounts','utf8');out.rootReadOnly=mounts.split('\\n').some(x=>x.includes(' / ')&&/\\bro[ ,]/.test(x))}catch(_){};`,
      `try{const v=fs.readFileSync('/sys/fs/cgroup/memory.max','utf8').trim();out.memoryLimit=v!=='max'&&Number(v)>0}catch(_){};`,
      `try{const v=fs.readFileSync('/sys/fs/cgroup/cpu.max','utf8').trim();out.cpuLimit=!v.startsWith('max ')}catch(_){};`,
      `try{const v=fs.readFileSync('/sys/fs/cgroup/pids.max','utf8').trim();out.processLimit=v!=='max'&&Number(v)>0}catch(_){};`,
      `process.stdout.write(JSON.stringify(out));`
    ].join('');
    const child = spawn('docker', ['run','--rm','--name',containerName,'--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--pids-limit',String(limits.maxProcesses),'--memory',`${limits.maxMemoryMb}m`,'--cpus',String(limits.maxCpus),'--tmpfs','/tmp:rw,nosuid,nodev,noexec,size=64m','-v',`${workingDirectory}:/workspace:ro`,'-w','/workspace','node:20-alpine','node','-e',script], { shell:false, windowsHide:true });
    const out = outputCollector(32 * 1024);
    child.stdout.on('data', out.append); child.stderr.on('data', out.append);
    const timer = setTimeout(() => { try { child.kill('SIGKILL'); } catch (_) {} }, 10000);
    child.on('close', code => { clearTimeout(timer); try { resolve(code===0 ? JSON.parse(out.value) : {containerStarted:false,probeOutput:out.value}); } catch (_) { resolve({containerStarted:false,probeOutput:out.value}); } });
    child.on('error', () => { clearTimeout(timer); resolve({containerStarted:false}); });
  });
}

function killDocker(containerName) {
  return new Promise(resolve => {
    const killer = spawn('docker', ['rm','-f',containerName], { shell:false, windowsHide:true });
    const out = outputCollector(4096);
    killer.stdout.on('data', out.append); killer.stderr.on('data', out.append);
    killer.on('close', () => {
      const check = spawn('docker', ['ps','-aq','--filter',`name=^${containerName}$`], { shell:false, windowsHide:true });
      let text = '';
      check.stdout.on('data', x => { text += x.toString(); });
      check.on('close', code => resolve({forcedRemoval: code===0,containerPresent: text.trim().length>0,output:out.value}));
      check.on('error', () => resolve({forcedRemoval:false,containerPresent:null,output:out.value}));
    });
    killer.on('error', () => resolve({forcedRemoval:false,containerPresent:null,output:out.value}));
  });
}

function execute(request) {
  return new Promise((resolve) => {
    const id = requestId();
    const image = String(request.image || 'node:20-alpine');
    const command = String(request.command || '').trim();
    if (!allowedCommand(command)) return resolve({ ok:false, status:'blocked', failure:'command_not_allowlisted', evidence:{requestId:id} });
    if (!APPROVED_IMAGES.has(image)) return resolve({ ok:false, status:'blocked', failure:'image_not_allowlisted', evidence:{requestId:id,approvedImages:[...APPROVED_IMAGES]} });
    const timeoutMs = safeNumber(request.timeoutMs, DEFAULT_TIMEOUT_MS, 250, MAX_TIMEOUT_MS);
    const maxOutputBytes = safeNumber(request.maxOutputBytes, DEFAULT_OUTPUT_BYTES, 1024, MAX_OUTPUT_BYTES);
    const limits = { maxMemoryMb: safeNumber(request.maxMemoryMb, 256, 64, 2048), maxCpus: safeNumber(request.maxCpus, 1, 0.1, 4), maxProcesses: safeNumber(request.maxProcesses, 64, 8, 256) };
    const workDir = fs.mkdtempSync(path.join(WORK_ROOT, `${id}-`));
    const containerName = `mastermind-${id.replaceAll('-', '')}`;
    let child = null;
    let timedOut = false;
    const stdout = outputCollector(maxOutputBytes);
    const started = Date.now();
    try {
      const fileCount = materializeWorkspace(workDir, request.workspaceFiles || {});
      const [executable, ...args] = command.split(/\s+/);
      child = spawn('docker', ['run','--rm','--name',containerName,'--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--pids-limit',String(limits.maxProcesses),'--memory',`${limits.maxMemoryMb}m`,'--cpus',String(limits.maxCpus),'--tmpfs','/tmp:rw,nosuid,nodev,noexec,size=64m','-v',`${workDir}:/workspace:rw`,'-w','/workspace',image,executable,...args], { shell:false, windowsHide:true });
      child.stdout.on('data', stdout.append); child.stderr.on('data', stdout.append);
      const timer = setTimeout(async () => { timedOut = true; const kill = await killDocker(containerName); try { if (child && !child.killed) child.kill('SIGKILL'); } catch (_) {} child.__killEvidence = kill; }, timeoutMs);
      child.on('close', async (exitCode) => {
        clearTimeout(timer);
        const killEvidence = child.__killEvidence || { forcedRemoval:false, containerPresent:false };
        const runtimeVerification = await dockerProbe(containerName + '-probe', workDir, limits);
        const verified = Boolean(runtimeVerification.containerStarted && runtimeVerification.networkIsolation && runtimeVerification.rootReadOnly && runtimeVerification.memoryLimit && runtimeVerification.cpuLimit && runtimeVerification.processLimit && killEvidence.containerPresent===false);
        resolve({ ok: exitCode === 0 && !timedOut && verified, status: exitCode === 0 && !timedOut && verified ? 'success' : (timedOut ? 'timeout' : 'failed_or_unverified'), requestId:id, output:stdout.value, outputTruncated:stdout.truncated, timedOut, killed:Boolean(timedOut), exitCode, elapsedMs:Date.now()-started, resourceLimits:limits, workspaceFiles:fileCount, runtimeVerification:{ verified, isolationLevel:'docker-enforced', backend:'external-docker-runtime', networkIsolation:Boolean(runtimeVerification.networkIsolation), rootReadOnly:Boolean(runtimeVerification.rootReadOnly), workspaceIsolation:true, memoryLimit:Boolean(runtimeVerification.memoryLimit), cpuLimit:Boolean(runtimeVerification.cpuLimit), processLimit:Boolean(runtimeVerification.processLimit), killController:Boolean(killEvidence.forcedRemoval), containerPresentAfterKill:killEvidence.containerPresent } });
        fs.rmSync(workDir,{recursive:true,force:true});
      });
      child.on('error', err => { clearTimeout(timer); resolve({ok:false,status:'runtime_error',requestId:id,failure:err.message,runtimeVerification:{verified:false,backend:'external-docker-runtime'}}); fs.rmSync(workDir,{recursive:true,force:true}); });
    } catch (err) { resolve({ok:false,status:'rejected',requestId:id,failure:err.message,runtimeVerification:{verified:false,backend:'external-docker-runtime'}}); try { fs.rmSync(workDir,{recursive:true,force:true}); } catch (_) {} }
  });
}

const server = http.createServer(async (req,res) => {
  if (req.method === 'GET' && req.url === '/health') return json(res,200,{ok:true,service:'mastermind-external-docker-runtime',version:'1.0-runtime-executor'});
  if (req.method !== 'POST' || req.url !== '/execute') return json(res,404,{ok:false,error:'not_found'});
  if (String(req.headers['x-runtime-token'] || '') !== SHARED_SECRET) return json(res,401,{ok:false,error:'unauthorized'});
  try { const raw = await readBody(req); const provided = String(req.headers['x-runtime-signature'] || ''); if (!timingSafeEqualHex(signatureFor(raw),provided)) return json(res,401,{ok:false,error:'invalid_signature'}); const request = JSON.parse(raw); if (request.allowCommand !== true) return json(res,403,{ok:false,error:'allowCommand_required'}); const result = await execute(request); return json(res,result.ok ? 200 : 400,result); } catch (err) { return json(res,400,{ok:false,error:err.code || err.message}); }
});

server.listen(PORT, () => console.log(`Mastermind runtime listening on ${PORT}`));
