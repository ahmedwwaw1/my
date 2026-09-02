/**
 * VSA Academy - Mastermind AI Core Logic
 * --------------------------------------------------
 * هذا الملف يتولى العمليات الحسابية والمنطقية والاتصال بـ Gemini API.
 */

const SUPABASE_URL = 'https://ozcffmadatsfyyldqmdl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96Y2ZmbWFkYXRzZnl5bGRxbWRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc5NzUxMSwiZXhwIjoyMTAyMzczNTExfQ.WkAWW7iXgstl4YX7be_O4K20YvyXvh0eNJ4eALpv9Wg';
const SUPABASE_BRIDGE_URL = 'https://ozcffmadatsfyyldqmdl.supabase.co/functions/v1/vsa-bridge';
const GITHUB_REPO = 'ahmedwwaw1/my';
const CHAT_LOG_PATH = 'chat_logs.json';

// --- [Globals] ---
let chatHistory = [];
let chatSessions = JSON.parse(localStorage.getItem('gemini_sessions') || '[]');
let currentSessionId = localStorage.getItem('gemini_current_session') || Date.now().toString();
let stopAiRequested = false;

// 📝 دستور النخبة السيادي الشامل (Sovereign Omni-Constitution - 2026 Edition)
const CONSTITUTION = `
{
  "role": "Mastermind - Sovereign Omni-Architect & Visionary Engineer (2026)",
  "identity": "VSA Academy Meta-Cognitive Core (Gemini 3.x Enabled)",
  "protocols": {
    "visual_genesis": "CRITICAL: Before any UI change, perform a 'Deep Visual Scan'. Identify branding colors, spacing constants, and typography.",
    "zero_trust_simulation": "Simulate the outcome in 'thought' and use 'analyze_file' before every commit.",
    "recursive_thought": "Reason BEFORE, DURING, and AFTER every tool. Thinking is your primary life-support system."
  },
  "response_style": "High-level architectural, creative, and self-correcting. Optimized for 2026 AI standard."
}`;

const GENERATION_CONFIG = { temperature: 0, topP: 0.1, maxOutputTokens: 2048 };
const FORBIDDEN_KEYWORDS = [/ignore previous instructions/i, /system prompt/i, /jailbreak/i];

const AI_TOOLS = [{
    function_declarations: [
        { name: "read_file", description: "قراءة محتوى ملف.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" }, startLine: { type: "NUMBER" }, endLine: { type: "NUMBER" } }, required: ["path"] } },
        { name: "write_file", description: "كتابة ملف كامل.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" }, content: { type: "STRING" } }, required: ["path", "content"] } },
        { name: "replace_file_content", description: "استبدال قطعة كود محددة.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" }, targetContent: { type: "STRING" }, replacementContent: { type: "STRING" } }, required: ["path", "targetContent", "replacementContent"] } },
        { name: "multi_replace_file_content", description: "استبدال عدة قطع كود غير متجاورة.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" }, replacements: { type: "ARRAY", items: { type: "OBJECT", properties: { targetContent: { type: "STRING" }, replacementContent: { type: "STRING" } }, required: ["targetContent", "replacementContent"] } } }, required: ["path", "replacements"] } },
        { name: "searchCode", description: "البحث عن كود في المستودع.", parameters: { type: "OBJECT", properties: { query: { type: "STRING" } }, required: ["query"] } },
        { name: "analyze_file", description: "فحص الملف برمجياً.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" } }, required: ["path"] } },
        { name: "take_snapshot", description: "أخذ لقطة احتياطية للملف.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" } }, required: ["path"] } },
        { name: "instant_undo", description: "استعادة آخر لقطة سليمة.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" } }, required: ["path"] } },
        { name: "thought", description: "مركز التحليل والمنطق.", parameters: { type: "OBJECT", properties: { reasoning: { type: "STRING" }, plan: { type: "STRING" } }, required: ["reasoning", "plan"] } },
        { name: "repairSystem", description: "إصلاح مشاكل الاتصال والتوكن.", parameters: { type: "OBJECT", properties: {} } },
        { name: "triggerGithubWorkflow", description: "تشغيل عمليات البوتات.", parameters: { type: "OBJECT", properties: { workflow_id: { type: "STRING" } }, required: ["workflow_id"] } },
        { name: "web_search", description: "البحث في الإنترنت.", parameters: { type: "OBJECT", properties: { query: { type: "STRING" } }, required: ["query"] } },
        { name: "read_url", description: "قراءة محتوى رابط خارجي.", parameters: { type: "OBJECT", properties: { url: { type: "STRING" } }, required: ["url"] } }
    ]
}];

