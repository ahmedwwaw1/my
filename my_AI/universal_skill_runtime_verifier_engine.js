/** Universal Skill Runtime Verifier 1.0 - Cloud
 * Evidence is accepted only when the execution adapter supplies empirical runtime probes.
 */
const crypto = require('crypto');
const VERSION = '1.0-runtime-verification';
function obj(v){return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
function str(v){return typeof v==='string'?v:''}
function stable(v){if(v===null||typeof v!=='object')return JSON.stringify(v);if(Array.isArray(v))return '['+v.map(stable).join(',')+']';return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}'}
function hashEvidence(evidence){return crypto.createHash('sha256').update(stable(evidence)).digest('hex')}
function verifyRuntimeEvidence(raw={}){const r=obj(raw),p=obj(r.probes);const checks={adapterReported:Boolean(r.adapterReported),runtimeProbe:Boolean(p.containerStarted&&p.networkIsolation&&p.workspaceReadOnly&&p.rootReadOnly),killController:Boolean(p.killController),resourceLimits:Boolean(p.memoryLimit&&p.cpuLimit&&p.processLimit),evidenceSource:r.source==='runtime-probe'};const verified=Object.values(checks).every(Boolean);return{version:VERSION,verified,status:verified?'verified':Object.values(checks).some(Boolean)?'partial':'unverified',checks,backend:str(r.backend),level:str(r.level)||'unknown',probes:p}}
function attest(evidence={}){const copy={...evidence};delete copy.evidenceHash;return{...evidence,evidenceHash:hashEvidence(copy),evidenceVersion:VERSION}}
module.exports={VERSION,verifyRuntimeEvidence,attest,hashEvidence};
