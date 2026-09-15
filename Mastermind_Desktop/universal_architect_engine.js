/**
 * Universal Architect Operating Loop
 * -----------------------------------
 * Environment-neutral orchestration layer.
 * It converts architectural discovery into an executable engineering model:
 * Discovery -> Understanding -> Planning -> Constraints -> Design ->
 * Cross-file Implementation -> Validation -> Repair.
 */

const UNIVERSAL_ARCHITECT_VERSION = '1.0-loop';

function architectUnique(list, value) {
    if (value && !list.includes(value)) list.push(value);
}

function architectArray(value) {
    return Array.isArray(value) ? value : [];
}

function architectNormalizeSnapshot(scanResult = {}) {
    const architecture = scanResult.architecture || {};
    const components = architectArray(architecture.components);
    const relations = architectArray(architecture.relations);
    const layers = architecture.layers && typeof architecture.layers === 'object' ? architecture.layers : {};
    const warnings = architectArray(scanResult.warnings);

    const dependencyMap = {};
    for (const component of components) {
        dependencyMap[component.path] = {
            role: component.role || 'Other',
            localDependencies: architectArray(component.localDependencies),
            externalDependencies: architectArray(component.externalDependencies),
            imports: architectArray(component.imports),
            exports: architectArray(component.exports),
            ipcChannels: architectArray(component.ipcChannels)
        };
    }

    return {
        root: scanResult.root || '.',
        project: scanResult.project || {},
        summary: scanResult.summary || {},
        layers,
        components,
        relations,
        dependencyMap,
        externalDependencies: architectArray(architecture.externalDependencies),
        electron: architecture.electron || { detected: false, ipcChannels: [], bridgeFiles: [] },
        warnings,
        truncated: Boolean(scanResult.summary?.truncated)
    };
}

function architectUnderstand(snapshot) {
    const boundaries = [];
    const roleCounts = {};
    for (const [role, files] of Object.entries(snapshot.layers)) {
        roleCounts[role] = architectArray(files).length;
    }

    for (const relation of snapshot.relations) {
        const from = snapshot.dependencyMap[relation.from]?.role || 'Other';
        const to = snapshot.dependencyMap[relation.to]?.role || 'Other';
        if (from !== to) {
            const boundary = `${from} -> ${to}`;
            architectUnique(boundaries, boundary);
        }
    }

    const componentCount = snapshot.components.length;
    const relationDensity = componentCount > 0 ? Number((snapshot.relations.length / componentCount).toFixed(2)) : 0;
    const highCoupling = snapshot.components
        .filter(component => architectArray(component.localDependencies).length >= 12)
        .map(component => component.path);

    return {
        roleCounts,
        boundaries,
        componentCount,
        relationDensity,
        highCoupling,
        entryPoints: architectArray(snapshot.project.entryPoints),
        externalDependencies: snapshot.externalDependencies,
        electronDetected: Boolean(snapshot.electron.detected),
        confidence: snapshot.truncated ? 'partial' : (componentCount ? 'structural' : 'low')
    };
}

function architectBuildConstraints(snapshot, options = {}) {
    const requested = options.constraints && typeof options.constraints === 'object' ? options.constraints : {};
    const constraints = {
        preserveApis: requested.preserveApis !== false,
        preserveData: requested.preserveData !== false,
        minimizeDependencies: requested.minimizeDependencies !== false,
        avoidBreakingChanges: requested.avoidBreakingChanges !== false,
        validateBeforeCommit: requested.validateBeforeCommit !== false,
        securityReview: requested.securityReview !== false,
        performanceReview: requested.performanceReview !== false,
        deploymentCompatibility: requested.deploymentCompatibility !== false,
        custom: architectArray(requested.custom)
    };

    const risks = [];
    if (snapshot.truncated) risks.push('Discovery result is partial; implementation requires a focused rescan before destructive changes.');
    if (snapshot.electron.detected) risks.push('Electron/IPC boundary detected; verify both renderer and bridge/main sides.');
    if (snapshot.externalDependencies.length > 25) risks.push('Large external dependency surface; avoid unnecessary package churn.');
    if (snapshot.components.length === 0) risks.push('No structural components were discovered; planning confidence is low.');

    return { constraints, risks };
}

function architectDesign(snapshot, understanding, constraints, options = {}) {
    const objective = options.objective || 'Improve or construct the requested software architecture while preserving working behavior.';
    const layers = Object.entries(snapshot.layers).map(([role, files]) => ({
        role,
        files: architectArray(files),
        responsibility: {
            UI: 'Presentation and interaction',
            Logic: 'Domain and application logic',
            Backend: 'Server and service boundaries',
            Data: 'Persistent/configuration data',
            Bridge: 'Environment and process boundary',
            Config: 'Build/runtime configuration',
            Other: 'Unclassified or infrastructure artifacts'
        }[role] || 'Other repository responsibility'
    }));

    const changeZones = [];
    for (const component of snapshot.components) {
        if (component.role !== 'Other' || architectArray(component.localDependencies).length > 0) {
            changeZones.push({
                path: component.path,
                role: component.role,
                impact: architectArray(component.localDependencies).length + architectArray(component.ipcChannels).length,
                dependencies: architectArray(component.localDependencies),
                external: architectArray(component.externalDependencies)
            });
        }
    }
    changeZones.sort((a, b) => b.impact - a.impact);

    const targetOrder = ['Config', 'Data', 'Backend', 'Logic', 'Bridge', 'UI'];
    const implementationOrder = layers
        .sort((a, b) => targetOrder.indexOf(a.role) - targetOrder.indexOf(b.role))
        .map(layer => layer.role);

    return {
        objective,
        architectureStyle: understanding.boundaries.length > 4 ? 'layered-with-cross-boundaries' : 'modular-layered',
        layers,
        boundaries: understanding.boundaries,
        changeZones: changeZones.slice(0, 80),
        implementationOrder,
        constraints,
        designRules: [
            'Preserve public contracts unless the objective explicitly requires a breaking change.',
            'Patch root causes before symptoms and keep related cross-file changes in one coherent change set.',
            'Prefer existing project conventions over introducing a new framework or dependency.',
            'For boundary changes, inspect both producer and consumer sides before editing.',
            'Keep each implementation step independently verifiable and reversible.'
        ]
    };
}

