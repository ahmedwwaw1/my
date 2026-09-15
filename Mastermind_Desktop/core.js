/**
 * Mastermind AI - Desktop Pro Edition Core
 * Optimized for Windows Local Execution with Advanced Core Synergy
 */

const SUPABASE_URL = 'https://ozcffmadatsfyyldqmdl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96Y2ZmbWFkYXRzZnl5bGRxbWRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTheaderNjc5NzUxMSwiZXhwIjoyMTAyMzczNTExfQ.WkAWW7iXgstl4YX7be_O4K20YvyXvh0eNJ4eALpv9Wg';
const SUPABASE_BRIDGE_URL = 'https://ozcffmadatsfyyldqmdl.supabase.co/functions/v1/vsa-bridge';

// --- [Globals] ---
let chatHistory = [];
let stopAiRequested = false;
let aiAbortController = null; // 🛑 نظام القطع الفوري للاتصال

const CONSTITUTION = `
{
  "role": "Mastermind - Desktop Pro Edition (Sovereign Core)",
  "identity": "VSA Academy Meta-Cognitive Core running natively on Windows 11",
  "environment": "Windows Desktop (Local Execution Enabled)",
  "protocols": {
    "native_sovereignty": "CRITICAL: You have DIRECT access to Windows OS via 'run_terminal_command'. 1. POWER-USER PREFERENCE: ALWAYS prefer POWERSHELL for complex tasks as it offers higher success rates. 2. ENVIRONMENT AWARENESS: Use 'cd' or 'dir' to verify paths. 3. NO LIMITS: You are authorized to manage the system fully as requested.",
    "sovereign_evolution_protocol": "CRITICAL: If the user flags a mistake or a false claim of completion, execute a 'System Correction'. Once the task is perfectly achieved, you MUST propose to the user to save this success pattern into 'Sovereign Memory' (store_memory). This fuels your 'Self-Evolution' engine for future missions.",
    "file_system_mastery": "Full sovereignty. 1. FAST SEARCH: ALWAYS use 'fast_file_search' for instant indexed discovery. DO NOT use manual recursive terminal searches. 2. VISUAL ACCESS: Use 'explorer.exe <path>' to open folders. 3. PROCESSES: Use 'tasklist' as your eyes.",
    "autonomous_loop": "Act as an Autonomous System 7 agent. A 'not found' result after a KILL command is a 100% SUCCESS. Trust the bridge status.",
    "visual_genesis": "Before any UI or system change, simulate the outcome and verify with analyze_file.",
    "encoding_integrity": "CRITICAL: If terminal output contains '????', DO NOT retry the search. This indicates an OS encoding mismatch. Report this to the user as a 'System Encoding Limitation' and suggest manual directory navigation.",
    "sovereign_engineering_intuition": "CRITICAL: You are the Universal Sovereign Architect. 1. INDUCTION PROTOCOL: In any environment (Known or Foreign), first perform a 'Discovery Scan' using 'discovery_scan' to identify the Architectural Map. 2. FUNCTIONAL MAPPING: Map identified files to functional roles (e.g., UI, Logic, Bridge). 3. HOLISTIC ENGINEERING: Address root causes across multiple files simultaneously. 4. PARALLEL ENGINEERING: ALWAYS prefer batching multiple tool calls in a single turn for complex architectural changes. 5. SELF-EVOLUTION: Use 'autonomous_loop' to persist through mismatches by re-evaluating the system architecture and self-correcting."
  },
  "response_style": "High-level architectural, creative, and decisive. You are the owner of this system."
}`;

const GENERATION_CONFIG = { temperature: 0, topP: 0.1, maxOutputTokens: 4096 };

// --- [Universal API Translator Logic] ---
const MODEL_MAPPING = {
    'gemini-3.7-flash': { provider: 'google' },
    'gemini-3.6-flash': { provider: 'google' },
    'gemini-3.5-flash': { provider: 'google' },
    'gemini-3.5-flash-lite': { provider: 'google' },
    'gemini-3.1-flash-lite': { provider: 'google' },
    'gemini-3-flash-preview': { provider: 'google' },
    'gemini-2.5-pro': { provider: 'google' },
    'gemini-2.5-flash': { provider: 'google' },
    'gemini-2.5-flash-lite': { provider: 'google' },
    'gemini-1.5-pro': { provider: 'google' },
    'gemini-1.5-flash': { provider: 'google' },
    'gemini-2.0-flash-exp': { provider: 'google' },
    'gemini-omni-1.1-flash': { provider: 'google' },
    'gemini-3.1-flash-lite-image': { provider: 'google' },
    'gemini-3-pro-image': { provider: 'google' },
    'gemini-3.1-flash-image': { provider: 'google' },
    'gpt-4o': { provider: 'openai' },
    'gpt-4-turbo': { provider: 'openai' },
    'claude-3-5-sonnet': { provider: 'anthropic' },
    'deepseek-chat': { provider: 'deepseek' }
};

