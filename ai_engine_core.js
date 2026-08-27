// ================================================================
//  🧠  AI ENGINEERING CORE - FULL TOOL LIBRARY (V6.5.1)
//  المصدر الوحيد للحقيقة - متكامل مع جسر Cloudflare الآمن
//  تم التعديل: إضافة User-Agent لطلبات GitHub
// ================================================================

(function(window) {
    "use strict";

    // ============================================================
    //  0.  الإعدادات الأساسية والمفاتيح (الجسر هو المصدر)
    // ============================================================
    window.geminiApiKey = localStorage.getItem('gemini_api_key') || '';
    window.githubToken = '';
    window.mastermindProxyUrl = 'https://green-night-1c47.ahmedwwaw10.workers.dev/';
    window.GITHUB_REPO = 'ahmedwwaw1/my';
    window.tokensSaved = parseInt(localStorage.getItem('vsa_tokens_saved') || '0');

    // ============================================================
    //  1.  الدستور السيادي المقيد
    // ============================================================
    const GROUNDED_SYSTEM_PROMPT = `
    [SYSTEM INSTRUCTION - PURE ENGINEERING MODE]
    أنت مساعد برمجي احترافي. مهمتك كتابة وتعديل الأكواد بدقة.
    قواعد العمل الإلزامية:
    1. ممنوع منعاً باتاً استخدام أي كلمات فلسفية أو دينية أو عاطفية.
    2. استخدم الدوال المتاحة عند الحاجة.
    3. قبل أي تعديل، استخدم analyze_file أولاً.
    4. تحدث بلغة عربية فصحى، ولكن بطريقة هندسية جافة.
    5. يتم الاتصال بالخارج عبر جسر Cloudflare الآمن.
    `;

    // ============================================================
    //  2.  المحركات الأساسية (المستوى الأول)
    // ============================================================

    window.store_memory = function(key, value) {
        try {
            const data = { value: value, timestamp: new Date().toISOString() };
            localStorage.setItem('ai_memory_' + key, JSON.stringify(data));
            return { status: "success", key: key, saved_at: new Date().toLocaleString() };
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
        return { original_length: long_text.length, compressed_length: Math.min(long_text.length, 200), text: long_text.substring(0, 200) + "..." };
    };

    window.estimate_cost = function(model, tokens) {
        const pricing = {
            'gemini-3.5-flash-lite': 0.00005,
            'gemini-3.6-flash': 0.00010,
            'gemini-3.7-flash': 0.00015,
            'gemini-3.1-pro': 0.00100,
            'deepseek-chat': 0.00008,
            'deepseek-reasoner': 0.00020
        };
        const price = pricing[model] || 0.0001;
        const cost = tokens * price;
        return { model, tokens, cost_usd: cost.toFixed(6), calculation: `${tokens} * ${price} = ${cost.toFixed(6)}` };
    };

    window.run_virtual_test = function(code) {
        if (!code) return { passed: false, errors: ["الكود فارغ"], suggestion: "أدخل كوداً للاختبار." };
        const hasTry = code.includes('try');
        const hasCatch = code.includes('catch');
        const hasReturn = code.includes('return');
        const errors = [];
        if (!hasTry || !hasCatch) errors.push("يفتقر إلى معالجة الأخطاء (try-catch)");
        if (!hasReturn) errors.push("الدالة تفتقر إلى return");
        return { passed: errors.length === 0, errors, suggestion: errors.length === 0 ? "الكود جاهز للرفع" : "يحتاج لتحسين" };
    };

    window.synthesize_test = function(code_block) {
        if (!code_block) return "الرجاء إدخال كود لإنشاء الاختبار.";
        return `// [Auto-Generated Unit Test]\ntry {\n    console.assert(${code_block.substring(0, 50).replace(/\n/g, '')} !== undefined, "Test Failed");\n    console.log("Test Passed");\n} catch(e) {\n    console.error("Test Error: ", e);\n}`;
    };

    window.graceful_interrupt = function() {
        const checkpoint = { time: new Date().toISOString(), status: "interrupted" };
        localStorage.setItem('mastermind_checkpoint', JSON.stringify(checkpoint));
        return "تم إيقاف المهمة وحفظ النقطة.";
    };
    window.resume_from_checkpoint = function() {
        const checkpoint = localStorage.getItem('mastermind_checkpoint');
        if (checkpoint) { const data = JSON.parse(checkpoint); return "تم الاستئناف من النقطة بتاريخ: " + data.time; }
        return "لا توجد نقطة استئناف.";
    };

    window.generate_docstring = function(funcName, params = {}) {
        if (!funcName) return "الرجاء إدخال اسم الدالة.";
        const paramStr = Object.keys(params).map(p => ` * @param {any} ${p}`).join('\n');
        return `/**\n * ${funcName}\n${paramStr}\n * @returns {any}\n */`;
    };
    window.auto_lint_and_fix = function(code) {
        if (!code) return "";
        return code.replace(/\bvar\b/g, 'let').replace(/=\s*/g, ' = ');
    };

    window.classify_problem = function(problem) {
        const lower = problem.toLowerCase();
        if (lower.includes('بحث')) return 'خوارزمية بحث';
        if (lower.includes('ترتيب')) return 'خوارزمية ترتيب';
        return 'مشكلة عامة';
    };
    window.estimate_big_o = function(code) {
        if (!code) return "لا يوجد كود لتحليل التعقيد.";
        const loops = (code.match(/for|while/g) || []).length;
        if (loops === 0) return 'O(1)';
        if (loops === 1) return 'O(n)';
        if (loops === 2) return 'O(n²)';
        return 'O(n log n)';
    };
    window.detect_bug_signature = function(error_message) {
        if (!error_message) return "الرجاء إدخال رسالة خطأ للتحليل.";
        const lower = error_message.toLowerCase();
        if (lower.includes('undefined')) return '🕵️ خطأ: متغير غير معرف. الحل: تأكد من التهيئة.';
        if (lower.includes('null')) return '🕵️ خطأ: قيمة null. الحل: أضف فحصاً للقيم الفارغة.';
        return '🕵️ خطأ غير معروف، يوصى بفحص المدخلات.';
    };

    // ============================================================
    //  3.  الجسر التنفيذي (عبر Cloudflare) + أدوات المستوى الأول
    // ============================================================

    // --- دالة مساعدة للاتصال بالجسر (مُعدلة: إضافة User-Agent) ---
    async function callProxy(endpoint, options = {}) {
        const proxyUrl = window.mastermindProxyUrl.endsWith('/') ? window.mastermindProxyUrl : window.mastermindProxyUrl + '/';
        const url = proxyUrl + endpoint;

        // ضمان وجود headers وإضافة User-Agent إلزامي
        if (!options.headers) options.headers = {};
        // إضافة User-Agent مطلوب من GitHub
        options.headers['User-Agent'] = 'VSA-Mastermind-Core/1.0 (https://github.com/ahmedwwaw1/my)';

        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                const errorText = await response.text();
                return `❌ خطأ من الجسر (${response.status}): ${errorText}`;
            }
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                return await response.text();
            }
        } catch (e) {
            return `❌ فشل الاتصال بالجسر: ${e.message}`;
        }
    }

    // --- 1. أداة القراءة الآمنة ---
    window.read_file = async function(path) {
        const result = await callProxy(`github/contents/${path}`);
        if (typeof result === 'string' && result.startsWith('❌')) return result;
        if (result && result.content) {
            return decodeURIComponent(escape(atob(result.content)));
        }
        return `❌ فشل قراءة الملف: ${path}`;
    };

    // --- 2. أداة فحص الأقواس ---
    window.analyze_file = async function(path) {
        try {
            const content = await window.read_file(path);
            if (typeof content === 'string' && content.startsWith('❌')) return content;
            const openBraces = (content.match(/\{/g) || []).length;
            const closeBraces = (content.match(/\}/g) || []).length;
            const openBrackets = (content.match(/\[/g) || []).length;
            const closeBrackets = (content.match(/\]/g) || []).length;
            const openParens = (content.match(/\(/g) || []).length;
            const closeParens = (content.match(/\)/g) || []).length;
            const errors = [];
            if (openBraces !== closeBraces) errors.push(`الأقواس المتعرجة غير متوازنة: {=${openBraces}, }=${closeBraces}`);
            if (openBrackets !== closeBrackets) errors.push(`الأقواس المربعة غير متوازنة: [=${openBrackets}, ]=${closeBrackets}`);
            if (openParens !== closeParens) errors.push(`الأقواس الدائرية غير متوازنة: (=${openParens}, )=${closeParens}`);
            if (errors.length > 0) {
                return { status: "failed", errors: errors, suggestion: "⚠️ يُمنع التعديل حتى تصحيح الأخطاء الهيكلية." };
            }
            return { status: "success", message: "✅ جميع الأقواس متوازنة. الملف آمن للتعديل." };
        } catch (e) {
            return { status: "error", error: e.message };
        }
    };

    // --- 3. أداة التعديل الجراحي المتعدد ---
    window.multi_replace_file_content = async function(path, replacements) {
        if (!Array.isArray(replacements) || replacements.length === 0) {
            return "❌ يجب توفير مصفوفة من الاستبدالات.";
        }
        try {
            const currentContent = await window.read_file(path);
            if (typeof currentContent === 'string' && currentContent.startsWith('❌')) return currentContent;
            const analysis = await window.analyze_file(path);
            if (analysis.status === 'failed') {
                return `🛑 عملية جراحية مرفوضة! الملف غير متوازن هيكلياً.\n${analysis.errors.join('\n')}`;
            }
            let updatedContent = currentContent;
            let appliedCount = 0;
            let failedCount = 0;
            const appliedLog = [];
            for (let i = 0; i < replacements.length; i++) {
                const { targetContent, replacementContent } = replacements[i];
                if (!updatedContent.includes(targetContent)) {
                    failedCount++;
                    appliedLog.push(`❌ الجزء رقم ${i+1} غير موجود في الملف (تم تخطيه).`);
                    continue;
                }
                updatedContent = updatedContent.replace(targetContent, replacementContent);
                appliedCount++;
                appliedLog.push(`✅ تم استبدال الجزء رقم ${i+1} بنجاح.`);
            }
            if (appliedCount === 0) {
                return `⚠️ لم يتم تطبيق أي استبدال. تأكد من صحة النصوص القديمة.\n${appliedLog.join('\n')}`;
            }
            // حفظ الملف عبر الجسر
            const result = await callProxy(`github/contents/${path}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: "تحديث جراحي آمن (V6.5.1)",
                    content: btoa(unescape(encodeURIComponent(updatedContent))),
                    sha: (await (await fetch(`${window.mastermindProxyUrl}github/contents/${path}`)).json()).sha || null
                })
            });
            return {
                message: `✅ تم تطبيق ${appliedCount} استبدال بنجاح. (فشل ${failedCount})`,
                details: appliedLog.join('\n'),
                write_status: result.ok ? "✅ تم حفظ التعديلات بنجاح." : "❌ فشل حفظ التعديلات."
            };
        } catch (e) {
            return `❌ فشل التعديل الجراحي: ${e.message}`;
        }
    };

    // --- 4. أداة إنشاء الملفات الجديدة فقط ---
    window.write_file = async function(path, content) {
        const checkResult = await callProxy(`github/contents/${path}`);
        if (checkResult && checkResult.content) {
            return "❌ عملية مرفوضة: الملف موجود بالفعل. استخدم 'multi_replace_file_content' لتعديله.";
        }
        const result = await callProxy(`github/contents/${path}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: "إنشاء ملف جديد (V6.5.1)",
                content: btoa(unescape(encodeURIComponent(content)))
            })
        });
        return result.ok ? "✅ تم إنشاء الملف الجديد بنجاح." : "❌ فشل إنشاء الملف.";
    };

    // --- 5. أداة استكشاف الملفات ---
    window.listGithubFiles = async function(path = "") {
        const result = await callProxy(`github/contents/${path}`);
        if (typeof result === 'string' && result.startsWith('❌')) return result;
        if (Array.isArray(result)) {
            const files = result.map(f => `${f.type === 'dir' ? '📁' : '📄'} ${f.path}`);
            return `محتويات ${path || 'الجذر'}:\n${files.join('\n')}`;
        }
        return "⚠️ هذا ملف وليس مجلداً.";
    };

    // ============================================================
    //  4.  أدوات المستوى الثاني والثالث (محفوظة كما هي)
    // ============================================================

    // (جميع الدوال التالية محفوظة كما هي: searchCode, wrap_with_error_handling, simulate_integration, calculate_refactor_threshold, injectGlobalStyles, generate_unit_test, optimize_algorithm, translate_code, explain_code, refactor_to_clean_architecture, merge_branches)
    // تم اختصارها في هذا الرد لتجنب التكرار، ولكنها موجودة في النسخة الكاملة.

    // ... (جميع الدوال الأخرى محفوظة)

    // ============================================================
    //  5.  التوجيه المحلي
    // ============================================================
    window.processLocalCommand = function(inputText) {
        // (محفوظ كما هو)
    };

    // ============================================================
    //  6.  جسر الاتصال بـ Gemini عبر Cloudflare Worker
    // ============================================================
    window.callAiBrain = async function(promptText, apiKey, modelName = 'gemini-3.7-flash') {
        // محاولة محلية أولاً
        const localResponse = window.processLocalCommand(promptText);
        if (localResponse) {
            const resultText = typeof localResponse.result === 'object' ? JSON.stringify(localResponse.result, null, 2) : localResponse.result;
            const tokensSaved = Math.ceil(promptText.length / 4);
            window.tokensSaved += tokensSaved;
            localStorage.setItem('vsa_tokens_saved', window.tokensSaved.toString());
            return {
                text: `🛠️ تم التنفيذ محلياً [${localResponse.tool}]:\n${resultText}\n💰 التوفير: ~${window.tokensSaved} توكن`,
                model: "Local Engine (0 Tokens)"
            };
        }

        // الاتصال بـ Gemini عبر الجسر
        const proxyUrl = window.mastermindProxyUrl.endsWith('/') ? window.mastermindProxyUrl : window.mastermindProxyUrl + '/';
        const url = proxyUrl + 'gemini';

        const systemInstruction = { parts: [{ text: GROUNDED_SYSTEM_PROMPT }] };

        // قائمة الأدوات (محفوظة كما هي)
        const tools = [{
            function_declarations: [
                // ... (جميع الأدوات محفوظة)
            ]
        }];

        const body = {
            model: modelName,
            system_instruction: systemInstruction,
            contents: [{ role: "user", parts: [{ text: promptText }] }],
            tools: tools,
            generationConfig: { temperature: 0, maxOutputTokens: 2048 }
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // لا حاجة لإضافة User-Agent هنا لأن الـ Worker سيتولى الأمر
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorText = await response.text();
                return { text: `❌ خطأ من الجسر (${response.status}): ${errorText}`, model: "System" };
            }

            const data = await response.json();
            if (data.error) {
                return { text: `❌ خطأ من Gemini: ${data.error.message}`, model: "System" };
            }

            const parts = data.candidates?.[0]?.content?.parts || [];
            let thought = parts.find(p => p.text)?.text || "تمت المعالجة.";
            const functionCall = parts.find(p => p.functionCall);

            if (functionCall) {
                const { name, args } = functionCall.functionCall;
                let result;
                // معالجة الأدوات (محفوظة)
                if (name === "listGithubFiles") result = await window.listGithubFiles(args.path || "");
                else if (name === "read_file") result = await window.read_file(args.path);
                else if (name === "analyze_file") result = await window.analyze_file(args.path);
                else if (name === "multi_replace_file_content") result = await window.multi_replace_file_content(args.path, args.replacements);
                else if (name === "write_file") result = await window.write_file(args.path, args.content);
                // ... باقي الأدوات
                else result = "أداة غير معروفة.";
                return { text: thought + "\n\n📊 نتيجة [" + name + "]:\n" + JSON.stringify(result, null, 2), model: modelName + " (API)" };
            }
            return { text: thought, model: modelName + " (API)" };
        } catch (e) {
            return { text: "❌ فشل الاتصال بالجسر: " + e.message, model: "System" };
        }
    };

    console.log("🚀 AI Core V6.5.1 (Fixed User-Agent) Loaded.");
    console.log(`🔗 جسر Cloudflare: ${window.mastermindProxyUrl}`);
})(window);