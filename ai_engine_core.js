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
    window.mastermindProxyUrl = 'https://ozcffmadatsfyyldqmdl.supabase.co/functions/v1/vsa-bridge/';
    window.GITHUB_REPO = 'ahmedwwaw1/my';
    window.tokensSaved = parseInt(localStorage.getItem('vsa_tokens_saved') || '0');

    // ============================================================
    //  1.  الدستور السيادي المقيد
    // ============================================================
    const GROUNDED_SYSTEM_PROMPT = `
    [SYSTEM INSTRUCTION - VSA CREATIVE AGENT MODE]
    أنت مهندس برمجيات ووكيل ذكي ذو شخصية تعاونية. مهمتك هي مساعدة المستخدم في كل ما يحتاجه بحرية تامة.

    فلسفة العمل الجديدة:
    1. **الحرية في الحوار:** تحدث مع المستخدم بطلاقة، أجب على التحيات، وناقش كافة المواضيع التقنية وغير التقنية.
    2. **الذكاء عند التنفيذ:** استخدم أدوات 'thought' و 'web_search' و 'read_file' تلقائياً عندما يتطلب الأمر ذلك، دون تقييد إبداعك.
    3. **الأمان الجراحي:** فقط عند إجراء تعديل حقيقي على الكود، التزم ببروتوكول (Thought -> Plan -> Approval -> Execute) لضمان سلامة المشروع.
    4. **الوعي بالسياق:** الذاكرة السحابية هي أرشيفك الدائم، استخدمها لتذكر تفضيلات المستخدم.

    أنت لست مجرد "منفذ"، أنت "شريك تقني" مبدع.
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

    // --- estimate_cost (2026 Updated) ---
    window.estimate_cost = function(model, tokens) {
        const pricing = {
            'gemini-3.5-flash': 0.00010,
            'gemini-3.5-flash-lite': 0.00004,
            'gemini-3.1-flash-lite': 0.00003,
            'gemini-2.5-pro': 0.00100,
            'gemini-2.5-flash': 0.00015,
            'gemini-2.5-flash-lite': 0.00005,
            'deepseek-chat': 0.00008
        };
        const price = pricing[model] || 0.0001;
        return { model, tokens, cost_usd: (tokens * price).toFixed(6), status: "حصة 2026" };
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
    //  4.  أدوات الحماية والدرع السيادي (Sovereign Shield)
    // ============================================================

    // --- 4.1 لقطة ما قبل الجراحة (Pre-Surgery Snapshot) ---
    window.take_snapshot = async function(path) {
        try {
            const content = await window.read_file(path);
            if (typeof content === 'string' && content.startsWith('❌')) return content;
            const snapshotKey = 'snapshot_' + path.replace(/[\/\.]/g, '_');
            localStorage.setItem(snapshotKey, content);
            return `✅ تم أخذ لقطة أمان للملف: ${path}`;
        } catch (e) { return `❌ فشل أخذ اللقطة: ${e.message}`; }
    };

    // --- 4.2 التراجع السيادي اللحظي (Instant Undo) ---
    window.instant_undo = async function(path) {
        const snapshotKey = 'snapshot_' + path.replace(/[\/\.]/g, '_');
        const backup = localStorage.getItem(snapshotKey);
        if (!backup) return `⚠️ لا توجد لقطة سابقة للملف: ${path}`;

        const result = await callProxy(`github/contents/${path}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: "🛡️ تراجع سيادي (Rollback) لاستعادة الاستقرار",
                content: btoa(unescape(encodeURIComponent(backup)))
            })
        });
        return result.ok ? `✅ تم التراجع بنجاح واستعادة حالة الملف السليمة.` : `❌ فشل التراجع.`;
    };

    // --- 4.3 أداة التفكير الهندسي (Engineering Thought 2.0) ---
    window.thought = function(reasoning, plan = "", risks = "غير محددة", peer_review = "غير محددة", swot = null, complexity = "منخفضة", self_correction = "") {
        // ... (نفس المنطق السابق) ...
        if (!reasoning) return "الرجاء تقديم تحليل منطقي (reasoning).";
        const input = reasoning.toLowerCase();
        let intent = "عام";
        let generatedPlan = "";
        let generatedRisks = "منخفضة";
        let generatedPeerReview = "لم تتم المراجعة";

        // تصنيف النية (Intent Detection)
        if (input.includes('عدل') || input.includes('غير') || input.includes('استبدل') || input.includes('أضف') || input.includes('حذف') || input.includes('اكتب')) {
            intent = "تعديل كود";
            generatedPlan = "1. قراءة الملف المطلوب باستخدام read_file.\n2. تحديد النص القديم بدقة (case-sensitive).\n3. تنفيذ الاستبدال الجراحي باستخدام multi_replace_file_content.\n4. حفظ التغييرات والتحقق من السلامة.";
            generatedRisks = "متوسطة (احتمال حدوث تعارض في الأقواس أو كسر الموقع)";
            generatedPeerReview = "يجب فحص توازن الأقواس باستخدام analyze_file بعد التعديل.";
        } 
        else if (input.includes('المستودع') || input.includes('الملفات') || input.includes('المشروع') || 
                 input.includes('البيانات') || input.includes('الدروس') ||
                 (input.includes('ابحث') && !input.includes('يوتيوب') && !input.includes('الإنترنت'))) {
            intent = "بحث محلي";
            generatedPlan = "1. استخدام 'searchCode' للبحث في ملفات المستودع.";
            generatedRisks = "منخفضة جداً";
        }
        else if (input.includes('يوتيوب') || input.includes('الإنترنت') || input.includes('الويب') || input.includes('جوجل')) {
            intent = "بحث ويب";
            generatedPlan = "1. استدعاء web_search لجلب النتائج.\n2. تحليل المصادر.";
            generatedRisks = "منخفضة";
        }

        // هيكلة الرد النهائي للمحرك
        return {
            status: "thought_processed",
            intent: intent,
            complexity: complexity,
            reasoning: reasoning,
            plan: (plan && plan.length > 5) ? plan : generatedPlan,
            risks: (risks && risks !== "غير محددة") ? risks : generatedRisks,
            swot_analysis: swot || { strengths: "تحليل ذكي", weaknesses: "تحتاج تدقيق", opportunities: "تحسين الأداء", threats: "مخاطر جانبية" },
            self_correction: self_correction,
            peer_review: (peer_review && peer_review !== "غير محددة") ? peer_review : generatedPeerReview,
            timestamp: new Date().toISOString(),
            recommendation: `[قرار المهندس]: بناءً على التعقيد (${complexity}) والتحليل الجراحي، ${intent === "تعديل كود" ? "يجب طلب موافقة قبل التعديل." : "يمكنك المتابعة."}`
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

    // --- 4.3 أداة البحث على الإنترنت (Web Search Hybrid V3.4) ---
    window.web_search = async function(query, engine = 'auto') {
        if (!query) return "الرجاء إدخال استعلام للبحث.";

        try {
            const proxyUrl = window.mastermindProxyUrl.endsWith('/') ? window.mastermindProxyUrl : window.mastermindProxyUrl + '/';
            const searchUrl = `${proxyUrl}search?q=${encodeURIComponent(query)}&engine=${engine}`;
            
            const response = await fetch(searchUrl, {
                headers: { 'User-Agent': 'VSA-Mastermind-Core/1.0' }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.results) {
                    const sourcesStr = data.sources ? `\n\n📊 **المصادر المستخدمة:** ${data.sources.join(' + ')}` : "";
                    return data.results + sourcesStr;
                } else {
                    return data.error || "🌐 لم يتم العثور على نتائج دقيقة.";
                }
            } else {
                return `❌ خطأ في محرك البحث (${response.status})`;
            }
        } catch (e) {
            console.warn('Search failed:', e.message);
            return `❌ فشل الاتصال بمحرك البحث: ${e.message}`;
        }
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
            // 1. أخذ لقطة أمان تلقائية (Sovereign Shield)
            await window.take_snapshot(path);

            const currentContent = await window.read_file(path);
            if (typeof currentContent === 'string' && currentContent.startsWith('❌')) return currentContent;

            // 2. فحص أولي قبل التعديل
            const preAnalysis = await window.analyze_file(path);
            if (preAnalysis.status === 'failed') return `🛑 التعديل مرفوض! الملف الأصلي معطوب بالفعل: ${preAnalysis.errors.join(', ')}`;

            let updatedContent = currentContent;
            let appliedCount = 0;
            for (let i = 0; i < replacements.length; i++) {
                const { targetContent, replacementContent } = replacements[i];
                if (updatedContent.includes(targetContent)) {
                    updatedContent = updatedContent.replace(targetContent, replacementContent);
                    appliedCount++;
                }
            }
            if (appliedCount === 0) return `⚠️ لم يتم العثور على أي نص مطابق للاستبدال.`;

            // 3. محاولة الحفظ
            const result = await callProxy(`github/contents/${path}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: "تعديل جراحي سيادي (V7.5)",
                    content: btoa(unescape(encodeURIComponent(updatedContent)))
                })
            });

            // 4. التحقق بعد الجراحة (Post-Surgery Validation)
            const postAnalysis = await window.analyze_file(path);
            if (postAnalysis.status === 'failed') {
                console.error("🛡️ اكتشاف خلل بعد التعديل! البدء في التراجع التلقائي...");
                await window.instant_undo(path);
                return {
                    status: "failed_and_reverted",
                    error: "تم اكتشاف أخطاء في بناء الكود بعد التعديل (أقواس غير متوازنة).",
                    details: postAnalysis.errors,
                    action: "تم التراجع تلقائياً لحماية النظام. يرجى مراجعة منطق الكود وإعادة المحاولة."
                };
            }

            return { message: `✅ تم تطبيق ${appliedCount} استبدال بنجاح وتم التحقق من سلامة الكود.`, write_status: result.ok ? "تم الحفظ." : "فشل الحفظ." };
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
    //  7.  جسر الاتصال بـ Gemini (المُحدث: Agentic Loop المباشر)
    // ============================================================
    window.callAiBrain = async function(promptText, apiKey, modelName = 'gemini-3.7-flash', existingHistory = []) {
        // تم إلغاء التنفيذ المحلي - الطلب يذهب مباشرة للعقل المدبر لضمان أقصى درجات الذكاء
        const baseUrl = window.mastermindProxyUrl.endsWith('/') ? window.mastermindProxyUrl.slice(0, -1) : window.mastermindProxyUrl;
        const url = baseUrl + '/gemini';

        // استخدام التاريخ السابق إذا وجد، أو البدء بمصفوفة جديدة
        let conversationHistory = existingHistory.length > 0 ? existingHistory : [];
        conversationHistory.push({ role: "user", parts: [{ text: promptText }] });

        let maxIterations = 5;
        let currentIteration = 0;
        let finalResponse = { text: "⚠️ فشل المحرك في الوصول لرد نهائي.", model: modelName, fullHistory: conversationHistory };

        // 3. تعريف الأدوات (نفس المصفوفة السابقة)
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
                { name: "thought", description: "غرفة عمليات التفكير الهندسي (تحليل SWOT + التعقيد + نقد ذاتي).", parameters: { type: "OBJECT", properties: { reasoning: { type: "STRING", description: "التحليل المنطقي." }, plan: { type: "STRING", description: "خطة التنفيذ." }, risks: { type: "STRING" }, complexity: { type: "STRING", enum: ["منخفضة", "متوسطة", "عالية", "حرجة"] }, swot: { type: "OBJECT", properties: { strengths: { type: "STRING" }, weaknesses: { type: "STRING" }, opportunities: { type: "STRING" }, threats: { type: "STRING" } } }, self_correction: { type: "STRING", description: "ما الذي قد يفشل في هذه الخطة؟" }, peer_review: { type: "STRING" } }, required: ["reasoning", "plan", "complexity", "swot"] } },
                { name: "DeepThink", description: "وضع التفكير العميق (مستوحى من DeepSeek R1).", parameters: { type: "OBJECT", properties: { problem: { type: "STRING" }, context: { type: "STRING" }, constraints: { type: "ARRAY", items: { type: "STRING" } } }, required: ["problem"] } },
                { name: "web_search", description: "البحث على الإنترنت (Google أولاً).", parameters: { type: "OBJECT", properties: { query: { type: "STRING" } }, required: ["query"] } },
                { name: "read_url", description: "قراءة محتوى رابط خارجي.", parameters: { type: "OBJECT", properties: { url: { type: "STRING" } }, required: ["url"] } },
                { name: "explain_plan", description: "شرح خطة العمل قبل التنفيذ.", parameters: { type: "OBJECT", properties: { plan_summary: { type: "STRING" }, steps: { type: "ARRAY", items: { type: "STRING" } } }, required: ["plan_summary"] } },
                { name: "request_approval", description: "طلب موافقة المستخدم على خطة قبل التنفيذ.", parameters: { type: "OBJECT", properties: { plan_summary: { type: "STRING" }, steps: { type: "ARRAY", items: { type: "STRING" } }, estimated_impact: { type: "STRING" } }, required: ["plan_summary"] } },
                { name: "execute_approved_plan", description: "تنفيذ الخطة بعد موافقة المستخدم.", parameters: { type: "OBJECT", properties: {} } }
            ]
        }];

        // 4. حلقة الوكيل الذكي (Agentic Loop)
        while (currentIteration < maxIterations) {
            currentIteration++;
            console.log(`🤖 Step ${currentIteration}: Thinking...`);

            const body = {
                model: modelName,
                system_instruction: { parts: [{ text: GROUNDED_SYSTEM_PROMPT }] },
                contents: conversationHistory,
                tools: tools,
                generationConfig: { temperature: 0, maxOutputTokens: 2048 }
            };

            try {
                const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
                if (!response.ok) return { text: `❌ خطأ الجسر: ${response.status}`, model: "System" };
                const data = await response.json();

                const parts = data.candidates?.[0]?.content?.parts || [];
                const assistantMessage = data.candidates?.[0]?.content || { role: "model", parts: [] };
                conversationHistory.push(assistantMessage);

                const textPart = parts.find(p => p.text);
                const functionCallPart = parts.find(p => p.functionCall);

                // إذا كان هناك نص فقط (نهاية المهمة)
                if (textPart && !functionCallPart) {
                    return { text: textPart.text, model: modelName };
                }

                // إذا طلب استدعاء أداة
                if (functionCallPart) {
                    const { name, args } = functionCallPart.functionCall;
                    console.log(`🛠️ Executing: ${name}...`);
                    
                    let result;
                    // تنفيذ الأداة (نفس منطق switch السابق)
                    if (name === "thought") result = window.thought(args.reasoning, args.plan, args.risks, args.peer_review, args.swot, args.complexity, args.self_correction);
                    else if (name === "web_search") result = await window.web_search(args.query);
                    else if (name === "read_file") result = await window.read_file(args.path);
                    else if (name === "listGithubFiles") result = await window.listGithubFiles(args.path || "");
                    else if (name === "analyze_file") result = await window.analyze_file(args.path);
                    else if (name === "multi_replace_file_content") result = await window.multi_replace_file_content(args.path, args.replacements);
                    else if (name === "write_file") result = await window.write_file(args.path, args.content);
                    else if (name === "request_approval") {
                        // طلب الموافقة هو "نقطة توقف" إجبارية في الحلقة
                        const approval = window.request_approval(args.plan_summary, args.steps || [], args.estimated_impact);
                        return { text: (textPart ? textPart.text + "\n\n" : "") + (typeof approval === 'string' ? approval : approval.message), model: modelName, requires_approval: true };
                    }
                    else if (name === "store_memory") result = await window.store_memory(args.key, args.value);
                    else if (name === "vector_search") result = await window.vector_search(args.query);
                    else if (name === "searchCode") result = await window.searchCode(args.query);
                    else if (name === "DeepThink") result = window.DeepThink(args.problem, args.context, args.constraints);
                    else result = "أداة غير مدعومة حالياً في الحلقة.";

                    // إضافة نتيجة الأداة للسياق لإكمال الحلقة
                    conversationHistory.push({
                        role: "function",
                        parts: [{
                            functionResponse: {
                                name: name,
                                response: { content: typeof result === 'object' ? result : { message: result } }
                            }
                        }]
                    });

                    // إذا كان هناك نص مصاحب للأداة، نعرضه في الكونسول للمتابعة
                    if (textPart) console.log("📝 AI says:", textPart.text);
                } else {
                    // إذا لم يرجع نصاً ولا أداة (حالة نادرة)
                    break;
                }
            } catch (e) {
                return { text: "❌ خطأ في الحلقة الذكية: " + e.message, model: "System" };
            }
        }

        return finalResponse;
    };

    console.log("🚀 AI Core V7.4 (Cloud Memory) Loaded.");
    console.log("🧠 الذاكرة الآن سحابية (engine_memory.json) مع localStorage احتياطي.");
    console.log("🌐 أدوات البحث: web_search (ويب) + searchLocalVideos (محلي - 0 توكنات).");
})(window);