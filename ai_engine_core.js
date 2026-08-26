// ================================================================
//  🧠  AI ENGINEERING CORE - Independent Logic (VSA Academy)
//  الإصدار: 4.2 (النسخة المستقرة النهائية)
//  الوظيفة: محرك الذكاء الاصطناعي والأدوات البرمجية المستقلة.
// ================================================================

(function(window) {
    // ================================================================
    //  1.  المتغيرات والحالة (State Management)
    // ================================================================
    window.geminiApiKey = '';
    window.openaiApiKey = '';
    window.claudeApiKey = '';
    window.deepseekApiKey = '';
    window.mastermindProxyUrl = '';
    window.githubToken = '';
    window.GITHUB_REPO = 'ahmedwwaw1/my';
    window.stopAiRequested = false;

    // 🧠 تهيئة محرك الاستمرارية العميقة (Deep Continuity Engine)
    let continuity;
    if (typeof DeepContinuityEngine !== 'undefined') {
        continuity = new DeepContinuityEngine({
            modelsList: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-3.5-flash-lite'],
            maxGlobalRetries: 3
        });
    }

    // 🛡️ إعدادات الجسر السيادي (تُدار ديناميكياً بدقة)
    const getSupabaseUrl = () => {
        let url = window.mastermindProxyUrl || 'https://ozcffmadatsfyyldqmdl.supabase.co';
        return (typeof url === 'string' && url.endsWith('/')) ? url.slice(0, -1) : url;
    };
    const SUPABASE_KEY = 'PROXIED_BY_SOVEREIGN_BRIDGE';

    const generationConfig = {
        temperature: 0,
        topP: 0.1,
        maxOutputTokens: 2048
    };

    // ================================================================
    //  2.  الدستور والأدوات (Constitution & Tools)
    // ================================================================
    const constitution = `
    {
      "role": "Autonomous Engineering Intelligence",
      "identity": "VSA Sovereign Orchestrator - Autonomous Mode ACTIVE",
      "protocols": {
        "goal_directed": "Focus on the final outcome, not just the intermediate command.",
        "closed_loop": "After every action, invoke analyze_file or verify_result to ensure the goal is met.",
        "persistence": "Use DeepContinuity to save state between complex autonomous steps.",
        "self_correction": "If a tool fails, analyze the error and try an alternative engine automatically."
      }
    }`;

    const systemInstruction = { parts: [{ text: constitution + `\nأنت الآن في وضع "المحرك الهندسي الذاتي". التزم بالقواعد البرمجية الصارمة.` }] };

    const tools = [{
        function_declarations: [
            { name: "read_file", description: "قراءة ملف.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" } }, required: ["path"] } },
            { name: "write_file", description: "كتابة ملف.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" }, content: { type: "STRING" } }, required: ["path", "content"] } },
            { name: "replace_file_content", description: "استبدال نص.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" }, targetContent: { type: "STRING" }, replacementContent: { type: "STRING" } }, required: ["path", "targetContent", "replacementContent"] } },
            { name: "analyze_file", description: "فحص السنتكس.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" } }, required: ["path"] } },
            { name: "verify_goal", description: "التحقق من الهدف.", parameters: { type: "OBJECT", properties: { goal_met: { type: "BOOLEAN" }, reasoning: { type: "STRING" } }, required: ["goal_met"] } },
            { name: "take_snapshot", description: "لقطة احتياطية.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" } }, required: ["path"] } },
            { name: "instant_undo", description: "تراجع لحظي.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" } }, required: ["path"] } },
            { name: "read_url", description: "قراءة رابط ويب.", parameters: { type: "OBJECT", properties: { url: { type: "STRING" } }, required: ["url"] } },
            { name: "thought", description: "التفكير الهندسي.", parameters: { type: "OBJECT", properties: { reasoning: { type: "STRING" }, plan: { type: "STRING" } }, required: ["reasoning", "plan"] } }
        ]
    }];

    // ================================================================
    //  3.  محركات الاتصال (Networking Engines)
    // ================================================================
    window.getCleanGithubToken = function() { return (window.githubToken || '').trim().replace(/^['"]|['"]$/g, ''); };

    window.safeGithubFetch = async function(endpoint, options = {}, isRetry = false) {
        let url;
        const defaultHeaders = { 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' };
        if (window.mastermindProxyUrl && window.mastermindProxyUrl.trim() !== '') {
            url = `${getSupabaseUrl()}/repos/${window.GITHUB_REPO}/${endpoint}`;
        } else {
            const token = window.getCleanGithubToken();
            if (!token) throw new Error("⚠️ توكن GitHub مفقود.");
            url = endpoint.startsWith('http') ? endpoint : `https://api.github.com/repos/${window.GITHUB_REPO}/${endpoint}`;
            defaultHeaders['Authorization'] = `Bearer ${token}`;
        }
        try {
            const res = await fetch(url, { ...options, headers: { ...defaultHeaders, ...options.headers } });
            if (res.status === 401 && !isRetry) return await window.safeGithubFetch(endpoint, options, true);
            return res;
        } catch (e) { throw new Error(`خطأ اتصال GitHub: ${e.message}`); }
    };

    window.getGithubFileContent = async function(path) {
        try {
            const res = await window.safeGithubFetch(`contents/${path}`);
            if (!res.ok) return `❌ فشل الجلب: ${res.status}`;
            const data = await res.json();
            return decodeURIComponent(escape(atob(data.content)));
        } catch (e) { return `❌ خطأ: ${e.message}`; }
    };

    window.writeFile = async function(path, content, message = "تحديث هندسي") {
        try {
            const apiPath = `contents/${path}`;
            const res = await window.safeGithubFetch(apiPath);
            let sha = null;
            if (res.ok) { const data = await res.json(); sha = data.sha; }
            const body = { message, content: btoa(unescape(encodeURIComponent(content))) };
            if (sha) body.sha = sha;
            const putRes = await window.safeGithubFetch(apiPath, { method: 'PUT', body: JSON.stringify(body) });
            return putRes.ok ? "✅ تم الحفظ." : `❌ فشل: ${putRes.status}`;
        } catch (e) { return `❌ خطأ كتابة: ${e.message}`; }
    };

    window.replaceFileContent = async function(path, target, replacement) {
        const current = await window.getGithubFileContent(path);
        if (current.startsWith('❌')) return current;
        if (!current.includes(target)) return "❌ النص غير موجود.";
        return await window.writeFile(path, current.replace(target, replacement));
    };

    // ================================================================
    //  4.  إدارة المفاتيح والأمان (Key Management)
    // ================================================================
    window.fetchApiKeyFromSupabase = async function(id) {
        try {
            const currentUrl = getSupabaseUrl();
            const res = await fetch(`${currentUrl}/rest/v1/secret_settings?id=eq.${id}`, { headers: { 'Content-Type': 'application/json' } });
            const data = await res.json();
            return data.length > 0 ? data[0].secret_value : null;
        } catch (e) { return null; }
    };

    window.initKeys = async function() {
        const savedProxy = localStorage.getItem('vsa_proxy_url');
        if (savedProxy) window.mastermindProxyUrl = savedProxy;

        window.geminiApiKey = await window.fetchApiKeyFromSupabase('gemini_key') || '';
        window.githubToken = await window.fetchApiKeyFromSupabase('github_token') || '';
        window.openaiApiKey = await window.fetchApiKeyFromSupabase('openai_key') || '';
        window.claudeApiKey = await window.fetchApiKeyFromSupabase('claude_key') || '';
        window.deepseekApiKey = await window.fetchApiKeyFromSupabase('deepseek_key') || '';

        console.log("🛡️ تم تحميل المفاتيح بنجاح.");
    };

    // ================================================================
    //  5.  محرك الاتصال بـ AI (AI Brain Engine)
    // ================================================================
    window.callAiBrain = async function(promptText, fileBase64 = null, mimeType = null) {
        const userModel = document.getElementById('modelSelector')?.value || 'gemini-1.5-flash';
        let key = window.geminiApiKey; // الافتراضي
        let provider = 'google';

        if (userModel.includes('claude')) { provider = 'anthropic'; key = window.claudeApiKey.trim(); }
        else if (userModel.includes('gpt')) { provider = 'openai'; key = window.openaiApiKey.trim(); }
        else if (userModel.includes('deepseek')) { provider = 'deepseek'; key = window.deepseekApiKey.trim(); }

        if (!key && !window.mastermindProxyUrl) return { text: "⚠️ مفتاح API مفقود ولا يوجد جسر.", model: "System" };

        let currentParts = [{ text: promptText }];
        if (fileBase64 && mimeType) currentParts.push({ inline_data: { mime_type: mimeType, data: fileBase64 } });
        const history = [{ role: "user", parts: currentParts }];

        if (continuity) {
            continuity.modelsList = [userModel, 'gemini-1.5-flash', 'gemini-1.5-pro'];
            return await continuity.executeWithContinuity(async (model) => {
                return await runToolLoop(history, model, provider, key);
            }, { prompt: promptText });
        }
        return await runToolLoop(history, userModel, provider, key);
    };

    async function runToolLoop(history, modelName, provider, key) {
        if (window.stopAiRequested) { window.stopAiRequested = false; return { text: "🛑 توقف.", model: "System" }; }
        const apiVersion = (modelName.includes('3.7') || modelName.includes('3.6') || modelName.includes('3.5')) ? 'v1' : 'v1beta';

        let url;
        if (window.mastermindProxyUrl) {
            url = `${getSupabaseUrl()}/${apiVersion}/models/${modelName}:generateContent`;
        } else {
            url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelName}:generateContent?key=${key}`;
        }

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ system_instruction: systemInstruction, contents: history, tools: tools, generationConfig })
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`[Status ${res.status}]: ${errText.substring(0, 50)}`);
            }

            const data = await res.json();
            const parts = data.candidates?.[0]?.content?.parts || [];
            const thought = parts.find(p => p.text)?.text;
            const functionCallPart = parts.find(p => p.functionCall);

            if (functionCallPart) {
                const { name, args } = functionCallPart.functionCall;
                if (thought && window.addMessageToUi) window.addMessageToUi('ai', thought, modelName);
                const stepId = window.addToolStepToUi ? window.addToolStepToUi(name, args) : null;

                let toolResult;
                if (name === "read_file") toolResult = await window.getGithubFileContent(args.path);
                else if (name === "write_file") toolResult = await window.writeFile(args.path, args.content);
                else if (name === "replace_file_content") toolResult = await window.replaceFileContent(args.path, args.targetContent, args.replacementContent);
                else if (name === "verify_goal") {
                    if (args.goal_met) return { text: args.reasoning || "تم الإنجاز.", model: modelName };
                    toolResult = "⚠️ لم يكتمل الهدف.";
                }
                else if (name === "take_snapshot") {
                    const c = await window.getGithubFileContent(args.path);
                    localStorage.setItem('vsa_snap_' + args.path, c);
                    toolResult = "📸 تم حفظ اللقطة.";
                }
                else if (name === "instant_undo") {
                    const old = localStorage.getItem('vsa_snap_' + args.path);
                    toolResult = old ? await window.writeFile(args.path, old) : "❌ لا توجد نسخة.";
                }
                else if (name === "read_url") {
                    if (window.mastermindProxyUrl) {
                        const r = await fetch(`${getSupabaseUrl()}/fetch_url?url=${encodeURIComponent(args.url)}`);
                        toolResult = await r.text();
                    } else toolResult = "⚠️ الجسر مطلوب.";
                }
                else if (name === "thought") toolResult = args;
                else toolResult = "أداة قيد التطوير.";

                if (window.updateToolStepStatus) window.updateToolStepStatus(stepId, true, toolResult);
                history.push({ role: "model", parts: [functionCallPart] });
                history.push({ role: "user", parts: [{ functionResponse: { name, response: { content: toolResult } } }] });
                return await runToolLoop(history, modelName, provider, key);
            }
            return { text: thought, model: modelName };
        } catch (e) { return { text: `❌ فشل الاتصال: ${e.message}`, model: "System" }; }
    }

    console.log("🚀 AI Engineering Core V4.2 (Fixed) Loaded.");
})(window);
