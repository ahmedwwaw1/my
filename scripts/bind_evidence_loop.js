const fs = require('fs');

const targets = [
  ['my_AI/ai_engine_core.js', 'my_AI/universal_evidence_engine.js', 'GitHub Cloud'],
  ['Mastermind_Desktop/core.js', 'Mastermind_Desktop/universal_evidence_engine.js', 'Windows Desktop']
];

function endOfFunction(source, marker) {
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Missing ${marker}`);
  const open = source.indexOf('{', start);
  if (open < 0) throw new Error(`Missing body for ${marker}`);
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = open; i < source.length; i++) {
    const c = source[i];
    const n = source[i + 1];
    if (lineComment) { if (c === '\n') lineComment = false; continue; }
    if (blockComment) { if (c === '*' && n === '/') { blockComment = false; i++; } continue; }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (c === '\\') { escaped = true; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '/' && n === '/') { lineComment = true; i++; continue; }
    if (c === '/' && n === '*') { blockComment = true; i++; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return { start, end: i + 1 };
  }
  throw new Error(`Unbalanced ${marker}`);
}

function evidenceAdapter(environment) {
  return `
/** Evidence-driven operating loop binding. */
(function bindEvidenceOperatingLoop(globalScope) {
  const legacy = globalScope.runUniversalAgentOperatingLoop;
  if (typeof legacy !== 'function') throw new Error('Universal Agent Operating Loop is unavailable');
  if (legacy.__evidenceWrapped === true) return;
  const wrapped = async function(options = {}) {
    const missionOptions = { ...options, environment: options.environment || '${environment}', verify: options.verify !== false };
    const mission = createUniversalEvidenceMission(missionOptions);
    const root = missionOptions.root || '';
    const discover = async () => {
      if (missionOptions.environment === 'GitHub Cloud' && typeof globalScope.performCloudArchitectureDiscovery === 'function') {
        return await Promise.resolve(globalScope.performCloudArchitectureDiscovery(root));
      }
      if (typeof globalScope.performArchitectureDiscovery === 'function') {
        return await Promise.resolve(globalScope.performArchitectureDiscovery(root));
      }
      return null;
    };
    let baseline = null;
    let result;
    try { baseline = await discover(); } catch (e) { baseline = { error: String(e?.message || e) }; }
    try {
      result = await legacy(missionOptions);
    } catch (e) {
      result = { status: 'failed', error: String(e?.message || e), implementation: { changed: false, executions: [] } };
    }
    let post = null;
    try { post = await discover(); } catch (e) { post = { error: String(e?.message || e) }; }
    const finalized = finalizeUniversalEvidenceMission(
      mission,
      missionOptions,
      result,
      baseline,
      post,
      typeof globalScope.architectNormalizeSnapshot === 'function' ? globalScope.architectNormalizeSnapshot : null
    );
    return {
      ...result,
      available: true,
      version: UNIVERSAL_EVIDENCE_ADAPTER_VERSION,
      status: finalized.acceptance.verdict,
      success: finalized.state === 'completed',
      mission: finalized,
      acceptance: finalized.acceptance,
      evidence: finalized.evidence,
      checkpoint: finalized.checkpoint,
      successReason: finalized.acceptance.confidence.reasons.join(' '),
      failureReason: finalized.state === 'failed' ? finalized.acceptance.confidence.reasons.join(' ') : null
    };
  };
  Object.defineProperty(wrapped, '__evidenceWrapped', { value: true });
  globalScope.runUniversalAgentOperatingLoop = wrapped;
  globalScope.UNIVERSAL_EVIDENCE_ADAPTER_VERSION = UNIVERSAL_EVIDENCE_ADAPTER_VERSION;
})(typeof window !== 'undefined' ? window : globalThis);
`;
}

for (const [corePath, enginePath, environment] of targets) {
  let core = fs.readFileSync(corePath, 'utf8');
  if (!core.includes('UNIVERSAL_EVIDENCE_ADAPTER_VERSION')) {
    const engine = fs.readFileSync(enginePath, 'utf8').replace(/\nif\s*\(typeof module[^]*$/, '');
    const old = endOfFunction(core, 'async function runUniversalAgentOperatingLoop');
    const legacy = core.slice(old.start, old.end).replace('async function runUniversalAgentOperatingLoop', 'async function runUniversalAgentOperatingLoopLegacy');
    const before = core.slice(0, old.start).replace(/\s+$/, '');
    const after = core.slice(old.end);
    core = before + '\n\n' + engine + '\n\n' + legacy + '\n\n' + evidenceAdapter(environment) + '\n' + after;
    fs.writeFileSync(corePath, core, 'utf8');
  }
}

for (const [corePath] of targets) {
  const core = fs.readFileSync(corePath, 'utf8');
  if ((core.match(/async function runUniversalAgentOperatingLoop\(/g) || []).length !== 0) throw new Error(`Unexpected wrapper declaration in ${corePath}`);
  if ((core.match(/async function runUniversalAgentOperatingLoopLegacy\(/g) || []).length !== 1) throw new Error(`Legacy loop count invalid in ${corePath}`);
  if (!core.includes('UNIVERSAL_EVIDENCE_ADAPTER_VERSION')) throw new Error(`Evidence adapter missing in ${corePath}`);
  if (!core.includes('finalizeUniversalEvidenceMission')) throw new Error(`Evidence engine missing in ${corePath}`);
}

for (const file of ['my_AI/universal_evidence_engine.js', 'Mastermind_Desktop/universal_evidence_engine.js']) {
  const source = fs.readFileSync(file, 'utf8').replace("!verify || verificationStatus === 'pass' || verificationStatus === 'unknown'", "!verify || verificationStatus === 'pass'");
  fs.writeFileSync(file, source, 'utf8');
}

console.log('Evidence binding applied successfully.');