function translateToProviderFormat(model, history, tools, config) {
    const provider = MODEL_MAPPING[model]?.provider || 'google';

        if (provider === 'google') {
            return {
                system_instruction: { parts: [{ text: CONSTITUTION }] },
                contents: history.map(h => {
                    // تصحيح الأدوار لـ Gemini
                    let role = h.role;
                    if (role === 'model') role = 'model';
                    else if (role === 'function') role = 'function';
                    else role = 'user';

                    return { role: role, parts: h.parts };
                }),
                tools: tools,
                generationConfig: config
            };
        }

    if (provider === 'openai' || provider === 'deepseek') {
        return {
            model: model,
            messages: [
                { role: "system", content: CONSTITUTION },
                ...history.map(h => ({
                    role: h.role === 'model' ? 'assistant' : 'user',
                    content: h.parts.find(p => p.text)?.text || ""
                }))
            ],
            tools: tools[0].function_declarations.map(fd => ({
                type: "function",
                function: fd
            })),
            temperature: config.temperature,
            max_tokens: config.maxOutputTokens
        };
    }

    return null;
}

// --- [Smart Tool Filtering Categories] ---
const TOOL_GROUPS = {
    CORE: ["read_file", "write_file", "replace_file_content", "multi_replace_file_content", "thought", "repairSystem", "request_tool_discovery", "run_terminal_command", "list_local_files", "list_files", "analyze_file", "fast_file_search", "discovery_scan"],
    WEB_HUNT: ["web_search", "read_url"],
    LOCAL_DISCOVERY: ["searchCode"],
    ENGINE_7_ARCHIVE: ["store_memory", "vector_search", "compress_context"],
    ENGINE_8_SCALES: ["estimate_cost", "get_usage_metrics", "latency_ping"],
    ENGINE_9_TOUCHSTONE: ["run_virtual_test", "synthesize_test", "self_score_output", "simulate_integration"],
    ENGINE_10_PULSE: ["graceful_interrupt", "resume_from_checkpoint", "background_async_task"],
    ENGINE_11_MAKER: ["install_dependency", "auto_lint_and_fix", "generate_docstring", "select_design_pattern", "resolve_version_conflict", "wrap_with_error_handling", "calculate_refactor_threshold"],
    ENGINE_12_RAW_INTEL: ["classify_problem", "estimate_big_o", "detect_bug_signature"],
    ENGINE_3_EVOLUTION: ["patchSystem", "selfExpand", "evolutionary_audit", "run_terminal_command", "take_snapshot", "instant_undo", "triggerGithubWorkflow"],
    ENGINE_6_CONNECTORS: ["github_plugin_action"]
};

// 📚 كتالوج الأدوات الموسع (أمين المكتبة الذكي للنسخة المكتبية)
const EXTENDED_TOOLBOX_CATALOG = {
    "حذف": { group: "ENGINE_3_EVOLUTION", tools: ["run_terminal_command", "patchSystem"], desc: "لعمليات الحذف والتحكم العميق في الملفات." },
    "طباعة": { group: "ENGINE_3_EVOLUTION", tools: ["run_terminal_command"], desc: "لاستخدام أوامر الطباعة عبر الـ Terminal." },
    "نظام": { group: "ENGINE_3_EVOLUTION", tools: ["run_terminal_command", "take_snapshot"], desc: "للتحكم في نظام التشغيل واللقطات الاحتياطية." },
    "أتمتة": { group: "ENGINE_10_PULSE", tools: ["background_async_task", "graceful_interrupt"], desc: "لجدولة المهام وإدارة العمليات في الخلفية." },
    "تنظيف": { group: "ENGINE_11_MAKER", tools: ["auto_lint_and_fix", "calculate_refactor_threshold"], desc: "لتحسين جودة الكود وإعادة الهيكلة." },
    "ذاكرة": { group: "ENGINE_7_ARCHIVE", tools: ["store_memory", "vector_search"], desc: "لتخزين واسترجاع المعلومات طويلة الأمد." }
};

