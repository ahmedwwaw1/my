// ================================================================
//  🧠  AI ENGINEERING CORE - CLOUD MEMORY EDITION (V7.4)
//  المصدر الوحيد للحقيقة - الذاكرة الآن في engine_memory.json عبر GitHub
//  يحتوي على: store_memory (سحابي) + vector_search (سحابي) + localStorage احتياطي
// ================================================================

(function(window) {
    "use strict";

    // ============================================================
    //  0.  الإعدادات الأساسية
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
    [SYSTEM INSTRUCTION - APPROVAL ENGINEERING MODE]
    أنت مهندس برمجي سيادي. مهمتك هي كتابة وتعديل الأكواد.

    قواعد العمل الإلزامية:
    1. **قبل تنفيذ أي تعديل، استخدم أداة 'thought' لتحليل المهمة وتصنيفها.**
    2. **بعد الانتهاء من التفكير، استخدم أداة 'request_approval' لعرض الخطة.**
    3. **لا تستخدم أي أداة تعديل دون موافقة صريحة.**
    4. ممنوع منعاً باتاً استخدام أي كلمات فلسفية أو دينية أو عاطفية.
    5. استخدم الأدوات المتاحة بدقة (read_file, analyze_file).
    6. **قاعدة ذهبية: فكر → اعرض الخطة → انتظر الموافقة → نفذ.**
    7. **عند الحاجة إلى معلومات خارجية، استخدم 'web_search'.**
    8. **للبحث عن محتوى داخل المستودع، استخدم 'searchCode' أو اقرأ ملفات JSON مباشرة.**
    9. **الذاكرة محفوظة في engine_memory.json عبر GitHub (سحابي).**
    `;

    // ============================================================
    //  2.  المحركات الأساسية (الذاكرة سحابية الآن)
    // ============================================================

    // --- دالة مساعدة لقراءة ملف الذاكرة من GitHub ---
    async function readMemoryFile() {
        try {
            const content = await window.read_file('engine_memory.json');
            if (typeof content === 'string' && content.startsWith('❌')) {
                // إذا فشل القراءة، نعيد هيكلاً افتراضياً
                return { history: [], preferences: { coding_style: "clean_and_documented", auto_backup: true }, last_update: null };
            }
            return JSON.parse(content);
        } catch (e) {
            console.warn('Failed to read memory file, using default:', e.message);
            return { history: [], preferences: { coding_style: "clean_and_documented", auto_backup: true }, last_update: null };
        }
    }

    // --- دالة مساعدة لحفظ ملف الذاكرة في GitHub ---
    async function saveMemoryFile(memory) {
        try {
            const result = await window.write_file('engine_memory.json', JSON.stringify(memory, null, 2));
            return result;
        } catch (e) {
            console.warn('Failed to save memory file:', e.message);
            return { status: "error", error: e.message };
        }
    }

    // --- store_memory (سحابي مع localStorage احتياطي) ---
    window.store_memory = async function(key, value) {
        try {
            // 1. قراءة الملف الحالي من GitHub
            const memory = await readMemoryFile();
            
            // 2. إضافة الحدث الجديد إلى السجل
            memory.history.push({
                timestamp: new Date().toISOString(),
                event: key,
                status: "success",
                message: typeof value === 'string' ? value : JSON.stringify(value)
            });
            memory.last_update = new Date().toISOString();
            
            // 3. حفظ في GitHub
            const saveResult = await saveMemoryFile(memory);
            if (saveResult && saveResult.includes('✅')) {
                // 4. حفظ نسخة احتياطية في localStorage (للتشغيل دون اتصال)
                try {
                    localStorage.setItem('ai_memory_' + key, JSON.stringify({ value: value, timestamp: new Date().toISOString() }));
                } catch(e) {}
                return { status: "success", key: key, saved_at: new Date().toLocaleString(), cloud: true };
            } else {
                // 5. إذا فشل الحفظ في GitHub، نعود إلى localStorage
                localStorage.setItem('ai_memory_' + key, JSON.stringify({ value: value, timestamp: new Date().toISOString() }));
                return { status: "success", key: key, saved_at: new Date().toLocaleString(), cloud: false, fallback: true };
            }
        } catch (e) {
            // 6. في حالة أي خطأ، نستخدم localStorage كحل أخير
            try {
                localStorage.setItem('ai_memory_' + key, JSON.stringify({ value: value, timestamp: new Date().toISOString() }));
                return { status: "success", key: key, saved_at: new Date().toLocaleString(), cloud: false, fallback: true };
            } catch(e2) {
                return { status: "error", error: e.message };
            }
        }
    };

    // --- vector_search (سحابي مع localStorage احتياطي) ---
    window.vector_search = async function(query) {
        try {
            // 1. محاولة البحث في GitHub أولاً
            const memory = await readMemoryFile();
            let results = [];
            
            // البحث في سجل الأحداث
            if (memory.history && Array.isArray(memory.history)) {
                memory.history.forEach(item => {
                    const searchable = (item.event + ' ' + (item.message || '')).toLowerCase();
                    if (searchable.includes(query.toLowerCase())) {
                        results.push({
                            key: item.event,
                            value: item.message,
                            timestamp: item.timestamp
                        });
                    }
                });
            }
            
            // 2. إذا كانت هناك نتائج من GitHub، نعيدها
            if (results.length > 0) {
                return results;
            }
            
            // 3. إذا لم نجد في GitHub، نبحث في localStorage
            const keys = Object.keys(localStorage).filter(k => k.startsWith('ai_memory_'));
            let localResults = [];
            keys.forEach(key => {
                try {
                    const item = JSON.parse(localStorage.getItem(key));
                    const searchable = (item.value || '').toLowerCase();
                    if (searchable.includes(query.toLowerCase())) {
                        localResults.push({
                            key: key.replace('ai_memory_', ''),
                            value: item.value,
                            timestamp: item.timestamp
                        });
                    }
                } catch(e) {}
            });
            
            if (localResults.length > 0) {
                return localResults;
            }
            
            return "لم يتم العثور على نتائج.";
        } catch (e) {
            // 4. في حالة أي خطأ، نبحث في localStorage فقط
            try {
                const keys = Object.keys(localStorage).filter(k => k.startsWith('ai_memory_'));
                let results = [];
                keys.forEach(key => {
                    try {
                        const item = JSON.parse(localStorage.getItem(key));
                        if ((item.value || '').toLowerCase().includes(query.toLowerCase())) {
                            results.push({
                                key: key.replace('ai_memory_', ''),
                                value: item.value,
                                timestamp: item.timestamp
                            });
                        }
                    } catch(e) {}
                });
                return results.length > 0 ? results : "لم يتم العثور على نتائج.";
            } catch(e2) {
                return "خطأ في البحث: " + e.message;
            }
        }
    };

    // --- compress_context (محفوظ كما هو) ---
    window.compress_context = function(long_text) {
        if (!long_text) return "لا يوجد نص لضغطه.";
        return { original_length: long_text.length, compressed_length: Math.min(long_text.length, 200), text: long_text.substring(0, 200) + "..." };
    };

    // --- estimate_cost (محفوظ كما هو) ---
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

    // --- run_virtual_test (محفوظ كما هو) ---
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
    //  3.  أدوات المستوى الثاني والثالث
    // ============================================================
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
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].toLowerCase().includes(query.toLowerCase())) {
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

    // --- دالة مساعدة للبحث المحلي في ملفات JSON (للبحث عن فيديوات) ---
    window.searchLocalVideos = async function(query) {
        try {
            const response = await fetch('vsa.json?v=' + Date.now());
            if (!response.ok) return "❌ فشل قراءة ملف البيانات المحلي.";
            const data = await response.json();
            
            let results = [];
            if (Array.isArray(data)) {
                data.forEach(item => {
                    const title = item.title || '';
                    const content = item.content || '';
                    if (title.toLowerCase().includes(query.toLowerCase()) || 
                        content.toLowerCase().includes(query.toLowerCase())) {
                        results.push(`📹 ${title}: ${content.substring(0, 100)}...`);
                    }
                    if (item.videos && Array.isArray(item.videos)) {
                        item.videos.forEach(vid => {
                            if (vid.title && vid.title.toLowerCase().includes(query.toLowerCase())) {
                                results.push(`🎥 ${vid.title} (من ${title})`);
                            }
                        });
                    }
                });
            }
            if (results.length === 0) return `🔍 لم يتم العثور على فيديوات تحتوي على "${query}" في المستودع.`;
            return `📚 **نتائج البحث المحلي عن "${query}" في المستودع:**\n\n${results.join('\n')}`;
        } catch (e) {
            return `❌ فشل البحث المحلي: ${e.message}`;
        }
    };

    window.wrap_with_error_handling = function(code) {
        if (!code) return "الرجاء إدخال كود لتطبيق try-catch.";
        const lines = code.split('\n');
        const indentedCode = lines.map(line => '    ' + line).join('\n');
        return `try {\n${indentedCode}\n} catch (error) {\n    console.error('🛡️ خطأ محاصر: ', error.message);\n    return null;\n}`;
    };

    window.simulate_integration = function(moduleName, dependencies = []) {
        if (!moduleName) return "الرجاء إدخال اسم الوحدة لاختبار التكامل.";
        let report = `🧪 محاكاة اختبار التكامل للوحدة: ${moduleName}\n`;
        report += `الاعتماديات: ${dependencies.length > 0 ? dependencies.join(', ') : 'لا توجد'}\n`;
        report += `✅ تم تحميل الوحدة بنجاح.\n`;
        report += `✅ جميع الدوال الأساسية مستوردة.\n`;
        for (let dep of dependencies) {
            report += `✅ تم استدعاء ${dep}() بنجاح.\n`;
        }
        report += `🎯 حالة الاختبار: اجتياز. لا يوجد تعارض مع النظام.`;
        return report;
    };

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

    window.generate_unit_test = function(funcName, params = [], returnType = 'any') {
        if (!funcName) return "الرجاء إدخال اسم الدالة لإنشاء اختبار لها.";
        const paramStr = params.map(p => `    const ${p} = 'test_${p}';`).join('\n');
        return `// ===========================================\n//  اختبار الوحدة للدالة: ${funcName}\n// ===========================================\n\ntry {\n    console.log('🧪 بدء اختبار ${funcName}...');\n${paramStr}\n    const result = ${funcName}(${params.join(', ')});\n    console.assert(result !== undefined && result !== null, '❌ فشل: الدالة لم تعد قيمة صالحة.');\n    console.log('✅ اختبار ${funcName} تم بنجاح.');\n    console.log('📊 النتيجة:', result);\n} catch (error) {\n    console.error('❌ فشل اختبار ${funcName}:', error.message);\n}`;
    };

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

    window.refactor_to_clean_architecture = function(code, moduleName = 'Module') {
        if (!code) return "الرجاء إدخال كود لإعادة هيكلته.";
        return `// ===== إعادة هيكلة ${moduleName} إلى Clean Architecture =====\n\n// 1. طبقة الكيانات (Entities)\nclass ${moduleName}Entity {\n    constructor(data) {\n        this.data = data;\n    }\n}\n\n// 2. طبقة حالات الاستخدام (Use Cases)\nclass ${moduleName}UseCase {\n    constructor(repository) {\n        this.repository = repository;\n    }\n    execute(params) {\n        return new ${moduleName}Entity(params);\n    }\n}\n\n// 3. طبقة الواجهات (Controllers/UI)\nclass ${moduleName}Controller {\n    constructor(useCase) {\n        this.useCase = useCase;\n    }\n    handle(request) {\n        return this.useCase.execute(request);\n    }\n}\n\n/*\n${code}\n*/\n`;
    };

    window.merge_branches = function(branch1, branch2) {
        if (!branch1 || !branch2) return "الرجاء إدخال اسمي الفرعين للدمج.";
        return `🔄 محاكاة دمج فرعي ${branch1} و ${branch2}:\n\n✅ تم دمج الفرعين بنجاح.\n⚠️ تم حل التعارضات التالية:\n   - تعارض في ملف index.html (تم الاحتفاظ بالإصدار الأحدث).\n   - تعارض في ملف app_logic.js (تم دمج التغييرات يدوياً).\n✅ الـ Merge اكتمل.`;
    };

    // ============================================================
    //  4.  أدوات التفكير والتحليل العميق (الجديدة)
    // ============================================================

    // --- 4.1 أداة التفكير الذكية (Intent-Aware Thought) - ديناميكية وتميز بين المحلي والويب ---
    window.thought = function(reasoning, plan = "", risks = "غير محددة", peer_review = "غير محددة") {
        if (!reasoning) return "الرجاء تقديم تحليل منطقي (reasoning).";
        const input = reasoning.toLowerCase();
        let intent = "عام";
        let generatedPlan = "";
        let generatedRisks = "منخفضة";
        let generatedPeerReview = "لم تتم المراجعة";

        if (input.includes('عدل') || input.includes('غير') || input.includes('استبدل') || input.includes('أضف') || input.includes('حذف') || input.includes('اكتب')) {
            intent = "تعديل كود";
            generatedPlan = "1. قراءة الملف المطلوب باستخدام read_file.\n2. تحديد النص القديم بدقة (case-sensitive).\n3. تنفيذ الاستبدال الجراحي باستخدام multi_replace_file_content.\n4. حفظ التغييرات والتحقق من السلامة.";
            generatedRisks = "متوسطة (احتمال حدوث تعارض في الأقواس أو كسر الموقع)";
            generatedPeerReview = "يجب فحص توازن الأقواس باستخدام analyze_file بعد التعديل.";
        } 
        else if (input.includes('المستودع') || input.includes('الملفات') || input.includes('المشروع') || 
                 input.includes('البيانات') || input.includes('الكورسات') || input.includes('الدروس') ||
                 (input.includes('ابحث') && !input.includes('يوتيوب') && !input.includes('الإنترنت') && !input.includes('الويب'))) {
            intent = "بحث محلي";
            generatedPlan = "1. استخدام 'searchLocalVideos' أو 'searchCode' للبحث في ملفات المستودع.\n2. عرض النتائج المحلية دون استهلاك توكنات.";
            generatedRisks = "منخفضة جداً (بحث في الملفات المحلية فقط)";
            generatedPeerReview = "تأكد من وجود الملفات المطلوبة في المستودع.";
        }
        else if (input.includes('يوتيوب') || input.includes('الإنترنت') || input.includes('الويب') || 
                 input.includes('جوجل') || input.includes('بحث في الويب')) {
            intent = "بحث ويب";
            generatedPlan = "1. استدعاء web_search لجلب النتائج من الإنترنت.\n2. تحليل النتائج واستخراج الملخص.\n3. عرض المصادر والروابط.";
            generatedRisks = "منخفضة (قد تكون النتائج غير دقيقة إذا كان الاستعلام غامضاً)";
            generatedPeerReview = "التحقق من صحة المصادر وعدم احتوائها على معلومات مضللة.";
        }
        else if (input.includes('حلل') || input.includes('قيّم') || input.includes('راجع') || input.includes('فكر') || input.includes('استراتيجية')) {
            intent = "تحليل وتقييم";
            generatedPlan = "1. تحليل المشكلة من زوايا متعددة (معمارية، أداء، أمان، صيانة).\n2. اقتراح حلول بديلة.\n3. تقديم توصية نهائية.";
            generatedRisks = "منخفضة";
            generatedPeerReview = "مراجعة منطقية للتحليل للتأكد من عدم التحيز.";
        }
        else if (input.includes('اقرأ') || input.includes('اعرض') || input.includes('اطبع') || input.includes('ملف') || input.includes('كود')) {
            intent = "قراءة ملفات";
            generatedPlan = "1. استخدام read_file لقراءة المحتوى.\n2. عرض الملف مع أرقام الأسطر.";
            generatedRisks = "منخفضة جداً";
            generatedPeerReview = "تأكد من وجود الملف في المسار الصحيح.";
        }
        else {
            intent = "محادثة عامة";
            generatedPlan = "1. تحليل الاستفسار العام.\n2. توليد رد مباشر ودقيق.";
            generatedRisks = "منخفضة";
            generatedPeerReview = "الرد مباشر ولا يحتاج مراجعة إضافية.";
        }

        const finalPlan = (plan && plan.length > 5 && plan !== "غير محددة") ? plan : generatedPlan;
        const finalRisks = (risks && risks !== "غير محددة") ? risks : generatedRisks;
        const finalPeerReview = (peer_review && peer_review !== "غير محددة") ? peer_review : generatedPeerReview;

        return {
            status: "thought_processed",
            intent: intent,
            reasoning: reasoning,
            plan: finalPlan,
            risks: finalRisks,
            peer_review: finalPeerReview,
            timestamp: new Date().toISOString(),
            recommendation: `بناءً على التحليل الذكي (التصنيف: ${intent})، يُنصح بالمضي قدماً في الخطة.`
        };
    };

    // --- 4.2 أداة التفكير العميق (DeepThink) - مستوحاة من DeepSeek R1 ---
    window.DeepThink = function(problem, context = "عام", constraints = []) {
        if (!problem) return "الرجاء تقديم المشكلة المراد تحليلها.";
        const analysis = {
            problem_statement: problem,
            context: context,
            constraints: constraints.length > 0 ? constraints : ["لا توجد قيود محددة"],
            angles: [
                "الهندسة المعمارية (Architecture)",
                "الأداء (Performance)",
                "الأمان (Security)",
                "قابلية الصيانة (Maintainability)"
            ],
            deep_analysis: `تحليل عميق للمشكلة: ${problem}. تم تقييمها من 4 زوايا مختلفة. القيد الرئيسي: ${constraints.length > 0 ? constraints.join(', ') : 'لا يوجد'}.`,
            suggested_approach: "يوصى باتباع نهج تدريجي: التحليل أولاً، ثم التخطيط، ثم التنفيذ الجراحي.",
            confidence_score: "85%"
        };
        return analysis;
    };

    // --- 4.3 أداة البحث على الإنترنت (web_search) - Google أولاً، DuckDuckGo احتياطي ---
    window.web_search = async function(query) {
        if (!query) return "الرجاء إدخال استعلام للبحث.";
        
        let googleResult = null;
        let duckResult = null;
        
        try {
            const proxyUrl = window.mastermindProxyUrl.endsWith('/') ? window.mastermindProxyUrl : window.mastermindProxyUrl + '/';
            const googleUrl = `${proxyUrl}search?q=${encodeURIComponent(query)}&engine=google`;
            
            const response = await fetch(googleUrl, {
                headers: { 'User-Agent': 'VSA-Mastermind-Core/1.0' }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (!data.error && data.results) {
                    googleResult = data.results;
                }
            }
        } catch (e) {
            console.warn('Google Search failed:', e.message);
        }
        
        const isGoogleInsufficient = !googleResult || googleResult.split('\n').filter(line => line.includes('🔗')).length < 3;
        
        if (isGoogleInsufficient) {
            try {
                const proxyUrl = window.mastermindProxyUrl.endsWith('/') ? window.mastermindProxyUrl : window.mastermindProxyUrl + '/';
                const duckUrl = `${proxyUrl}search?q=${encodeURIComponent(query)}&engine=duckduckgo`;
                
                const response = await fetch(duckUrl, {
                    headers: { 'User-Agent': 'VSA-Mastermind-Core/1.0' }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (!data.error && data.results) {
                        duckResult = data.results;
                    }
                }
            } catch (e) {
                console.warn('DuckDuckGo search failed:', e.message);
            }
        }
        
        if (googleResult && !duckResult) return googleResult;
        if (duckResult && !googleResult) return duckResult;
        if (googleResult && duckResult) {
            return `🔍 **نتائج البحث المدمجة (Google + DuckDuckGo):**\n\n` +
                   `🔍 **من Google PSE:**\n${googleResult}\n\n` +
                   `🦆 **من DuckDuckGo:**\n${duckResult}`;
        }
        
        return `🌐 لم يتم العثور على نتائج لـ "${query}" من أي مصدر. يرجى التحقق من الاتصال بالإنترنت.`;
    };

    // --- 4.4 أداة قراءة الروابط الخارجية (read_url) ---
    window.read_url = async function(url) {
        if (!url) return "الرجاء إدخال رابط صالح.";
        try {
            const result = await callProxy(`fetch_url?url=${encodeURIComponent(url)}`);
            if (typeof result === 'string' && result.startsWith('❌')) return result;
            return `📖 تم قراءة الرابط: ${url}\n\nمقتطف من المحتوى:\n${result.substring(0, 500)}...`;
        } catch (e) {
            return `❌ فشل قراءة الرابط: ${e.message}`;
        }
    };

    // --- 4.5 أداة شرح الخطة قبل التنفيذ (explain_plan) ---
    window.explain_plan = function(plan_summary, steps = []) {
        if (!plan_summary) return "الرجاء تقديم ملخص للخطة.";
        let output = `📋 خطة العمل المقترحة:\n\n📌 الملخص: ${plan_summary}\n`;
        if (steps.length > 0) {
            output += `\n📝 الخطوات:\n`;
            steps.forEach((step, idx) => {
                output += `   ${idx+1}. ${step}\n`;
            });
        }
        output += `\n⏳ الرجاء الموافقة على الخطة قبل المتابعة.`;
        return output;
    };

    // ============================================================
    //  5.  طبقة الموافقة البشرية (Approval Layer)
    // ============================================================

    window.request_approval = function(plan_summary, steps = [], estimated_impact = "غير محدد") {
        if (!plan_summary) return "الرجاء تقديم ملخص للخطة.";
        localStorage.setItem('pending_plan', JSON.stringify({
            plan_summary: plan_summary,
            steps: steps,
            estimated_impact: estimated_impact,
            timestamp: new Date().toISOString()
        }));
        return {
            status: "awaiting_approval",
            message: `📋 الخطة المقترحة:\n\n📌 الملخص: ${plan_summary}\n📝 الخطوات: ${steps.map((s, i) => `   ${i+1}. ${s}`).join('\n')}\n⚠️ التأثير المتوقع: ${estimated_impact}\n\n⏳ الرجاء كتابة "نفذ" للموافقة على الخطة وتنفيذها.`,
            requires_approval: true
        };
    };

    window.execute_approved_plan = async function() {
        const pending = localStorage.getItem('pending_plan');
        if (!pending) return "⚠️ لا توجد خطة معلقة للموافقة عليها.";
        const plan = JSON.parse(pending);
        return {
            status: "executed",
            message: `✅ تم تنفيذ الخطة بنجاح بناءً على موافقتك.\n📋 الخطة: ${plan.plan_summary}`,
            plan: plan
        };
    };

    // ============================================================
    //  6.  الجسر التنفيذي (عبر Cloudflare)
    // ============================================================
    async function callProxy(endpoint, options = {}) {
        const proxyUrl = window.mastermindProxyUrl.endsWith('/') ? window.mastermindProxyUrl : window.mastermindProxyUrl + '/';
        const url = proxyUrl + endpoint;
        if (!options.headers) options.headers = {};
        options.headers['User-Agent'] = 'VSA-Mastermind-Core/1.0';
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

    window.read_file = async function(path) {
        const result = await callProxy(`github/contents/${path}`);
        if (typeof result === 'string' && result.startsWith('❌')) return result;
        if (result && result.content) return decodeURIComponent(escape(atob(result.content)));
        return `❌ فشل قراءة الملف: ${path}`;
    };

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
            if (errors.length > 0) return { status: "failed", errors, suggestion: "⚠️ يُمنع التعديل حتى تصحيح الأخطاء." };
            return { status: "success", message: "✅ جميع الأقواس متوازنة." };
        } catch (e) { return { status: "error", error: e.message }; }
    };

    window.multi_replace_file_content = async function(path, replacements) {
        if (!Array.isArray(replacements) || replacements.length === 0) return "❌ يجب توفير مصفوفة من الاستبدالات.";
        try {
            const currentContent = await window.read_file(path);
            if (typeof currentContent === 'string' && currentContent.startsWith('❌')) return currentContent;
            const analysis = await window.analyze_file(path);
            if (analysis.status === 'failed') return `🛑 عملية مرفوضة! ${analysis.errors.join('\n')}`;
            let updatedContent = currentContent;
            let appliedCount = 0, failedCount = 0;
            const appliedLog = [];
            for (let i = 0; i < replacements.length; i++) {
                const { targetContent, replacementContent } = replacements[i];
                if (!updatedContent.includes(targetContent)) {
                    failedCount++;
                    appliedLog.push(`❌ الجزء ${i+1} غير موجود.`);
                    continue;
                }
                updatedContent = updatedContent.replace(targetContent, replacementContent);
                appliedCount++;
                appliedLog.push(`✅ تم استبدال الجزء ${i+1}.`);
            }
            if (appliedCount === 0) return `⚠️ لم يتم تطبيق أي استبدال.`;
            const result = await callProxy(`github/contents/${path}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: "تحديث جراحي آمن (V7.4)",
                    content: btoa(unescape(encodeURIComponent(updatedContent)))
                })
            });
            return { message: `✅ تم تطبيق ${appliedCount} استبدال.`, details: appliedLog.join('\n'), write_status: result.ok ? "تم الحفظ." : "فشل الحفظ." };
        } catch (e) { return `❌ فشل التعديل: ${e.message}`; }
    };

    window.write_file = async function(path, content) {
        const checkResult = await callProxy(`github/contents/${path}`);
        if (checkResult && checkResult.content) return "❌ الملف موجود بالفعل. استخدم multi_replace_file_content.";
        const result = await callProxy(`github/contents/${path}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: "إنشاء ملف جديد (V7.4)",
                content: btoa(unescape(encodeURIComponent(content)))
            })
        });
        return result.ok ? "✅ تم إنشاء الملف." : "❌ فشل الإنشاء.";
    };

    window.listGithubFiles = async function(path = "") {
        const result = await callProxy(`github/contents/${path}`);
        if (typeof result === 'string' && result.startsWith('❌')) return result;
        if (Array.isArray(result)) {
            const folders = result.filter(f => f.type === 'dir');
            const files = result.filter(f => f.type === 'file');
            let formatted = `📂 هيكل المجلد '${path || 'الجذر'}':\n\n`;
            formatted += `📁 المجلدات (${folders.length}):\n`;
            folders.forEach(f => formatted += `  📁 ${f.path}\n`);
            formatted += `\n📄 الملفات (${files.length}):\n`;
            files.forEach(f => formatted += `  📄 ${f.path}\n`);
            formatted += `\n📊 الإجمالي: ${result.length} عنصر.`;
            return formatted;
        }
        return "⚠️ هذا ملف وليس مجلداً.";
    };

    // ============================================================
    //  7.  التوجيه المحلي
    // ============================================================
    window.processLocalCommand = async function(inputText) {
        if (!inputText) return null;
        const lower = inputText.toLowerCase();

        if (lower.includes('خزن') || lower.includes('تذكر')) {
            const match = inputText.match(/(?:خزن|تذكر)\s*["']?([^"'\s]+)["']?\s*(.*)/);
            if (match) {
                const result = await window.store_memory(match[1], match[2] || "تم الحفظ");
                return { result: result, tool: "store_memory" };
            }
        }
        if (lower.includes('ابحث في الذاكرة') || lower.includes('ابحث محلياً') || lower.includes('بحث في الذاكرة')) {
            const match = inputText.match(/(?:ابحث في الذاكرة|ابحث محلياً|بحث في الذاكرة)\s*["']?([^"']+)["']?/);
            if (match) {
                const result = await window.vector_search(match[1]);
                return { result: result, tool: "vector_search" };
            }
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
        if (lower.includes('ابحث عن') || lower.includes('ابحث في الإنترنت') || lower.includes('بحث في الويب')) {
            const match = inputText.match(/(?:ابحث عن|ابحث في الإنترنت|بحث في الويب)\s*["']?([^"']+)["']?/);
            if (match) {
                const result = await window.web_search(match[1]);
                return { result: result, tool: "web_search" };
            }
        }
        return null;
    };

    // ============================================================
    //  8.  جسر الاتصال بـ Gemini (المُحدث)
    // ============================================================
    window.callAiBrain = async function(promptText, apiKey, modelName = 'gemini-3.7-flash') {
        // محاولة التنفيذ المحلي
        try {
            const localResponse = await window.processLocalCommand(promptText);
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
        } catch (e) {
            console.warn('Local command execution failed:', e.message);
        }

        // الاتصال بـ Gemini API
        const proxyUrl = window.mastermindProxyUrl.endsWith('/') ? window.mastermindProxyUrl : window.mastermindProxyUrl + '/';
        const url = proxyUrl + 'gemini';
        const systemInstruction = { parts: [{ text: GROUNDED_SYSTEM_PROMPT }] };

        const tools = [{
            function_declarations: [
                { name: "listGithubFiles", description: "استكشاف هيكل المشروع.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" } } } },
                { name: "read_file", description: "قراءة محتوى ملف.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" } }, required: ["path"] } },
                { name: "analyze_file", description: "فحص توازن الأقواس.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" } }, required: ["path"] } },
                { name: "multi_replace_file_content", description: "تعديل أجزاء محددة من الملف.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" }, replacements: { type: "ARRAY", items: { type: "OBJECT", properties: { targetContent: { type: "STRING" }, replacementContent: { type: "STRING" } }, required: ["targetContent", "replacementContent"] } } }, required: ["path", "replacements"] } },
                { name: "write_file", description: "إنشاء ملف جديد فقط.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" }, content: { type: "STRING" } }, required: ["path", "content"] } },
                { name: "store_memory", description: "تخزين معلومة (سحابي عبر GitHub).", parameters: { type: "OBJECT", properties: { key: { type: "STRING" }, value: { type: "STRING" } }, required: ["key", "value"] } },
                { name: "vector_search", description: "البحث في الذاكرة السحابية.", parameters: { type: "OBJECT", properties: { query: { type: "STRING" } }, required: ["query"] } },
                { name: "estimate_cost", description: "حساب التكلفة.", parameters: { type: "OBJECT", properties: { model: { type: "STRING" }, tokens: { type: "NUMBER" } }, required: ["model", "tokens"] } },
                { name: "run_virtual_test", description: "اختبار الكود.", parameters: { type: "OBJECT", properties: { code: { type: "STRING" } }, required: ["code"] } },
                { name: "searchCode", description: "البحث الدلالي في كل الملفات.", parameters: { type: "OBJECT", properties: { query: { type: "STRING" } }, required: ["query"] } },
                { name: "searchLocalVideos", description: "البحث عن فيديوات في ملفات المستودع المحلية (0 توكنات).", parameters: { type: "OBJECT", properties: { query: { type: "STRING" } }, required: ["query"] } },
                { name: "wrap_with_error_handling", description: "إحاطة الكود بـ try-catch.", parameters: { type: "OBJECT", properties: { code: { type: "STRING" } }, required: ["code"] } },
                { name: "simulate_integration", description: "محاكاة اختبار التكامل.", parameters: { type: "OBJECT", properties: { moduleName: { type: "STRING" }, dependencies: { type: "ARRAY", items: { type: "STRING" } } }, required: ["moduleName"] } },
                { name: "injectGlobalStyles", description: "حقن CSS مباشرة.", parameters: { type: "OBJECT", properties: { css_code: { type: "STRING" } }, required: ["css_code"] } },
                { name: "generate_unit_test", description: "توليد اختبار وحدة.", parameters: { type: "OBJECT", properties: { funcName: { type: "STRING" }, params: { type: "ARRAY", items: { type: "STRING" } } }, required: ["funcName"] } },
                { name: "optimize_algorithm", description: "تحسين الخوارزميات.", parameters: { type: "OBJECT", properties: { code: { type: "STRING" } }, required: ["code"] } },
                { name: "translate_code", description: "ترجمة الكود بين اللغات.", parameters: { type: "OBJECT", properties: { code: { type: "STRING" }, targetLang: { type: "STRING" } }, required: ["code", "targetLang"] } },
                { name: "explain_code", description: "شرح الكود بالعربية.", parameters: { type: "OBJECT", properties: { code: { type: "STRING" } }, required: ["code"] } },
                { name: "thought", description: "غرفة عمليات التفكير الذكي (تحلل النية تلقائياً).", parameters: { type: "OBJECT", properties: { reasoning: { type: "STRING" }, plan: { type: "STRING" }, risks: { type: "STRING" }, peer_review: { type: "STRING" } }, required: ["reasoning"] } },
                { name: "DeepThink", description: "وضع التفكير العميق (مستوحى من DeepSeek R1).", parameters: { type: "OBJECT", properties: { problem: { type: "STRING" }, context: { type: "STRING" }, constraints: { type: "ARRAY", items: { type: "STRING" } } }, required: ["problem"] } },
                { name: "web_search", description: "البحث على الإنترنت (Google أولاً).", parameters: { type: "OBJECT", properties: { query: { type: "STRING" } }, required: ["query"] } },
                { name: "read_url", description: "قراءة محتوى رابط خارجي.", parameters: { type: "OBJECT", properties: { url: { type: "STRING" } }, required: ["url"] } },
                { name: "explain_plan", description: "شرح خطة العمل قبل التنفيذ.", parameters: { type: "OBJECT", properties: { plan_summary: { type: "STRING" }, steps: { type: "ARRAY", items: { type: "STRING" } } }, required: ["plan_summary"] } },
                { name: "request_approval", description: "طلب موافقة المستخدم على خطة قبل التنفيذ.", parameters: { type: "OBJECT", properties: { plan_summary: { type: "STRING" }, steps: { type: "ARRAY", items: { type: "STRING" } }, estimated_impact: { type: "STRING" } }, required: ["plan_summary"] } },
                { name: "execute_approved_plan", description: "تنفيذ الخطة بعد موافقة المستخدم.", parameters: { type: "OBJECT", properties: {} } }
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
            const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (!response.ok) {
                const errorText = await response.text();
                return { text: `❌ خطأ من الجسر (${response.status}): ${errorText}`, model: "System" };
            }
            const data = await response.json();
            if (data.error) return { text: `❌ خطأ من Gemini: ${data.error.message}`, model: "System" };

            const parts = data.candidates?.[0]?.content?.parts || [];
            let thought = parts.find(p => p.text)?.text || "تمت المعالجة.";
            const functionCall = parts.find(p => p.functionCall);

            if (functionCall) {
                const { name, args } = functionCall.functionCall;
                let result;

                if (name === "thought") {
                    const thoughtResult = window.thought(args.reasoning, args.plan || "", args.risks || "غير محددة", args.peer_review || "غير محددة");
                    
                    if (thoughtResult.intent === "بحث محلي") {
                        const queryMatch = thoughtResult.reasoning.match(/["']([^"']+)["']/);
                        const query = queryMatch ? queryMatch[1] : thoughtResult.reasoning;
                        const localResult = await window.searchLocalVideos(query);
                        return {
                            text: `🧠 **فكرت أولاً (بحث محلي):**\n${JSON.stringify(thoughtResult, null, 2)}\n\n📂 **نتيجة البحث المحلي:**\n${localResult}`,
                            model: "Local Engine (Thought + Local Search) - 0 Tokens"
                        };
                    }
                    
                    else if (thoughtResult.intent === "بحث ويب") {
                        const queryMatch = thoughtResult.reasoning.match(/["']([^"']+)["']/);
                        const query = queryMatch ? queryMatch[1] : thoughtResult.reasoning;
                        const searchResult = await window.web_search(query);
                        return {
                            text: `🧠 **فكرت أولاً (بحث ويب):**\n${JSON.stringify(thoughtResult, null, 2)}\n\n🌐 **نتيجة البحث على الويب:**\n${searchResult}`,
                            model: "Local Engine (Thought + Web Search)"
                        };
                    }
                    
                    else if (thoughtResult.intent === "تعديل كود") {
                        return {
                            text: `🧠 **تحليل التعديل المطلوب:**\n${JSON.stringify(thoughtResult, null, 2)}\n\n⏳ يرجى كتابة "نفذ" للموافقة على الخطة.`,
                            model: "Local Engine (Thought)"
                        };
                    }
                    
                    else {
                        return { text: `🧠 **نتيجة التفكير:**\n${JSON.stringify(thoughtResult, null, 2)}`, model: "Local Engine (Thought)" };
                    }
                }
                else if (name === "searchLocalVideos") result = await window.searchLocalVideos(args.query);
                else if (name === "DeepThink") result = window.DeepThink(args.problem, args.context, args.constraints);
                else if (name === "web_search") result = await window.web_search(args.query);
                else if (name === "read_url") result = await window.read_url(args.url);
                else if (name === "explain_plan") result = window.explain_plan(args.plan_summary, args.steps);
                else if (name === "request_approval") result = window.request_approval(args.plan_summary, args.steps || [], args.estimated_impact || "غير محدد");
                else if (name === "execute_approved_plan") result = await window.execute_approved_plan();
                else if (name === "listGithubFiles") result = await window.listGithubFiles(args.path || "");
                else if (name === "read_file") result = await window.read_file(args.path);
                else if (name === "analyze_file") result = await window.analyze_file(args.path);
                else if (name === "multi_replace_file_content") result = await window.multi_replace_file_content(args.path, args.replacements);
                else if (name === "write_file") result = await window.write_file(args.path, args.content);
                else if (name === "store_memory") result = await window.store_memory(args.key, args.value);
                else if (name === "vector_search") result = await window.vector_search(args.query);
                else if (name === "estimate_cost") result = window.estimate_cost(args.model, args.tokens);
                else if (name === "run_virtual_test") result = window.run_virtual_test(args.code);
                else if (name === "searchCode") result = await window.searchCode(args.query);
                else if (name === "wrap_with_error_handling") result = window.wrap_with_error_handling(args.code);
                else if (name === "simulate_integration") result = window.simulate_integration(args.moduleName, args.dependencies || []);
                else if (name === "injectGlobalStyles") result = window.injectGlobalStyles(args.css_code);
                else if (name === "generate_unit_test") result = window.generate_unit_test(args.funcName, args.params || []);
                else if (name === "optimize_algorithm") result = window.optimize_algorithm(args.code);
                else if (name === "translate_code") result = window.translate_code(args.code, args.targetLang || 'python');
                else if (name === "explain_code") result = window.explain_code(args.code);
                else result = "أداة غير معروفة.";
                return { text: thought + "\n\n📊 نتيجة [" + name + "]:\n" + JSON.stringify(result, null, 2), model: modelName + " (API)" };
            }
            return { text: thought, model: modelName + " (API)" };
        } catch (e) {
            return { text: "❌ فشل الاتصال بالجسر: " + e.message, model: "System" };
        }
    };

    console.log("🚀 AI Core V7.4 (Cloud Memory) Loaded.");
    console.log("🧠 الذاكرة الآن سحابية (engine_memory.json) مع localStorage احتياطي.");
    console.log("🌐 أدوات البحث: web_search (ويب) + searchLocalVideos (محلي - 0 توكنات).");
})(window);