/**
 * Universal Agent Operating Loop Hardening Adapter
 * Runtime safety layer for the existing loop.
 */
const UNIVERSAL_AGENT_HARDENING_VERSION = '1.0-hardened';
(function bindAgentHardening(globalScope) {
    const legacy = globalScope.runUniversalAgentOperatingLoop;
    if (typeof legacy !== 'function') {
        console.error('Agent Hardening: Universal Agent Operating Loop is not available.');
        return;
    }
    if (legacy.__agentHardeningWrapped === true) return;

    const isBadWriteResult = (result) => {
        if (!result) return true;
        if (typeof result === 'object' && result.error) return true;
        if (typeof result === 'string' && /^(❌|error|failed)\b/i.test(result.trim())) return true;
        return false;
    };

    const normalize = (path) => {
        if (typeof globalScope.normalizePathForCloud === 'function') return globalScope.normalizePathForCloud(path || '');
        return String(path || '').replace(/\\/g, '/').replace(/^my\//i, '');
    };

    const hardenedSearch = async (query) => {
        const q = String(query || '').trim();
        if (!q) return { error: 'fast_file_search requires a non-empty query.' };
        if (typeof globalScope.searchCode === 'function') return await Promise.resolve(globalScope.searchCode(q));
        if (typeof globalScope.callLocalBridge === 'function') {
            return await globalScope.callLocalBridge('cmd', { command: `es.exe -d "${q.replace(/"/g, '\\"')}"` });
        }
        if (typeof globalScope.getGithubFileContent === 'function') {
            return { error: 'fast_file_search has no repository search backend in this environment.' };
        }
        return { error: 'fast_file_search unavailable.' };
    };

    const hardenedWrite = async (path, content, label) => {
        const p = normalize(path);
        const result = typeof globalScope.writeFile === 'function'
            ? await globalScope.writeFile(p, content, label)
            : (typeof globalScope.callLocalBridge === 'function'
                ? await globalScope.callLocalBridge('write', { path: p, content })
                : { error: 'No write backend available.' });
        if (isBadWriteResult(result)) throw new Error(`${label || 'write'} failed: ${typeof result === 'string' ? result : JSON.stringify(result)}`);
        return result;
    };

    const hardenedRead = async (path) => {
        const p = normalize(path);
        const result = typeof globalScope.getGithubFileContent === 'function'
            ? await globalScope.getGithubFileContent(p)
            : (typeof globalScope.callLocalBridge === 'function'
                ? await globalScope.callLocalBridge('read', { path: p })
                : { error: 'No read backend available.' });
        if (result && typeof result === 'object' && result.content !== undefined) return result.content;
        if (result && typeof result === 'object' && result.error) throw new Error(result.error);
        if (typeof result !== 'string') throw new Error('Read backend did not return file content.');
        return result;
    };

    const hardenedReplace = async (path, target, replacement, label) => {
        const p = normalize(path);
        if (typeof globalScope.replaceFileContent === 'function') {
            const result = await globalScope.replaceFileContent(p, target, replacement);
            if (isBadWriteResult(result)) throw new Error(`${label || 'replace'} failed: ${typeof result === 'string' ? result : JSON.stringify(result)}`);
            return result;
        }
        const current = await hardenedRead(p);
        if (!current.includes(target)) throw new Error(`${label || 'replace'} target not found: ${p}`);
        return await hardenedWrite(p, current.replace(target, replacement), label || 'surgical replacement');
    };

    async function hardenedOperatingLoop(options = {}) {
        const environment = options.environment || (typeof globalScope.performCloudArchitectureDiscovery === 'function' ? 'GitHub Cloud' : 'Windows Desktop');
        const root = normalize(options.root || '');
        const objective = options.objective || '';
        const constraints = options.constraints || {};
        const discover = typeof globalScope.performCloudArchitectureDiscovery === 'function'
            ? () => Promise.resolve(globalScope.performCloudArchitectureDiscovery(root))
            : (typeof globalScope.performArchitectureDiscovery === 'function'
                ? () => Promise.resolve(globalScope.performArchitectureDiscovery(root))
                : null);
        if (!discover) return { available: false, status: 'discovery-unavailable', version: UNIVERSAL_AGENT_HARDENING_VERSION };

        const initialScan = await discover();
        const plan = globalScope.runUniversalArchitectLoop(initialScan, { environment, objective, constraints });
        const allowed = new Set(['read_file', 'write_file', 'replace_file_content', 'multi_replace_file_content', 'analyze_file', 'list_files', 'fast_file_search']);
        const history = [{ role: 'user', parts: [{ text: 'Implementation mission. Objective: ' + objective + '\nArchitecture plan:\n' + JSON.stringify(plan).slice(-24000) + '\nRules: inspect before writing; implement only the objective; preserve contracts; use the smallest safe cross-file change; do not call architecture_loop or runtime_verify; never overwrite a file with replacement-only content.' }] }];
        const executions = [];
        let changed = false;

        for (let turn = 0; turn < 5; turn++) {
            const response = await globalScope.callAiBrain(history);
            const candidate = response?.candidates?.[0];
            if (!candidate?.content?.parts?.length) break;
            history.push(candidate.content);
            const calls = candidate.content.parts.filter(part => part.functionCall && allowed.has(part.functionCall.name));
            if (!calls.length) break;

            for (const part of calls.slice(0, 8)) {
                const { name, args = {} } = part.functionCall;
                const path = normalize(args.path || '');
                let result;

                if (name === 'fast_file_search') {
                    result = await hardenedSearch(args.query || '');
                } else if (name === 'read_file' || name === 'analyze_file') {
                    result = await hardenedRead(path);
                } else if (name === 'list_files') {
                    result = typeof globalScope.listGithubFiles === 'function'
                        ? await globalScope.listGithubFiles(path || '')
                        : (typeof globalScope.callLocalBridge === 'function'
                            ? await globalScope.callLocalBridge('list', { path: path || '.' })
                            : { error: 'list_files unavailable.' });
                } else if (name === 'write_file') {
                    result = await hardenedWrite(path, args.content || '', 'Universal Agent Operating Loop implementation');
                    changed = true;
                } else if (name === 'replace_file_content') {
                    result = await hardenedReplace(path, args.targetContent || '', args.replacementContent || '', 'Universal Agent Operating Loop surgical replacement');
                    changed = true;
                } else {
                    const current = await hardenedRead(path);
                    let updated = current;
                    let matched = 0;
                    for (const replacement of (args.replacements || [])) {
                        if (updated.includes(replacement.targetContent)) {
                            updated = updated.replace(replacement.targetContent, replacement.replacementContent);
                            matched++;
                        }
                    }
                    if (!matched) throw new Error(`multi_replace_file_content: none of the targets matched: ${path}`);
                    result = await hardenedWrite(path, updated, 'Universal Agent Operating Loop batch');
                    changed = true;
                }

                executions.push({ turn, name, path, result: typeof result === 'string' ? result : JSON.stringify(result) });
                history.push({ role: 'function', parts: [{ functionResponse: { name, response: { content: typeof result === 'string' ? result : JSON.stringify(result) } } }] });
            }
        }

        let verification = null;
        if (changed && options.verify !== false && typeof globalScope.runClosedRuntimeRepairLoop === 'function') {
            verification = await globalScope.runClosedRuntimeRepairLoop({
                environment, root, snapshot: initialScan, baseline: initialScan,
                runBuild: options.runBuild !== false,
                runTests: options.runTests !== false,
                runRuntime: options.runRuntime !== false,
                startCommand: options.startCommand || '', healthUrl: options.healthUrl || '', apiPath: options.apiPath || '',
                maxRetries: options.maxRetries ?? 1, runtimeChecks: options.runtimeChecks ?? 3, maxRepairAttempts: options.maxRepairAttempts ?? 2,
                execute: async command => typeof globalScope.callLocalBridge === 'function' ? globalScope.callLocalBridge('cmd', { command }) : null,
                discover,
                repair: options.repair
            });
        }

        const finalScan = await discover();
        const before = { components: initialScan?.architecture?.components || initialScan?.components || [] };
        const after = { components: finalScan?.architecture?.components || finalScan?.components || [] };
        const diff = typeof globalScope.ua2ArchitectureDiff === 'function' ? globalScope.ua2ArchitectureDiff(before, after) : null;
        return { available: true, version: UNIVERSAL_AGENT_HARDENING_VERSION, status: verification?.status || (changed ? 'implemented' : 'unchanged'), objective, plan, implementation: { changed, executions }, verification, architectureDiff: diff, finalDiscoverySummary: finalScan?.summary || null, closedLoop: Boolean(changed && verification) };
    }

    Object.defineProperty(hardenedOperatingLoop, '__agentHardeningWrapped', { value: true, enumerable: false });
    globalScope.runUniversalAgentOperatingLoop = hardenedOperatingLoop;
    globalScope.UNIVERSAL_AGENT_HARDENING_VERSION = UNIVERSAL_AGENT_HARDENING_VERSION;

    // Active runtime security shim: never forward a service-role credential from renderer code.
    if (typeof globalScope.callBridge === 'function') {
        const bridgeUrl = globalScope.SUPABASE_BRIDGE_URL || 'https://ozcffmadatsfyyldqmdl.supabase.co/functions/v1/vsa-bridge';
        globalScope.callBridge = async function secureBridge(action, payload) {
            const publicKey = typeof globalScope.__SUPABASE_PUBLIC_KEY__ === 'string' ? globalScope.__SUPABASE_PUBLIC_KEY__ : '';
            const headers = { 'Content-Type': 'application/json' };
            if (publicKey) {
                headers.Authorization = `Bearer ${publicKey}`;
                headers.apikey = publicKey;
            }
            try {
                const response = await fetch(bridgeUrl, { method: 'POST', headers, body: JSON.stringify({ action, ...payload }) });
                const data = await response.json();
                if (!response.ok) return { error: data?.error || data?.message || `Bridge error: ${response.status}` };
                return data;
            } catch (error) {
                return { error: error?.message || String(error) };
            }
        };
    }
})(window);