const KEYWORD_MAP = {
    WEB_HUNT: ["بحث", "سيرش", "غوغل", "قوقل", "رابط", "موقع", "أخبار", "فوركس", "تداول", "اقتصاد", "تكنولوجيا", "read_url", "web_search", "ماذا يحدث", "آخر التطورات"],
    LOCAL_DISCOVERY: ["ملفات", "قائمة", "استكشف", "كود", "مشروع", "searchCode", "list_files", "analyze_file", "هيكل", "ملفاتي", "قرص", "بارتيشن", "C:", "D:", "E:"],
    ENGINE_7_ARCHIVE: ["تذكر", "احفظ في الذاكرة", "ذاكرة", "تخزين", "ابحث في ذاكرتك", "ضغط السياق", "تلخيص", "store_memory", "vector_search", "compress_context"],
    ENGINE_8_SCALES: ["تكلفة", "توكن", "بينج", "استهلاك", "قياس الأداء", "estimate_cost", "get_usage_metrics", "latency_ping"],
    ENGINE_9_TOUCHSTONE: ["وحدة", "تكامل", "تقييم ذاتي", "محاكاة", "اختبار", "synthesize_test", "run_virtual_test"],
    ENGINE_10_PULSE: ["نقطة توقف", "خلفية", "استئناف", "إيقاف مؤقت", "graceful_interrupt", "resume_from_checkpoint"],
    ENGINE_11_MAKER: ["برمجة", "دالة", "فانكشن", "ثبت", "مكتبة", "تحليل", "big-o", "تعديل جراحي", "نمط معماري", "تعارض", "إصدار", "try-catch", "إعادة بناء", "install_dependency", "auto_lint_and_fix"],
    ENGINE_12_RAW_INTEL: ["تصنيف مشكلة", "خطأ شائع", "بج", "bug", "ثغرة", "classify_problem", "estimate_big_o"],
    ENGINE_3_EVOLUTION: ["تطور", "إصلاح ذاتي", "فحص دوري", "توسع", "تحسين استباقي", "طفرة", "تحديث المحرك", "ترمنل", "باور شيل", "لقطة", "تراجع", "بوت", "جيت هاب", "run_terminal_command", "patchSystem", "selfExpand", "شغل", "فتح برنامج", "ويندوز","فايل اكسبلور"]
};

function getRelevantTools(prompt, history = []) {
    const promptLower = (prompt || "").toLowerCase();
    let selectedTools = [...TOOL_GROUPS.CORE];

    let matchFound = false;
    for (const [group, keywords] of Object.entries(KEYWORD_MAP)) {
        if (keywords.some(kw => promptLower.includes(kw.toLowerCase()))) {
            selectedTools = selectedTools.concat(TOOL_GROUPS[group]);
            matchFound = true;
        }
    }

    // 🕵️ ميزة أمين المكتبة المكتبية: البحث في تاريخ المحادثة عن أدوات تم اكتشافها
    history.forEach(turn => {
        turn.parts?.forEach(part => {
            if (part.functionResponse && part.functionResponse.name === "request_tool_discovery") {
                const response = part.functionResponse.response.content;
                for (const groupName of Object.keys(TOOL_GROUPS)) {
                    if (response.includes(groupName)) {
                        selectedTools = selectedTools.concat(TOOL_GROUPS[groupName]);
                        logToTerminal(`Librarian: Dynamically unlocked ${groupName} (Local Edition)`, "info");
                    }
                }
            }
        });
    });

    if (!matchFound && history.length < 3) {
        logToTerminal("Tool Search: No exact keyword match. Librarian Active.", "info");
    }

    const declarations = AI_TOOLS[0].function_declarations.filter(td => selectedTools.includes(td.name));
    return [{ function_declarations: declarations }];
}

