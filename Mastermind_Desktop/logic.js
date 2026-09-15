// UI Logic for Mastermind Desktop Pro

function initMastermindUi() {
    console.log("🚀 Initializing Mastermind UI Engine...");

    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const chatMessages = document.getElementById('chatMessages');
    const newChatBtn = document.getElementById('newChatBtn');
    const modelSelector = document.getElementById('modelSelector');

    if (!userInput) {
        console.warn("⚠️ UI elements not found yet, retrying...");
        setTimeout(initMastermindUi, 100);
        return;
    }

    let attachBtn = document.getElementById('attachBtn');
    if (!attachBtn) {
        const icon = document.querySelector('.fa-paperclip');
        if (icon) attachBtn = icon.closest('button');
    }

    let fileInput = document.getElementById('fileInput');
    if (!fileInput) {
        fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'fileInput';
        fileInput.multiple = true;
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
    }

    let filePreviewContainer = document.getElementById('filePreviewContainer');
    if (!filePreviewContainer) {
        filePreviewContainer = document.createElement('div');
        filePreviewContainer.id = 'filePreviewContainer';
        filePreviewContainer.className = 'file-preview-container';
        filePreviewContainer.style.cssText = 'display: none; padding: 8px; gap: 8px; border-bottom: 1px solid var(--border); flex-wrap: wrap;';
        const inputContainer = document.querySelector('.input-container');
        if (inputContainer) inputContainer.prepend(filePreviewContainer);
    }

    let selectedFiles = [];

    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = userInput.scrollHeight + 'px';
    });

    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });

    if (sendBtn) sendBtn.onclick = handleSend;

    if (attachBtn) {
        attachBtn.onclick = () => {
            console.log("📎 Attach button clicked");
            fileInput.click();
        };
    }

    fileInput.onchange = (e) => {
        const files = Array.from(e.target.files);
        console.log("📂 Files selected:", files.length);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = event.target.result.split(',')[1];
                const fileObj = {
                    name: file.name,
                    type: file.type,
                    base64: base64,
                    id: Date.now() + Math.random()
                };

                if (file.type.startsWith('text/') || file.name.endsWith('.json') || file.name.endsWith('.js') || file.name.endsWith('.css')) {
                    const textReader = new FileReader();
                    textReader.onload = (te) => {
                        fileObj.content = te.target.result;
                        selectedFiles.push(fileObj);
                        renderPreviews();
                    };
                    textReader.readAsText(file);
                } else {
                    selectedFiles.push(fileObj);
                    renderPreviews();
                }
            };
            reader.readAsDataURL(file);
        });
        fileInput.value = '';
    };

    function renderPreviews() {
        if (!filePreviewContainer) return;
        filePreviewContainer.innerHTML = '';
        filePreviewContainer.style.display = selectedFiles.length > 0 ? 'flex' : 'none';

        selectedFiles.forEach(file => {
            const item = document.createElement('div');
            item.className = 'preview-item';

            if (file.type.startsWith('image/')) {
                item.innerHTML = `<img src="data:${file.type};base64,${file.base64}">`;
            } else {
                item.innerHTML = `<i class="fas fa-file-alt"></i>`;
                item.title = file.name;
            }

            const removeBtn = document.createElement('div');
            removeBtn.className = 'remove-btn';
            removeBtn.innerHTML = '×';
            removeBtn.onclick = (event) => {
                event.stopPropagation();
                selectedFiles = selectedFiles.filter(f => f.id !== file.id);
                renderPreviews();
            };
            item.appendChild(removeBtn);
            filePreviewContainer.appendChild(item);
        });
    }

    if (newChatBtn) {
        newChatBtn.onclick = () => {
            chatMessages.innerHTML = `
                <div class="welcome-screen">
                    <div class="app-logo">M</div>
                    <h1>Mastermind AI</h1>
                    <p>New Session Started • Ready for instructions</p>
                </div>
            `;
            chatHistory = [];
            if (chatMessages) chatMessages.style.display = 'block';
            const chatFooter = document.querySelector('.chat-footer');
            if (chatFooter) chatFooter.style.display = 'block';
            const pluginsView = document.getElementById('pluginsView');
            if (pluginsView) pluginsView.style.display = 'none';
        };
    }

    async function handleSend() {
        const text = userInput.value.trim();
        if (!text && selectedFiles.length === 0) return;

        const selectedModel = modelSelector ? modelSelector.value : 'gemini-1.5-pro';

        const images = selectedFiles
            .filter(f => f.type.startsWith('image/'))
            .map(f => `data:${f.type};base64,${f.base64}`);

        addMessage('user', text, null, images);
        userInput.value = '';
        userInput.style.height = 'auto';

        let finalPrompt = text;
        let attachments = [];

        selectedFiles.forEach(f => {
            if (f.content) finalPrompt += `\n\n[File: ${f.name}]\n${f.content}`;
            if (f.type.startsWith('image/') || f.type === 'application/pdf') {
                attachments.push({ inline_data: { mime_type: f.type, data: f.base64 } });
            }
        });

        selectedFiles = [];
        renderPreviews();

        const aiMsgId = addMessage('ai', 'Thinking...');

        chatHistory.push({ role: 'user', parts: [{ text: finalPrompt }, ...attachments] });

        try {
            const response = await runToolLoop(chatHistory);
            updateMessage(aiMsgId, response.text, response.used_model || selectedModel);
            chatHistory.push({ role: 'model', parts: [{ text: response.text }] });
        } catch (e) {
            updateMessage(aiMsgId, "Error: " + e.message);
        }
    }

    function addMessage(role, text, modelName = null, images = []) {
        const id = 'msg-' + Date.now();
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${role}`;
        msgDiv.id = id;

        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.innerHTML = role === 'ai' ? '<i class="fas fa-robot"></i>' : '<i class="fas fa-user"></i>';

        const content = document.createElement('div');
        content.className = 'content';

        if (images && images.length > 0) {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'chat-images-container';
            images.forEach(src => {
                const img = document.createElement('img');
                img.src = src;
                img.className = 'chat-image-msg';
                imgContainer.appendChild(img);
            });
            content.appendChild(imgContainer);
        }

        const textDiv = document.createElement('div');
        textDiv.className = 'text-content';
        textDiv.textContent = text;
        content.appendChild(textDiv);

        if (role === 'ai') {
            const badge = document.createElement('div');
            badge.className = 'model-badge';
            badge.style.display = modelName ? 'block' : 'none';
            badge.textContent = modelName || '';
            content.appendChild(badge);
        }

        msgDiv.appendChild(avatar);
        msgDiv.appendChild(content);

        const welcome = chatMessages.querySelector('.welcome-screen');
        if (welcome) welcome.remove();

        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return id;
    }

    function updateMessage(id, text, modelName = null) {
        const msgDiv = document.getElementById(id);
        if (msgDiv) {
            const textContent = msgDiv.querySelector('.text-content');
            if (textContent) {
                textContent.textContent = text;
            } else {
                const content = msgDiv.querySelector('.content');
                if (content) content.textContent = text;
            }

            if (modelName) {
                let badge = msgDiv.querySelector('.model-badge');
                if (badge) {
                    badge.textContent = modelName;
                    badge.style.display = 'block';
                }
            }

            chatMessages.appendChild(msgDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    document.querySelectorAll('.nav-item, .recent-chat-item').forEach(item => {
        item.onclick = () => {
            document.querySelectorAll('.nav-item, .recent-chat-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            const text = item.textContent.trim();
            const chatFooter = document.querySelector('.chat-footer');
            const pluginsView = document.getElementById('pluginsView');

            if (text.includes('Plugins')) {
                if (chatMessages) chatMessages.style.display = 'none';
                if (chatFooter) chatFooter.style.display = 'none';
                if (pluginsView) pluginsView.style.display = 'block';
            } else {
                if (chatMessages) chatMessages.style.display = 'block';
                if (chatFooter) chatFooter.style.display = 'block';
                if (pluginsView) pluginsView.style.display = 'none';
            }
        };
    });

    const bridgeStatus = document.getElementById('bridgeStatus');
    if (bridgeStatus) {
        bridgeStatus.onclick = () => {
            const terminal = document.getElementById('terminalOverlay');
            terminal.classList.toggle('open');
        };
    }

    const closeTerminal = document.getElementById('closeTerminal');
    if (closeTerminal) {
        closeTerminal.onclick = () => {
            document.getElementById('terminalOverlay').classList.remove('open');
        };
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMastermindUi);
} else {
    initMastermindUi();
}

// --- [Advanced UI Functions for Tools] ---

function addToolStepToUi(toolName, args) {
    const container = document.getElementById('chatMessages');
    const stepId = 'step-' + Date.now();
    const stepContainer = document.createElement('div');
    stepContainer.className = 'ai-step-container';
    stepContainer.id = stepId;

    stepContainer.innerHTML = `
        <div class="ai-step-header is-active" id="${stepId}-header" onclick="toggleStepDetails('${stepId}')">
            <span class="ai-step-icon">${getToolIcon(toolName)}</span>
            <span class="ai-step-name">${toolName.toUpperCase()}</span>
            <div class="ai-step-status">
                <div class="status-spinner"></div>
                <span class="status-text">RUNNING</span>
            </div>
            <span class="toggle-arrow" style="font-size: 10px; transition: transform 0.3s; margin-left: 8px; opacity: 0.5; transform: rotate(180deg);">▼</span>
        </div>
        <div class="ai-step-details" id="${stepId}-details" style="display: block;">
            <div class="ai-step-args">
                <div style="font-size: 9px; color: #6366f1; margin-bottom: 2px; font-weight: 900;">PARAMS</div>
                ${JSON.stringify(args, null, 1)}
            </div>
            <div class="step-output-area">
                <div class="status-spinner" style="display:inline-block; vertical-align:middle; margin-right:8px;"></div>
                <span style="opacity: 0.6; font-size: 11px;">Waiting for system kernel...</span>
            </div>
        </div>
    `;
    container.appendChild(stepContainer);

    const thinkingMsg = Array.from(container.querySelectorAll('.message.ai')).reverse().find(m => m.textContent.includes('Thinking...'));
    if (thinkingMsg) container.appendChild(thinkingMsg);

    container.scrollTop = container.scrollHeight;
    return stepId;
}

function toggleStepDetails(id) {
    const details = document.getElementById(id + '-details');
    const header = document.getElementById(id + '-header');
    const arrow = header.querySelector('.toggle-arrow');

    if (!details || !header) return;

    const isVisible = details.style.display === 'block';

    details.style.display = isVisible ? 'none' : 'block';
    if (isVisible) {
        header.classList.remove('is-active');
        if (arrow) arrow.style.transform = 'rotate(0deg)';
    } else {
        header.classList.add('is-active');
        if (arrow) arrow.style.transform = 'rotate(180deg)';
    }
}

function updateToolStepStatus(stepId, success, output) {
    const step = document.getElementById(stepId);
    if (!step) return;

    const status = step.querySelector('.ai-step-status');

    status.innerHTML = success ?
        '<span class="status-done">✅ COMPLETED</span>' :
        '<span class="status-error">❌ FAILED</span>';

    const outputArea = step.querySelector('.step-output-area');
    if (typeof output === 'object' && output.reasoning) {
        outputArea.innerHTML = `
            <div class="thought-container">
                <div class="thought-label">🧠 Autonomous Reasoning</div>
                <div style="color: #dfe1e5; font-size: 12px; line-height: 1.5;">${escapeHtml(output.reasoning)}</div>
                ${output.plan ? `<div style="margin-top:10px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.05); color:#888; font-size:11px;"><b>NEXT_STEP:</b> ${escapeHtml(output.plan)}</div>` : ''}
            </div>
        `;
    } else {
        const textOut = String(output);
        outputArea.innerHTML = `
            <div style="font-size: 9px; color: #10b981; margin-bottom: 4px; font-weight: 900; opacity: 0.8;">KERNEL_OUTPUT</div>
            <div style="white-space: pre-wrap; color: #a9b7c6; font-size: 12px;">${escapeHtml(textOut)}</div>
        `;
    }

    const container = document.getElementById('chatMessages');
    container.scrollTop = container.scrollHeight;
}

function getToolIcon(name) {
    const icons = { read: '🔍', write: '📝', search: '📡', run: '⚡', repair: '🛠️', thought: '🧠', github: '🐙' };
    const key = Object.keys(icons).find(k => name.toLowerCase().includes(k));
    return icons[key] || '⚙️';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.innerText = text;
    return div.innerHTML;
}

// --- [Architecture Discovery Upgrade] ---
(function installArchitectureDiscovery() {
    const fs = (typeof require === 'function') ? require('fs') : null;
    const path = (typeof require === 'function') ? require('path') : null;
    if (!fs || !path) return;

    const ignoredDirs = new Set(['.git', '.hg', '.svn', 'node_modules', 'dist', 'build', 'out', 'coverage', '.cache', '.idea', '.vscode']);
    const textExts = new Set(['.js','.jsx','.ts','.tsx','.mjs','.cjs','.json','.html','.htm','.css','.scss','.sass','.less','.py','.java','.kt','.kts','.cs','.cpp','.c','.h','.hpp','.go','.rs','.php','.vue','.svelte']);

    const roleRules = [
        ['UI', [/\.html?$/i,/\.css$/i,/\.scss$/i,/\.sass$/i,/\.less$/i,/\.jsx$/i,/\.tsx$/i,/(^|[\\/])(ui|view|views|components|frontend|renderer|public)([\\/]|$)/i]],
        ['Bridge', [/(^|[\\/])(bridge|preload)([\\/]|$)/i,/preload\.(js|ts)$/i,/(ipc|bridge)/i]],
        ['Backend', [/\.(py|java|kt|kts|cs|go|rs)$/i,/(^|[\\/])(server|backend|api)([\\/]|$)/i]],
        ['Config', [/package(-lock)?\.json$/i,/(^|[\\/])(vite|webpack|rollup|tsconfig|eslint|prettier|electron)[^\\/]*\.(json|js|cjs|mjs)$/i]],
        ['Data', [/\.json$/i,/(^|[\\/])(data|assets|fixtures)([\\/]|$)/i]],
        ['Logic', [/\.(js|ts|mjs|cjs)$/i,/(^|[\\/])(logic|core|service|services|lib|utils)([\\/]|$)/i]]
    ];

    function rel(root, file) { return path.relative(root, file).split(path.sep).join('/'); }
    function addUnique(arr, value) { if (value && !arr.includes(value)) arr.push(value); }
    function roleOf(file) {
        for (const [role, patterns] of roleRules) if (patterns.some(re => re.test(file))) return role;
        return 'Other';
    }
    function readText(file, maxBytes = 180000) {
        try {
            const stat = fs.statSync(file);
            if (!stat.isFile() || stat.size > maxBytes) return '';
            return fs.readFileSync(file, 'utf8');
        } catch (_) { return ''; }
    }
    function collect(root) {
        const out = [], stack = [root];
        while (stack.length) {
            const current = stack.pop();
            let entries;
            try { entries = fs.readdirSync(current, { withFileTypes: true }); } catch (_) { continue; }
            for (const entry of entries) {
                if (ignoredDirs.has(entry.name)) continue;
                const full = path.join(current, entry.name);
                if (entry.isDirectory()) { stack.push(full); continue; }
                const rp = rel(root, full);
                let size = 0; try { size = fs.statSync(full).size; } catch (_) {}
                out.push({ path: rp, extension: path.extname(entry.name).toLowerCase() || '(none)', role: roleOf(rp), size });
            }
        }
        return out.sort((a,b) => a.path.localeCompare(b.path));
    }
    function depsFrom(text) {
        const out = [];
        const patterns = [
            /\bimport\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g,
            /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
            /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
            /\bexport\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g,
            /<script[^>]+src=["']([^"']+)["']/gi,
            /<link[^>]+href=["']([^"']+\.css[^"']*)["']/gi,
            /@import\s+(?:url\()?\s*["']([^"']+)["']/gi
        ];
        for (const re of patterns) {
            let m; while ((m = re.exec(text))) addUnique(out, m[1]);
        }
        return out;
    }
    function externalDeps(text) {
        const out = [];
        for (const spec of depsFrom(text)) {
            if (!spec || spec.startsWith('.') || spec.startsWith('/') || /^https?:/i.test(spec)) continue;
            addUnique(out, spec.startsWith('@') ? spec.split('/').slice(0,2).join('/') : spec.split('/')[0]);
        }
        return out;
    }
    function ipcChannels(text) {
        const out = [];
        const patterns = [
            /ipcMain\.(?:handle|on|removeHandler)\(\s*["']([^"']+)["']/g,
            /ipcRenderer\.(?:invoke|send|on|once)\(\s*["']([^"']+)["']/g,
            /ipc\.(?:invoke|send|on)\(\s*["']([^"']+)["']/g
        ];
        for (const re of patterns) { let m; while ((m = re.exec(text))) addUnique(out, m[1]); }
        return out;
    }
    function resolveLocal(source, spec, root, known) {
        if (!spec || !spec.startsWith('.')) return null;
        const base = path.resolve(path.dirname(path.join(root, source)), spec);
        const tries = [base];
        for (const ext of ['.js','.mjs','.cjs','.ts','.tsx','.jsx','.json','.css','.html']) tries.push(base + ext);
        for (const ext of ['.js','.mjs','.cjs','.ts','.tsx','.jsx','.json','.css','.html']) tries.push(path.join(base, 'index' + ext));
        for (const candidate of tries) {
            try {
                if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
                    const rp = rel(root, candidate); if (known.has(rp)) return rp;
                }
            } catch (_) {}
        }
        return null;
    }
    function scan(scanPath) {
        const root = path.resolve(scanPath || process.cwd());
        if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) return { error: `Architecture scan path is not a directory: ${root}` };
        const files = collect(root);
        const known = new Set(files.map(x => x.path));
        const layers = {};
        for (const f of files) (layers[f.role] ||= []).push(f.path);

        let pkg = null;
        const packageText = readText(path.join(root, 'package.json'), 500000);
        try { if (packageText) pkg = JSON.parse(packageText); } catch (_) {}

        const entryPoints = [];
        if (pkg?.main) addUnique(entryPoints, String(pkg.main).replace(/\\/g,'/'));
        if (pkg?.scripts?.start) addUnique(entryPoints, 'package.json#scripts.start');
        if (pkg?.scripts?.dev) addUnique(entryPoints, 'package.json#scripts.dev');
        for (const name of ['main.js','index.js','app.js','server.js','index.html','preload.js']) if (known.has(name)) addUnique(entryPoints, name);

        const components = [], relations = [], external = new Set(), ipc = new Set();
        for (const file of files) {
            if (!textExts.has(file.extension)) continue;
            const full = path.join(root, file.path.split('/').join(path.sep));
            const text = readText(full); if (!text) continue;
            const imports = depsFrom(text), local = [];
            for (const spec of imports) {
                const target = resolveLocal(file.path, spec, root, known);
                if (target) { addUnique(local, target); relations.push({ from: file.path, to: target, type: 'imports' }); }
            }
            for (const dep of externalDeps(text)) external.add(dep);
            for (const channel of ipcChannels(text)) ipc.add(channel);
            components.push({ path: file.path, role: file.role, imports: local, externalDependencies: externalDeps(text), ipcChannels: ipcChannels(text) });
        }

        const relationsUnique = relations.filter((r, i, a) => i === a.findIndex(x => x.from === r.from && x.to === r.to && x.type === r.type));
        const electronDetected = Boolean((layers.Bridge?.length) || ipc.size || pkg?.dependencies?.electron || pkg?.devDependencies?.electron);
        const roleCounts = {};
        for (const [role, list] of Object.entries(layers)) roleCounts[role] = list.length;
        const warnings = [];
        if (!pkg) warnings.push('package.json not found; dependency metadata is inferred from source imports.');
        if (!entryPoints.length) warnings.push('No obvious entry point was detected from package metadata or common filenames.');
        if (files.length > 8000) warnings.push(`Large project (${files.length} files); downstream model context should rely on the summarized map.`);

        return {
            scanVersion: '2.0',
            root,
            summary: { totalFiles: files.length, roleCounts, relationCount: relationsUnique.length, externalDependencyCount: external.size, ipcChannelCount: ipc.size },
            project: {
                name: pkg?.name || path.basename(root),
                version: pkg?.version || null,
                type: pkg?.type || null,
                packageManager: pkg ? 'npm-package' : 'unknown',
                entryPoints,
                dependencies: Object.keys({ ...(pkg?.dependencies || {}), ...(pkg?.devDependencies || {}), ...(pkg?.optionalDependencies || {}) })
            },
            architecture: {
                layers,
                components,
                relations: relationsUnique.slice(0, 5000),
                externalDependencies: [...external].sort(),
                electron: { detected: electronDetected, ipcChannels: [...ipc].sort(), bridgeFiles: layers.Bridge || [] }
            },
            recommendations: [
                'Use the layers and relations as the architectural map before editing files.',
                'Prefer root-cause components and their direct dependents instead of isolated UI symptoms.',
                'Read the specific component files before surgical edits.'
            ],
            warnings
        };
    }

    let activeTool = null;

    function install() {
        if (typeof window.callLocalBridge !== 'function' || typeof window.addToolStepToUi !== 'function') {
            setTimeout(install, 50);
            return;
        }
        if (window.__architectureDiscoveryInstalled) return;
        window.__architectureDiscoveryInstalled = true;

        const bridge = window.callLocalBridge;
        const step = window.addToolStepToUi;

        window.addToolStepToUi = function(toolName, args) {
            activeTool = toolName;
            window.__activeToolName = toolName;
            return step.apply(this, arguments);
        };

        window.callLocalBridge = async function(action, payload) {
            if (action === 'list' && (activeTool === 'discovery_scan' || window.__activeToolName === 'discovery_scan')) {
                const target = payload?.path || '.';
                const result = scan(target);
                if (result && !result.error) console.log('🧭 Architecture Discovery v2.0:', result.summary);
                return result;
            }
            return bridge.apply(this, arguments);
        };

        console.log('🧭 Architecture Discovery Engine v2.0 installed.');
    }

    install();
})();