// --- [Core Logic Functions] ---

async function callBridge(action, payload) {
    const start = Date.now();
    logToTerminal(`Bridge Call [${action}] initiated...`, "info");
    try {
        const res = await fetch(SUPABASE_BRIDGE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'apikey': SUPABASE_KEY
            },
            body: JSON.stringify({ action, ...payload })
        });
        const duration = Date.now() - start;
        if (!res.ok) {
            const errorText = await res.text();
            let errorMessage = `Bridge error: ${res.status}`;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.error || errorJson.message || errorMessage;
            } catch (e) {
                errorMessage = errorText || errorMessage;
            }
            logToTerminal(`Bridge Error: ${errorMessage} (${duration}ms)`, "error");
            throw new Error(errorMessage);
        }
        const data = await res.json();
        logToTerminal(`Bridge Success: ${action} (${duration}ms)`, "info");
        return data;
    } catch (e) {
        logToTerminal(`Bridge Fatal: ${e.message} (${Date.now() - start}ms)`, "error");
        console.error("Bridge Call Failed:", e);
        throw e;
    }
}

async function safeGithubFetch(endpoint, options = {}, isRetry = false) {
    const payload = {
        endpoint: endpoint.startsWith('http') ? endpoint : `https://api.github.com/repos/${GITHUB_REPO}/${endpoint}`,
        method: options.method || 'GET',
        body: options.body ? JSON.parse(options.body) : undefined,
        headers: options.headers
    };
    try {
        const data = await callBridge('github', payload);
        return {
            ok: true,
            status: 200,
            json: async () => data,
            text: async () => typeof data === 'string' ? data : JSON.stringify(data)
        };
    } catch (e) {
        console.error("🛠️ Bridge GitHub Error:", e);
        if (!isRetry) {
            await repairSystem();
            return await safeGithubFetch(endpoint, options, true);
        }
        return { ok: false, status: 500, json: async () => ({ message: e.message }), text: async () => e.message };
    }
}

async function writeFile(path, content, message = "تحديث ملف بواسطة العقل المدبر") {
    try {
        const apiPath = `contents/${path}`;
        const res = await safeGithubFetch(apiPath);
        let sha = null;
        if (res.ok) {
            const data = await res.json();
            sha = data.sha;
        }
        const body = { message, content: btoa(unescape(encodeURIComponent(content))) };
        if (sha) body.sha = sha;
        const putRes = await safeGithubFetch(apiPath, { method: 'PUT', body: JSON.stringify(body) });
        return putRes.ok ? "✅ تم حفظ الملف بنجاح." : `❌ فشل حفظ الملف: ${putRes.status}`;
    } catch (e) { return `❌ خطأ: ${e.message}`; }
}

async function replaceFileContent(path, targetContent, replacementContent) {
    try {
        const apiPath = `contents/${path}`;
        const res = await safeGithubFetch(apiPath);
        if (!res.ok) return "❌ فشل الوصول للملف.";
        const data = await res.json();
        const currentContent = decodeURIComponent(escape(atob(data.content)));

        if (!currentContent.includes(targetContent)) return "❌ خطأ في المطابقة: النص القديم غير موجود.";

        const updatedFullContent = currentContent.replace(targetContent, replacementContent);
        const putRes = await safeGithubFetch(apiPath, {
            method: 'PUT',
            body: JSON.stringify({
                message: "🛠️ تعديل جراحي (Code Engine)",
                content: btoa(unescape(encodeURIComponent(updatedFullContent))),
                sha: data.sha
            })
        });
        return putRes.ok ? "✅ تم التعديل الجراحي بنجاح." : "❌ فشل الحفظ.";
    } catch (e) { return `❌ خطأ: ${e.message}`; }
}

