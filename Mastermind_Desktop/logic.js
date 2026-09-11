// UI Logic for Mastermind Desktop Pro

document.addEventListener('DOMContentLoaded', () => {
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const chatMessages = document.getElementById('chatMessages');
    const newChatBtn = document.getElementById('newChatBtn');
    const modelSelector = document.getElementById('modelSelector');

    // Auto-resize textarea
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = userInput.scrollHeight + 'px';
    });

    // Send message on Enter (but Shift+Enter for newline)
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });

    sendBtn.addEventListener('click', handleSend);

    newChatBtn.addEventListener('click', () => {
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
    });

    async function handleSend() {
        const text = userInput.value.trim();
        if (!text) return;

        // Add user message to UI
        addMessage('user', text);
        userInput.value = '';
        userInput.style.height = 'auto';

        // Add thinking indicator
        const aiMsgId = addMessage('ai', 'Thinking...');

        chatHistory.push({ role: 'user', parts: [{ text }] });

        try {
            const response = await runToolLoop(chatHistory);
            updateMessage(aiMsgId, response.text);
            chatHistory.push({ role: 'model', parts: [{ text: response.text }] });
        } catch (e) {
            updateMessage(aiMsgId, "Error: " + e.message);
        }
    }

    function addMessage(role, text) {
        const id = 'msg-' + Date.now();
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${role}`;
        msgDiv.id = id;

        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.innerHTML = role === 'ai' ? '<i class="fas fa-robot"></i>' : '<i class="fas fa-user"></i>';

        const content = document.createElement('div');
        content.className = 'content';
        content.textContent = text;

        msgDiv.appendChild(avatar);
        msgDiv.appendChild(content);

        // Remove welcome screen if present
        const welcome = chatMessages.querySelector('.welcome-screen');
        if (welcome) welcome.remove();

        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return id;
    }

    function updateMessage(id, text) {
        const msgDiv = document.getElementById(id);
        if (msgDiv) {
            const content = msgDiv.querySelector('.content');
            content.textContent = text;
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    // Sidebar navigation switching between Chat and Plugins views
    document.querySelectorAll('.nav-item, .recent-chat-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.nav-item, .recent-chat-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            const text = item.textContent.trim();
            logToTerminal(`Navigated to: ${text}`, "info");

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
        });
    });

    // Connect Button Event Handler
    const connectGithubBtn = document.getElementById('connectGithubBtn');
    if (connectGithubBtn) {
        connectGithubBtn.addEventListener('click', () => {
            logToTerminal("Initiating GitHub OAuth via Desktop Bridge...", "info");
            alert("GitHub OAuth Consent requested via Desktop Bridge.");
            connectGithubBtn.innerHTML = '<i class="fas fa-check"></i> Connected';
            connectGithubBtn.style.background = '#10b981';
        });
    }

    // Bridge Status Toggle simulation
    const bridgeStatus = document.getElementById('bridgeStatus');
    bridgeStatus.addEventListener('click', () => {
        const terminal = document.getElementById('terminalOverlay');
        terminal.classList.toggle('open');
    });

    document.getElementById('closeTerminal').addEventListener('click', () => {
        document.getElementById('terminalOverlay').classList.remove('open');
    });
});

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
