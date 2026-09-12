/**
 * VSA Academy - Mastermind UI & Interaction Logic
 * --------------------------------------------------
 * هذا الملف يتولى كافة العمليات "الميكانيكية" والرسومية للواجهة.
 */

var selectedFiles = [];
var aiMasterTimerInterval = null;
var aiMasterStartTime = 0;

// --- [1. تهيئة المفاتيح وإدارة الجلسات] ---

async function initKeys() {
    const term = document.getElementById('aiTerminal');
    if (term && !term.querySelector('.terminal-close-btn')) {
        const closeBtn = document.createElement('div');
        closeBtn.className = 'terminal-close-btn';
        closeBtn.innerHTML = '✕';
        closeBtn.style.cssText = "position:absolute; top:5px; right:10px; color:#afb1b3; cursor:pointer; z-index:10;";
        closeBtn.onclick = toggleTerminal;
        term.appendChild(closeBtn);
    }

    if (!window.heartbeatStarted) {
        window.heartbeatStarted = true;
        setInterval(async () => {
            const sendBtn = document.getElementById('aiSendBtn');
            if (sendBtn && !sendBtn.classList.contains('working')) {
                try {
                    const status = await repairSystem();
                    const isOnline = !status.includes('❌');
                    updateHealthUI(isOnline, isOnline ? `BRIDGE: OK | ONLINE (2026)` : `BRIDGE: OFFLINE`);
                    if (!isOnline) logToTerminal(status, "error");
                } catch (e) {
                    updateHealthUI(false, `BRIDGE: ERROR`);
                    logToTerminal(`Heartbeat failed: ${e.message}`, "error");
                }
            }
        }, 60000);
    }
}

function saveModelSelection() {
    const selectedModel = document.getElementById('modelSelector').value;
    localStorage.setItem('gemini_selected_model', selectedModel);
}

function toggleHistory() {
    const sidebar = document.getElementById('aiHistorySidebar');
    if (sidebar) {
        const isOpen = sidebar.classList.contains('open');
        if (isOpen) {
            sidebar.classList.remove('open');
            sidebar.style.display = 'none';
        } else {
            sidebar.classList.add('open');
            sidebar.style.display = 'flex';
            renderHistory();
        }
    }
}

function renderHistory() {
    const list = document.getElementById('historyList');
    if (!list) return;

    list.innerHTML = `
        <div style="padding: 10px; border-bottom: 1px solid #3c3f41; margin-bottom: 10px;">
            <button onclick="manualHistoryImport()" style="width:100%; background:#4db6ac; color:white; border:none; padding:8px; border-radius:4px; font-size:12px; cursor:pointer;">📥 استيراد سجل خارجي (JSON)</button>
        </div>
    ` + chatSessions.map(s => `
        <div class="history-item ${s.id === currentSessionId ? 'active' : ''}" onclick="loadSession('${s.id}')">
            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:160px;">${s.title}</span>
            <div class="actions">
                <span onclick="event.stopPropagation(); renameSession('${s.id}')">✏️</span>
                <span onclick="event.stopPropagation(); deleteSession('${s.id}')">🗑️</span>
            </div>
        </div>
    `).join('');
}

// --- [2. التحكم في النافذة والتحجيم] ---