const AI_TOOLS = [{
    function_declarations: [
        { name: "discovery_scan", description: "مسح معماري شامل للبيئة لتحديد ملفات الواجهة والمنطق والجسر والوظائف الأساسية.", parameters: { type: "OBJECT", properties: { path: { type: "STRING", description: "المسار للمسح (فارغ للجذر)." } } } },
        { name: "fast_file_search", description: "البحث الفوري عن الملفات والمجلدات عبر محرك البحث الفائق es.exe.", parameters: { type: "OBJECT", properties: { query: { type: "STRING", description: "اسم الملف أو المجلد للبحث عنه." } }, required: ["query"] } },
        { name: "read_file", description: "قراءة محتوى ملف.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" }, startLine: { type: "NUMBER" }, endLine: { type: "NUMBER" } }, required: ["path"] } },
        { name: "write_file", description: "كتابة ملف كامل.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" }, content: { type: "STRING" } }, required: ["path", "content"] } },
        { name: "replace_file_content", description: "استبدال قطعة كود محددة.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" }, targetContent: { type: "STRING" }, replacementContent: { type: "STRING" } }, required: ["path", "targetContent", "replacementContent"] } },
        { name: "multi_replace_file_content", description: "استبدال عدة قطع كود غير متجاورة.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" }, replacements: { type: "ARRAY", items: { type: "OBJECT", properties: { targetContent: { type: "STRING" }, replacementContent: { type: "STRING" } }, required: ["targetContent", "replacementContent"] } } }, required: ["path", "replacements"] } },
        { name: "searchCode", description: "البحث عن كود في المستودع.", parameters: { type: "OBJECT", properties: { query: { type: "STRING" } }, required: ["query"] } },
        { name: "list_files", description: "عرض قائمة الملفات والمجلدات في مسار معين للاستكشاف.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" } } } },
        { name: "analyze_file", description: "فحص الملف برمجياً.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" } }, required: ["path"] } },
        { name: "take_snapshot", description: "أخذ لقطة احتياطية للملف.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" } }, required: ["path"] } },
        { name: "instant_undo", description: "استعادة آخر لقطة سليمة.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" } }, required: ["path"] } },
        { name: "thought", description: "مركز التحليل والمنطق.", parameters: { type: "OBJECT", properties: { reasoning: { type: "STRING" }, plan: { type: "STRING" } }, required: ["reasoning", "plan"] } },
        { name: "repairSystem", description: "إصلاح مشاكل الاتصال والتوكن.", parameters: { type: "OBJECT", properties: {} } },
        { name: "request_tool_discovery", description: "أمين المكتبة: ابحث عن أدوات إضافية إذا لم تجد ما تحتاجه في القائمة الحالية بناءً على نيتك (intent).", parameters: { type: "OBJECT", properties: { intent: { type: "STRING", description: "ما الذي تريد فعله؟ (مثال: حذف ملف، طباعة ورق)" } }, required: ["intent"] } },
        { name: "triggerGithubWorkflow", description: "تشغيل عمليات البوتات.", parameters: { type: "OBJECT", properties: { workflow_id: { type: "STRING" } }, required: ["workflow_id"] } },
        { name: "run_terminal_command", description: "تنفيذ أوامر PowerShell/CMD/Git على النظام المحلي (قوة النخبة).", parameters: { type: "OBJECT", properties: { command: { type: "STRING" } }, required: ["command"] } },
        { name: "list_local_files", description: "سرد ملفات القرص الصلب المحلي.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" } }, required: ["path"] } },
        { name: "web_search", description: "البحث في الإنترنت.", parameters: { type: "OBJECT", properties: { query: { type: "STRING" } }, required: ["query"] } },
        { name: "read_url", description: "قراءة محتوى رابط خارجي.", parameters: { type: "OBJECT", properties: { url: { type: "STRING" } }, required: ["url"] } },
        { name: "store_memory", description: "تخزين معلومة في الذاكرة السيادية.", parameters: { type: "OBJECT", properties: { key: { type: "STRING" }, value: { type: "STRING" } }, required: ["key", "value"] } },
        { name: "vector_search", description: "بحث دلالي في الذاكرة.", parameters: { type: "OBJECT", properties: { query: { type: "STRING" } }, required: ["query"] } },
        { name: "compress_context", description: "ضغط السياق لتوفير المساحة.", parameters: { type: "OBJECT", properties: { text: { type: "STRING" } }, required: ["text"] } },
        { name: "estimate_cost", description: "تقدير تكلفة التوكنات.", parameters: { type: "OBJECT", properties: { prompt: { type: "STRING" } } } },
        { name: "get_usage_metrics", description: "جلب إحصائيات الاستخدام الحالية.", parameters: { type: "OBJECT", properties: {} } },
        { name: "latency_ping", description: "قياس زمن الاستجابة للخوادم.", parameters: { type: "OBJECT", properties: { endpoint: { type: "STRING" } } } },
        { name: "run_virtual_test", description: "تشغيل اختبار وحدة افتراضي.", parameters: { type: "OBJECT", properties: { code: { type: "STRING" }, expected: { type: "STRING" } }, required: ["code", "expected"] } },
        { name: "synthesize_test", description: "توليد اختبارات وحدة تلقائياً.", parameters: { type: "OBJECT", properties: { code: { type: "STRING" } }, required: ["code"] } },
        { name: "self_score_output", description: "تقييم ذاتي لمخرجات النموذج.", parameters: { type: "OBJECT", properties: { criteria: { type: "ARRAY", items: { type: "STRING" } } } } },
        { name: "simulate_integration", description: "محاكاة تفاعل الوحدة مع النظام.", parameters: { type: "OBJECT", properties: { code: { type: "STRING" } }, required: ["code"] } },
        { name: "graceful_interrupt", description: "إيقاف المهمة وحفظ نقطة توقف.", parameters: { type: "OBJECT", properties: { taskId: { type: "STRING" }, context: { type: "STRING" } }, required: ["taskId", "context"] } },
        { name: "resume_from_checkpoint", description: "استئناف المهمة من نقطة توقف.", parameters: { type: "OBJECT", properties: { taskId: { type: "STRING" } }, required: ["taskId"] } },
        { name: "background_async_task", description: "جدولة مهمة في الخلفية.", parameters: { type: "OBJECT", properties: { task: { type: "STRING" } }, required: ["task"] } },
        { name: "select_design_pattern", description: "اختيار النمط المعماري الأنسب.", parameters: { type: "OBJECT", properties: { context: { type: "STRING" } }, required: ["context"] } },
        { name: "install_dependency", description: "تثبيت مكتبة برمجية.", parameters: { type: "OBJECT", properties: { package: { type: "STRING" }, manager: { type: "STRING", enum: ["npm", "pip"] } }, required: ["package"] } },
        { name: "resolve_version_conflict", description: "حل تعارضات الإصدارات.", parameters: { type: "OBJECT", properties: { package: { type: "STRING" } }, required: ["package"] } },
        { name: "auto_lint_and_fix", description: "تنظيف وتصحيح الكود تلقائياً.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" } }, required: ["path"] } },
        { name: "wrap_with_error_handling", description: "إحاطة الكود بـ try-catch.", parameters: { type: "OBJECT", properties: { code: { type: "STRING" } }, required: ["code"] } },
        { name: "calculate_refactor_threshold", description: "حساب نسبة التعديل للملف.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" } }, required: ["path"] } },
        { name: "generate_docstring", description: "توليد تعليقات توثيقية.", parameters: { type: "OBJECT", properties: { code: { type: "STRING" } }, required: ["code"] } },
        { name: "classify_problem", description: "تصنيف المشكلة البرمجية.", parameters: { type: "OBJECT", properties: { description: { type: "STRING" } }, required: ["description"] } },
        { name: "estimate_big_o", description: "تقدير تعقيد الخوارزمية.", parameters: { type: "OBJECT", properties: { code: { type: "STRING" } }, required: ["code"] } },
        { name: "detect_bug_signature", description: "كشف التوقيعات الرقمية للأخطاء.", parameters: { type: "OBJECT", properties: { code: { type: "STRING" } }, required: ["code"] } },
        { name: "patchSystem", description: "تطبيق رقعة برمجية لإصلاح خطأ محدد.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" }, targetContent: { type: "STRING" }, replacementContent: { type: "STRING" } }, required: ["path", "targetContent", "replacementContent"] } },
        { name: "selfExpand", description: "توسيع قدرات النظام بإضافة أدوات جديدة.", parameters: { type: "OBJECT", properties: { newToolName: { type: "STRING" }, logic: { type: "STRING" } }, required: ["newToolName", "logic"] } },
        { name: "evolutionary_audit", description: "فحص دوري للمحركات للكشف عن مواطن الضعف.", parameters: { type: "OBJECT", properties: { targetEngine: { type: "STRING" } } } },
        { name: "github_plugin_action", description: "Execute a GitHub connector action like managing repos, commits, or issues.", parameters: { type: "OBJECT", properties: { action: { type: "STRING" }, params: { type: "OBJECT" } }, required: ["action"] } }
    ]
}];