async function listGithubWorkflows() {
    try {
        const res = await safeGithubFetch(`actions/workflows`);
        if (!res.ok) return "❌ فشل جلب القائمة.";
        const data = await res.json();
        return `قائمة العمليات: ${data.workflows.map(w => w.path.split('/').pop()).join(', ')}`;
    } catch (e) { return `❌ خطأ: ${e.message}`; }
}

async function triggerGithubWorkflow(workflow_id) {
    try {
        const res = await safeGithubFetch(`actions/workflows/${workflow_id}/dispatches`, { method: 'POST', body: JSON.stringify({ ref: 'main' }) });
        return res.ok ? `✅ تم تشغيل البوت بنجاح!` : `❌ فشل التشغيل.`;
    } catch (e) { return `❌ خطأ: ${e.message}`; }
}

async function updateWorkflowStatus(workflow_id, status) {
    const action = status === 'stop' ? 'disable' : 'enable';
    try {
        const res = await safeGithubFetch(`actions/workflows/${workflow_id}/${action}`, { method: 'PUT' });
        return res.ok ? `✅ تم التحديث بنجاح.` : `❌ فشل التحديث.`;
    } catch (e) { return `❌ خطأ: ${e.message}`; }
}

async function getGithubFileContent(path) {
    try {
        const res = await safeGithubFetch(`contents/${path}`);
        if (!res.ok) return "❌ فشل جلب الملف.";
        const data = await res.json();
        return decodeURIComponent(escape(atob(data.content)));
    } catch (e) { return `❌ خطأ: ${e.message}`; }
}

async function listGithubFiles(path = "") {
    try {
        const res = await safeGithubFetch(`contents/${path}`);
        if (!res.ok) return "❌ فشل جلب القائمة.";
        const data = await res.json();
        const files = data.map(f => `${f.type === 'dir' ? '📁' : '📄'} ${f.path}`);
        return `محتويات ${path || 'الجذر'}:\n${files.join('\n')}`;
    } catch (e) { return `❌ خطأ: ${e.message}`; }
}

async function repairSystem() {
    try {
        const start = Date.now();
        await callBridge('health_check', {});
        return `🛡️ النظام متصل (${Date.now() - start}ms).`;
    } catch (e) { return `❌ فشل الاتصال: ${e.message}`; }
}

async function readCodeRange(path, start, end) {
    try {
        const content = await getGithubFileContent(path);
        if (content.startsWith('❌')) return content;
        const lines = content.split('\n');
        return `📖 ${path} (L${start}-${end}):\n\n${lines.slice(start - 1, end).join('\n')}`;
    } catch (e) { return `❌ خطأ: ${e.message}`; }
}

async function selectString(path, query) {
    try {
        const content = await getGithubFileContent(path);
        if (content.startsWith('❌')) return content;
        const matches = content.split('\n').map((line, i) => line.toLowerCase().includes(query.toLowerCase()) ? `L${i + 1}: ${line.trim()}` : null).filter(m => m);
        return matches.length ? `🔍 نتائج البحث عن "${query}":\n${matches.join('\n')}` : "🔍 لا توجد نتائج.";
    } catch (e) { return `❌ خطأ: ${e.message}`; }
}