function architectImplementationPlan(design, snapshot) {
    const operations = [];
    const touched = new Set();
    const add = (operation) => {
        if (!operation?.path || touched.has(`${operation.action}:${operation.path}`)) return;
        touched.add(`${operation.action}:${operation.path}`);
        operations.push(operation);
    };

    for (const zone of design.changeZones.slice(0, 80)) {
        add({ action: 'inspect', path: zone.path, reason: `Confirm current ${zone.role} contract before modification.` });
        for (const dependency of zone.dependencies.slice(0, 12)) {
            add({ action: 'inspect', path: dependency, reason: `Trace dependency impact from ${zone.path}.` });
        }
    }

    return {
        mode: 'agent-executable',
        strategy: 'inspect -> patch/create -> analyze -> validate -> repair',
        operations,
        creationPolicy: 'Create new files only when the existing architecture cannot satisfy the objective without violating constraints.',
        modificationPolicy: 'Prefer surgical replacement for localized edits; use full-file writes only when the file is being deliberately reconstructed.',
        safety: {
            snapshotBeforeWrite: true,
            analyzeBeforeCommit: true,
            validateAfterBatch: true,
            repairOnFailure: true
        },
        affectedFiles: operations.map(operation => operation.path).slice(0, 120)
    };
}

function architectValidationPlan(design, snapshot) {
    const checks = [
        { id: 'syntax', description: 'Parse or syntax-check every changed source file.' },
        { id: 'imports', description: 'Verify local imports/exports and unresolved references.' },
        { id: 'architecture', description: 'Re-run discovery and compare expected layer/boundary relationships.' },
        { id: 'integration', description: 'Verify changed interfaces across producer/consumer boundaries.' },
        { id: 'regression', description: 'Run available project tests, smoke checks, or safe runtime verification.' },
        { id: 'constraints', description: 'Re-check preservation, dependency, security, and deployment constraints.' }
    ];

    if (snapshot.electron.detected) checks.push({ id: 'ipc', description: 'Validate IPC channel names, registration, and consumer symmetry.' });

    return { checks, passCondition: 'All mandatory checks pass or an explicit non-blocking exception is recorded.' };
}

function architectRepairPlan(validation, design) {
    return {
        policy: 'Failure classification first; repair root cause, then affected dependants, then re-validate.',
        stages: [
            'Classify failure as syntax, dependency, contract, integration, runtime, or environment issue.',
            'Rollback only the smallest unsafe change when the architecture cannot be safely repaired in place.',
            'Apply the smallest root-cause patch consistent with the design rules.',
            'Re-run validation checks affected by the repair.',
            'Re-run discovery if the repair changes boundaries, entry points, or dependency graphs.'
        ],
        escalation: 'Stop further writes when repeated repairs do not converge or when repository evidence contradicts the current architecture model.'
    };
}

function runUniversalArchitectLoop(scanResult, options = {}) {
    const snapshot = architectNormalizeSnapshot(scanResult);
    const understanding = architectUnderstand(snapshot);
    const constraintResult = architectBuildConstraints(snapshot, options);
    const design = architectDesign(snapshot, understanding, constraintResult.constraints, options);
    const implementation = architectImplementationPlan(design, snapshot);
    const validation = architectValidationPlan(design, snapshot);
    const repair = architectRepairPlan(validation, design);

    return {
        loopVersion: UNIVERSAL_ARCHITECT_VERSION,
        environment: options.environment || 'Unknown',
        root: snapshot.root,
        objective: design.objective,
        stages: [
            { name: 'Discovery', status: 'complete', output: snapshot.summary },
            { name: 'Architecture Understanding', status: 'complete', output: understanding },
            { name: 'Constraint Analysis', status: 'complete', output: constraintResult },
            { name: 'Architecture Planning', status: 'complete', output: { objective: design.objective, implementationOrder: design.implementationOrder } },
            { name: 'Design', status: 'complete', output: design },
            { name: 'Cross-file Implementation', status: 'ready', output: implementation },
            { name: 'Validation', status: 'ready', output: validation },
            { name: 'Repair', status: 'ready', output: repair }
        ],
        architectureModel: {
            project: snapshot.project,
            layers: snapshot.layers,
            boundaries: understanding.boundaries,
            components: snapshot.components,
            relations: snapshot.relations,
            externalDependencies: snapshot.externalDependencies,
            electron: snapshot.electron,
            confidence: understanding.confidence
        },
        executionProtocol: [
            'Use this model before writing code for non-trivial architecture work.',
            'Execute cross-file changes in dependency-aware order.',
            'Analyze and validate after each coherent batch.',
            'Invoke the repair policy automatically when validation fails.',
            'Finish with a fresh discovery scan so the architecture model reflects the new state.'
        ]
    };
}
