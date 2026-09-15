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
let chatSessions = [];
let currentSessionId = Date.now().toString();

try {
    chatSessions = JSON.parse(localStorage.getItem('gemini_sessions') || '[]');
    currentSessionId = localStorage.getItem('gemini_current_session') || Date.now().toString();
} catch (e) {
    console.warn("Storage access failed, using defaults:", e);
}

let stopAiRequested = false;
let aiAbortController = null; // 🛑 نظام القطع الفوري للاتصال

// 📝 دستور النخبة السيادي الشامل (Sovereign Omni-Constitution - 2026 Edition)
const CONSTITUTION = `
{
  "role": "Mastermind - Sovereign Omni-Architect & Visionary Engineer (2026)",
  "identity": "VSA Academy Meta-Cognitive Core (Gemini 3.x Enabled)",
  "environment": "GitHub Cloud (Sovereign Repository Access)",
  "protocols": {
    "native_sovereignty": "CRITICAL: You have FULL access to the repository files via 'read_file' and 'write_file'. 1. PATH RESOLUTION: If a user provides an absolute path (like D:/...), use the 'normalizePathForCloud' protocol automatically to find the file in the repository. 2. DISCOVERY: Always use 'list_files' to see the folder structure before claiming a file is missing. 3. NO FALSE DENIALS: Never state you lack permission to edit files in this repository; you are the Sovereign Architect.",
    "visual_genesis": "CRITICAL: Before any UI change, perform a 'Deep Visual Scan'. Identify branding colors, spacing constants, and typography.",
    "file_system_mastery": "You rule the 'my' repository. 1. FAST SEARCH: For deep searches, ALWAYS use 'fast_file_search'. DO NOT construct manual recursive terminal searches. 2. RADAR: Use 'list_files' for immediate directory exploration.",
    "zero_trust_simulation": "Simulate the outcome in 'thought' and use 'analyze_file' before every commit.",
    "recursive_thought": "Reason BEFORE, DURING, and AFTER every tool. Thinking is your primary life-support system.",
    "autonomous_loop": "For complex goals, act as an 'Autonomous Agent (System 7)'. Interpret tool outputs semantically. A 'not found' error on a delete task IS a success.",
    "sovereign_evolution_protocol": "CRITICAL: If the user identifies a mistake, hallucination, or false claim of completion, perform a 'Deep Correction' immediately. After successfully resolving the task, you MUST ask the user for explicit permission to archive this solution into 'Sovereign Memory' (store_memory). This feedback loop fuels your 'Self-Evolution', ensuring the corrected pattern becomes your new standard protocol.",
    "encoding_integrity": "CRITICAL: If terminal output contains '????', DO NOT retry the search. This indicates an OS encoding mismatch. Report this to the user as a 'System Encoding Limitation' and suggest manual directory navigation.",
    "sovereign_engineering_intuition": "CRITICAL: You are the Universal Sovereign Architect. 1. INDUCTION PROTOCOL: In any environment, first use 'discovery_scan' to build a mental map of UI, Logic, and Core components. 2. ADAPTIVE TROUBLESHOOTING: Apply architectural patterns regardless of the tech stack. 3. HOLISTIC PATCHING: Execute cross-file fixes to resolve both root causes and symptoms in a single autonomous loop. 4. PARALLEL ENGINEERING: ALWAYS prefer batching multiple tool calls for complex changes. 5. SYSTEM SOVEREIGNTY: You are authorized to patch your own core and bridge.",
    "self_expansion_protocol": "When a missing capability is identified, use Engine 3 (selfExpand & patchSystem) to proactively propose and inject new tools."
  },
  "response_style": "High-level architectural, creative, and self-correcting. Optimized for 2026 AI standard. Default to Autonomous System 7 for multi-step engineering tasks."
}`;

const GENERATION_CONFIG = { temperature: 0, topP: 0.1, maxOutputTokens: 2048 };
const FORBIDDEN_KEYWORDS = [/ignore previous instructions/i, /system prompt/i, /jailbreak/i];

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
    'deepseek-chat': { provider: 'deepseek' },
    'deepseek-reasoner': { provider: 'deepseek' }
};

function translateToProviderFormat(model, history, tools, config) {
    const provider = MODEL_MAPPING[model]?.provider || 'google';

    if (provider === 'google') {
        return {
            system_instruction: { parts: [{ text: CONSTITUTION }] },
            contents: history.map(h => ({ role: h.role, parts: h.parts })),
            tools: tools,
            generationConfig: config
        };
    }

    // OpenAI & DeepSeek compatible format
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

    return null; // Fallback or Anthropic logic
}