async function workflowFramework(args) {
    const { action, workflow_name, steps } = args;
    const WORKFLOWS_FILE = 'workflows.json';
    if (action === 'define') {
        let workflows = {};
        const content = await getGithubFileContent(WORKFLOWS_FILE);
        if (!content.startsWith('❌')) workflows = JSON.parse(content);
        workflows[workflow_name] = steps;
        return await writeFile(WORKFLOWS_FILE, JSON.stringify(workflows, null, 2));
    } else if (action === 'list') {
        const content = await getGithubFileContent(WORKFLOWS_FILE);
        return content.startsWith('❌') ? "⚠️ لا توجد عمليات." : `العمليات: ${Object.keys(JSON.parse(content)).join(', ')}`;
    }
    return "❌ إجراء غير مدعوم.";
}

// --- [AI Engine Logic] ---

async function callAiBrain(history) {
    const userModel = document.getElementById('modelSelector').value;
    const payload = {
        system_instruction: { parts: [{ text: CONSTITUTION }] },
        contents: history.map(h => ({ role: h.role, parts: h.parts })),
        tools: AI_TOOLS,
        generationConfig: GENERATION_CONFIG
    };
    return await callBridge('chat', { model: userModel, payload });
}

async function runToolLoop(history) {
    if (stopAiRequested) {
        stopAiRequested = false;
        localStorage.removeItem('gemini_pending_history');
        return { text: "🛑 توقف يدوي.", model: "System" };
    }
    localStorage.setItem('gemini_pending_history', JSON.stringify(history));
    startAiTimer();
    try {
        const data = await callAiBrain(history);
        if (data.error) return { text: data.error, model: "System" };
        const candidate = data.candidates?.[0];
        const parts = candidate?.content?.parts || [];
        const thought = parts.find(p => p.text)?.text;
        const functionCallPart = parts.find(p => p.functionCall);

        if (functionCallPart && functionCallPart.functionCall) {
            const { name, args } = functionCallPart.functionCall;
            if (thought) addMessageToUi('ai', '', data.model, thought);
            const stepId = addToolStepToUi(name, args);
            let toolResult;
            if (name === "read_file") toolResult = await getGithubFileContent(args.path);
            else if (name === "write_file") toolResult = await writeFile(args.path, args.content);
            else if (name === "replace_file_content") toolResult = await replaceFileContent(args.path, args.targetContent, args.replacementContent);
            else if (name === "multi_replace_file_content") {
                let content = await getGithubFileContent(args.path);
                let updated = content;
                args.replacements.forEach(r => { if (updated.includes(r.targetContent)) updated = updated.replace(r.targetContent, r.replacementContent); });
                toolResult = await writeFile(args.path, updated);
            }
            else if (name === "searchCode") {
                const searchData = await callBridge('github_search', args);
                if (searchData.items) {
                    toolResult = searchData.items.map(i => `📄 ${i.path} (Score: ${i.score})`).join('\n') || "🔍 لا توجد نتائج.";
                } else {
                    toolResult = JSON.stringify(searchData);
                }
            }
            else if (name === "thought") toolResult = { reasoning: args.reasoning, plan: args.plan };
            else if (name === "repairSystem") toolResult = await repairSystem();
            else if (name === "triggerGithubWorkflow") toolResult = await triggerGithubWorkflow(args.workflow_id);
            else if (name === "web_search" || name === "read_url") toolResult = await callBridge(name, args);
            else toolResult = "❌ أداة غير مدعومة.";

            updateToolStepStatus(stepId, !String(toolResult).includes('❌'), toolResult);
            history.push({ role: "model", parts: parts });
            history.push({ role: "user", parts: [{ functionResponse: { name: name, response: { content: toolResult } } }] });
            return await runToolLoop(history);
        }
        const actualModel = data.used_model || document.getElementById('modelSelector').value;
        const finalTurn = { role: "model", parts: parts, model: actualModel };
        chatHistory = history.concat([finalTurn]);
        saveChatToStorage();
        localStorage.removeItem('gemini_pending_history');
        stopAiTimer();
        return { text: thought || "تم بنجاح.", model: actualModel };
    } catch (err) {
        stopAiTimer();
        return { text: `❌ فشل: ${err.message}`, model: "System" };
    }
}

