/**
 * Universal Evidence Engine 1.0
 * Evidence-driven mission state, acceptance gates, confidence and proof.
 */
const UNIVERSAL_EVIDENCE_ENGINE_VERSION = '1.0-evidence';

function ueArray(value) { return Array.isArray(value) ? value : []; }
function ueString(value) { return typeof value === 'string' ? value : ''; }
function ueStatus(value) {
    if (value == null) return 'unknown';
    if (typeof value === 'boolean') return value ? 'pass' : 'fail';
    const s = String(value).toLowerCase();
    if (/pass|success|ok|healthy|verified|complete|accepted|resolved/.test(s)) return 'pass';
    if (/fail|error|blocked|unhealthy|rejected|rollback/.test(s)) return 'fail';
    return 'unknown';
}

function ueSnapshotSummary(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') {
        return { available: false, fileCount: 0, componentCount: 0 };
    }
    const files = Array.isArray(snapshot.files)
        ? snapshot.files
        : (snapshot.fileMap && typeof snapshot.fileMap === 'object' ? Object.keys(snapshot.fileMap) : []);
    const components = Array.isArray(snapshot.components)
        ? snapshot.components
        : (snapshot.architecture && Array.isArray(snapshot.architecture.components)
            ? snapshot.architecture.components
            : []);
    return {
        available: true,
        fileCount: files.length,
        componentCount: components.length,
        framework: snapshot.framework || snapshot.language || snapshot.architecture?.framework || null,
        platform: snapshot.platform || snapshot.architecture?.platform || null
    };
}

function ueFingerprint(snapshot, normalizer) {
    try {
        const value = typeof normalizer === 'function' ? normalizer(snapshot || {}) : (snapshot || {});
        const json = JSON.stringify(value);
        let hash = 2166136261;
        for (let i = 0; i < json.length; i++) {
            hash ^= json.charCodeAt(i);
            hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
        }
        return (hash >>> 0).toString(16);
    } catch (_) {
        return '';
    }
}

function ueCriterion(id, ok, required, reason, evidence = null) {
    return {
        id,
        required: required !== false,
        status: ok === true ? 'pass' : ok === false ? 'fail' : 'unknown',
        reason: reason || '',
        evidence
    };
}

function ueVerificationStatus(result) {
    const verification = result?.verification || result?.closedLoop?.verification || {};
    return ueStatus(
        verification?.status ??
        verification?.overall?.status ??
        verification?.result ??
        result?.closedLoop?.status
    );
}