// --- [Smart Tool Filtering Categories] ---
const TOOL_GROUPS = {
    CORE: ["read_file", "write_file", "replace_file_content", "multi_replace_file_content", "thought", "repairSystem", "request_tool_discovery", "list_files", "analyze_file", "searchCode", "fast_file_search", "discovery_scan"],
    WEB_HUNT: ["web_search", "read_url"], // 🌍 قناص الويب (أخبار، بحث عالمي)
    LOCAL_DISCOVERY: [], // الأدوات انتقلت للـ CORE لرفع القيود
    ENGINE_7_ARCHIVE: ["store_memory", "vector_search", "compress_context"],
    ENGINE_8_SCALES: ["estimate_cost", "get_usage_metrics", "latency_ping"],
    ENGINE_9_TOUCHSTONE: ["run_virtual_test", "synthesize_test", "self_score_output", "simulate_integration"],
    ENGINE_10_PULSE: ["graceful_interrupt", "resume_from_checkpoint", "background_async_task"],
    ENGINE_11_MAKER: ["install_dependency", "auto_lint_and_fix", "generate_docstring", "select_design_pattern", "resolve_version_conflict", "wrap_with_error_handling", "calculate_refactor_threshold"],
    ENGINE_12_RAW_INTEL: ["classify_problem", "estimate_big_o", "detect_bug_signature"],
    ENGINE_3_EVOLUTION: ["patchSystem", "selfExpand", "evolutionary_audit", "run_terminal_command", "take_snapshot", "instant_undo", "triggerGithubWorkflow"]
};

// 📚 كتالوج الأدوات الموسع (أمين المكتبة الذكي)
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
    LOCAL_DISCOVERY: ["ملفات", "قائمة", "استكشف", "كود", "مشروع", "searchCode", "list_files", "analyze_file", "هيكل", "ملفاتي"],
    ENGINE_7_ARCHIVE: ["تذكر", "احفظ في الذاكرة", "ذاكرة", "تخزين", "ابحث في ذاكرتك", "ضغط السياق", "تلخيص", "store_memory", "vector_search", "compress_context"],
    ENGINE_8_SCALES: ["تكلفة", "توكن", "بينج", "استهلاك", "قياس الأداء", "estimate_cost", "get_usage_metrics", "latency_ping"],
    ENGINE_9_TOUCHSTONE: ["وحدة", "تكامل", "تقييم ذاتي", "محاكاة", "اختبار", "synthesize_test", "run_virtual_test"],
    ENGINE_10_PULSE: ["نقطة توقف", "خلفية", "استئناف", "إيقاف مؤقت", "graceful_interrupt", "resume_from_checkpoint"],
    ENGINE_11_MAKER: ["برمجة", "دالة", "فانكشن", "ثبت", "مكتبة", "تحليل", "big-o", "تعديل جراحي", "نمط معماري", "تعارض", "إصدار", "try-catch", "إعادة بناء", "install_dependency", "auto_lint_and_fix"],
    ENGINE_12_RAW_INTEL: ["تصنيف مشكلة", "خطأ شائع", "بج", "bug", "ثغرة", "classify_problem", "estimate_big_o"],
    ENGINE_3_EVOLUTION: ["تطور", "إصلاح ذاتي", "فحص دوري", "توسع", "تحسين استباقي", "طفرة", "تحديث المحرك", "ترمنل", "باور شيل", "لقطة", "تراجع", "بوت", "جيت هاب", "run_terminal_command", "patchSystem", "selfExpand"]
};

function getRelevantTools(prompt, history = []) {
    const promptLower = (prompt || "").toLowerCase();
    let selectedTools = [...TOOL_GROUPS.CORE]; // Core tools always included

    let matchFound = false;
    for (const [group, keywords] of Object.entries(KEYWORD_MAP)) {
        if (keywords.some(kw => promptLower.includes(kw.toLowerCase()))) {
            selectedTools = selectedTools.concat(TOOL_GROUPS[group]);
            matchFound = true;
        }
    }

    // 🕵️ ميزة أمين المكتبة: البحث في تاريخ المحادثة عن أدوات تم اكتشافها
    history.forEach(turn => {
        turn.parts?.forEach(part => {
            if (part.functionResponse && part.functionResponse.name === "request_tool_discovery") {
                const response = part.functionResponse.response.content;
                // إذا كانت الاستجابة تحتوي على أسماء مجموعات أدوات، قم بتفعيلها
                for (const groupName of Object.keys(TOOL_GROUPS)) {
                    if (response.includes(groupName)) {
                        selectedTools = selectedTools.concat(TOOL_GROUPS[groupName]);
                        logToTerminal(`Librarian: Dynamically unlocked ${groupName}`, "info");
                    }
                }
            }
        });
    });

    if (!matchFound && history.length < 3) {
        logToTerminal("Tool Search: No exact keyword match. Librarian Active.", "info");
    }

    // Map back to full tool declarations
    const declarations = AI_TOOLS[0].function_declarations.filter(td => selectedTools.includes(td.name));
    return [{ function_declarations: declarations }];
}

