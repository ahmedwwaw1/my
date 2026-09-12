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

    // 🛠️ Robust Element Discovery
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

    // Auto-resize textarea
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = userInput.scrollHeight + 'px';
    });

    // ⚡ Send message on Enter (Fixed)
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

    // Sidebar navigation
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

// 🚦 Boot Sequence
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

    // Ensure the "Thinking" indicator stays at the bottom
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