function initResizer() {
    const chatBox = document.getElementById('aiChatBox');
    const resizers = document.querySelectorAll('.ai-resizer');
    let isResizing = false;

    resizers.forEach(resizer => {
        resizer.addEventListener('mousedown', function(e) {
            e.preventDefault();
            isResizing = true;

            const startX = e.clientX;
            const startY = e.clientY;
            const startWidth = chatBox.offsetWidth;
            const startHeight = chatBox.offsetHeight;

            // ⚡ تعطيل الـ Transition أثناء التحجيم لضمان سرعة البرق
            chatBox.style.transition = 'none';

            const overlay = document.createElement('div');
            overlay.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:9999; cursor:" + window.getComputedStyle(resizer).cursor;
            document.body.appendChild(overlay);

            let animationFrame;

            function mousemove(e) {
                if (!isResizing) return;

                if (animationFrame) cancelAnimationFrame(animationFrame);

                animationFrame = requestAnimationFrame(() => {
                    const dx = e.clientX - startX;
                    const dy = e.clientY - startY;

                    if (resizer.classList.contains('ai-resizer-r')) {
                        chatBox.style.width = (startWidth + dx) + 'px';
                    } else if (resizer.classList.contains('ai-resizer-l')) {
                        chatBox.style.width = (startWidth - dx) + 'px';
                    } else if (resizer.classList.contains('ai-resizer-b')) {
                        chatBox.style.height = (startHeight + dy) + 'px';
                    } else if (resizer.classList.contains('ai-resizer-t')) {
                        chatBox.style.height = (startHeight - dy) + 'px';
                    } else if (resizer.classList.contains('ai-resizer-br')) {
                        chatBox.style.width = (startWidth + dx) + 'px';
                        chatBox.style.height = (startHeight + dy) + 'px';
                    } else if (resizer.classList.contains('ai-resizer-bl')) {
                        chatBox.style.width = (startWidth - dx) + 'px';
                        chatBox.style.height = (startHeight + dy) + 'px';
                    } else if (resizer.classList.contains('ai-resizer-tr')) {
                        chatBox.style.width = (startWidth + dx) + 'px';
                        chatBox.style.height = (startHeight - dy) + 'px';
                    } else if (resizer.classList.contains('ai-resizer-tl')) {
                        chatBox.style.width = (startWidth - dx) + 'px';
                        chatBox.style.height = (startHeight - dy) + 'px';
                    }
                });
            }

            function mouseup() {
                isResizing = false;
                if (animationFrame) cancelAnimationFrame(animationFrame);

                // 🔄 إعادة تفعيل الـ Transition بعد الانتهاء
                chatBox.style.transition = '';

                if (document.body.contains(overlay)) document.body.removeChild(overlay);
                window.removeEventListener('mousemove', mousemove);
                window.removeEventListener('mouseup', mouseup);
                localStorage.setItem('ai_chat_width', chatBox.offsetWidth);
                localStorage.setItem('ai_chat_height', chatBox.offsetHeight);
            }
            window.addEventListener('mousemove', mousemove);
            window.addEventListener('mouseup', mouseup);
        });
    });
}

async function toggleAiChat() {
    const chatBox = document.getElementById('aiChatBox');
    const toggleBtn = document.getElementById('aiToggleBtn');
    const isOpening = chatBox.style.display !== 'flex';

    chatBox.style.display = isOpening ? 'flex' : 'none';
    if (toggleBtn) toggleBtn.style.display = isOpening ? 'none' : 'flex';

    if (isOpening) {
        const savedW = localStorage.getItem('ai_chat_width');
        const savedH = localStorage.getItem('ai_chat_height');
        if (savedW) chatBox.style.width = savedW + 'px';
        if (savedH) chatBox.style.height = savedH + 'px';

        const container = document.getElementById('aiMessages');
        container.scrollTop = container.scrollHeight;
        await initKeys();
        initResizer();
    }
}

function toggleMaximizeAi() {
    const chatBox = document.getElementById('aiChatBox');
    chatBox.classList.toggle('maximized');
    document.getElementById('aiInput').focus();
}

// --- [3. معالجة المدخلات والملفات] ---

function autoResizeInput() {
    const input = document.getElementById('aiInput');
    input.style.height = 'auto';
    input.style.height = (input.scrollHeight) + 'px';
}

function updateSendButtonState() {
    const input = document.getElementById('aiInput');
    const btn = document.getElementById('aiSendBtn');
    const hasFiles = selectedFiles.length > 0;
    if ((input.value && input.value.trim() !== "") || hasFiles) {
        btn.classList.add('active');
    } else {
        btn.classList.remove('active');
    }
}

async function handleFileUpload(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    const container = document.getElementById('imagePreviewContainer');
    container.style.display = 'flex';

    for (const file of files) {
        const fileId = Date.now() + Math.random();
        const reader = new FileReader();

        reader.onload = (e) => {
            const base64 = e.target.result.split(',')[1];
            const fileObj = { id: fileId, name: file.name, type: file.type || 'application/json', base64: base64, content: null };

            if (file.type === 'application/json' || file.name.endsWith('.json') || file.type.startsWith('text/')) {
                const textReader = new FileReader();
                textReader.onload = (te) => { 
                    fileObj.content = te.target.result; 
                    selectedFiles.push(fileObj);
                    renderPreviews();
                    updateSendButtonState();
                };
                textReader.readAsText(file);
            } else {
                selectedFiles.push(fileObj);
                renderPreviews();
                updateSendButtonState();
            }
        };
        reader.readAsDataURL(file);
    }
    event.target.value = '';
}

