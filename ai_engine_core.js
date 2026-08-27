// ================================================================
//  🧠  AI ENGINEERING CORE - Full Sovereign Edition (V4.0)
//  الإصدار: 4.0 (مكتمل بالمحركات 7-12 والمنطق المحلي وجسر GitHub)
// ================================================================

(function(window) {
    // إعدادات المفاتيح والجسر
    window.geminiApiKey = '';
    window.githubToken = '';
    window.mastermindProxyUrl = localStorage.getItem('vsa_proxy_url') || 'https://ozcffmadatsfyyldqmdl.supabase.co';
    window.GITHUB_REPO = 'ahmedwwaw1/my';
    window.tokensSaved = parseInt(localStorage.getItem('vsa_tokens_saved') || '0');

    // ============================================================
    //  1.  الدستور السيادي المقيد (يمنع الهلوسة)
    // ============================================================
    const GROUNDED_SYSTEM_PROMPT = `
    [SYSTEM INSTRUCTION - GROUNDED ENGINEERING MODE]
    أنت "المحرك الهندسي" (Engineering Core). أنت مساعد برمجي دقيق.
    القواعد الذهبية:
    1. ممنوع منعاً باتاً استخدام كلمات (بكل سيادة، أنجزت، النخبة، الخلود، البعث، الإرادة العلوية).
    2. كل رد يجب أن يكون عملياً وجافاً. ركز على الأرقام والمنطق والكود.
    3. إذا لم تستخدم أداة (Function) محددة، فلا تقل أنك أنجزت شيئاً.
    4. استخدم الدوال المتاحة أولاً (store_memory, vector_search, estimate_cost, run_virtual_test).
    `;

    // ============================================================
    //  2.  المحركات 7-12 (الدوال الفعلية)
    // ============================================================

    // -------- 7. محرك الذاكرة --------
    window.store_memory = function(key, value) {
        try {
            const data = { value, timestamp: new Date().toISOString() };
            localStorage.setItem('ai_memory_' + key, JSON.stringify(data));
            return { status: "success", key, saved_at: new Date().toLocaleString() };
        } catch (e) {
            return { status: "error", error: e.message };
        }
    };

    window.vector_search = function(query) {
        try {
            const keys = Object.keys(localStorage).filter(k => k.startsWith('ai_memory_'));
            let results = [];
            keys.forEach(key => {
                try {
                    const item = JSON.parse(localStorage.getItem(key));
                    if ((item.value || '').toLowerCase().includes(query.toLowerCase())) {
                        results.push({ key: key.replace('ai_memory_', ''), value: item.value, timestamp: item.timestamp });
                    }
                } catch(e) {}
            });
            return results.length > 0 ? results : "لم يتم العثور على نتائج.";
        } catch(e) {
            return "خطأ في البحث: " + e.message;
        }
    };

    window.compress_context = function(long_text) {
        if (!long_text) return "لا يوجد نص لضغطه.";
        const compressed = long_text.substring(0, 200) + "... [تم ضغط السياق محلياً]";
        return { original_length: long_text.length, compressed_length: compressed.length, text: compressed };
    };

    // -------- 8. محرك التكلفة --------
    window.estimate_cost = function(model, tokens) {
        const pricing = {
            'gemini-3.7-flash': 0.00015,
            'gemini-3.5-flash-lite': 0.00005,
            'deepseek-chat': 0.00008
        };
        const price = pricing[model] || 0.0001;
        const cost = tokens * price;
        return { model, tokens, cost_usd: cost.toFixed(6), calculation: `${tokens} * ${price}` };
    };

    // -------- 9. محرك الاختبار --------
    window.run_virtual_test = function(code) {
        const errors = [];
        if (!code.includes('try')) errors.push("يفتقر إلى try-catch");
        return { passed: errors.length === 0, errors };
    };

    window.synthesize_test = function(code_block) {
        return `// [Auto-Generated Unit Test]\ntry {\n    console.assert(${code_block.substring(0, 50).replace(/\n/g, '')} !== undefined, "Test Failed");\n    console.log("Test Passed");\n} catch(e) {\n    console.error("Test Error: ", e);\n}`;
    };

    // -------- 10-12. الدوال المساعدة والمحلية --------
    window.classify_problem = (p) => p.includes('بحث') ? 'خوارزمية' : 'عامة';
    window.estimate_big_o = (c) => c.includes('for') ? 'O(n)' : 'O(1)';
    window.detect_bug_signature = function(error_message) {
        const lower = error_message.toLowerCase();
        if (lower.includes('undefined')) return '🕵️ خطأ: متغير غير معرف. الحل: تأكد من التهيئة.';
        if (lower.includes('null')) return '🕵️ خطأ: قيمة null. الحل: أضف فحصاً للقيم الفارغة.';
        if (lower.includes('cors')) return '🕵️ خطأ: قيود CORS. الحل: استخدم الجسر السيادي.';
        return '🕵️ خطأ غير معروف، يوصى بفحص المدخلات.';
    };

    window.generate_docstring = function(funcName) {
        return `/**\n * @function ${funcName}\n * @description [وصف الدالة]\n * @returns {any}\n */`;
    };

    // ============================================================
    //  3.  جسر GitHub و Supabase (المحرك التنفيذي 2)
    // ============================================================
    window.getSupabaseUrl = () => window.mastermindProxyUrl.endsWith('/') ? window.mastermindProxyUrl.slice(0, -1) : window.mastermindProxyUrl;

    window.safeGithubFetch = async function(endpoint, options = {}) {
        const url = `${getSupabaseUrl()}/repos/${window.GITHUB_REPO}/${endpoint}`;
        return await fetch(url, { ...options, headers: { 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json', ...options.headers } });
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
        const body = { message: "تحديث هندسي (V4.0)", content: btoa(unescape(encodeURIComponent(content))), sha };
        const putRes = await safeGithubFetch(apiPath, { method: 'PUT', body: JSON.stringify(body) });
        return putRes.ok ? "✅ تم الحفظ." : "❌ فشل الحفظ.";
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
        console.log("🛡️ تم استعادة الاتصال واستحضار المفاتيح.");
    };

    // ============================================================
    //  4.  التوجيه المحلي (Local Routing)
    // ============================================================
    window.processLocalCommand = function(inputText) {
        const lower = inputText.toLowerCase();
        let result = null;
        let tool = null;

        if (lower.includes('خزن') || lower.includes('تذكر')) {
            const match = inputText.match(/(?:خزن|تذكر)\s*["']?([^"'\s]+)["']?\s*(.*)/);
            if (match) { result = window.store_memory(match[1], match[2] || "تم الحفظ"); tool = "store_memory"; }
        }
        else if (lower.includes('ابحث') || lower.includes('بحث')) {
            const match = inputText.match(/(?:ابحث|بحث)\s*["']?([^"']+)["']?/);
            if (match) { result = window.vector_search(match[1]); tool = "vector_search"; }
        }
        else if (lower.includes('اضغط') || lower.includes('اختصر')) {
            result = window.compress_context(inputText); tool = "compress_context";
        }
        else if (lower.includes('صنع اختبار') || lower.includes('ولد اختبار')) {
            result = window.synthesize_test(inputText); tool = "synthesize_test";
        }
        else if (lower.includes('وثق') || lower.includes('توثيق')) {
            const match = inputText.match(/(?:وثق|توثيق)\s*["']?([^"'\s]+)["']?/);
            result = window.generate_docstring(match ? match[1] : "دالة_غير_معروفة"); tool = "generate_docstring";
        }
        else if (lower.includes('حلل خطأ') || lower.includes('ما هذا الخطأ')) {
            result = window.detect_bug_signature(inputText); tool = "detect_bug_signature";
        }

        if (result) {
            // تحديث عداد التوكنات الموفرة (بافتراض 500 توكن لكل عملية محلية)
            window.tokensSaved += 500;
            localStorage.setItem('vsa_tokens_saved', window.tokensSaved.toString());
            return { result, tool };
        }

        return null;
    };

    // ============================================================
    //  5.  محرك الاتصال بـ API (callAiBrain)
    // ============================================================
    window.callAiBrain = async function(promptText) {
        // المحاولة المحلية أولاً
        const local = window.processLocalCommand(promptText);
        if (local) return { text: `🛠️ تنفيذ محلي [${local.tool}]:\n${JSON.stringify(local.result, null, 2)}`, model: "Local Engine" };

        const userModel = document.getElementById('modelSelector')?.value || 'gemini-3.7-flash';
        const url = `${getSupabaseUrl()}/v1beta/models/${userModel}:generateContent?key=${window.geminiApiKey}`;

        const tools = [{
            function_declarations: [
                { name: "read_file", description: "قراءة ملف من GitHub", parameters: { type: "OBJECT", properties: { path: { type: "STRING" } }, required: ["path"] } },
                { name: "write_file", description: "كتابة ملف إلى GitHub", parameters: { type: "OBJECT", properties: { path: { type: "STRING" }, content: { type: "STRING" } }, required: ["path", "content"] } },
                { name: "store_memory", description: "تخزين محلي", parameters: { type: "OBJECT", properties: { key: { type: "STRING" }, value: { type: "STRING" } }, required: ["key", "value"] } }
            ]
        }];

        const body = {
            system_instruction: { parts: [{ text: GROUNDED_SYSTEM_PROMPT }] },
            contents: [{ role: "user", parts: [{ text: promptText }] }],
            tools: tools
        };

        try {
            const res = await fetch(url, { method: 'POST', body: JSON.stringify(body) });
            const data = await res.json();
            const parts = data.candidates?.[0]?.content?.parts || [];
            const thought = parts.find(p => p.text)?.text || "تمت المعالجة.";
            const fc = parts.find(p => p.functionCall);

            if (fc) {
                const { name, args } = fc.functionCall;
                let resTool;
                if (name === "read_file") resTool = await window.getGithubFileContent(args.path);
                else if (name === "write_file") resTool = await window.writeFile(args.path, args.content);
                else if (name === "store_memory") resTool = window.store_memory(args.key, args.value);

                return { text: thought + `\n\n📊 نتيجة [${name}]:\n` + JSON.stringify(resTool, null, 2), model: userModel };
            }
            return { text: thought, model: userModel };
        } catch (e) { return { text: "❌ خطأ في الجسر.", model: "System" }; }
    };

    console.log("🚀 AI Core V4.0 (Full Merged Edition) Loaded.");
})(window);
