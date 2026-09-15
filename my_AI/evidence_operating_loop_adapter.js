/**
 * Evidence Operating Loop Adapter
 * Wraps the existing Universal Agent Operating Loop without duplicating it.
 */
const UNIVERSAL_EVIDENCE_ADAPTER_VERSION = '1.0-bound';
(function bindEvidenceOperatingLoop(globalScope) {
    const legacy = globalScope.runUniversalAgentOperatingLoop;
    if (typeof legacy !== 'function') {
        console.error('Evidence Adapter: Universal Agent Operating Loop is not available.');
        return;
    }
    if (legacy.__evidenceWrapped === true) return;

    async function evidenceWrappedOperatingLoop(options = {}) {
        const environment = options.environment || 'GitHub Cloud';
        const root = typeof globalScope.normalizePathForCloud === 'function'
            ? globalScope.normalizePathForCloud(options.root || '')
            : (options.root || '');
        const missionOptions = { ...options, environment, root, verify: options.verify !== false };
        const mission = createUniversalEvidenceMission(missionOptions);
        const discover = async () => {
            if (environment === 'GitHub Cloud' && typeof globalScope.performCloudArchitectureDiscovery === 'function') {
                return await Promise.resolve(globalScope.performCloudArchitectureDiscovery(root));
            }
            if (typeof globalScope.performArchitectureDiscovery === 'function') {
                return await Promise.resolve(globalScope.performArchitectureDiscovery(root));
            }
            return null;
        };

        let baseline = null;
        let result;
        try {
            baseline = await discover();
            result = await legacy(missionOptions);
        } catch (error) {
            result = {
                status: 'failed',
                error: String(error?.message || error),
                implementation: { changed: false, executions: [] }
            };
        }

        let post = null;
        try {
            post = await discover();
        } catch (error) {
            post = { error: String(error?.message || error) };
        }

        const finalized = finalizeUniversalEvidenceMission(
            mission,
            missionOptions,
            result,
            baseline,
            post,
            typeof globalScope.architectNormalizeSnapshot === 'function'
                ? globalScope.architectNormalizeSnapshot
                : null
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
            failureReason: finalized.state === 'failed'
                ? finalized.acceptance.confidence.reasons.join(' ')
                : null
        };
    }

    Object.defineProperty(evidenceWrappedOperatingLoop, '__evidenceWrapped', {
        value: true,
        enumerable: false,
        configurable: false
    });

    globalScope.runUniversalAgentOperatingLoop = evidenceWrappedOperatingLoop;
    globalScope.UNIVERSAL_EVIDENCE_ADAPTER_VERSION = UNIVERSAL_EVIDENCE_ADAPTER_VERSION;
})(window);