function renderPreviews() {
    const container = document.getElementById('imagePreviewContainer');
    container.innerHTML = '';
    container.style.display = selectedFiles.length === 0 ? 'none' : 'flex';

    selectedFiles.forEach(file => {
        const item = document.createElement('div');
        item.className = 'preview-item';
        if (file.type.startsWith('image/')) {
            item.innerHTML = `<img src="data:${file.type};base64,${file.base64}">`;
        } else if (file.type === 'application/json' || file.name.endsWith('.json')) {
            item.innerHTML = `<div class="file-icon" title="${file.name}">📊</div>`;
        } else {
            item.innerHTML = `<div class="file-icon" title="${file.name}">📝</div>`;
        }
        const removeBtn = document.createElement('div');
        removeBtn.className = 'remove-btn';
        removeBtn.innerText = '✕';
        removeBtn.onclick = () => removeFile(file.id);
        item.appendChild(removeBtn);
        container.appendChild(item);
    });
}

function removeFile(id) {
    selectedFiles = selectedFiles.filter(f => f.id !== id);
    renderPreviews();
    updateSendButtonState();
}

function clearSelectedFile() {
    selectedFiles = [];
    renderPreviews();
    updateSendButtonState();
}

function handleKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        const btn = document.getElementById('aiSendBtn');
        if (btn.classList.contains('active') || btn.classList.contains('working')) {
            e.preventDefault();
            sendAiMessage();
        }
    }
}

// --- [4. الرسوميات وبناء الرسائل] ---

function addMessageToUi(sender, text, modelName = null, thought = null, images = []) {
    const container = document.getElementById('aiMessages');
    const id = 'msg-' + Date.now();
    const div = document.createElement('div');
    div.className = `msg ${sender}`;
    div.id = id;

    if (sender === 'ai' && thought) {
        const toggle = document.createElement('div');
        toggle.className = 'thought-toggle';
        toggle.innerText = "Thought Process";
        toggle.onclick = () => {
            const box = toggle.nextElementSibling;
            box.style.display = box.style.display === 'block' ? 'none' : 'block';
            toggle.classList.toggle('open');
        };
        div.appendChild(toggle);
        const box = document.createElement('div');
        box.className = 'thought-box';
        box.innerText = thought;
        div.appendChild(box);
    }

    const contentDiv = document.createElement('div');
    contentDiv.className = 'msg-content';

    // Image Rendering Logic (Gemini Style)
    if (images && images.length > 0) {
        const imgContainer = document.createElement('div');
        imgContainer.className = 'chat-images-container';
        images.forEach(base64 => {
            const img = document.createElement('img');
            img.src = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
            img.className = 'chat-image-msg';
            imgContainer.appendChild(img);
        });
        contentDiv.appendChild(imgContainer);
    }

    if (text) {
        const textPart = document.createElement('div');
        textPart.className = 'text-part';
        textPart.innerHTML = (sender === 'user') ? text : marked.parse(text);
        contentDiv.appendChild(textPart);
    }

    div.appendChild(contentDiv);

    if (sender === 'ai' && modelName) {
        const badge = document.createElement('div');
        badge.className = 'model-badge';
        badge.innerText = modelName;
        div.appendChild(badge);
    }

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return id;
}

