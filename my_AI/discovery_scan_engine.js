/**
 * Mastermind AI - Cloud Architecture Discovery Engine
 * ---------------------------------------------------
 * GitHub-native scanner: no Electron, fs, path, or local bridge required.
 */

const CLOUD_ARCH_SCAN_LIMITS = {
    maxFiles: 2500,
    maxDirectories: 700,
    maxRelations: 4500,
    maxTextBytes: 180000,
    maxPackageBytes: 500000,
    maxConcurrentReads: 8
};

const CLOUD_ARCH_IGNORED_DIRS = new Set([
    '.git', '.github', 'node_modules', 'dist', 'build', 'out', 'coverage',
    '.cache', '.idea', '.vscode', '.next', '.nuxt', '.turbo', '.vercel'
]);

const CLOUD_ARCH_TEXT_EXTENSIONS = new Set([
    '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.json', '.html', '.htm',
    '.css', '.scss', '.sass', '.less', '.vue', '.svelte', '.py', '.java',
    '.kt', '.kts', '.cs', '.cpp', '.c', '.h', '.hpp', '.go', '.rs', '.php',
    '.md', '.yml', '.yaml', '.toml', '.xml'
]);

function cloudArchNormalizePath(value = '') {
    return String(value).replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');
}

function cloudArchAddUnique(array, value) {
    if (value && !array.includes(value)) array.push(value);
}

function cloudArchRoleOf(filePath) {
    const p = cloudArchNormalizePath(filePath);
    const base = p.split('/').pop().toLowerCase();

    if (
        base === 'package.json' || base === 'package-lock.json' || base === 'pnpm-lock.yaml' ||
        base === 'yarn.lock' || /^(tsconfig|jsconfig)(\.|$)/i.test(base) ||
        /(vite|webpack|rollup|electron|eslint|prettier|babel|jest|vitest)\.(js|cjs|mjs|json|ts)$/i.test(base)
    ) return 'Config';

    if (/(^|\/)(preload|bridge|ipc|adapters?|connectors?)(\/|$)/i.test(p) || /^preload\.(js|ts|mjs|cjs)$/i.test(base)) return 'Bridge';

    if (
        /\.(html?|css|scss|sass|less|jsx|tsx|vue|svelte)$/i.test(base) ||
        /(^|\/)(ui|views?|components|frontend|renderer|public|pages|layouts?)(\/|$)/i.test(p)
    ) return 'UI';

    if (
        /\.(py|java|kt|kts|cs|go|rs|php)$/i.test(base) ||
        /(^|\/)(server|backend|api|controllers?|routers?)(\/|$)/i.test(p)
    ) return 'Backend';

    if (
        /\.(json|ya?ml|toml|xml)$/i.test(base) ||
        /(^|\/)(data|fixtures|assets|resources|content|schemas?)(\/|$)/i.test(p)
    ) return 'Data';

    if (
        /\.(js|ts|mjs|cjs)$/i.test(base) ||
        /(^|\/)(logic|core|service|services|lib|utils|helpers|hooks|store)(\/|$)/i.test(p)
    ) return 'Logic';

    return 'Other';
}