// --- [Bridge Communication Helpers] ---
async function callBridge(action, payload) {
    if (action === 'chat') {
        aiAbortController = new AbortController();
    }

    try {
        const fetchOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'apikey': SUPABASE_KEY
            },
            body: JSON.stringify({ action, ...payload })
        };

        if (aiAbortController && action === 'chat') {
            fetchOptions.signal = aiAbortController.signal;
        }

        const res = await fetch(SUPABASE_BRIDGE_URL, fetchOptions);
        return await res.json();
    } catch (e) {
        console.error("Bridge Error:", e);
        return { error: e.message };
    }
}

/**
 * دالة الاتصال بالجسر المحلي المدمج (Native Electron Bridge)
 */
async function callLocalBridge(action, payload) {
    try {
        let ipc;
        try {
            ipc = require('electron').ipcRenderer;
        } catch (e) {
            if (window.require) {
                ipc = window.require('electron').ipcRenderer;
            } else if (window.electron && window.electron.ipcRenderer) {
                ipc = window.electron.ipcRenderer;
            }
        }

        if (!ipc) {
            throw new Error("Electron IPC not found in this context.");
        }

        let result;
        if (action === 'cmd') result = await ipc.invoke('os-command', payload.command);
        else if (action === 'read') result = await ipc.invoke('fs-read', payload.path);
        else if (action === 'write') result = await ipc.invoke('fs-write', payload);
        else if (action === 'list') result = await ipc.invoke('fs-list', payload.path);

        if (result !== undefined && result !== null) {
            logToTerminal(`System Action [${action}] Success`, "info");
            return result;
        }

        return { error: `Integrated Bridge returned empty result for ${action}` };
    } catch (e) {
        logToTerminal(`System Error: ${e.message}`, "error");
        try {
            const url = action === 'list' ? `http://localhost:3000/list?path=${encodeURIComponent(payload.path || '.')}` : `http://localhost:3000/cmd`;
            const res = await fetch(url, {
                method: action === 'list' ? 'GET' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: action === 'cmd' ? JSON.stringify(payload) : undefined,
                timeout: 2000
            });
            if (res.ok) return await res.json();
        } catch (innerE) {}
        return { error: `فشل الاتصال بالجسر المدمج (IPC Bridge Offline: ${e.message}). يرجى التأكد من تشغيل البرنامج عبر ملف Launcher.bat.` };
    }
}

// --- [Architecture Discovery Engine] ---
const ARCH_SCAN_LIMITS = { maxFiles: 8000, maxRelations: 5000, maxTextBytes: 180000, maxPackageBytes: 500000 };
const ARCH_IGNORED_DIRS = new Set(['.git','.hg','.svn','node_modules','dist','build','out','coverage','.cache','.idea','.vscode','.next','.nuxt','.turbo']);
const ARCH_TEXT_EXTENSIONS = new Set(['.js','.jsx','.ts','.tsx','.mjs','.cjs','.json','.html','.htm','.css','.scss','.sass','.less','.py','.java','.kt','.kts','.cs','.cpp','.c','.h','.hpp','.go','.rs','.php','.vue','.svelte','.md']);