function addToolStepToUi(toolName, args) {
    const container = document.getElementById('aiMessages');
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
            <span class="toggle-arrow" style="font-size: 10px; transition: transform 0.3s; margin-right: 8px; opacity: 0.5; transform: rotate(180deg);">▼</span>
        </div>
        <div class="ai-step-details" id="${stepId}-details" style="display: block;">
            <div class="ai-step-args">
                <div style="font-size: 9px; color: #3574f0; margin-bottom: 2px; font-weight: 900;">PARAMS</div>
                ${JSON.stringify(args, null, 1)}
            </div>
            <div class="step-output-area">
                <div class="status-spinner" style="display:inline-block; vertical-align:middle; margin-right:8px;"></div>
                <span style="opacity: 0.6; font-size: 11px;">Waiting for system kernel...</span>
            </div>
        </div>
    `;
    container.appendChild(stepContainer);

    // Ensure any "Processing" or "Thinking" AI message stays at the bottom
    const processingMsg = Array.from(container.querySelectorAll('.msg.ai')).reverse().find(m => m.innerText.includes('جاري المعالجة') || m.innerText.includes('Thinking'));
    if (processingMsg) container.appendChild(processingMsg);

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
    const header = document.getElementById(stepId + '-header');

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
            <div style="font-size: 9px; color: #59a869; margin-bottom: 4px; font-weight: 900; opacity: 0.8;">KERNEL_OUTPUT</div>
            <div style="white-space: pre-wrap; color: #a9b7c6; font-size: 12px;">${escapeHtml(textOut)}</div>
        `;
    }

    const container = document.getElementById('aiMessages');
    container.scrollTop = container.scrollHeight;
}

function getToolIcon(name) {
    const icons = { read: '🔍', write: '📝', search: '📡', run: '⚡', repair: '🛠️', thought: '🧠' };
    const key = Object.keys(icons).find(k => name.toLowerCase().includes(k));
    return icons[key] || '⚙️';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.innerText = text;
    return div.innerHTML;
}

// --- [5. العدادات والتوقيت] ---

function startAiTimer() {
    const badge = document.getElementById('aiDynamicTimer');
    if (!badge) return;
    badge.style.display = 'inline-block';
    aiMasterStartTime = Date.now();
    aiMasterTimerInterval = setInterval(() => {
        const diff = Math.floor((Date.now() - aiMasterStartTime) / 1000);
        const mins = Math.floor(diff / 60);
        const secs = diff % 60;
        badge.innerText = `${mins}:${secs.toString().padStart(2, '0')}`;
    }, 1000);
}

function stopAiTimer() {
    if (aiMasterTimerInterval) clearInterval(aiMasterTimerInterval);
    const badge = document.getElementById('aiDynamicTimer');
    if (badge) badge.style.display = 'none';
}

function updateHealthUI(online, text) {
    const badge = document.getElementById('systemHealthBadge');
    const textEl = document.getElementById('healthStatusText');
    const dot = badge ? badge.querySelector('.health-dot') : null;

    if (badge && textEl) {
        badge.classList.toggle('status-error', !online);
        textEl.innerText = text.toUpperCase();
        if (dot) {
            dot.style.background = online ? '#4db6ac' : '#ff3d00';
            dot.style.boxShadow = online ? '0 0 8px #4db6ac' : '0 0 8px #ff3d00';
        }
    }
}

function toggleTerminal() {
    const term = document.getElementById('aiTerminal');
    if (term) {
        const isHidden = window.getComputedStyle(term).display === 'none';
        term.style.display = isHidden ? 'flex' : 'none';
    }
}

function logToTerminal(msg, type = "info") {
    const out = document.getElementById('terminalOutput');
    if (!out) return;
    const div = document.createElement('div');
    div.className = `terminal-${type}`;
    div.innerText = `> [${new Date().toLocaleTimeString()}] ${msg}`;
    out.appendChild(div);
    out.scrollTop = out.scrollHeight;
}

function updateMessage(id, text, modelName = null) {
    const msgDiv = document.getElementById(id);
    if (msgDiv) {
        const contentDiv = msgDiv.querySelector('.msg-content');
        if (contentDiv) {
            const textPart = contentDiv.querySelector('.text-part') || contentDiv;
            const isUser = msgDiv.classList.contains('user');
            textPart.innerHTML = isUser ? text : marked.parse(text);
        }

        if (modelName) {
            let badge = msgDiv.querySelector('.model-badge');
            if (badge) {
                badge.innerText = modelName;
            } else {
                badge = document.createElement('div');
                badge.className = 'model-badge';
                badge.innerText = modelName;
                msgDiv.appendChild(badge);
            }
        }

        // Move to bottom
        const container = document.getElementById('aiMessages');
        container.appendChild(msgDiv);
        container.scrollTop = container.scrollHeight;
    }
}