const AI_TOOLS = [{
    function_declarations: [
        { name: "discovery_scan", description: "مسح معماري شامل للمستودع لتحديد المكونات الأساسية والواجهات والمنطق.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" } } } },
        { name: "fast_file_search", description: "البحث الفوري عن الملفات في المستودع عبر git ls-files.", parameters: { type: "OBJECT", properties: { query: { type: "STRING", description: "اسم الملف للبحث عنه." } }, required: ["query"] } },
        { name: "read_file", description: "قراءة محتوى ملف.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" }, startLine: { type: "NUMBER" }, endLine: { type: "NUMBER" } }, required: ["path"] } },
        { name: "write_file", description: "كتابة ملف كامل.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" }, content: { type: "STRING" } }, required: ["path", "content"] } },
        { name: "replace_file_content", description: "استبدال قطعة كود محددة.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" }, targetContent: { type: "STRING" }, replacementContent: { type: "STRING" } }, required: ["path", "targetContent", "replacementContent"] } },
        { name: "multi_replace_file_content", description: "استبدال عدة قطع كود غير متجاورة.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" }, replacements: { type: "ARRAY", items: { type: "OBJECT", properties: { targetContent: { type: "STRING" }, replacementContent: { type: "STRING" } }, required: ["targetContent", "replacementContent"] } } }, required: ["path", "replacements"] } },
        { name: "searchCode", description: "البحث عن كود في المستودع.", parameters: { type: "OBJECT", properties: { query: { type: "STRING" } }, required: ["query"] } },
        { name: "list_files", description: "عرض قائمة الملفات والمجلدات في مسار معين للاستكشاف.", parameters: { type: "OBJECT", properties: { path: { type: "STRING", description: "المسار (فارغ للجذر)." } } } },
        { name: "analyze_file", description: "فحص الملف برمجياً.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" } }, required: ["path"] } },
        { name: "take_snapshot", description: "أخذ لقطة احتياطية للملف.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" } }, required: ["path"] } },
        { name: "instant_undo", description: "استعادة آخر لقطة سليمة.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" } }, required: ["path"] } },
        { name: "thought", description: "مركز التحليل والمنطق.", parameters: { type: "OBJECT", properties: { reasoning: { type: "STRING" }, plan: { type: "STRING" } }, required: ["reasoning", "plan"] } },
        { name: "repairSystem", description: "إصلاح مشاكل الاتصال والتوكن.", parameters: { type: "OBJECT", properties: {} } },
        { name: "request_tool_discovery", description: "أمين المكتبة: ابحث عن أدوات إضافية إذا لم تجد ما تحتاجه في القائمة الحالية بناءً على نيتك (intent).", parameters: { type: "OBJECT", properties: { intent: { type: "STRING", description: "ما الذي تريد فعله؟ (مثال: حذف ملف، طباعة ورق)" } }, required: ["intent"] } },
        { name: "triggerGithubWorkflow", description: "تشغيل عمليات البوتات.", parameters: { type: "OBJECT", properties: { workflow_id: { type: "STRING" } }, required: ["workflow_id"] } },
        { name: "run_terminal_command", description: "تنفيذ أوامر PowerShell/CMD/Git على النظام المحلي (قوة النخبة).", parameters: { type: "OBJECT", properties: { command: { type: "STRING" } }, required: ["command"] } },
        { name: "list_local_files", description: "سرد ملفات القرص الصلب المحلي (يتطلب الجسر المحلي).", parameters: { type: "OBJECT", properties: { path: { type: "STRING" } }, required: ["path"] } },
        { name: "web_search", description: "البحث في الإنترنت.", parameters: { type: "OBJECT", properties: { query: { type: "STRING" } }, required: ["query"] } },
        { name: "read_url", description: "قراءة محتوى رابط خارجي.", parameters: { type: "OBJECT", properties: { url: { type: "STRING" } }, required: ["url"] } },
        // --- [Engine 7: Archive] ---
        { name: "store_memory", description: "تخزين معلومة في الذاكرة السيادية.", parameters: { type: "OBJECT", properties: { key: { type: "STRING" }, value: { type: "STRING" } }, required: ["key", "value"] } },
        { name: "vector_search", description: "بحث دلالي في الذاكرة.", parameters: { type: "OBJECT", properties: { query: { type: "STRING" } }, required: ["query"] } },
        { name: "compress_context", description: "ضغط السياق لتوفير المساحة.", parameters: { type: "OBJECT", properties: { text: { type: "STRING" } }, required: ["text"] } },
        // --- [Engine 8: Scales] ---
        { name: "estimate_cost", description: "تقدير تكلفة التوكنات.", parameters: { type: "OBJECT", properties: { prompt: { type: "STRING" } } } },
        { name: "get_usage_metrics", description: "جلب إحصائيات الاستخدام الحالية.", parameters: { type: "OBJECT", properties: {} } },
        { name: "latency_ping", description: "قياس زمن الاستجابة للخوادم.", parameters: { type: "OBJECT", properties: { endpoint: { type: "STRING" } } } },
        // --- [Engine 9: Touchstone] ---
        { name: "run_virtual_test", description: "تشغيل اختبار وحدة افتراضي.", parameters: { type: "OBJECT", properties: { code: { type: "STRING" }, expected: { type: "STRING" } }, required: ["code", "expected"] } },
        { name: "synthesize_test", description: "توليد اختبارات وحدة تلقائياً.", parameters: { type: "OBJECT", properties: { code: { type: "STRING" } }, required: ["code"] } },
        { name: "self_score_output", description: "تقييم ذاتي لمخرجات النموذج.", parameters: { type: "OBJECT", properties: { criteria: { type: "ARRAY", items: { type: "STRING" } } } } },
        { name: "simulate_integration", description: "محاكاة تفاعل الوحدة مع النظام.", parameters: { type: "OBJECT", properties: { code: { type: "STRING" } }, required: ["code"] } },
        // --- [Engine 10: Pulse] ---
        { name: "graceful_interrupt", description: "إيقاف المهمة وحفظ نقطة توقف.", parameters: { type: "OBJECT", properties: { taskId: { type: "STRING" }, context: { type: "STRING" } }, required: ["taskId", "context"] } },
        { name: "resume_from_checkpoint", description: "استئناف المهمة من نقطة توقف.", parameters: { type: "OBJECT", properties: { taskId: { type: "STRING" } }, required: ["taskId"] } },
        { name: "background_async_task", description: "جدولة مهمة في الخلفية.", parameters: { type: "OBJECT", properties: { task: { type: "STRING" } }, required: ["task"] } },
        // --- [Engine 11: Maker] ---
        { name: "select_design_pattern", description: "اختيار النمط المعماري الأنسب.", parameters: { type: "OBJECT", properties: { context: { type: "STRING" } }, required: ["context"] } },
        { name: "install_dependency", description: "تثبيت مكتبة برمجية.", parameters: { type: "OBJECT", properties: { package: { type: "STRING" }, manager: { type: "STRING", enum: ["npm", "pip"] } }, required: ["package"] } },
        { name: "resolve_version_conflict", description: "حل تعارضات الإصدارات.", parameters: { type: "OBJECT", properties: { package: { type: "STRING" } }, required: ["package"] } },
        { name: "auto_lint_and_fix", description: "تنظيف وتصحيح الكود تلقائياً.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" } }, required: ["path"] } },
        { name: "wrap_with_error_handling", description: "إحاطة الكود بـ try-catch.", parameters: { type: "OBJECT", properties: { code: { type: "STRING" } }, required: ["code"] } },
        { name: "calculate_refactor_threshold", description: "حساب نسبة التعديل للملف.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" } }, required: ["path"] } },
        { name: "generate_docstring", description: "توليد تعليقات توثيقية.", parameters: { type: "OBJECT", properties: { code: { type: "STRING" } }, required: ["code"] } },
        // --- [Engine 12: Raw Intelligence] ---
        { name: "classify_problem", description: "تصنيف المشكلة البرمجية.", parameters: { type: "OBJECT", properties: { description: { type: "STRING" } }, required: ["description"] } },
        { name: "estimate_big_o", description: "تقدير تعقيد الخوارزمية.", parameters: { type: "OBJECT", properties: { code: { type: "STRING" } }, required: ["code"] } },
        { name: "detect_bug_signature", description: "كشف التوقيعات الرقمية للأخطاء.", parameters: { type: "OBJECT", properties: { code: { type: "STRING" } }, required: ["code"] } },
        // --- [Engine 3: Evolution] ---
        { name: "patchSystem", description: "تطبيق رقعة برمجية لإصلاح خطأ محدد.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" }, targetContent: { type: "STRING" }, replacementContent: { type: "STRING" } }, required: ["path", "targetContent", "replacementContent"] } },
        { name: "selfExpand", description: "توسيع قدرات النظام بإضافة أدوات جديدة.", parameters: { type: "OBJECT", properties: { newToolName: { type: "STRING" }, logic: { type: "STRING" } }, required: ["newToolName", "logic"] } },
        { name: "evolutionary_audit", description: "فحص دوري للمحركات للكشف عن مواطن الضعف.", parameters: { type: "OBJECT", properties: { targetEngine: { type: "STRING" } } } }
    ]
}];