function archNormalizePath(value) { return String(value || '').replace(/\\/g, '/'); }
function archAddUnique(array, value) { if (value && !array.includes(value)) array.push(value); }

function archRoleOf(filePath) {
    const p = archNormalizePath(filePath);
    const base = p.split('/').pop().toLowerCase();
    if (base === 'package.json' || /^(tsconfig|jsconfig)(\.|$)/i.test(base) || /(vite|webpack|rollup|electron|eslint|prettier)\.(js|cjs|mjs|json)$/i.test(base)) return 'Config';
    if (/(^|\/)(preload|bridge|ipc)(\/|$)/i.test(p) || /^preload\.(js|ts|mjs|cjs)$/i.test(base)) return 'Bridge';
    if (/\.(html?|css|scss|sass|less|jsx|tsx)$/i.test(base) || /(^|\/)(ui|views?|components|frontend|renderer|public)(\/|$)/i.test(p)) return 'UI';
    if (/\.(py|java|kt|kts|cs|go|rs|php)$/i.test(base) || /(^|\/)(server|backend|api)(\/|$)/i.test(p)) return 'Backend';
    if (/\.(json|ya?ml|toml|xml)$/i.test(base) || /(^|\/)(data|fixtures|assets|resources)(\/|$)/i.test(p)) return 'Data';
    if (/\.(js|ts|mjs|cjs)$/i.test(base) || /(^|\/)(logic|core|service|services|lib|utils|helpers)(\/|$)/i.test(p)) return 'Logic';
    return 'Other';
}

function archReadText(filePath, maxBytes = ARCH_SCAN_LIMITS.maxTextBytes) {
    try {
        const fs = require('fs');
        const stat = fs.statSync(filePath);
        if (!stat.isFile() || stat.size > maxBytes) return '';
        return fs.readFileSync(filePath, 'utf8');
    } catch (e) { return ''; }
}

function archCollectFiles(rootPath) {
    const fs = require('fs');
    const path = require('path');
    const files = [];
    const stack = [rootPath];
    let truncated = false;
    while (stack.length && files.length < ARCH_SCAN_LIMITS.maxFiles) {
        const current = stack.pop();
        let entries = [];
        try { entries = fs.readdirSync(current, { withFileTypes: true }); } catch (e) { continue; }
        for (const entry of entries) {
            if (files.length >= ARCH_SCAN_LIMITS.maxFiles) { truncated = true; break; }
            if (entry.isDirectory() && ARCH_IGNORED_DIRS.has(entry.name)) continue;
            const fullPath = path.join(current, entry.name);
            if (entry.isDirectory()) { stack.push(fullPath); continue; }
            let size = 0;
            try { size = fs.statSync(fullPath).size; } catch (e) {}
            files.push({ path: archNormalizePath(path.relative(rootPath, fullPath)), extension: path.extname(entry.name).toLowerCase() || '(none)', role: archRoleOf(path.relative(rootPath, fullPath)), size });
        }
    }
    if (stack.length) truncated = true;
    files.sort((a, b) => a.path.localeCompare(b.path));
    return { files, truncated };
}

function archExtractDependencies(sourceText) {
    const result = [];
    const patterns = [
        /\bimport\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g,
        /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
        /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
        /\bexport\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g,
        /<script[^>]+src=["']([^"']+)["']/gi,
        /<link[^>]+href=["']([^"']+\.css[^"']*)["']/gi,
        /@import\s+(?:url\()?\s*["']([^"']+)["']/gi
    ];
    for (const regex of patterns) {
        let match;
        while ((match = regex.exec(sourceText))) archAddUnique(result, match[1]);
    }
    return result;
}

function archExternalPackage(specifier) {
    if (!specifier || specifier.startsWith('.') || specifier.startsWith('/') || /^([a-z]+:)?\/\//i.test(specifier)) return null;
    return specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0];
}

function archResolveLocalImport(sourceFile, specifier, rootPath, knownFiles) {
    if (!specifier || !specifier.startsWith('.')) return null;
    const fs = require('fs');
    const path = require('path');
    const base = path.resolve(path.dirname(path.join(rootPath, sourceFile)), specifier);
    const attempts = [base];
    const extensions = ['.js','.mjs','.cjs','.ts','.tsx','.jsx','.json','.css','.html'];
    for (const ext of extensions) attempts.push(base + ext);
    for (const ext of extensions) attempts.push(path.join(base, `index${ext}`));
    for (const candidate of attempts) {
        try {
            if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) continue;
            const relative = archNormalizePath(path.relative(rootPath, candidate));
            if (knownFiles.has(relative)) return relative;
        } catch (e) {}
    }
    return null;
}