function cloudArchExtractDependencies(sourceText = '') {
    const result = [];
    const patterns = [
        /\bimport\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g,
        /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
        /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
        /\bexport\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g,
        /<script[^>]+src=["']([^"']+)["']/gi,
        /<link[^>]+href=["']([^"']+\.css[^"']*)["']/gi,
        /@import\s+(?:url\()?\s*["']([^"']+)["']/gi
    ];

    for (const regex of patterns) {
        let match;
        while ((match = regex.exec(sourceText))) cloudArchAddUnique(result, match[1]);
    }
    return result;
}

function cloudArchExternalPackage(specifier) {
    if (!specifier || specifier.startsWith('.') || specifier.startsWith('/') || /^([a-z]+:)?\/\//i.test(specifier)) return null;
    return specifier.startsWith('@')
        ? specifier.split('/').slice(0, 2).join('/')
        : specifier.split('/')[0];
}

function cloudArchResolveLocalImport(sourceFile, specifier, knownFiles) {
    if (!specifier || (!specifier.startsWith('.') && !specifier.startsWith('/'))) return null;

    const sourceDir = sourceFile.includes('/') ? sourceFile.slice(0, sourceFile.lastIndexOf('/')) : '';
    let base;

    if (specifier.startsWith('/')) {
        base = specifier.replace(/^\/+/, '');
    } else {
        const parts = `${sourceDir}/${specifier}`.split('/');
        const normalized = [];
        for (const part of parts) {
            if (!part || part === '.') continue;
            if (part === '..') normalized.pop();
            else normalized.push(part);
        }
        base = normalized.join('/');
    }

    const extensions = ['', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.json', '.css', '.html', '.vue', '.svelte'];
    for (const ext of extensions) {
        const candidate = cloudArchNormalizePath(base + ext);
        if (knownFiles.has(candidate)) return candidate;
    }

    for (const ext of extensions.slice(1)) {
        const candidate = cloudArchNormalizePath(`${base}/index${ext}`);
        if (knownFiles.has(candidate)) return candidate;
    }

    return null;
}

function cloudArchDetectIpc(sourceText = '') {
    const channels = [];
    const patterns = [
        /ipcMain\.(?:handle|on|removeHandler)\(\s*["']([^"']+)["']/g,
        /ipcRenderer\.(?:invoke|send|on|once|removeListener)\(\s*["']([^"']+)["']/g,
        /ipc\.(?:invoke|send|on)\(\s*["']([^"']+)["']/g,
        /contextBridge\.expose(?:InMainWorld|IsolatedWorld)\(\s*["']([^"']+)["']/g
    ];
    for (const regex of patterns) {
        let match;
        while ((match = regex.exec(sourceText))) cloudArchAddUnique(channels, match[1]);
    }
    return channels;
}

function cloudArchDetectExports(sourceText = '') {
    const exports = [];
    const patterns = [
        /\bexport\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/g,
        /\bmodule\.exports\s*=\s*([A-Za-z_$][\w$]*)/g,
        /\bexports\.([A-Za-z_$][\w$]*)/g
    ];
    for (const regex of patterns) {
        let match;
        while ((match = regex.exec(sourceText))) cloudArchAddUnique(exports, match[1] || 'CommonJS export');
    }
    return exports;
}

function cloudArchEntryCandidates(packageJson, knownFiles) {
    const entryPoints = [];
    if (packageJson?.main) cloudArchAddUnique(entryPoints, cloudArchNormalizePath(packageJson.main));
    if (packageJson?.browser) cloudArchAddUnique(entryPoints, cloudArchNormalizePath(packageJson.browser));
    if (packageJson?.module) cloudArchAddUnique(entryPoints, cloudArchNormalizePath(packageJson.module));
    if (packageJson?.scripts?.start) cloudArchAddUnique(entryPoints, 'package.json#scripts.start');
    if (packageJson?.scripts?.dev) cloudArchAddUnique(entryPoints, 'package.json#scripts.dev');

    for (const candidate of [
        'main.js', 'index.js', 'app.js', 'server.js', 'electron.js', 'preload.js',
        'index.html', 'src/main.js', 'src/index.js', 'src/app.js', 'src/renderer.js'
    ]) {
        if (knownFiles.has(candidate)) cloudArchAddUnique(entryPoints, candidate);
    }

    return entryPoints;
}

function cloudArchParsePackage(text) {
    if (!text) return null;
    try { return JSON.parse(text); } catch (_) { return null; }
}

async function cloudArchGetText(path, maxBytes = CLOUD_ARCH_SCAN_LIMITS.maxTextBytes) {
    try {
        const response = await safeGithubFetch(`contents/${path}`);
        if (!response.ok) return '';
        const data = await response.json();
        if (data?.encoding !== 'base64' || !data?.content) return '';
        const decoded = decodeURIComponent(escape(atob(data.content.replace(/\s/g, ''))));
        return decoded.length > maxBytes ? decoded.slice(0, maxBytes) : decoded;
    } catch (_) {
        return '';
    }
}

async function cloudArchListDirectory(path = '') {
    try {
        const response = await safeGithubFetch(`contents/${path}`);
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (_) {
        return [];
    }
}

async function cloudArchCollectTree(rootPath = '') {
    const files = [];
    const directories = [];
    const queue = [cloudArchNormalizePath(rootPath)];
    const seen = new Set();
    let truncated = false;

    while (queue.length && files.length < CLOUD_ARCH_SCAN_LIMITS.maxFiles && directories.length < CLOUD_ARCH_SCAN_LIMITS.maxDirectories) {
        const current = queue.shift() || '';
        if (seen.has(current)) continue;
        seen.add(current);

        const entries = await cloudArchListDirectory(current);
        directories.push(current || '.');

        for (const entry of entries) {
            if (entry.type === 'dir') {
                if (CLOUD_ARCH_IGNORED_DIRS.has(entry.name)) continue;
                if (directories.length + queue.length >= CLOUD_ARCH_SCAN_LIMITS.maxDirectories) {
                    truncated = true;
                    continue;
                }
                queue.push(cloudArchNormalizePath(entry.path));
                continue;
            }

            if (files.length >= CLOUD_ARCH_SCAN_LIMITS.maxFiles) {
                truncated = true;
                break;
            }

            const extension = entry.name.includes('.')
                ? `.${entry.name.split('.').pop().toLowerCase()}`
                : '(none)';

            files.push({
                path: cloudArchNormalizePath(entry.path),
                name: entry.name,
                extension,
                role: cloudArchRoleOf(entry.path),
                size: Number(entry.size || 0)
            });
        }
    }

    if (queue.length) truncated = true;
    files.sort((a, b) => a.path.localeCompare(b.path));
    return { files, directories, truncated };
}

async function cloudArchReadSources(files) {
    const targets = files.filter(file => CLOUD_ARCH_TEXT_EXTENSIONS.has(file.extension));
    const results = [];
    let cursor = 0;

    async function worker() {
        while (cursor < targets.length) {
            const index = cursor++;
            const file = targets[index];
            const source = await cloudArchGetText(file.path);
            results[index] = { file, source };
        }
    }

    const workers = Array.from(
        { length: Math.min(CLOUD_ARCH_SCAN_LIMITS.maxConcurrentReads, targets.length) },
        () => worker()
    );
    await Promise.all(workers);
    return results.filter(Boolean);
}

async function performCloudArchitectureDiscovery(scanPath = '') {
    const root = cloudArchNormalizePath(scanPath);
    const tree = await cloudArchCollectTree(root);
    const files = tree.files;
    const knownFiles = new Set(files.map(file => file.path));
    const layers = {};
    const roleCounts = {};
    const bridgeFiles = [];
    const relations = [];
    const externalDependencies = new Set();
    const ipcChannels = new Set();
    const components = [];

    for (const file of files) {
        if (!layers[file.role]) layers[file.role] = [];
        layers[file.role].push(file.path);
        roleCounts[file.role] = (roleCounts[file.role] || 0) + 1;
        if (file.role === 'Bridge') bridgeFiles.push(file.path);
    }

    const packageText = knownFiles.has(cloudArchNormalizePath(`${root ? `${root}/` : ''}package.json`))
        ? await cloudArchGetText(cloudArchNormalizePath(`${root ? `${root}/` : ''}package.json`), CLOUD_ARCH_SCAN_LIMITS.maxPackageBytes)
        : '';
    const packageJson = cloudArchParsePackage(packageText);
    const entryPoints = cloudArchEntryCandidates(packageJson, knownFiles);
    const sourceResults = await cloudArchReadSources(files);

    for (const { file, source } of sourceResults) {
        if (!source) continue;
        const imports = cloudArchExtractDependencies(source);
        const localDependencies = [];
        const external = [];
        const ipc = cloudArchDetectIpc(source);

        for (const specifier of imports) {
            const localTarget = cloudArchResolveLocalImport(file.path, specifier, knownFiles);
            if (localTarget) {
                cloudArchAddUnique(localDependencies, localTarget);
                if (relations.length < CLOUD_ARCH_SCAN_LIMITS.maxRelations) {
                    relations.push({ from: file.path, to: localTarget, type: 'local-import' });
                }
            }

            const packageName = cloudArchExternalPackage(specifier);
            if (packageName) {
                cloudArchAddUnique(external, packageName);
                externalDependencies.add(packageName);
            }
        }

        ipc.forEach(channel => ipcChannels.add(channel));

        components.push({
            path: file.path,
            role: file.role,
            size: file.size,
            imports,
            localDependencies,
            externalDependencies: external,
            exports: cloudArchDetectExports(source),
            ipcChannels: ipc
        });
    }

    const packageDependencies = packageJson
        ? Object.keys({
            ...(packageJson.dependencies || {}),
            ...(packageJson.devDependencies || {}),
            ...(packageJson.optionalDependencies || {})
        })
        : [];

    packageDependencies.forEach(dep => externalDependencies.add(dep));

    const electronDetected = Boolean(
        packageDependencies.includes('electron') ||
        bridgeFiles.length ||
        ipcChannels.size
    );

    const warnings = [];
    if (!packageJson) warnings.push('لم يتم العثور على package.json صالح في نطاق المسح.');
    if (!entryPoints.length) warnings.push('لم يتم اكتشاف نقطة دخول واضحة.');
    if (tree.truncated) warnings.push('تم تطبيق حدود الحماية؛ الخريطة قد تكون جزئية.');
    if (relations.length >= CLOUD_ARCH_SCAN_LIMITS.maxRelations) warnings.push('تم قص العلاقات عند الحد المسموح به.');

    return {
        scanVersion: '4.0-cloud',
        environment: 'GitHub Cloud',
        root: root || '.',
        summary: {
            totalFiles: files.length,
            totalDirectories: tree.directories.length,
            roleCounts,
            relationCount: relations.length,
            externalDependencyCount: externalDependencies.size,
            ipcChannelCount: ipcChannels.size,
            truncated: tree.truncated
        },
        project: {
            name: packageJson?.name || root.split('/').pop() || 'my',
            version: packageJson?.version || null,
            type: packageJson?.type || null,
            entryPoints,
            dependencies: packageDependencies
        },
        architecture: {
            layers,
            components,
            relations,
            externalDependencies: [...externalDependencies].sort(),
            electron: {
                detected: electronDetected,
                ipcChannels: [...ipcChannels].sort(),
                bridgeFiles
            }
        },
        recommendations: [
            'استخدم layers لتحديد الطبقة قبل اختيار الملف المستهدف.',
            'استخدم relations وlocalDependencies لتتبع التأثيرات قبل التعديل.',
            'افحص Bridge/IPC قبل تغيير الاتصال بين الواجهة والمنطق.',
            'افحص externalDependencies وpackage metadata قبل تغيير الاعتماديات.',
            'عند كون الخريطة جزئية، نفّذ Discovery Scan بنطاق أضيق للمسار المستهدف.'
        ],
        warnings
    };
}