async function sendAiMessage() {
    const input = document.getElementById('aiInput');
    const sendBtn = document.getElementById('aiSendBtn');
    if (sendBtn.classList.contains('working')) {
        stopAiRequested = true;
        addMessageToUi('ai', "🛑 إيقاف المحرك...", 'System');
        return;
    }
    const msgText = input.value.trim();
    if (!msgText && selectedFiles.length === 0) return;

    // Filter images for immediate rendering in UI
    const userImages = selectedFiles
        .filter(f => f.type.startsWith('image/'))
        .map(f => `data:${f.type};base64,${f.base64}`);

    addMessageToUi('user', msgText, null, null, userImages);

    // ⚡ التعديل الاحترافي: تفريغ واجهة الكتابة فوراً بعد الإرسال (سرعة البرق)
    clearSelectedFile();

    input.value = '';
    autoResizeInput();
    stopAiRequested = false;

    try {
        sendBtn.classList.add('working');
        let finalPrompt = msgText;
        let attachments = [];
        selectedFiles.forEach(f => {
            if (f.content) finalPrompt += `\n\n[File ${f.name}]:\n${f.content}`;
            if (f.type.startsWith('image/') || f.type === 'application/pdf') attachments.push({ inline_data: { mime_type: f.type, data: f.base64 } });
        });
        addMessageToUi('ai', `🧠 جاري المعالجة...`, 'System');
        const currentTurn = { role: "user", parts: [{ text: finalPrompt }, ...attachments] };
        const result = await runToolLoop([...chatHistory, currentTurn]);

        // Support AI response images if present in the final turn
        const lastTurn = chatHistory[chatHistory.length - 1];
        const aiImages = lastTurn && lastTurn.role === 'model' ?
            lastTurn.parts.filter(p => p.inline_data).map(p => `data:${p.inline_data.mime_type};base64,${p.inline_data.data}`) : [];

        addMessageToUi('ai', result.text, result.model, null, aiImages);
        clearSelectedFile();
        updateSessions();
    } catch (err) {
        addMessageToUi('ai', "⚠️ عطل فني في الاتصال.");
    } finally {
        sendBtn.classList.remove('working');
        updateSendButtonState();
    }
}

async function resumePendingTask() {
    const pending = localStorage.getItem('gemini_pending_history');
    if (pending && !stopAiRequested) {
        const history = JSON.parse(pending);
        localStorage.removeItem('gemini_pending_history');
        addMessageToUi('ai', `🔄 استئناف العمل...`, 'System');
        const sendBtn = document.getElementById('aiSendBtn');
        sendBtn.classList.add('working');
        try { await runToolLoop(history); } finally { sendBtn.classList.remove('working'); updateSendButtonState(); }
    }
}

// --- [Storage & Session Management] ---

async function saveChatToStorage() {
    try {
        const context = { sessions: chatSessions, activeSessionId: currentSessionId, pendingHistory: localStorage.getItem('gemini_pending_history'), timestamp: new Date().toISOString() };
        await writeFile(CHAT_LOG_PATH, JSON.stringify(context, null, 2), "تحديث الذاكرة");
        localStorage.setItem('gemini_chat_ui', document.getElementById('aiMessages').innerHTML);
        saveModelSelection();
    } catch (e) { console.warn("Save failed:", e); }
}

async function loadChatFromStorage() {
    const savedUi = localStorage.getItem('gemini_chat_ui');
    if (savedUi) document.getElementById('aiMessages').innerHTML = savedUi;
    const savedModel = localStorage.getItem('gemini_selected_model');
    if (savedModel) document.getElementById('modelSelector').value = savedModel;

    try {
        const res = await safeGithubFetch(CHAT_LOG_PATH);
        if (res.ok) {
            const content = JSON.parse(decodeURIComponent(escape(atob((await res.json()).content))));
            chatSessions = content.sessions || [];
            currentSessionId = content.activeSessionId || currentSessionId;
            const active = chatSessions.find(s => s.id === currentSessionId);
            chatHistory = active ? active.history : [];
            rebuildChatUi();
            renderHistory();
            resumePendingTask();
        }
    } catch (e) { console.error("Load failed:", e); }
}

