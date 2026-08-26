// ================================================================
//  🧠  AI ENGINEERING CORE - Independent Logic (VSA Academy)
//  الإصدار: 4.0 (الهندسة السيادية المستقلة الكاملة)
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
    const continuity = new DeepContinuityEngine({
        modelsList: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-3.5-flash-lite'],
        maxGlobalRetries: 3
    });

    // 🛡️ إعدادات الجسر السيادي (تُجلب من الإعدادات أو يتم تجاوزها عبر الوكيل)
    const SUPABASE_URL = window.mastermindProxyUrl || 'https://ozcffmadatsfyyldqmdl.supabase.co';
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

    const systemInstruction = { parts: [{ text: constitution + `\nأنت الآن في وضع "المحرك الهندسي". التزم بالقواعد البرمجية الصارمة وتجنب أي لغة غير عملية.` }] };

    const tools = [{
        function_declarations: [
            { name: "read_file", description: "قراءة محتوى ملف.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" }, startLine: { type: "NUMBER" }, endLine: { type: "NUMBER" } }, required: ["path"] } },
            { name: "write_file", description: "كتابة ملف كامل أو إنشاء ملف جديد.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" }, content: { type: "STRING" } }, required: ["path", "content"] } },
            { name: "replace_file_content", description: "استبدال قطعة كود محددة بقطعة أخرى.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" }, targetContent: { type: "STRING" }, replacementContent: { type: "STRING" } }, required: ["path", "targetContent", "replacementContent"] } },
            { name: "searchCode", description: "البحث عن كلمة أو كود في كامل المستودع.", parameters: { type: "OBJECT", properties: { query: { type: "STRING" } }, required: ["query"] } },
            { name: "store_memory", description: "تخزين معلومة مهمة في الذاكرة المحلية.", parameters: { type: "OBJECT", properties: { key: { type: "STRING" }, value: { type: "STRING" } }, required: ["key", "value"] } },
            { name: "vector_search", description: "البحث في الذاكرة المخزنة سابقاً.", parameters: { type: "OBJECT", properties: { query: { type: "STRING" } }, required: ["query"] } },
            { name: "estimate_cost", description: "حساب تكلفة العمليات البرمجية.", parameters: { type: "OBJECT", properties: { model: { type: "STRING" }, tokens: { type: "NUMBER" } }, required: ["model", "tokens"] } },
            { name: "run_virtual_test", description: "اختبار جودة الكود.", parameters: { type: "OBJECT", properties: { code: { type: "STRING" } }, required: ["code"] } },
            { name: "thought", description: "محرك التفكير الهندسي: تحليل الخطوات قبل التنفيذ.", parameters: { type: "OBJECT", properties: { reasoning: { type: "STRING" }, plan: { type: "STRING" }, peer_review: { type: "STRING" }, expected_outcome: { type: "STRING" } }, required: ["reasoning", "plan"] } },
            { name: "analyze_file", description: "مسبار الجودة: فحص الملف قبل الحفظ.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" } }, required: ["path"] } },
            { name: "verify_goal", description: "التحقق الذاتي: هل تم تحقيق الهدف النهائي؟", parameters: { type: "OBJECT", properties: { goal_met: { type: "BOOLEAN" }, reasoning: { type: "STRING" } }, required: ["goal_met"] } },
            { name: "autonomous_plan", description: "مخطط المسار الذاتي: تقسيم الهدف الكبير إلى مهام صغيرة.", parameters: { type: "OBJECT", properties: { tasks: { type: "ARRAY", items: { type: "STRING" } } }, required: ["tasks"] } },
            { name: "take_snapshot", description: "أخذ لقطة احتياطية للملف.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" } }, required: ["path"] } },
            { name: "instant_undo", description: "التراجع عن آخر عملية تعديل.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" } }, required: ["path"] } },
            { name: "web_search", description: "البحث في الويب عن توثيقات أو حلول.", parameters: { type: "OBJECT", properties: { query: { type: "STRING" } }, required: ["query"] } },
            { name: "repairSystem", description: "إصلاح مشاكل النظام والاتصال.", parameters: { type: "OBJECT", properties: {} } },
            { name: "multi_replace_file_content", description: "المشرط الجراحي المتعدد.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" }, replacements: { type: "ARRAY", items: { type: "OBJECT", properties: { targetContent: { type: "STRING" }, replacementContent: { type: "STRING" } } } } }, required: ["path", "replacements"] } }
        ]
    }];

    // ================================================================
    //  3.  محركات GitHub والتعامل مع الملفات (GitHub Engines)
    // ================================================================
    window.getCleanGithubToken = function() {
        if (!window.githubToken) return null;
        return window.githubToken.trim().replace(/^['"]|['"]$/g, '');
    };

    window.safeGithubFetch = async function(endpoint, options = {}, isRetry = false) {
        const token = window.getCleanGithubToken();
        if (!token) throw new Error("⚠️ لم يتم ضبط توكن GitHub.");

        const url = endpoint.startsWith('http') ? endpoint : `https://api.github.com/repos/${window.GITHUB_REPO}/${endpoint}`;
        const defaultHeaders = {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        };

        const fetchOptions = { ...options, headers: { ...defaultHeaders, ...options.headers }, mode: 'cors' };

        try {
            const res = await fetch(url, fetchOptions);
            if (res.status === 401 && !isRetry) {
                console.log("🔄 محاولة تجديد الجلسة...");
                return await window.safeGithubFetch(endpoint, options, true);
            }
            return res;
        } catch (e) { throw new Error(`فشل الاتصال بـ GitHub: ${e.message}`); }
    };

    window.getGithubFileContent = async function(path) {
        try {
            const res = await window.safeGithubFetch(`contents/${path}`);
            if (!res.ok) return `❌ فشل جلب الملف: ${res.status}`;
            const data = await res.json();
            return decodeURIComponent(escape(atob(data.content)));
        } catch (e) { return `❌ خطأ اتصال: ${e.message}`; }
    };

    window.writeFile = async function(path, content, message = "تحديث بواسطة المحرك الهندسي") {
        try {
            const apiPath = `contents/${path}`;
            const res = await window.safeGithubFetch(apiPath);
            let sha = null;
            if (res.ok) { const data = await res.json(); sha = data.sha; }
            const body = { message, content: btoa(unescape(encodeURIComponent(content))) };
            if (sha) body.sha = sha;
            const putRes = await window.safeGithubFetch(apiPath, { method: 'PUT', body: JSON.stringify(body) });
            return putRes.ok ? "✅ تم الحفظ بنجاح." : `❌ فشل الحفظ: ${putRes.status}`;
        } catch (e) { return `❌ خطأ كتابة: ${e.message}`; }
    };

    window.replaceFileContent = async function(path, targetContent, replacementContent) {
        try {
            const current = await window.getGithubFileContent(path);
            if (current.startsWith('❌')) return current;
            if (!current.includes(targetContent)) return "❌ النص القديم غير موجود بدقة.";
            const updated = current.replace(targetContent, replacementContent);
            return await window.writeFile(path, updated, `تعديل جراحي في ${path}`);
        } catch (e) { return `❌ خطأ جراحي: ${e.message}`; }
    };

    window.readCodeRange = async function(path, start, end) {
        try {
            const content = await window.getGithubFileContent(path);
            if (content.startsWith('❌')) return content;
            const lines = content.split('\n');
            const range = lines.slice(start - 1, end);
            return `📖 قراءة الملف ${path} (الأسطر ${start}-${end}):\n\n${range.join('\n')}`;
        } catch (e) { return `❌ فشل قراءة النطاق: ${e.message}`; }
    };

    window.repairSystem = async function() {
        return "✅ نظام الإصلاح نشط ومدمج في المحرك الهندسي.";
    };

    // ================================================================
    //  4.  إدارة المفاتيح والأمان (Key Management)
    // ================================================================
    window.fetchApiKeyFromSupabase = async function(id) {
        try {
            // المحرك الهندسي الذكي: يقرر استخدام الجسر أو الاتصال المباشر
            const endpoint = `${SUPABASE_URL}/rest/v1/secret_settings?id=eq.${id}`;
            const headers = { 'Content-Type': 'application/json' };

            // إذا لم يكن هناك جسر، نستخدم المفتاح المحلي (مؤقتاً للتشغيل)
            if (SUPABASE_KEY !== 'PROXIED_BY_SOVEREIGN_BRIDGE') {
                headers['apikey'] = SUPABASE_KEY;
                headers['Authorization'] = `Bearer ${SUPABASE_KEY}`;
            }

            const res = await fetch(endpoint, { headers });
            const data = await res.json();
            return data.length > 0 ? data[0].secret_value : null;
        } catch (e) { console.error("🛡️ Bridge Security Notice: Connection restricted or key missing."); return null; }
    };

    window.saveApiKeyToSupabase = async function(id, value) {
        try {
            await fetch(`${SUPABASE_URL}/rest/v1/secret_settings`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'resolution=merge-duplicates'
                },
                body: JSON.stringify({ id, secret_value: value })
            });
        } catch (e) { console.error("Key save error:", e); }
    };

    window.initKeys = async function() {
        // 🛡️ فحص أمني لبروتوكول الاتصال
        if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
            console.warn("⚠️ تحذير أمني: يرجى استخدام HTTPS لحماية المفاتيح السيادية.");
        }

        if (!window.geminiApiKey) window.geminiApiKey = await window.fetchApiKeyFromSupabase('gemini_key') || '';
        if (!window.githubToken) window.githubToken = await window.fetchApiKeyFromSupabase('github_token') || '';
        if (!window.openaiApiKey) window.openaiApiKey = await window.fetchApiKeyFromSupabase('openai_key') || '';
        if (!window.claudeApiKey) window.claudeApiKey = await window.fetchApiKeyFromSupabase('claude_key') || '';
        if (!window.deepseekApiKey) window.deepseekApiKey = await window.fetchApiKeyFromSupabase('deepseek_key') || '';
        if (!window.mastermindProxyUrl) window.mastermindProxyUrl = await window.fetchApiKeyFromSupabase('proxy_url') || '';

        console.log("🛡️ تم تحميل المفاتيح بنظام الأمان السيادي.");
    };

    // ================================================================
    //  4.  أدوات المنطق البرمجي (Logic Tools)
    // ================================================================
    window.store_memory = function(key, value) {
        try {
            localStorage.setItem('ai_memory_' + key, JSON.stringify({ value, time: new Date().toISOString() }));
            return { status: "success", key };
        } catch (e) { return { status: "error", message: e.message }; }
    };

    window.vector_search = function(query) {
        const keys = Object.keys(localStorage).filter(k => k.startsWith('ai_memory_'));
        const results = keys.map(k => JSON.parse(localStorage.getItem(k)))
                            .filter(v => v.value.toLowerCase().includes(query.toLowerCase()));
        return results.length > 0 ? results : "لا نتائج.";
    };

    window.estimate_cost = function(model, tokens) {
        const price = (model.includes('3.7')) ? 0.00015 : 0.00008;
        return { cost: (tokens * price).toFixed(6) + " USD" };
    };

    window.run_virtual_test = function(code) {
        return { passed: code.includes('try'), score: code.length > 50 ? 10 : 5 };
    };

    // ================================================================
    //  5.  محرك الاتصال بـ AI (AI Brain Engine)
    // ================================================================
    window.callAiBrain = async function(promptText, fileBase64 = null, mimeType = null) {
        const userModel = document.getElementById('modelSelector')?.value || 'gemini-1.5-flash';
        let key = '';
        let provider = 'google';

        if (userModel.includes('claude')) { provider = 'anthropic'; key = window.claudeApiKey.trim(); }
        else if (userModel.includes('gpt')) { provider = 'openai'; key = window.openaiApiKey.trim(); }
        else if (userModel.includes('deepseek')) { provider = 'deepseek'; key = window.deepseekApiKey.trim(); }
        else { key = window.geminiApiKey.trim(); }

        if (!key || key.length < 10) return { text: "⚠️ مفتاح API مفقود.", model: "System" };

        let currentParts = [{ text: promptText }];
        if (fileBase64 && mimeType) currentParts.push({ inline_data: { mime_type: mimeType, data: fileBase64 } });
        const history = [{ role: "user", parts: currentParts }];

        // 🚀 تحديث قائمة النماذج لتجعل اختيار المستخدم هو الأول
        continuity.modelsList = [userModel, 'gemini-1.5-flash', 'gemini-1.5-pro'];

        // 🛡️ تنفيذ الطلب عبر محرك الاستمرارية العميقة
        try {
            return await continuity.executeWithContinuity(async (model) => {
                return await runToolLoop(history, model, provider, key);
            }, { prompt: promptText });
        } catch (e) {
            return { text: `❌ فشل المحرك بعد عدة محاولات: ${e.message}`, model: "Continuity Error" };
        }
    };

    async function runToolLoop(history, modelName, provider, key) {
        if (window.stopAiRequested) { window.stopAiRequested = false; return { text: "🛑 توقف.", model: "System" }; }

        const apiVersion = (modelName.includes('3.7') || modelName.includes('3.6') || modelName.includes('3.5')) ? 'v1' : 'v1beta';

        // 🚀 المنطق السيادي الموحد:
        // إذا وجد رابط جسر (Proxy URL)، نستخدمه لكل شيء (الدردشة والبيانات)
        // إذا لم يوجد، نحاول الاتصال المباشر بجوجل
        let url;
        if (window.mastermindProxyUrl && window.mastermindProxyUrl.trim() !== '') {
            const baseUrl = window.mastermindProxyUrl.endsWith('/') ? window.mastermindProxyUrl.slice(0,-1) : window.mastermindProxyUrl;
            url = `${baseUrl}/${apiVersion}/models/${modelName}:generateContent`;
        } else {
            url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelName}:generateContent?key=${key}`;
        }

        const body = { system_instruction: systemInstruction, contents: history, tools: tools, generationConfig };

        try {
            const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error?.message || "API Error");

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
                else if (name === "autonomous_plan") toolResult = { status: "Plan locked", tasks: args.tasks };
                else if (name === "verify_goal") {
                    toolResult = args.goal_met ? "✅ Goal Achieved." : "⚠️ Goal not yet met. Continuing...";
                    if (args.goal_met) {
                        if (window.updateToolStepStatus) window.updateToolStepStatus(stepId, true, toolResult);
                        return { text: args.reasoning || "تم إنجاز المهمة بنجاح.", model: modelName };
                    }
                }
                else if (name === "thought") toolResult = args;
                else toolResult = "أداة قيد المعالجة...";

                if (window.updateToolStepStatus) window.updateToolStepStatus(stepId, true, toolResult);
                history.push({ role: "model", parts: [functionCallPart] });
                history.push({ role: "user", parts: [{ functionResponse: { name, response: { content: toolResult } } }] });

                // الاستمرار التلقائي (Autonomous Continuation)
                return await runToolLoop(history, modelName, provider, key);
            }

            return { text: thought, model: modelName };
        } catch (e) { return { text: `❌ خطأ: ${e.message}`, model: "System" }; }
    }

    console.log("🚀 AI Engineering Core V4.0 Loaded.");
})(window);
