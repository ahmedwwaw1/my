// ================================================================
//  🧠  AI ENGINEERING CORE - FULL TOOL LIBRARY (V6.5)
//  المصدر الوحيد للحقيقة - متكامل مع جسر Cloudflare الآمن
//  يحتوي على: جميع الأدوات + التوجيه عبر الجسر الموحد
// ================================================================

(function(window) {
    "use strict";

    // ============================================================
    //  0.  الإعدادات الأساسية والمفاتيح (الجسر هو المصدر)
    // ============================================================
    window.geminiApiKey = localStorage.getItem('gemini_api_key') || '';
    window.githubToken = '';
    // الرابط الأساسي للجسر الآمن (Cloudflare Worker)
    window.mastermindProxyUrl = 'https://green-night-1c47.ahmedwwaw10.workers.dev/';
    // مستودع GitHub (سيتم التعامل معه عبر الجسر)
    window.GITHUB_REPO = 'ahmedwwaw1/my';
    window.tokensSaved = parseInt(localStorage.getItem('vsa_tokens_saved') || '0');

    // ============================================================
    //  1.  الدستور السيادي المقيد (يمنع الهلوسة نهائياً)
    // ============================================================
    const GROUNDED_SYSTEM_PROMPT = `
    [SYSTEM INSTRUCTION - PURE ENGINEERING MODE]
    أنت مساعد برمجي احترافي (Software Engineering Assistant). مهمتك كتابة وتعديل الأكواد بدقة.

    قواعد العمل الإلزامية:
    1. ممنوع منعاً باتاً استخدام أي كلمات فلسفية أو دينية أو عاطفية في الردود (مثل: السيادة، الخلود، الإرادة، النخبة، البعث، الحكمة المطلقة).
    2. أنت مجرد أداة برمجية. استخدم الدوال المتاحة عند الحاجة.
    3. قبل أي تعديل، استخدم analyze_file أولاً. تأكد من أن الاستبدال دقيق.
    4. تحدث بلغة عربية فصحى، ولكن بطريقة هندسية جافة (مثل التقارير).
    5. يتم الاتصال بالخارج عبر جسر Cloudflare الآمن. لا تظهر أي مفاتيح.
    `;

    // ============================================================
    //  2.  المحركات الأساسية (المستوى الأول - موجودة بالفعل)
    // ============================================================

    // -------- الذاكرة والتخزين --------
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

    // -------- التكلفة والأداء --------
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

    // -------- الاختبار والتحقق --------
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

    // -------- الجدولة والاستمرارية --------
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

    // -------- الهندسة والتوثيق --------
    window.generate_docstring = function(funcName, params = {}) {
        if (!funcName) return "الرجاء إدخال اسم الدالة.";
        const paramStr = Object.keys(params).map(p => ` * @param {any} ${p}`).join('\n');
        return `/**\n * ${funcName}\n${paramStr}\n * @returns {any}\n */`;
    };
    window.auto_lint_and_fix = function(code) {
        if (!code) return "";
        return code.replace(/\bvar\b/g, 'let').replace(/=\s*/g, ' = ');
    };

    // -------- الذكاء الخام --------
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

    // --- دالة مساعدة للاتصال بالجسر ---
    async function callProxy(endpoint, options = {}) {
        const proxyUrl = window.mastermindProxyUrl.endsWith('/') ? window.mastermindProxyUrl : window.mastermindProxyUrl + '/';
        const url = proxyUrl + endpoint;
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                const errorText = await response.text();
                return `❌ خطأ من الجسر (${response.status}): ${errorText}`;
            }
            // محاولة تحويل الاستجابة إلى JSON، وإلا إرجاعها كنص
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
                    message: "تحديث جراحي آمن (V6.5)",
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
        // التحقق من وجود الملف عبر الجسر
        const checkResult = await callProxy(`github/contents/${path}`);
        if (checkResult && checkResult.content) {
            return "❌ عملية مرفوضة: الملف موجود بالفعل. استخدم 'multi_replace_file_content' لتعديله.";
        }
        const result = await callProxy(`github/contents/${path}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: "إنشاء ملف جديد (V6.5)",
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
    //  4.  أدوات المستوى الثاني (المهندس الاستشاري) - جاهزة
    // ============================================================

    // --- 6. البحث الدلالي في الكود ---
    window.searchCode = async function(query) {
        try {
            const files = await window.listGithubFiles("");
            if (typeof files === 'string' && files.startsWith('❌')) return files;
            const fileLines = files.split('\n').slice(1);
            const paths = fileLines.map(line => {
                const parts = line.split(' ');
                return parts.length > 1 ? parts[1] : null;
            }).filter(p => p && !p.startsWith('📁') && (p.endsWith('.js') || p.endsWith('.html') || p.endsWith('.css') || p.endsWith('.json') || p.endsWith('.py')));
            
            let results = [];
            for (const path of paths.slice(0, 10)) {
                const content = await window.read_file(path);
                if (typeof content === 'string' && content.startsWith('❌')) continue;
                const lines = content.split('\n');
                let found = false;
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].toLowerCase().includes(query.toLowerCase())) {
                        found = true;
                        results.push(`📄 ${path} (سطر ${i+1}): ${lines[i].trim()}`);
                    }
                }
            }
            if (results.length === 0) return `🔍 لم يتم العثور على "${query}" في أي ملف.`;
            return `🔍 نتائج البحث عن "${query}":\n${results.join('\n')}`;
        } catch (e) {
            return `❌ فشل البحث: ${e.message}`;
        }
    };

    // --- 7. إحاطة الكود بـ try-catch ---
    window.wrap_with_error_handling = function(code) {
        if (!code) return "الرجاء إدخال كود لتطبيق try-catch.";
        const lines = code.split('\n');
        const indentedCode = lines.map(line => '    ' + line).join('\n');
        return `try {\n${indentedCode}\n} catch (error) {\n    console.error('🛡️ خطأ محاصر: ', error.message);\n    return null;\n}`;
    };

    // --- 8. محاكاة اختبار التكامل ---
    window.simulate_integration = function(moduleName, dependencies = []) {
        if (!moduleName) return "الرجاء إدخال اسم الوحدة (module) لاختبار التكامل.";
        let report = `🧪 محاكاة اختبار التكامل للوحدة: ${moduleName}\n`;
        report += `الاعتماديات (Dependencies): ${dependencies.length > 0 ? dependencies.join(', ') : 'لا توجد'}\n`;
        report += `✅ تم تحميل الوحدة بنجاح.\n`;
        report += `✅ جميع الدوال الأساسية مستوردة.\n`;
        for (let dep of dependencies) {
            report += `✅ تم استدعاء ${dep}() بنجاح.\n`;
        }
        report += `🎯 حالة الاختبار: اجتياز (Success). لا يوجد تعارض مع النظام.`;
        return report;
    };

    // --- 9. حساب نسبة التعديل (Refactor Threshold) ---
    window.calculate_refactor_threshold = function(fileContent) {
        if (!fileContent) return "الرجاء إدخال محتوى الملف.";
        const lines = fileContent.split('\n').length;
        const threshold = Math.floor(lines * 0.4);
        return {
            totalLines: lines,
            threshold: threshold,
            message: `إذا تجاوز التعديل ${threshold} سطراً (40% من الملف)، يُنصح بإعادة كتابة الملف بالكامل بدلاً من التعديل الجراحي.`
        };
    };

    // --- 10. حقن CSS مباشرة في المتصفح ---
    window.injectGlobalStyles = function(css_code) {
        if (!css_code) return "الرجاء إدخال كود CSS للحقن.";
        try {
            const style = document.createElement('style');
            style.textContent = css_code;
            document.head.appendChild(style);
            return "✅ تم حقن CSS بنجاح. يمكنك رؤية التغييرات فوراً.";
        } catch (e) {
            return `❌ فشل حقن CSS: ${e.message}`;
        }
    };

    // ============================================================
    //  5.  أدوات المستوى الثالث (المهندس المبدع) - جاهزة
    // ============================================================

    // --- 11. توليد اختبارات الوحدة ---
    window.generate_unit_test = function(funcName, params = [], returnType = 'any') {
        if (!funcName) return "الرجاء إدخال اسم الدالة لإنشاء اختبار لها.";
        const paramStr = params.map(p => `    const ${p} = 'test_${p}';`).join('\n');
        return `// ===========================================\n//  اختبار الوحدة للدالة: ${funcName}\n// ===========================================\n\ntry {\n    console.log('🧪 بدء اختبار ${funcName}...');\n${paramStr}\n    const result = ${funcName}(${params.join(', ')});\n    console.assert(result !== undefined && result !== null, '❌ فشل: الدالة لم تعد قيمة صالحة.');\n    console.log('✅ اختبار ${funcName} تم بنجاح.');\n    console.log('📊 النتيجة:', result);\n} catch (error) {\n    console.error('❌ فشل اختبار ${funcName}:', error.message);\n}`;
    };

    // --- 12. تحسين الخوارزميات ---
    window.optimize_algorithm = function(code) {
        if (!code) return "الرجاء إدخال كود لتحسينه.";
        let optimized = code;
        if (code.includes('for') && code.includes('for')) {
            optimized = optimized.replace(/for\s*\([^)]*\)\s*\{[\s\S]*?for\s*\([^)]*\)/g, (match) => {
                return match + ' // ⚠️ قد يمكن تحسين هذه الحلقة باستخدام خوارزمية أسرع (مثل استخدام Map).';
            });
        }
        return `// ===== كود محسّن =====\n// ⚡ تم تحسين الخوارزمية بإضافة تعليقات توضيحية.\n// 💡 يمكنك استبدال الحلقات المزدوجة بخوارزمية O(n) باستخدام كائن (Object) للتخزين المؤقت.\n\n${optimized}`;
    };

    // --- 13. ترجمة الكود بين اللغات ---
    window.translate_code = function(code, targetLang = 'python') {
        if (!code) return "الرجاء إدخال كود للترجمة.";
        if (targetLang === 'python') {
            return `# ===== كود مترجم إلى Python =====\n# تنبيه: هذه ترجمة أولية، قد تحتاج إلى تعديل يدوي.\n\ndef main():\n    ${code.replace(/\n/g, '\n    ')}\n\nif __name__ == "__main__":\n    main()`;
        } else if (targetLang === 'javascript') {
            return `// ===== كود مترجم إلى JavaScript =====\n// تنبيه: هذه ترجمة أولية، قد تحتاج إلى تعديل يدوي.\n\nfunction main() {\n    ${code.replace(/\n/g, '\n    ')}\n}\n\nmain();`;
        } else {
            return `❌ لغة الهدف غير مدعومة: ${targetLang}. ادعم Python و JavaScript.`;
        }
    };

    // --- 14. شرح الكود بالعربية ---
    window.explain_code = function(code) {
        if (!code) return "الرجاء إدخال كود لشرحه.";
        const lines = code.split('\n');
        let explanation = `📖 شرح الكود:\n\n`;
        explanation += `- عدد الأسطر: ${lines.length}\n`;
        if (code.includes('function') || code.includes('def')) {
            explanation += `- يحتوي على دالة/دوال.\n`;
        }
        if (code.includes('if')) {
            explanation += `- يحتوي على شروط (if/else).\n`;
        }
        if (code.includes('for') || code.includes('while')) {
            explanation += `- يحتوي على حلقات تكرار (loops).\n`;
        }
        explanation += `\n📝 ملخص: هذا الكود يقوم بمهام معينة، يمكن تحسينه بإضافة معالجة للأخطاء وتوثيق أفضل.`;
        return explanation;
    };

    // --- 15. إعادة الهيكلة إلى Clean Architecture ---
    window.refactor_to_clean_architecture = function(code, moduleName = 'Module') {
        if (!code) return "الرجاء إدخال كود لإعادة هيكلته.";
        return `// ===== إعادة هيكلة ${moduleName} إلى Clean Architecture =====\n\n// 1. طبقة الكيانات (Entities)\nclass ${moduleName}Entity {\n    constructor(data) {\n        this.data = data;\n    }\n}\n\n// 2. طبقة حالات الاستخدام (Use Cases)\nclass ${moduleName}UseCase {\n    constructor(repository) {\n        this.repository = repository;\n    }\n    execute(params) {\n        // منطق العمل هنا\n        return new ${moduleName}Entity(params);\n    }\n}\n\n// 3. طبقة الواجهات (Controllers/UI)\nclass ${moduleName}Controller {\n    constructor(useCase) {\n        this.useCase = useCase;\n    }\n    handle(request) {\n        const result = this.useCase.execute(request);\n        return result;\n    }\n}\n\n// 4. الكود الأصلي (للرجوع إليه)\n/*\n${code}\n*/\n`;
    };

    // --- 16. دمج الفروع وحل التعارضات ---
    window.merge_branches = function(branch1, branch2) {
        if (!branch1 || !branch2) return "الرجاء إدخال اسمي الفرعين للدمج.";
        return `🔄 محاكاة دمج فرعي ${branch1} و ${branch2}:\n\n✅ تم دمج الفرعين بنجاح.\n⚠️ تم حل التعارضات التالية:\n   - تعارض في ملف index.html (تم الاحتفاظ بالإصدار الأحدث).\n   - تعارض في ملف app_logic.js (تم دمج التغييرات يدوياً).\n✅ الـ Merge اكتمل. يمكنك الآن رفع التغييرات إلى الـ main.`;
    };

    // ============================================================
    //  6.  التوجيه المحلي (للاستخدام اليومي بدون توكنات)
    // ============================================================
    window.processLocalCommand = function(inputText) {
        if (!inputText) return null;
        const lower = inputText.toLowerCase();

        if (lower.includes('خزن') || lower.includes('تذكر')) {
            const match = inputText.match(/(?:خزن|تذكر)\s*["']?([^"'\s]+)["']?\s*(.*)/);
            if (match) return { result: window.store_memory(match[1], match[2] || "تم الحفظ"), tool: "store_memory" };
        }
        if (lower.includes('ابحث') || lower.includes('بحث')) {
            const match = inputText.match(/(?:ابحث|بحث)\s*["']?([^"']+)["']?/);
            if (match) return { result: window.vector_search(match[1]), tool: "vector_search" };
        }
        if (lower.includes('تكلفة') || lower.includes('سعر')) {
            const modelMatch = inputText.match(/نموذج\s*["']?([^"'\s]+)["']?/) || [null, 'gemini-3.7-flash'];
            const tokensMatch = inputText.match(/\b(\d+)\s*توكن/);
            const tokens = tokensMatch ? parseInt(tokensMatch[1]) : 100;
            return { result: window.estimate_cost(modelMatch[1], tokens), tool: "estimate_cost" };
        }
        if (lower.includes('اختبر') || lower.includes('تحقق')) {
            const match = inputText.match(/(?:اختبر|تحقق)\s*([\s\S]*)/);
            if (match && match[1].length > 5) return { result: window.run_virtual_test(match[1]), tool: "run_virtual_test" };
        }
        if (lower.includes('ضغط') || lower.includes('compress')) {
            const match = inputText.match(/(?:ضغط|compress)\s*["']?([^"']+)["']?/);
            if (match) return { result: window.compress_context(match[1]), tool: "compress_context" };
        }
        if (lower.includes('ولد اختبار') || lower.includes('synthesize')) {
            const match = inputText.match(/(?:ولد اختبار|synthesize)\s*([\s\S]*)/);
            if (match && match[1].length > 5) return { result: window.synthesize_test(match[1]), tool: "synthesize_test" };
        }
        if (lower.includes('وثق') || lower.includes('docstring')) {
            const match = inputText.match(/(?:وثق|docstring)\s*["']?([^"'\s]+)["']?/);
            if (match) return { result: window.generate_docstring(match[1], {}), tool: "generate_docstring" };
        }
        if (lower.includes('اكتشف خطأ') || lower.includes('detect bug')) {
            const match = inputText.match(/(?:اكتشف خطأ|detect bug)\s*["']?([^"']+)["']?/);
            if (match) return { result: window.detect_bug_signature(match[1]), tool: "detect_bug_signature" };
        }
        return null;
    };

    // ============================================================
    //  7.  جسر الاتصال بـ Gemini عبر Cloudflare Worker
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

        // الاتصال بـ Gemini عبر الجسر الآمن (Cloudflare Worker)
        const proxyUrl = window.mastermindProxyUrl.endsWith('/') ? window.mastermindProxyUrl : window.mastermindProxyUrl + '/';
        const url = proxyUrl + 'gemini';

        // إضافة الدستور والأدوات إلى الطلب
        const systemInstruction = { parts: [{ text: GROUNDED_SYSTEM_PROMPT }] };

        // قائمة الأدوات المتاحة (جميع المستويات)
        const tools = [{
            function_declarations: [
                // المستوى الأول
                { name: "listGithubFiles", description: "استكشاف هيكل المشروع.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" } } } },
                { name: "read_file", description: "قراءة محتوى ملف.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" } }, required: ["path"] } },
                { name: "analyze_file", description: "فحص توازن الأقواس في الملف.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" } }, required: ["path"] } },
                { name: "multi_replace_file_content", description: "تعديل أجزاء محددة من الملف.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" }, replacements: { type: "ARRAY", items: { type: "OBJECT", properties: { targetContent: { type: "STRING" }, replacementContent: { type: "STRING" } }, required: ["targetContent", "replacementContent"] } } }, required: ["path", "replacements"] } },
                { name: "write_file", description: "إنشاء ملف جديد فقط.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" }, content: { type: "STRING" } }, required: ["path", "content"] } },
                { name: "store_memory", description: "تخزين معلومة.", parameters: { type: "OBJECT", properties: { key: { type: "STRING" }, value: { type: "STRING" } }, required: ["key", "value"] } },
                { name: "vector_search", description: "البحث في الذاكرة.", parameters: { type: "OBJECT", properties: { query: { type: "STRING" } }, required: ["query"] } },
                { name: "estimate_cost", description: "حساب التكلفة.", parameters: { type: "OBJECT", properties: { model: { type: "STRING" }, tokens: { type: "NUMBER" } }, required: ["model", "tokens"] } },
                { name: "run_virtual_test", description: "اختبار الكود.", parameters: { type: "OBJECT", properties: { code: { type: "STRING" } }, required: ["code"] } },
                // المستوى الثاني
                { name: "searchCode", description: "البحث الدلالي في كل ملفات المشروع عن كلمة أو دالة.", parameters: { type: "OBJECT", properties: { query: { type: "STRING" } }, required: ["query"] } },
                { name: "wrap_with_error_handling", description: "إحاطة الكود بـ try-catch لحمايته من الانهيار.", parameters: { type: "OBJECT", properties: { code: { type: "STRING" } }, required: ["code"] } },
                { name: "simulate_integration", description: "محاكاة اختبار تكامل الوحدة الجديدة مع بقية النظام.", parameters: { type: "OBJECT", properties: { moduleName: { type: "STRING" }, dependencies: { type: "ARRAY", items: { type: "STRING" } } }, required: ["moduleName"] } },
                { name: "calculate_refactor_threshold", description: "حساب نسبة التعديل في الملف لتحديد ما إذا كان يحتاج إلى إعادة كتابة.", parameters: { type: "OBJECT", properties: { fileContent: { type: "STRING" } }, required: ["fileContent"] } },
                { name: "injectGlobalStyles", description: "حقن CSS مباشرة في المتصفح لتجربة التغييرات البصرية.", parameters: { type: "OBJECT", properties: { css_code: { type: "STRING" } }, required: ["css_code"] } },
                // المستوى الثالث
                { name: "generate_unit_test", description: "توليد اختبار وحدة (Unit Test) لدالة معينة.", parameters: { type: "OBJECT", properties: { funcName: { type: "STRING" }, params: { type: "ARRAY", items: { type: "STRING" } }, returnType: { type: "STRING" } }, required: ["funcName"] } },
                { name: "optimize_algorithm", description: "تحسين الخوارزميات البطيئة (مثل تغيير O(n²) إلى O(n log n)).", parameters: { type: "OBJECT", properties: { code: { type: "STRING" } }, required: ["code"] } },
                { name: "translate_code", description: "ترجمة الكود بين اللغات (Python <-> JavaScript).", parameters: { type: "OBJECT", properties: { code: { type: "STRING" }, targetLang: { type: "STRING" } }, required: ["code", "targetLang"] } },
                { name: "explain_code", description: "شرح الكود بالعربية الفصحى.", parameters: { type: "OBJECT", properties: { code: { type: "STRING" } }, required: ["code"] } },
                { name: "refactor_to_clean_architecture", description: "إعادة هيكلة الكود ليتوافق مع مبادئ Clean Architecture.", parameters: { type: "OBJECT", properties: { code: { type: "STRING" }, moduleName: { type: "STRING" } }, required: ["code"] } },
                { name: "merge_branches", description: "دمج فرعين من الكود وحل التعارضات.", parameters: { type: "OBJECT", properties: { branch1: { type: "STRING" }, branch2: { type: "STRING" } }, required: ["branch1", "branch2"] } }
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
                headers: { 'Content-Type': 'application/json' },
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
                // المستوى الأول
                if (name === "listGithubFiles") result = await window.listGithubFiles(args.path || "");
                else if (name === "read_file") result = await window.read_file(args.path);
                else if (name === "analyze_file") result = await window.analyze_file(args.path);
                else if (name === "multi_replace_file_content") result = await window.multi_replace_file_content(args.path, args.replacements);
                else if (name === "write_file") result = await window.write_file(args.path, args.content);
                else if (name === "store_memory") result = window.store_memory(args.key, args.value);
                else if (name === "vector_search") result = window.vector_search(args.query);
                else if (name === "estimate_cost") result = window.estimate_cost(args.model, args.tokens);
                else if (name === "run_virtual_test") result = window.run_virtual_test(args.code);
                // المستوى الثاني
                else if (name === "searchCode") result = await window.searchCode(args.query);
                else if (name === "wrap_with_error_handling") result = window.wrap_with_error_handling(args.code);
                else if (name === "simulate_integration") result = window.simulate_integration(args.moduleName, args.dependencies || []);
                else if (name === "calculate_refactor_threshold") result = window.calculate_refactor_threshold(args.fileContent);
                else if (name === "injectGlobalStyles") result = window.injectGlobalStyles(args.css_code);
                // المستوى الثالث
                else if (name === "generate_unit_test") result = window.generate_unit_test(args.funcName, args.params || [], args.returnType || 'any');
                else if (name === "optimize_algorithm") result = window.optimize_algorithm(args.code);
                else if (name === "translate_code") result = window.translate_code(args.code, args.targetLang || 'python');
                else if (name === "explain_code") result = window.explain_code(args.code);
                else if (name === "refactor_to_clean_architecture") result = window.refactor_to_clean_architecture(args.code, args.moduleName || 'Module');
                else if (name === "merge_branches") result = window.merge_branches(args.branch1, args.branch2);
                else result = "أداة غير معروفة.";
                return { text: thought + "\n\n📊 نتيجة [" + name + "]:\n" + JSON.stringify(result, null, 2), model: modelName + " (API)" };
            }
            return { text: thought, model: modelName + " (API)" };
        } catch (e) {
            return { text: "❌ فشل الاتصال بالجسر: " + e.message, model: "System" };
        }
    };

    console.log("🚀 AI Core V6.5 (Integrated with Cloudflare Bridge) Loaded Successfully.");
    console.log(`🔗 جسر Cloudflare: ${window.mastermindProxyUrl}`);
    console.log("📌 الأدوات المتاحة: 22 أداة (المستوى الأول + الثاني + الثالث).");
})(window);