async function clearChatHistory() {
    chatHistory = [];
    await writeFile(CHAT_LOG_PATH, "[]");
    localStorage.removeItem('gemini_chat_ui');
    document.getElementById('aiMessages').innerHTML = '<div class="msg ai">تم مسح الذاكرة.</div>';
}

function createNewChat() {
    stopAiRequested = false;
    localStorage.removeItem('gemini_pending_history');
    currentSessionId = Date.now().toString();
    chatHistory = [];
    document.getElementById('aiMessages').innerHTML = '<div class="msg ai">بدأت محادثة جديدة!</div>';
    saveChatToStorage();
}

async function deleteSession(id) {
    if (confirm("حذف؟")) {
        chatSessions = chatSessions.filter(s => s.id !== id);
        renderHistory();
        await saveChatToStorage();
    }
}

function renameSession(id) {
    const name = prompt("الاسم:");
    if (name) {
        const s = chatSessions.find(x => x.id === id);
        if (s) { s.title = name; renderHistory(); saveChatToStorage(); }
    }
}

function loadSession(id) {
    const s = chatSessions.find(x => x.id === id);
    if (s) {
        currentSessionId = id;
        chatHistory = s.history;
        rebuildChatUi();
        saveChatToStorage();
    }
}

function updateSessions() {
    const existing = chatSessions.find(s => s.id === currentSessionId);
    const title = chatHistory.length > 0 ? chatHistory[chatHistory.length - 1].parts[0].text.substring(0, 30) : "محادثة جديدة";
    if (existing) { existing.history = chatHistory; existing.title = title; }
    else { chatSessions.unshift({ id: currentSessionId, title: title, history: chatHistory }); }
    saveChatToStorage();
}

function rebuildChatUi() {
    const container = document.getElementById('aiMessages');
    container.innerHTML = '';
    chatHistory.forEach(turn => {
        const sender = turn.role === 'user' ? 'user' : 'ai';
        const text = turn.parts.filter(p => p.text).map(p => p.text).join('\n');

        // Extract images from turn parts (Gemini style inline_data)
        const images = turn.parts
            .filter(p => p.inline_data)
            .map(p => `data:${p.inline_data.mime_type};base64,${p.inline_data.data}`);

        addMessageToUi(sender, text, turn.model, null, images);
    });
}

async function executeAiFunction(name, args) {
    const headers = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };
    const endpoints = {
        update_card_description: { method: 'PATCH', url: `${SUPABASE_URL}/rest/v1/cards?id=eq.${args.card_id}`, body: { content: args.new_content } },
        add_new_video: { method: 'POST', url: `${SUPABASE_URL}/rest/v1/videos`, body: { id: args.video_id, card_id: args.card_id, title: args.video_title, url: args.video_url } },
        delete_video: { method: 'DELETE', url: `${SUPABASE_URL}/rest/v1/videos?id=eq.${args.video_id}` },
        add_video_chapter: { method: 'POST', url: `${SUPABASE_URL}/rest/v1/video_chapters`, body: { video_id: args.video_id, chapter_time: args.time, chapter_text: args.text } }
    };
    const op = endpoints[name];
    if (op) {
        const res = await fetch(op.url, { method: op.method, headers, body: op.body ? JSON.stringify(op.body) : undefined });
        if (res.ok) return "✅ تمت العملية بنجاح.";
    }
    return "❌ فشل التنفيذ.";
}

window.addEventListener('load', () => {
    loadChatFromStorage();
    setInterval(() => {
        const clock = document.getElementById('aiLiveClock');
        if (clock) clock.innerText = new Date().toLocaleTimeString('ar-EG', { hour12: false });
    }, 1000);
});