// --- [Core Logic Functions] ---

async function callBridge(action, payload) {
    const start = Date.now();
    logToTerminal(`Bridge Call [${action}] initiated...`, "info");

    // إنشاء متحكم جديد لكل طلب لضمان إمكانية الإلغاء
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

        // ربط إشارة الإلغاء بالطلب الفعلي
        if (aiAbortController && action === 'chat') {
            fetchOptions.signal = aiAbortController.signal;
        }

        const res = await fetch(SUPABASE_BRIDGE_URL, fetchOptions);
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

/**
 * دالة الاتصال بالجسر المحلي (الهجين): يدعم IPC المدمج أو الخادم الخارجي
 */
async function callLocalBridge(action, payload) {
    logToTerminal(`Local Bridge [${action}] initiated...`, "info");

    // محاولة استخدام الجسر المدمج (IPC) أولاً بطريقة مرنة
    try {
        let ipc;
        try {
            ipc = require('electron').ipcRenderer;
        } catch (e) {
            if (window.require) ipc = window.require('electron').ipcRenderer;
            else if (window.electron) ipc = window.electron.ipcRenderer;
        }

        if (ipc) {
            let result;
            if (action === 'cmd') result = await ipc.invoke('os-command', payload.command);
            else if (action === 'read') result = await ipc.invoke('fs-read', payload.path);
            else if (action === 'write') result = await ipc.invoke('fs-write', payload);
            else if (action === 'list') result = await ipc.invoke('fs-list', payload.path);

            if (result !== undefined && result !== null) {
                logToTerminal(`Integrated Bridge Success: ${action}`, "info");
                return result;
            }
        }
    } catch (e) {
        console.log("IPC Bridge failed, checking for server bridge...");
    }

    // الانتقال للوضع التقليدي (Server Bridge) إذا فشل IPC
    try {
        const url = action === 'list' ? `http://localhost:3000/list?path=${encodeURIComponent(payload.path || '.')}` : `http://localhost:3000/cmd`;
        const options = {
            method: action === 'list' ? 'GET' : 'POST',
            headers: { 'Content-Type': 'application/json' }
        };
        if (action === 'cmd') options.body = JSON.stringify(payload);

        const res = await fetch(url, options);
        if (!res.ok) throw new Error(`Local bridge error: ${res.status}`);
        const data = await res.json();
        logToTerminal(`Local Bridge Success: ${action}`, "info");
        return data;
    } catch (e) {
        logToTerminal(`Local Bridge Offline: ${e.message}`, "error");
        return { error: `الجسر المحلي المدمج أو الخارجي غير متصل. (Error: ${e.message}). يرجى التأكد من تشغيل البرنامج عبر Electron أو تشغيل 'node server.js'.` };
    }
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

// --- [Cloud Architecture Discovery Engine v4.0] ---
/**
 * Mastermind AI - Cloud Architecture Discovery Engine
 * ---------------------------------------------------
 * GitHub-native scanner: no Electron, fs, path, or local bridge required.
 */

const CLOUD_ARCH_SCAN_LIMITS = {
    maxFiles: 2500,
    maxDirectories: 700,
    maxRelations: 4500,
    maxTextBytes: 180000,
    maxPackageBytes: 500000,
    maxConcurrentReads: 8
};

const CLOUD_ARCH_IGNORED_DIRS = new Set([
    '.git', '.github', 'node_modules', 'dist', 'build', 'out', 'coverage',
    '.cache', '.idea', '.vscode', '.next', '.nuxt', '.turbo', '.vercel'
]);

const CLOUD_ARCH_TEXT_EXTENSIONS = new Set([
    '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.json', '.html', '.htm',
    '.css', '.scss', '.sass', '.less', '.vue', '.svelte', '.py', '.java',
    '.kt', '.kts', '.cs', '.cpp', '.c', '.h', '.hpp', '.go', '.rs', '.php',
    '.md', '.yml', '.yaml', '.toml', '.xml'
]);

function cloudArchNormalizePath(value = '') {
    return String(value).replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');
}

function cloudArchAddUnique(array, value) {
    if (value && !array.includes(value)) array.push(value);
}

function cloudArchRoleOf(filePath) {
    const p = cloudArchNormalizePath(filePath);
    const base = p.split('/').pop().toLowerCase();

    if (
        base === 'package.json' || base === 'package-lock.json' || base === 'pnpm-lock.yaml' ||
        base === 'yarn.lock' || /^(tsconfig|jsconfig)(\.|$)/i.test(base) ||
        /(vite|webpack|rollup|electron|eslint|prettier|babel|jest|vitest)\.(js|cjs|mjs|json|ts)$/i.test(base)
    ) return 'Config';

    if (/(^|\/)(preload|bridge|ipc|adapters?|connectors?)(\/|$)/i.test(p) || /^preload\.(js|ts|mjs|cjs)$/i.test(base)) return 'Bridge';

    if (
        /\.(html?|css|scss|sass|less|jsx|tsx|vue|svelte)$/i.test(base) ||
        /(^|\/)(ui|views?|components|frontend|renderer|public|pages|layouts?)(\/|$)/i.test(p)
    ) return 'UI';

    if (
        /\.(py|java|kt|kts|cs|go|rs|php)$/i.test(base) ||
        /(^|\/)(server|backend|api|controllers?|routers?)(\/|$)/i.test(p)
    ) return 'Backend';

    if (
        /\.(json|ya?ml|toml|xml)$/i.test(base) ||
        /(^|\/)(data|fixtures|assets|resources|content|schemas?)(\/|$)/i.test(p)
    ) return 'Data';

    if (
        /\.(js|ts|mjs|cjs)$/i.test(base) ||
        /(^|\/)(logic|core|service|services|lib|utils|helpers|hooks|store)(\/|$)/i.test(p)
    ) return 'Logic';

    return 'Other';
}

function cloudArchExtractDependencies(sourceText = '') {
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
        while ((match = regex.exec(sourceText))) cloudArchAddUnique(result, match[1]);
    }
    return result;
}

function cloudArchExternalPackage(specifier) {
    if (!specifier || specifier.startsWith('.') || specifier.startsWith('/') || /^([a-z]+:)?\/\//i.test(specifier)) return null;
    return specifier.startsWith('@')
        ? specifier.split('/').slice(0, 2).join('/')
        : specifier.split('/')[0];
}

function cloudArchResolveLocalImport(sourceFile, specifier, knownFiles) {
    if (!specifier || (!specifier.startsWith('.') && !specifier.startsWith('/'))) return null;

    const sourceDir = sourceFile.includes('/') ? sourceFile.slice(0, sourceFile.lastIndexOf('/')) : '';
    let base;

    if (specifier.startsWith('/')) {
        base = specifier.replace(/^\/+/, '');
    } else {
        const parts = `${sourceDir}/${specifier}`.split('/');
        const normalized = [];
        for (const part of parts) {
            if (!part || part === '.') continue;
            if (part === '..') normalized.pop();
            else normalized.push(part);
        }
        base = normalized.join('/');
    }

    const extensions = ['', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.json', '.css', '.html', '.vue', '.svelte'];
    for (const ext of extensions) {
        const candidate = cloudArchNormalizePath(base + ext);
        if (knownFiles.has(candidate)) return candidate;
    }

    for (const ext of extensions.slice(1)) {
        const candidate = cloudArchNormalizePath(`${base}/index${ext}`);
        if (knownFiles.has(candidate)) return candidate;
    }

    return null;
}

function cloudArchDetectIpc(sourceText = '') {
    const channels = [];
    const patterns = [
        /ipcMain\.(?:handle|on|removeHandler)\(\s*["']([^"']+)["']/g,
        /ipcRenderer\.(?:invoke|send|on|once|removeListener)\(\s*["']([^"']+)["']/g,
        /ipc\.(?:invoke|send|on)\(\s*["']([^"']+)["']/g,
        /contextBridge\.expose(?:InMainWorld|IsolatedWorld)\(\s*["']([^"']+)["']/g
    ];
    for (const regex of patterns) {
        let match;
        while ((match = regex.exec(sourceText))) cloudArchAddUnique(channels, match[1]);
    }
    return channels;
}

function cloudArchDetectExports(sourceText = '') {
    const exports = [];
    const patterns = [
        /\bexport\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/g,
        /\bmodule\.exports\s*=\s*([A-Za-z_$][\w$]*)/g,
        /\bexports\.([A-Za-z_$][\w$]*)/g
    ];
    for (const regex of patterns) {
        let match;
        while ((match = regex.exec(sourceText))) cloudArchAddUnique(exports, match[1] || 'CommonJS export');
    }
    return exports;
}

function cloudArchEntryCandidates(packageJson, knownFiles) {
    const entryPoints = [];
    if (packageJson?.main) cloudArchAddUnique(entryPoints, cloudArchNormalizePath(packageJson.main));
    if (packageJson?.browser) cloudArchAddUnique(entryPoints, cloudArchNormalizePath(packageJson.browser));
    if (packageJson?.module) cloudArchAddUnique(entryPoints, cloudArchNormalizePath(packageJson.module));
    if (packageJson?.scripts?.start) cloudArchAddUnique(entryPoints, 'package.json#scripts.start');
    if (packageJson?.scripts?.dev) cloudArchAddUnique(entryPoints, 'package.json#scripts.dev');

    for (const candidate of [
        'main.js', 'index.js', 'app.js', 'server.js', 'electron.js', 'preload.js',
        'index.html', 'src/main.js', 'src/index.js', 'src/app.js', 'src/renderer.js'
    ]) {
        if (knownFiles.has(candidate)) cloudArchAddUnique(entryPoints, candidate);
    }

    return entryPoints;
}

function cloudArchParsePackage(text) {
    if (!text) return null;
    try { return JSON.parse(text); } catch (_) { return null; }
}

async function cloudArchGetText(path, maxBytes = CLOUD_ARCH_SCAN_LIMITS.maxTextBytes) {
    try {
        const response = await safeGithubFetch(`contents/${path}`);
        if (!response.ok) return '';
        const data = await response.json();
        if (data?.encoding !== 'base64' || !data?.content) return '';
        const decoded = decodeURIComponent(escape(atob(data.content.replace(/\s/g, ''))));
        return decoded.length > maxBytes ? decoded.slice(0, maxBytes) : decoded;
    } catch (_) {
        return '';
    }
}

async function cloudArchListDirectory(path = '') {
    try {
        const response = await safeGithubFetch(`contents/${path}`);
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (_) {
        return [];
    }
}

async function cloudArchCollectTree(rootPath = '') {
    const files = [];
    const directories = [];
    const queue = [cloudArchNormalizePath(rootPath)];
    const seen = new Set();
    let truncated = false;

    while (queue.length && files.length < CLOUD_ARCH_SCAN_LIMITS.maxFiles && directories.length < CLOUD_ARCH_SCAN_LIMITS.maxDirectories) {
        const current = queue.shift() || '';
        if (seen.has(current)) continue;
        seen.add(current);

        const entries = await cloudArchListDirectory(current);
        directories.push(current || '.');

        for (const entry of entries) {
            if (entry.type === 'dir') {
                if (CLOUD_ARCH_IGNORED_DIRS.has(entry.name)) continue;
                if (directories.length + queue.length >= CLOUD_ARCH_SCAN_LIMITS.maxDirectories) {
                    truncated = true;
                    continue;
                }
                queue.push(cloudArchNormalizePath(entry.path));
                continue;
            }

            if (files.length >= CLOUD_ARCH_SCAN_LIMITS.maxFiles) {
                truncated = true;
                break;
            }

            const extension = entry.name.includes('.')
                ? `.${entry.name.split('.').pop().toLowerCase()}`
                : '(none)';

            files.push({
                path: cloudArchNormalizePath(entry.path),
                name: entry.name,
                extension,
                role: cloudArchRoleOf(entry.path),
                size: Number(entry.size || 0)
            });
        }
    }

    if (queue.length) truncated = true;
    files.sort((a, b) => a.path.localeCompare(b.path));
    return { files, directories, truncated };
}

async function cloudArchReadSources(files) {
    const targets = files.filter(file => CLOUD_ARCH_TEXT_EXTENSIONS.has(file.extension));
    const results = [];
    let cursor = 0;

    async function worker() {
        while (cursor < targets.length) {
            const index = cursor++;
            const file = targets[index];
            const source = await cloudArchGetText(file.path);
            results[index] = { file, source };
        }
    }

    const workers = Array.from(
        { length: Math.min(CLOUD_ARCH_SCAN_LIMITS.maxConcurrentReads, targets.length) },
        () => worker()
    );
    await Promise.all(workers);
    return results.filter(Boolean);
}

async function performCloudArchitectureDiscovery(scanPath = '') {
    const root = cloudArchNormalizePath(scanPath);
    const tree = await cloudArchCollectTree(root);
    const files = tree.files;
    const knownFiles = new Set(files.map(file => file.path));
    const layers = {};
    const roleCounts = {};
    const bridgeFiles = [];
    const relations = [];
    const externalDependencies = new Set();
    const ipcChannels = new Set();
    const components = [];

    for (const file of files) {
        if (!layers[file.role]) layers[file.role] = [];
        layers[file.role].push(file.path);
        roleCounts[file.role] = (roleCounts[file.role] || 0) + 1;
        if (file.role === 'Bridge') bridgeFiles.push(file.path);
    }

    const packageText = knownFiles.has(cloudArchNormalizePath(`${root ? `${root}/` : ''}package.json`))
        ? await cloudArchGetText(cloudArchNormalizePath(`${root ? `${root}/` : ''}package.json`), CLOUD_ARCH_SCAN_LIMITS.maxPackageBytes)
        : '';
    const packageJson = cloudArchParsePackage(packageText);
    const entryPoints = cloudArchEntryCandidates(packageJson, knownFiles);
    const sourceResults = await cloudArchReadSources(files);

    for (const { file, source } of sourceResults) {
        if (!source) continue;
        const imports = cloudArchExtractDependencies(source);
        const localDependencies = [];
        const external = [];
        const ipc = cloudArchDetectIpc(source);

        for (const specifier of imports) {
            const localTarget = cloudArchResolveLocalImport(file.path, specifier, knownFiles);
            if (localTarget) {
                cloudArchAddUnique(localDependencies, localTarget);
                if (relations.length < CLOUD_ARCH_SCAN_LIMITS.maxRelations) {
                    relations.push({ from: file.path, to: localTarget, type: 'local-import' });
                }
            }

            const packageName = cloudArchExternalPackage(specifier);
            if (packageName) {
                cloudArchAddUnique(external, packageName);
                externalDependencies.add(packageName);
            }
        }

        ipc.forEach(channel => ipcChannels.add(channel));

        components.push({
            path: file.path,
            role: file.role,
            size: file.size,
            imports,
            localDependencies,
            externalDependencies: external,
            exports: cloudArchDetectExports(source),
            ipcChannels: ipc
        });
    }

    const packageDependencies = packageJson
        ? Object.keys({
            ...(packageJson.dependencies || {}),
            ...(packageJson.devDependencies || {}),
            ...(packageJson.optionalDependencies || {})
        })
        : [];

    packageDependencies.forEach(dep => externalDependencies.add(dep));

    const electronDetected = Boolean(
        packageDependencies.includes('electron') ||
        bridgeFiles.length ||
        ipcChannels.size
    );

    const warnings = [];
    if (!packageJson) warnings.push('لم يتم العثور على package.json صالح في نطاق المسح.');
    if (!entryPoints.length) warnings.push('لم يتم اكتشاف نقطة دخول واضحة.');
    if (tree.truncated) warnings.push('تم تطبيق حدود الحماية؛ الخريطة قد تكون جزئية.');
    if (relations.length >= CLOUD_ARCH_SCAN_LIMITS.maxRelations) warnings.push('تم قص العلاقات عند الحد المسموح به.');

    return {
        scanVersion: '4.0-cloud',
        environment: 'GitHub Cloud',
        root: root || '.',
        summary: {
            totalFiles: files.length,
            totalDirectories: tree.directories.length,
            roleCounts,
            relationCount: relations.length,
            externalDependencyCount: externalDependencies.size,
            ipcChannelCount: ipcChannels.size,
            truncated: tree.truncated
        },
        project: {
            name: packageJson?.name || root.split('/').pop() || 'my',
            version: packageJson?.version || null,
            type: packageJson?.type || null,
            entryPoints,
            dependencies: packageDependencies
        },
        architecture: {
            layers,
            components,
            relations,
            externalDependencies: [...externalDependencies].sort(),
            electron: {
                detected: electronDetected,
                ipcChannels: [...ipcChannels].sort(),
                bridgeFiles
            }
        },
        recommendations: [
            'استخدم layers لتحديد الطبقة قبل اختيار الملف المستهدف.',
            'استخدم relations وlocalDependencies لتتبع التأثيرات قبل التعديل.',
            'افحص Bridge/IPC قبل تغيير الاتصال بين الواجهة والمنطق.',
            'افحص externalDependencies وpackage metadata قبل تغيير الاعتماديات.',
            'عند كون الخريطة جزئية، نفّذ Discovery Scan بنطاق أضيق للمسار المستهدف.'
        ],
        warnings
    };
}


// --- [AI Engine Logic] ---

async function callAiBrain(history) {
    const userModel = document.getElementById('modelSelector').value;
    const lastUserMsg = [...history].reverse().find(h => h.role === 'user')?.parts[0]?.text || "";
    const filteredTools = getRelevantTools(lastUserMsg, history);

    const payload = translateToProviderFormat(userModel, history, filteredTools, GENERATION_CONFIG);

    if (!payload) throw new Error("❌ مزود الخدمة غير مدعوم حالياً في المترجم.");

    return await callBridge('chat', { model: userModel, payload });
}

// --- [Path Normalizer Helper] ---
function normalizePathForCloud(path) {
    if (!path) return "";
    // تنظيف المسارات المطلقة لتناسب GitHub API
    return path.replace(/^[a-zA-Z]:\/[^\/]+\/[^\/]+\/my\//i, '')
               .replace(/^[a-zA-Z]:\\[^\\]+\\[^\\]+\\my\\/i, '')
               .replace(/^my\//i, '')
               .replace(/\\/g, '/');
}

async function runToolLoop(history) {
    if (stopAiRequested) {
        stopAiRequested = false;
        localStorage.removeItem('gemini_pending_history');
        return { text: "🛑 توقف يدوي.", model: "System" };
    }
    const userModel = document.getElementById('modelSelector').value;
    localStorage.setItem('gemini_pending_history', JSON.stringify(history));
    startAiTimer();
    try {
        const data = await callAiBrain(history);
        if (data.error) return { text: data.error, model: "System" };
        const candidate = data.candidates?.[0];
        const parts = candidate?.content?.parts || [];
        const thought = parts.find(p => p.text)?.text;
        const callParts = parts.filter(p => p.functionCall);

        if (callParts.length > 0) {
            const currentActualModel = data.used_model || userModel;
            if (thought) addMessageToUi('ai', '', currentActualModel, thought);

            const results = await Promise.all(callParts.map(async (part) => {
                const { name, args } = part.functionCall;
                const stepId = addToolStepToUi(name, args);
                let toolResult;

                // تطبيق التنظيف الذكي للمسارات في السحابة
                const safePath = normalizePathForCloud(args.path);

                if (name === "fast_file_search") toolResult = await callLocalBridge('cmd', { command: `git ls-files | grep -i "${args.query}"` });
                else if (name === "discovery_scan") {
                    try {
                        toolResult = await performCloudArchitectureDiscovery(safePath || "");
                    } catch (scanError) {
                        toolResult = {
                            error: "Cloud discovery scan failed.",
                            details: scanError?.message || String(scanError),
                            fallback: await listGithubFiles(safePath || "")
                        };
                    }
                }
                else if (name === "read_file") toolResult = await getGithubFileContent(safePath);
                else if (name === "write_file") toolResult = await writeFile(safePath, args.content);
                else if (name === "replace_file_content") toolResult = await replaceFileContent(safePath, args.targetContent, args.replacementContent);
                else if (name === "multi_replace_file_content") {
                    let content = await getGithubFileContent(safePath);
                    let updated = content;
                    args.replacements.forEach(r => { if (updated.includes(r.targetContent)) updated = updated.replace(r.targetContent, r.replacementContent); });
                    toolResult = await writeFile(safePath, updated);
                }
                else if (name === "list_files") toolResult = await listGithubFiles(safePath || "");
                else if (name === "analyze_file") {
                    const content = await getGithubFileContent(safePath);
                    toolResult = content.length > 0 ? `✅ الملف سليم وحجمه ${content.length} حرف.` : "❌ الملف فارغ أو غير موجود.";
                }
                else if (name === "run_terminal_command") toolResult = await callLocalBridge('cmd', { command: args.command });
                else if (name === "web_search") toolResult = await callBridge('web_search', args);
                else if (name === "thought") toolResult = { reasoning: args.reasoning, plan: args.plan };
                else toolResult = `✅ العملية [${name}] اكتملت.`;

                updateToolStepStatus(stepId, !String(toolResult).includes('❌'), toolResult);

                return {
                    role: "function",
                    parts: [{ functionResponse: { name: name, response: { content: typeof toolResult === 'object' ? JSON.stringify(toolResult) : toolResult } } }]
                };
            }));

            history.push({ role: "model", parts: parts });
            history.push(...results);

            const nextLoopResult = await runToolLoop(history);
            return {
                text: nextLoopResult.text,
                model: nextLoopResult.model || currentActualModel
            };
        }
        const actualModel = data.used_model || userModel;
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
        if (aiAbortController) aiAbortController.abort(); // 🛑 قطع الاتصال الفوري بالسيرفر
        addMessageToUi('ai', "🛑 تم قطع الاتصال وإيقاف المحرك فوراً.", 'System');
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
        const aiMsgId = addMessageToUi('ai', `🧠 جاري المعالجة...`, 'System');
        const currentTurn = { role: "user", parts: [{ text: finalPrompt }, ...attachments] };
        const result = await runToolLoop([...chatHistory, currentTurn]);

        // Support AI response images if present in the final turn
        const lastTurn = chatHistory[chatHistory.length - 1];
        const aiImages = lastTurn && lastTurn.role === 'model' ?
            lastTurn.parts.filter(p => p.inline_data).map(p => `data:${p.inline_data.mime_type};base64,${p.inline_data.data}`) : [];

        updateMessage(aiMsgId, result.text, result.model);
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