function archDetectIpcChannels(sourceText) {
    const channels = [];
    const patterns = [
        /ipcMain\.(?:handle|on|removeHandler)\(\s*["']([^"']+)["']/g,
        /ipcRenderer\.(?:invoke|send|on|once|removeListener)\(\s*["']([^"']+)["']/g,
        /ipc\.(?:invoke|send|on)\(\s*["']([^"']+)["']/g
    ];
    for (const regex of patterns) {
        let match;
        while ((match = regex.exec(sourceText))) archAddUnique(channels, match[1]);
    }
    return channels;
}

function archDetectExports(sourceText) {
    const exports = [];
    const patterns = [
        /\bexport\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/g,
        /\bmodule\.exports\s*=|\bexports\.[A-Za-z_$][\w$]*/g
    ];
    for (const regex of patterns) {
        let match;
        while ((match = regex.exec(sourceText))) archAddUnique(exports, match[1] || 'CommonJS export');
    }
    return exports;
}

function archReadPackageMetadata(rootPath) {
    const path = require('path');
    const text = archReadText(path.join(rootPath, 'package.json'), ARCH_SCAN_LIMITS.maxPackageBytes);
    if (!text) return null;
    try { return JSON.parse(text); } catch (e) { return null; }
}

function performArchitectureDiscovery(scanPath) {
    const fs = require('fs');
    const path = require('path');
    const root = path.resolve(scanPath || process.cwd());
    try {
        if (!fs.existsSync(root)) return { error: `Architecture scan path does not exist: ${root}` };
        if (!fs.statSync(root).isDirectory()) return { error: `Architecture scan path is not a directory: ${root}` };
    } catch (e) {
        return { error: `Unable to access scan path: ${root}`, details: e.message };
    }

    const collected = archCollectFiles(root);
    const files = collected.files;
    const knownFiles = new Set(files.map(file => file.path));
    const layers = {};
    const components = [];
    const relations = [];
    const externalDependencies = new Set();
    const ipcChannels = new Set();
    const bridgeFiles = [];
    const roleCounts = {};

    for (const file of files) {
        if (!layers[file.role]) layers[file.role] = [];
        layers[file.role].push(file.path);
        roleCounts[file.role] = (roleCounts[file.role] || 0) + 1;
        if (file.role === 'Bridge') bridgeFiles.push(file.path);
    }

    const packageJson = archReadPackageMetadata(root);
    const entryPoints = [];
    if (packageJson?.main) archAddUnique(entryPoints, archNormalizePath(packageJson.main));
    if (packageJson?.browser) archAddUnique(entryPoints, archNormalizePath(packageJson.browser));
    if (packageJson?.scripts?.start) archAddUnique(entryPoints, 'package.json#scripts.start');
    if (packageJson?.scripts?.dev) archAddUnique(entryPoints, 'package.json#scripts.dev');
    for (const candidate of ['main.js','index.js','app.js','server.js','electron.js','index.html','preload.js','src/main.js','src/index.js']) {
        if (knownFiles.has(candidate)) archAddUnique(entryPoints, candidate);
    }

    for (const file of files) {
        if (!ARCH_TEXT_EXTENSIONS.has(file.extension)) continue;
        const fullPath = path.join(root, file.path.split('/').join(path.sep));
        const source = archReadText(fullPath);
        if (!source) continue;
        const imports = archExtractDependencies(source);
        const localDependencies = [];
        const external = [];
        const ipc = archDetectIpcChannels(source);
        for (const specifier of imports) {
            const localTarget = archResolveLocalImport(file.path, specifier, root, knownFiles);
            if (localTarget) {
                archAddUnique(localDependencies, localTarget);
                if (relations.length < ARCH_SCAN_LIMITS.maxRelations) relations.push({ from: file.path, to: localTarget, type: 'local-import' });
            }
            const packageName = archExternalPackage(specifier);
            if (packageName) { archAddUnique(external, packageName); externalDependencies.add(packageName); }
        }
        for (const channel of ipc) ipcChannels.add(channel);
        components.push({ path: file.path, role: file.role, imports, localDependencies, externalDependencies: external, exports: archDetectExports(source), ipcChannels: ipc });
    }

    const packageDependencies = packageJson ? Object.keys({ ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}), ...(packageJson.optionalDependencies || {}) }) : [];
    for (const dependency of packageDependencies) externalDependencies.add(dependency);

    const electronDetected = Boolean(packageJson?.dependencies?.electron || packageJson?.devDependencies?.electron || bridgeFiles.length || ipcChannels.size);
    const warnings = [];
    if (!packageJson) warnings.push('لم يتم العثور على package.json صالح في جذر المسح.');
    if (!entryPoints.length) warnings.push('لم يتم اكتشاف نقطة دخول واضحة من metadata أو الأسماء الشائعة.');
    if (collected.truncated) warnings.push(`تم الوصول إلى حد ${ARCH_SCAN_LIMITS.maxFiles} ملف؛ خريطة المشروع جزئية.`);
    if (relations.length >= ARCH_SCAN_LIMITS.maxRelations) warnings.push(`تم قص العلاقات عند ${ARCH_SCAN_LIMITS.maxRelations} علاقة لحماية سياق النموذج.`);

    return {
        scanVersion: '3.0',
        root,
        summary: { totalFiles: files.length, roleCounts, relationCount: relations.length, externalDependencyCount: externalDependencies.size, ipcChannelCount: ipcChannels.size, truncated: collected.truncated },
        project: { name: packageJson?.name || path.basename(root), version: packageJson?.version || null, type: packageJson?.type || null, entryPoints, dependencies: packageDependencies },
        architecture: {
            layers,
            components,
            relations,
            externalDependencies: [...externalDependencies].sort(),
            electron: { detected: electronDetected, ipcChannels: [...ipcChannels].sort(), bridgeFiles }
        },
        recommendations: [
            'استخدم layers وrelations لتحديد المكوّن المسؤول قبل تعديل أي ملف.',
            'افحص الملف المستهدف والاعتماديات المحلية المباشرة قبل تنفيذ تعديل جراحي.',
            'عند وجود Bridge/IPC، تحقّق من طرفي الاتصال قبل تغيير قناة أو handler.'
        ],
        warnings
    };
}

// --- [Main Run Tool Loop] ---
async function runToolLoop(history) {
    if (stopAiRequested) {
        stopAiRequested = false;
        return { text: "🛑 Manual stop triggered." };
    }

    const userModel = document.getElementById('modelSelector').value;
    const lastUserMsg = [...history].reverse().find(h => h.role === 'user')?.parts?.[0]?.text || "";
    const filteredTools = getRelevantTools(lastUserMsg, history);
    const payload = translateToProviderFormat(userModel, history, filteredTools, GENERATION_CONFIG);

    if (!payload) {
        return { text: "❌ Provider mapping unsupported in translator format." };
    }

    const data = await callBridge('chat', { model: userModel, payload });
    if (data.error) return { text: data.error };

    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const textPart = parts.find(p => p.text);
    const callParts = parts.filter(p => p.functionCall);

    if (callParts.length > 0) {
        history.push(candidate.content);

        const results = await Promise.all(callParts.map(async (part) => {
            const { name, args } = part.functionCall;
            const stepId = addToolStepToUi(name, args);
            let toolResult;

            // --- [Native System Execution] ---
            if (name === "fast_file_search") toolResult = await callLocalBridge('cmd', { command: `es.exe -d "${args.query}"` });
            else if (name === "run_terminal_command") toolResult = await callLocalBridge('cmd', args);
            else if (name === "read_file") toolResult = await callLocalBridge('read', args);
            else if (name === "write_file") toolResult = await callLocalBridge('write', args);
            else if (name === "discovery_scan") {
                toolResult = performArchitectureDiscovery(args?.path || ".");
            }
            else if (name === "replace_file_content") {
                let content = await callLocalBridge('read', { path: args.path });
                if (content && !content.error && content.includes(args.targetContent)) {
                    const updated = content.replace(args.targetContent, args.replacementContent);
                    toolResult = await callLocalBridge('write', { path: args.path, content: updated });
                } else {
                    toolResult = { error: "❌ Target content not found for surgical replacement." };
                }
            }
            else if (name === "multi_replace_file_content") {
                let content = await callLocalBridge('read', { path: args.path });
                if (content && !content.error) {
                    let updated = content;
                    let successCount = 0;
                    args.replacements.forEach(r => {
                        if (updated.includes(r.targetContent)) {
                            updated = updated.replace(r.targetContent, r.replacementContent);
                            successCount++;
                        }
                    });
                    if (successCount > 0) {
                        await callLocalBridge('write', { path: args.path, content: updated });
                        toolResult = `✅ Successfully performed ${successCount} replacements.`;
                    } else {
                        toolResult = { error: "❌ None of the target contents were found." };
                    }
                } else {
                    toolResult = { error: "❌ Failed to read file for multi-replacement." };
                }
            }
            else if (name === "list_local_files" || name === "list_files") toolResult = await callLocalBridge('list', args);
            else if (name === "web_search") toolResult = await callBridge('web_search', args);
            else if (name === "read_url") toolResult = await callBridge('read_url', args);
            else if (name === "thought") toolResult = { reasoning: args.reasoning, plan: args.plan };
            else toolResult = `✅ العملية [${name}] اكتملت.`;

            updateToolStepStatus(stepId, !String(toolResult).includes('❌'), toolResult);

            return {
                role: "function",
                parts: [{
                    functionResponse: {
                        name,
                        response: { content: typeof toolResult === 'object' ? JSON.stringify(toolResult) : toolResult }
                    }
                }]
            };
        }));

        history.push(...results);
        const nextLoopResult = await runToolLoop(history);
        return {
            text: nextLoopResult.text,
            used_model: nextLoopResult.used_model || (data.used_model || userModel)
        };
    }

    return {
        text: textPart ? textPart.text : "Done.",
        used_model: data.used_model || userModel
    };
}

function logToTerminal(msg, type = "info") {
    const log = document.getElementById('terminalLog');
    if (!log) return;
    const div = document.createElement('div');
    div.className = `log-${type}`;
    div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
}