function ueEvaluateMission(options = {}, result = {}, baseline = null, post = null, normalizer = null) {
    const verify = options.verify !== false;
    const implementationChanged = Boolean(result?.implementation?.changed);
    const verificationStatus = ueVerificationStatus(result);
    const baselineFingerprint = ueFingerprint(baseline, normalizer);
    const postFingerprint = ueFingerprint(post, normalizer);
    const architectureChanged = Boolean(
        baselineFingerprint && postFingerprint && baselineFingerprint !== postFingerprint
    );

    const custom = ueArray(options.acceptanceCriteria);
    const criteria = custom.length
        ? custom.map((entry, index) => {
            const criterion = typeof entry === 'string'
                ? { id: `custom_${index + 1}`, type: entry, required: true }
                : entry;
            switch (criterion.type) {
                case 'implementation_changed':
                    return ueCriterion(
                        criterion.id,
                        implementationChanged,
                        criterion.required,
                        implementationChanged ? 'Implementation change proven.' : 'No implementation change proven.',
                        { implementationChanged }
                    );
                case 'architecture_changed':
                    return ueCriterion(
                        criterion.id,
                        architectureChanged,
                        criterion.required,
                        architectureChanged ? 'Pre/post architecture differs.' : 'No architecture difference proven.',
                        { baselineFingerprint, postFingerprint }
                    );
                case 'verification_pass':
                    return ueCriterion(
                        criterion.id,
                        verificationStatus === 'pass',
                        criterion.required,
                        `Verification status: ${verificationStatus}.`,
                        { verificationStatus }
                    );
                case 'post_discovery':
                    return ueCriterion(
                        criterion.id,
                        Boolean(post && !post.error),
                        criterion.required,
                        post && !post.error ? 'Post-change discovery completed.' : 'Post-change discovery failed.',
                        ueSnapshotSummary(post)
                    );
                case 'runtime_pass': {
                    const runtime = result?.verification?.runtime || result?.verification?.runtimeChecks || {};
                    const runtimeStatus = ueStatus(runtime?.status ?? runtime?.result ?? runtime?.passed);
                    return ueCriterion(
                        criterion.id,
                        runtimeStatus === 'pass',
                        criterion.required,
                        `Runtime status: ${runtimeStatus}.`,
                        { runtimeStatus }
                    );
                }
                case 'api_pass': {
                    const api = result?.verification?.api || result?.verification?.apiTesting || {};
                    const apiStatus = ueStatus(api?.status ?? api?.result ?? api?.passed);
                    return ueCriterion(
                        criterion.id,
                        apiStatus === 'pass',
                        criterion.required,
                        `API status: ${apiStatus}.`,
                        { apiStatus }
                    );
                }
                default:
                    return ueCriterion(
                        criterion.id,
                        null,
                        criterion.required,
                        `Unsupported criterion type: ${criterion.type}.`
                    );
            }
        })
        : [
            ueCriterion('objective_defined', Boolean(ueString(options.objective).trim()), true, 'Mission objective is explicit.'),
            ueCriterion('architecture_plan', Boolean(result?.plan), true, result?.plan ? 'Architect plan returned.' : 'No architect plan returned.'),
            ueCriterion(
                'verification_evidence',
                !verify || verificationStatus === 'pass' || verificationStatus === 'unknown',
                true,
                verify ? `Verification status: ${verificationStatus}.` : 'Verification disabled.'
            ),
            ueCriterion(
                'post_discovery',
                Boolean(post && !post.error),
                true,
                post && !post.error ? 'Post-change discovery completed.' : 'Post-change discovery failed.',
                ueSnapshotSummary(post)
            ),
            ueCriterion(
                'no_unresolved_failure',
                ueStatus(result?.status) !== 'fail',
                true,
                `Loop status: ${ueStatus(result?.status)}.`
            )
        ];

    const required = criteria.filter((criterion) => criterion.required);
    const failed = required.filter((criterion) => criterion.status === 'fail');
    const unknown = required.filter((criterion) => criterion.status === 'unknown');

    let verdict = 'partial';
    if (ueStatus(result?.status) === 'fail' || verificationStatus === 'fail' || failed.length) {
        verdict = 'failed';
    } else if (!unknown.length && (!verify || verificationStatus === 'pass')) {
        verdict = 'accepted';
    }

    let score = 0;
    score += baseline && !baseline.error ? 15 : 0;
    score += result?.plan ? 20 : 0;
    score += implementationChanged ? 15 : 0;
    score += verify && verificationStatus === 'pass' ? 25 : (!verify ? 10 : 5);
    score += post && !post.error ? 15 : 0;
    score += architectureChanged ? 10 : 0;
    score = Math.max(0, Math.min(100, score));
    if (verdict === 'failed') score = Math.min(score, 35);
    else if (verdict === 'partial') score = Math.min(score, 79);

    const reasons = [];
    if (verdict === 'accepted') reasons.push('All required evidence gates passed.');
    if (!implementationChanged) reasons.push('No implementation change was proven.');
    if (verify && verificationStatus !== 'pass') reasons.push(`Functional verification is not proven (${verificationStatus}).`);
    if (!post || post.error) reasons.push('Post-change discovery is missing or failed.');
    if (unknown.length) reasons.push(`${unknown.length} required criterion(s) are unknown.`);

    return {
        verdict,
        confidence: {
            score,
            level: score >= 85 ? 'high' : score >= 60 ? 'medium' : 'low',
            reasons
        },
        criteria,
        facts: {
            baselineFingerprint,
            postFingerprint,
            architectureChanged,
            verificationStatus,
            implementationChanged
        }
    };
}

function createUniversalEvidenceMission(options = {}) {
    const missionId = options.missionId || `mission-${Date.now().toString(36)}`;
    return {
        missionId,
        version: UNIVERSAL_EVIDENCE_ENGINE_VERSION,
        state: 'created',
        phase: 'preflight',
        objective: ueString(options.objective).trim(),
        environment: options.environment || 'unknown',
        startedAt: new Date().toISOString(),
        checkpoint: null,
        evidence: [],
        acceptance: null
    };
}

function finalizeUniversalEvidenceMission(mission, options, result, baseline, post, normalizer) {
    if (!mission || typeof mission !== 'object') throw new TypeError('mission must be an object');
    const acceptance = ueEvaluateMission(options, result, baseline, post, normalizer);
    mission.state = acceptance.verdict === 'accepted'
        ? 'completed'
        : acceptance.verdict === 'failed'
            ? 'failed'
            : 'needs_review';
    mission.phase = 'finalize';
    mission.finishedAt = new Date().toISOString();
    mission.acceptance = acceptance;
    mission.evidence.push(
        { phase: 'baseline', status: baseline && !baseline.error ? 'pass' : 'fail', summary: ueSnapshotSummary(baseline), fingerprint: acceptance.facts.baselineFingerprint },
        { phase: 'implementation', status: result?.implementation?.changed ? 'pass' : 'unknown', changed: Boolean(result?.implementation?.changed) },
        { phase: 'verification', status: acceptance.facts.verificationStatus },
        { phase: 'post_discovery', status: post && !post.error ? 'pass' : 'fail', summary: ueSnapshotSummary(post), fingerprint: acceptance.facts.postFingerprint },
        { phase: 'verdict', status: acceptance.verdict, confidence: acceptance.confidence }
    );
    mission.checkpoint = {
        missionId: mission.missionId,
        state: mission.state,
        phase: mission.phase,
        verdict: acceptance.verdict,
        confidence: acceptance.confidence,
        updatedAt: mission.finishedAt
    };
    return mission;
}

if (typeof module !== 'undefined') {
    module.exports = {
        UNIVERSAL_EVIDENCE_ENGINE_VERSION,
        ueArray,
        ueString,
        ueStatus,
        ueSnapshotSummary,
        ueFingerprint,
        ueEvaluateMission,
        createUniversalEvidenceMission,
        finalizeUniversalEvidenceMission
    };
}
