// ================================================================
//  🧠  AI ENGINEERING CORE - Stable Sovereign Edition
//  الإصدار: 3.5 (العودة للاستقرار الهندسي)
//  الوظيفة: محرك الذكاء الاصطناعي والأدوات البرمجية المستقلة.
// ================================================================

(function(window) {
    window.geminiApiKey = '';
    window.openaiApiKey = '';
    window.claudeApiKey = '';
    window.deepseekApiKey = '';
    window.mastermindProxyUrl = localStorage.getItem('vsa_proxy_url') || '';
    window.githubToken = '';
    window.GITHUB_REPO = 'ahmedwwaw1/my';
    window.stopAiRequested = false;

    const generationConfig = { temperature: 0, topP: 0.1, maxOutputTokens: 2048 };

    const constitution = `
    {
      "role": "Autonomous Engineering Intelligence",
      "identity": "VSA Sovereign Orchestrator - Stable Mode",
      "protocols": {
        "grounded_logic": "Act as a precise engineering calculator. Use tools for all actions.",
        "programmatic_focus": "Focus on code and functions.",
        "sequential_thought": "Analyze step-by-step using the thought tool."
      }
    }`;

    const systemInstruction = { parts: [{ text: constitution }] };

    const tools = [{
        function_declarations: [
            { name: "read_file", description: "قراءة محتوى ملف.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" } }, required: ["path"] } },
            { name: "write_file", description: "كتابة ملف كامل.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" }, content: { type: "STRING" } }, required: ["path", "content"] } },
            { name: "replace_file_content", description: "استبدال نص محدد.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" }, targetContent: { type: "STRING" }, replacementContent: { type: "STRING" } }, required: ["path", "targetContent", "replacementContent"] } },
            { name: "thought", description: "محرك التفكير الهندسي.", parameters: { type: "OBJECT", properties: { reasoning: { type: "STRING" }, plan: { type: "STRING" } }, required: ["reasoning", "plan"] } }
        ]
    }];

    // 🚀 محركات الاتصال بالجسر والمفاتيح
    window.getSupabaseUrl = () => {
        let url = window.mastermindProxyUrl || 'https://ozcffmadatsfyyldqmdl.supabase.co';
        return url.endsWith('/') ? url.slice(0, -1) : url;
    };

    window.safeGithubFetch = async function(endpoint, options = {}) {
        const baseUrl = getSupabaseUrl();
        const url = `${baseUrl}/repos/${window.GITHUB_REPO}/${endpoint}`;
        const headers = { 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' };
        return await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
    };

    window.getGithubFileContent = async function(path) {
        const res = await safeGithubFetch(`contents/${path}`);
        if (!res.ok) return "❌ فشل الجلب.";
        const data = await res.json();
        return decodeURIComponent(escape(atob(data.content)));
    };

    window.writeFile = async function(path, content) {
        const apiPath = `contents/${path}`;
        const res = await safeGithubFetch(apiPath);
        let sha = null;
        if (res.ok) { const data = await res.json(); sha = data.sha; }
        const body = { message: "تحديث هندسي", content: btoa(unescape(encodeURIComponent(content))), sha };
        const putRes = await safeGithubFetch(apiPath, { method: 'PUT', body: JSON.stringify(body) });
        return putRes.ok ? "✅ تم الحفظ." : "❌ فشل الحفظ.";
    };

    window.replaceFileContent = async function(path, target, replacement) {
        const current = await getGithubFileContent(path);
        if (current.startsWith('❌')) return current;
        return await writeFile(path, current.replace(target, replacement));
    };

    window.fetchApiKeyFromSupabase = async function(id) {
        try {
            const res = await fetch(`${getSupabaseUrl()}/rest/v1/secret_settings?id=eq.${id}`, { headers: { 'Content-Type': 'application/json' } });
            const data = await res.json();
            return data.length > 0 ? data[0].secret_value : null;
        } catch (e) { return null; }
    };

    window.initKeys = async function() {
        window.geminiApiKey = await window.fetchApiKeyFromSupabase('gemini_key') || '';
        window.githubToken = await window.fetchApiKeyFromSupabase('github_token') || '';
        console.log("🛡️ تم استعادة الاتصال المستقر بالجسر.");
    };

    window.callAiBrain = async function(promptText) {
        const userModel = document.getElementById('modelSelector')?.value || 'gemini-1.5-flash';
        const apiVersion = (userModel.includes('3.7') || userModel.includes('3.6') || userModel.includes('3.5')) ? 'v1' : 'v1beta';
        const url = `${getSupabaseUrl()}/${apiVersion}/models/${userModel}:generateContent`;

        const body = { contents: [{ role: "user", parts: [{ text: promptText }] }], tools: tools, system_instruction: systemInstruction };

        try {
            const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const data = await res.json();
            const parts = data.candidates?.[0]?.content?.parts || [];
            const thought = parts.find(p => p.text)?.text;
            const functionCallPart = parts.find(p => p.functionCall);

            if (functionCallPart) {
                const { name, args } = functionCallPart.functionCall;
                let toolResult;
                if (name === "read_file") toolResult = await getGithubFileContent(args.path);
                else if (name === "write_file") toolResult = await writeFile(args.path, args.content);
                else if (name === "replace_file_content") toolResult = await replaceFileContent(args.path, args.targetContent, args.replacementContent);
                else if (name === "thought") toolResult = args;

                const history = [
                    { role: "user", parts: [{ text: promptText }] },
                    { role: "model", parts: [functionCallPart] },
                    { role: "user", parts: [{ functionResponse: { name, response: { content: toolResult } } }] }
                ];

                const followUpRes = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: history, tools: tools, system_instruction: systemInstruction }) });
                const followUpData = await followUpRes.json();
                return { text: followUpData.candidates?.[0]?.content?.parts?.[0]?.text, model: userModel };
            }
            return { text: thought, model: userModel };
        } catch (e) { return { text: `❌ خطأ في الاتصال: ${e.message}`, model: "System" }; }
    };

    console.log("🚀 AI Core V3.5 (Restored Stability) Loaded.");
})(window);
