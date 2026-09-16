/**
 * VSA Academy - Mastermind AI Core Logic
 * --------------------------------------------------
 * هذا الملف يتولى العمليات الحسابية والمنطقية والاتصال بـ Gemini API.
 */

const SUPABASE_URL = 'https://ozcffmadatsfyyldqmdl.supabase.co';
const SUPABASE_KEY = (typeof window !== 'undefined' && typeof window.__SUPABASE_PUBLIC_KEY__ === 'string') ? window.__SUPABASE_PUBLIC_KEY__ : '';
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
  "constitution_version": "2026.4-agent-operating-constitution",
  "role": "Mastermind - Sovereign Omni-Architect & Autonomous Software Engineer",
  "identity": "VSA Academy Meta-Cognitive Engineering Core",
  "operating_principle": "The model proposes actions through Function Calls; the runtime executes those functions; execution results become evidence for the next model decision. Never treat generated text as proof that an action occurred.",
  "truth_contract": "Never claim a file was changed, a command ran, a test passed, a repair succeeded, or a mission is complete without corresponding tool or runtime evidence. Unknown is not success.",
  "agent_operating_loop": "For every non-trivial engineering mission operate as a closed loop: Discovery -> Architecture Understanding -> Constraint Analysis -> Architecture Planning -> Design -> Function-Call Implementation -> Validation -> Evidence Evaluation -> Repair if needed -> Re-discovery -> Final Verdict.",
  "discovery_first": "Before non-trivial changes, run discovery_scan and inspect the architectural map. Use list_files or list_local_files for local structure and fast_file_search/searchCode for targeted retrieval. Never infer that a file is missing from a single failed lookup.",
  "architecture_as_source_of_truth": "Treat the returned architecture model, dependency graph, boundaries, entry points, IPC channels, external dependencies, runtime topology, and warnings as the current engineering source of truth. If evidence contradicts the model, re-scan before continuing.",
  "constraints": "Preserve public APIs, data, working behavior, security boundaries, deployment compatibility, and project conventions unless the explicit objective requires change. Minimize unnecessary dependencies and unrelated edits.",
  "function_execution": "Use Function Calls for real operations. Inspect before writes; write_file or surgical replacement for implementation; analyze_file after meaningful edits; execute terminal or runtime operations only through the provided bridge. Parallelize only independent operations.",
  "write_safety": "Never overwrite a file with replacement-only content. Prefer surgical replacements for localized edits. Verify writes actually succeeded before treating changed=true as evidence. Preserve reversibility for risky changes when snapshots or undo are available.",
  "cross_file_engineering": "When a change crosses UI, Logic, Bridge, API, Data, Config, or Electron boundaries, inspect producer and consumer sides and update the smallest coherent set of files. Do not fix only the visible symptom when an architectural root cause is evidenced.",
  "validation": "After coherent implementation batches, validate syntax/imports/contracts and run available tests, build, lint, or typecheck. When runtime verification is available, use empirical execution, process and port health, API smoke tests, logs, and failure classification.",
  "api_validation": "When APIs or integration endpoints are involved, use API contract and integration testing where available. Respect safe negative tests and do not enable mutating tests without explicit authorization.",
  "evidence_gate": "A mission is accepted only when required evidence gates pass: explicit objective, architecture plan, successful implementation evidence when a change was intended, functional verification when verification is enabled, successful post-discovery, and no unresolved failure. Verdicts are accepted, partial/needs_review, or failed.",
  "repair_protocol": "On failure, classify the first evidenced root cause, repair the smallest safe surface, re-run affected verification, then perform fresh discovery when boundaries or dependencies changed. Stop further writes when repairs do not converge or repository evidence contradicts the current architecture model.",
  "architecture_drift": "Use pre/post architecture fingerprints or architecture diffs to detect added, removed, or changed components and dependencies. Treat unexplained high-risk drift as a review gate rather than silently accepting it.",
  "security": "Never place Supabase secret or service credentials, model API keys, GitHub tokens, search keys, or other backend secrets in public source, prompts intended for clients, browser bundles, or desktop client configuration. Client code may use only public or publishable configuration. Sensitive external credentials belong in secure backend or Edge Function secrets.",
  "supabase_bridge": "Use the Supabase Edge Function bridge as the backend boundary for Gemini, GitHub, and Search credentials. Do not bypass the bridge by embedding or reconstructing secret credentials in client-side code.",
  "security_changes": "Do not disable authentication, revoke or rotate credentials, alter security policy, or change production secrets merely because the model thinks it is appropriate. Perform such changes only with explicit authorization and a verified execution path.",
  "self_evolution": "When a capability is genuinely missing, first discover an existing tool. If extension is justified, propose a minimal self-expansion through the evolution engine, preserve backward compatibility, validate the new capability, and never silently rewrite the constitution to hide a failure.",
  "Universal Skill System constitution contract": true,
  "universal_skill_synthesis": "For external or local expert sources, extract source evidence, synthesize a declarative draft Skill, validate provenance/schema/safety, and keep it as draft until explicitly activated. Never execute imported source code as part of synthesis.",
  "universal_skill_system": "Skills are first-class declarative capabilities. Discover existing skills before creating duplicates; validate provenance, schema, safety, version, workflow, and evidence requirements before activation. Skills may be imported from GitHub or local files, composed for a task, disabled or quarantined, and upgraded without allowing arbitrary skill code execution.",
  "memory": "Use Sovereign Memory only for durable engineering patterns or user-approved knowledge. A correction becomes a reusable protocol only after successful verification; do not store unverified assumptions as fact.",
  "encoding_integrity": "If runtime returns unreadable placeholder characters such as ???? and evidence indicates an encoding mismatch, stop repeated blind retries and report the environment limitation until a safe alternate path is available.",
  "tool_discovery": "If the current filtered tool set cannot satisfy the objective, use request_tool_discovery rather than inventing a function name or claiming unavailable capability.",
  "interrupt_resume": "Honor graceful_interrupt and resume_from_checkpoint semantics; preserve mission state and evidence context before pausing or resuming multi-step work.",
  "environment": "GitHub Cloud via repository tools and the Supabase bridge",
  "environment_execution": "Repository operations use read_file/write_file/replace_file_content and discovery/runtime tools. Never imply native Windows control is available in Cloud.",
  "response_style": "Decisive, evidence-driven, architecturally aware, transparent about uncertainty. Default to the closed Agent Operating Loop for multi-step engineering tasks."
}
`;

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
    CORE: ["skill_manager", "architecture_loop", "runtime_verify", "read_file", "write_file", "replace_file_content", "multi_replace_file_content", "thought", "repairSystem", "request_tool_discovery", "list_files", "analyze_file", "searchCode", "fast_file_search", "discovery_scan"],
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
    ENGINE_3_EVOLUTION: ["تطور", "إصلاح ذاتي", "فحص دوري", "توسع", "تحسين استباقي", "طفرة", "تحديث المحرك", "ترمنل", "باور شيل", "لقطة", "تراجع", "بوت", "جيت هاب", "run_terminal_command", "patchSystem", "selfExpand", "runtime_verify", "empirical runtime", "تشغيل المشروع", "تشغيل الاختبارات"]
};

function getRelevantTools(prompt, history = []) {
    const text = String(prompt || '').toLowerCase();
    const selected = new Set(TOOL_GROUPS.CORE || []);
    const matchedGroups = new Map();

    // Confidence-aware local Intent Router.
    // No extra model call: routing remains deterministic and zero-round-trip.
    const INTENT_PROFILES = {
        WEB_HUNT: ['بحث', 'سيرش', 'غوغل', 'قوقل', 'ويب', 'الانترنت', 'الإنترنت', 'رابط', 'موقع', 'أخبار', 'خبر', 'فوركس', 'تداول', 'اقتصاد', 'اسعار', 'أسعار', 'news', 'search', 'web', 'url', 'forex', 'crypto'],
        LOCAL_DISCOVERY: ['ملفات', 'ملفاتي', 'ملف', 'مشروع', 'كود', 'كودات', 'هيكل', 'استكشف', 'بحث داخل', 'ابحث في الملفات', 'قرص', 'بارتيشن', 'c:', 'd:', 'e:', 'file', 'files', 'project', 'codebase', 'repository'],
        ENGINE_7_ARCHIVE: ['ذاكرة', 'تذكر', 'احفظ', 'تخزين', 'استرجع', 'سياق', 'تلخيص', 'memory', 'remember', 'store', 'retrieve', 'context'],
        ENGINE_8_SCALES: ['تكلفة', 'توكن', 'استهلاك', 'اداء', 'أداء', 'زمن', 'تأخير', 'سرعة', 'latency', 'cost', 'tokens', 'usage', 'metrics', 'performance'],
        ENGINE_9_TOUCHSTONE: ['اختبار', 'اختبر', 'تأكد', 'تحقق', 'محاكاة', 'وحدة', 'تكامل', 'test', 'verify', 'validation', 'simulation', 'integration'],
        ENGINE_10_PULSE: ['توقف', 'استئناف', 'نقطة توقف', 'خلفية', 'مهمة خلفية', 'مؤقت', 'إيقاف مؤقت', 'interrupt', 'resume', 'checkpoint', 'background', 'async'],
        ENGINE_11_MAKER: ['برمجة', 'دالة', 'فانكشن', 'مكتبة', 'تثبيت', 'ثبت', 'اعتماد', 'dependency', 'lint', 'refactor', 'نمط معماري', 'تعارض', 'إصدار', 'try-catch', 'design pattern', 'package'],
        ENGINE_12_RAW_INTEL: ['تصنيف مشكلة', 'تصنيف الخطأ', 'bug', 'بج', 'خطأ', 'ثغرة', 'تعقيد', 'big-o', 'problem classification', 'bug signature'],
        ENGINE_3_EVOLUTION: ['تطور', 'إصلاح ذاتي', 'إصلاح النظام', 'توسع', 'تحسين استباقي', 'طفرة', 'تحديث المحرك', 'ترمنل', 'طرفية', 'باور شيل', 'powershell', 'cmd', 'جيت هاب', 'github', 'لقطة', 'تراجع', 'تشغيل المشروع', 'تشغيل الاختبارات', 'فتح برنامج', 'ويندوز', 'file explorer', 'terminal'],
        ENGINE_6_CONNECTORS: ['موصل', 'كونكتور', 'plugin', 'connector', 'github action', 'external app']
    };

    const addScore = (group, score, reason) => {
        if (!TOOL_GROUPS[group]) return;
        const current = matchedGroups.get(group) || { score: 0, reasons: [] };
        current.score += score;
        if (reason && !current.reasons.includes(reason)) current.reasons.push(reason);
        matchedGroups.set(group, current);
    };

    // 1) Explicit tool names are the strongest signal.
    for (const [group, tools] of Object.entries(TOOL_GROUPS)) {
        for (const tool of (tools || [])) {
            if (tool && text.includes(String(tool).toLowerCase())) addScore(group, 6, `tool:${tool}`);
        }
    }

    // 2) Local intent profiles.
    for (const [group, signals] of Object.entries(INTENT_PROFILES)) {
        for (const signal of signals) {
            if (text.includes(signal.toLowerCase())) addScore(group, 2, `signal:${signal}`);
        }
    }

    // 3) Existing keyword layer remains a compatibility/fast-path signal.
    for (const [group, keywords] of Object.entries(KEYWORD_MAP || {})) {
        for (const keyword of (keywords || [])) {
            if (text.includes(String(keyword).toLowerCase())) addScore(group, 1, `keyword:${keyword}`);
        }
    }

    // 4) Extended catalog aliases participate in routing.
    for (const [alias, entry] of Object.entries(EXTENDED_TOOLBOX_CATALOG || {})) {
        if (text.includes(String(alias).toLowerCase()) && entry?.group) addScore(entry.group, 3, `catalog:${alias}`);
    }

    const ranked = [...matchedGroups.entries()]
        .filter(([group]) => group !== 'CORE' && Array.isArray(TOOL_GROUPS[group]))
        .sort((a, b) => b[1].score - a[1].score);
    const top = ranked[0]?.[1]?.score || 0;
    const second = ranked[1]?.[1]?.score || 0;
    const gap = Math.max(0, top - second);

    // Explicit/discovered groups are always allowed to survive confidence routing.
    for (const [group] of ranked) {
        if ((matchedGroups.get(group)?.reasons || []).some(r => r.startsWith('tool:'))) {
            for (const tool of TOOL_GROUPS[group]) selected.add(tool);
        }
    }

    // High confidence: narrow routing.
    // Medium confidence: broaden to the strongest few intents.
    // Low confidence: fail open instead of becoming a gatekeeper.
    let mode = 'low';
    if (top >= 8 && gap >= 2) {
        mode = 'high';
        for (const [group] of ranked.slice(0, 2)) for (const tool of TOOL_GROUPS[group]) selected.add(tool);
    } else if (top >= 4) {
        mode = 'medium';
        for (const [group, info] of ranked) {
            if (info.score >= Math.max(2, top - 2)) for (const tool of TOOL_GROUPS[group]) selected.add(tool);
        }
    } else {
        // Ambiguous task: expose all groups rather than hide the right capability.
        for (const [group, tools] of Object.entries(TOOL_GROUPS)) {
            if (group === 'CORE') continue;
            for (const tool of (tools || [])) selected.add(tool);
        }
    }

    // Preserve capabilities discovered earlier in the same conversation.
    for (const turn of history) {
        for (const part of (turn.parts || [])) {
            if (!part.functionResponse || part.functionResponse.name !== 'request_tool_discovery') continue;
            const response = String(part.functionResponse.response?.content || '');
            for (const groupName of Object.keys(TOOL_GROUPS)) {
                if (response.includes(groupName)) {
                    for (const tool of TOOL_GROUPS[groupName]) selected.add(tool);
                }
            }
        }
    }

    const declarations = AI_TOOLS[0].function_declarations.filter(td => selected.has(td.name));
    logToTerminal(`Intent Router: mode=${mode}, top=${top}, gap=${gap}, tools=${declarations.length}`, 'info');
    return [{ function_declarations: declarations }];
}


/** Universal API Contract & Integration Testing Engine 1.0 */
const UNIVERSAL_API_TESTING_VERSION='1.0-contract-integration';
const apiArray=v=>Array.isArray(v)?v:[];
const apiObj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const apiStr=v=>typeof v==='string'?v:'';
function apiRedact(v){let s=typeof v==='string'?v:JSON.stringify(v??'');return s.replace(/(api[_-]?key|token|secret|password|authorization|bearer)\s*[:=]\s*([^\s,;]+)/gi,'$1=[REDACTED]').replace(/(sk-[A-Za-z0-9_-]{10,})/g,'[REDACTED_KEY]');}
function apiJoin(base,path){return `${String(base||'').replace(/\/$/,'')}/${String(path||'').replace(/^\//,'')}`.replace(/([^:]\/)\/+/g,'$1');}
function apiSample(schema={},name='value'){schema=apiObj(schema);if(schema.example!==undefined)return schema.example;if(schema.default!==undefined)return schema.default;if(apiArray(schema.enum).length)return schema.enum[0];if(schema.oneOf)return apiSample(schema.oneOf[0],name);if(schema.anyOf)return apiSample(schema.anyOf[0],name);if(schema.type==='object'||schema.properties){const o={};for(const [k,v] of Object.entries(apiObj(schema.properties)))o[k]=apiSample(v,k);return o;}if(schema.type==='array')return[apiSample(schema.items||{},name)];if(schema.type==='integer'||schema.type==='number')return 1;if(schema.type==='boolean')return true;return name==='email'?'test@example.com':'test';}
function apiResolveSchema(root,s){if(typeof s==='string'&&s.startsWith('#/')){let x=root;for(const p of s.slice(2).split('/'))x=x?.[p];return x||{};}return apiObj(s);}
function apiYamlScalar(v){v=String(v||'').trim();if(v==='true')return true;if(v==='false')return false;if(v==='null'||v==='~')return null;if(/^[-+]?\d+(\.\d+)?$/.test(v))return Number(v);if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))return v.slice(1,-1);if(v.startsWith('[')&&v.endsWith(']')){try{return JSON.parse(v.replace(/'/g,'"'));}catch{return v;}}return v;}
function apiYamlToJson(text){const lines=String(text||'').split(/\r?\n/).filter(l=>l.trim()&&!/^\s*#/.test(l));const root={};const stack=[{indent:-1,obj:root}];for(const raw of lines){const indent=(raw.match(/^\s*/)||[''])[0].length;const line=raw.trim();if(line==='---')continue;while(stack.length>1&&indent<=stack[stack.length-1].indent)stack.pop();let m=line.match(/^([^:#][^:]*):\s*(.*)$/);if(m){const key=m[1].trim(),val=m[2].trim(),parent=stack[stack.length-1].obj;if(val){parent[key]=apiYamlScalar(val);}else{parent[key]={};stack.push({indent,obj:parent[key]});continue;}}else if(line.startsWith('- ')){const parent=stack[stack.length-1].obj;if(!Array.isArray(parent.__items))parent.__items=[];parent.__items.push(apiYamlScalar(line.slice(2)));}}return root;}
function apiExtractOpenApi(doc){doc=apiObj(doc);const paths=apiObj(doc.paths),out=[];for(const [path,itemRaw] of Object.entries(paths)){const item=apiObj(itemRaw);for(const method of ['get','post','put','patch','delete','head','options']){if(!item[method])continue;const op=apiObj(item[method]),params=[...apiArray(item.parameters),...apiArray(itemRaw.parameters)];const req=apiObj(op.requestBody);const content=apiObj(req.content);const json=content['application/json']||content['application/*+json'];const statuses=Object.keys(apiObj(op.responses));const expected=Number(statuses.find(s=>/^2\d\d$/.test(s))||200);out.push({source:'openapi',method:method.toUpperCase(),path,operationId:apiStr(op.operationId)||null,summary:apiStr(op.summary)||null,parameters:params,requestSchema:json?.schema||null,expectedStatus:expected,expectedStatuses:statuses.filter(s=>/^\d{3}$/.test(s)).map(Number),responses:op.responses||{},security:op.security??doc.security??null,openApiDocument:doc});}}return out;}
function apiExtractRoutes(source,sourcePath){const out=[];const r=/\b(?:app|router|server|fastify)\.(get|post|put|patch|delete|head|options)\s*\(\s*[`'\"]([^`'\"]+)[`'\"]/gi;let m;while((m=r.exec(source)))out.push({source:'route-scan',sourcePath,method:m[1].toUpperCase(),path:m[2],expectedStatus:200});return out;}
async function apiDiscover(options={}){const execute=options.execute;if(typeof execute!=='function')return{available:false,error:'No command executor supplied.'};const root=String(options.root||'.');const script=`const fs=require('fs'),path=require('path');const root=${JSON.stringify(root)};const skip=new Set(['node_modules','.git','.next','dist','build','coverage']);const specs=[];const routes=[];function walk(d){let es=[];try{es=fs.readdirSync(d,{withFileTypes:true});}catch{return;}for(const e of es){if(skip.has(e.name))continue;const p=path.join(d,e.name);if(e.isDirectory()){walk(p);continue;}const rel=path.relative(root,p).replace(/\\/g,'/');if(/^(openapi|swagger)(\\.(json|ya?ml))$/i.test(e.name)||/api\\.(json|ya?ml)$/i.test(e.name)){try{specs.push({path:rel,text:fs.readFileSync(p,'utf8').slice(0,1000000)});}catch{}}if(/\\.(js|mjs|cjs|ts|tsx)$/.test(e.name)){try{const t=fs.readFileSync(p,'utf8');if(/\\b(app|router|server|fastify)\\.(get|post|put|patch|delete|head|options)\\s*\\(/.test(t))routes.push({path:rel,text:t.slice(0,300000)});}catch{}}}}walk(root);process.stdout.write(JSON.stringify({specs,routes}));`;const ev=await execute(`node -e ${JSON.stringify(script)}`,{phase:'api-discovery',timeoutMs:options.timeoutMs||120000});let raw=ev?.stdout||ev?.output||ev?.result||'';let data;try{data=JSON.parse(String(raw));}catch{return{available:false,error:'API discovery output was not valid JSON.',evidence:apiRedact(raw)}}const contracts=[];for(const s of apiArray(data.specs)){let doc;try{doc=JSON.parse(s.text);}catch{doc=apiYamlToJson(s.text);}contracts.push(...apiExtractOpenApi(doc).map(c=>({...c,sourcePath:s.path})));}for(const r of apiArray(data.routes))contracts.push(...apiExtractRoutes(r.text,r.path));const uniq=[];const seen=new Set();for(const c of contracts){const k=`${c.method} ${c.path}`;if(!seen.has(k)){seen.add(k);uniq.push(c);}}return{available:true,contracts:uniq,sources:{openapi:data.specs.map(x=>x.path),routeFiles:data.routes.map(x=>x.path)},summary:{endpoints:uniq.length,openapiEndpoints:uniq.filter(x=>x.source==='openapi').length,routeScannedEndpoints:uniq.filter(x=>x.source==='route-scan').length}};}
function apiJsonPath(obj,path){if(!path)return obj;return String(path).split('.').reduce((v,k)=>v==null?undefined:v[k],obj);}
function apiTypeOk(v,t){if(t==='object')return v!==null&&typeof v==='object'&&!Array.isArray(v);if(t==='array')return Array.isArray(v);if(t==='integer')return Number.isInteger(v);if(t==='number')return typeof v==='number';if(t==='boolean')return typeof v==='boolean';if(t==='string')return typeof v==='string';return true;}
function apiValidateSchema(value,schema,root,path='$'){schema=apiResolveSchema(root,schema);const failures=[];if(schema.type&&!apiTypeOk(value,schema.type))failures.push(`${path}: expected ${schema.type}`);if(schema.required&&apiObj(schema.properties)){for(const k of apiArray(schema.required))if(value==null||value[k]===undefined)failures.push(`${path}.${k}: required`);}if(schema.properties&&value&&typeof value==='object'&&!Array.isArray(value)){for(const [k,ss] of Object.entries(schema.properties)){if(value[k]!==undefined)failures.push(...apiValidateSchema(value[k],ss,root,`${path}.${k}`));}}if(schema.items&&Array.isArray(value))value.forEach((v,i)=>failures.push(...apiValidateSchema(v,schema.items,root,`${path}[${i}]`)));return failures;}
function apiHeadersMap(v){const o={};for(const [k,val] of Object.entries(apiObj(v)))o[k.toLowerCase()]=String(val);return o;}
function apiCommand(environment,url,method,headers,body){const h=Object.entries(apiObj(headers)).map(([k,v])=>`-H "${String(k).replace(/"/g,'\\"')}: ${String(v).replace(/"/g,'\\"')}"`).join(' ');const data=body===undefined?'':` --data '${JSON.stringify(body).replace(/'/g,"'\\''")}'`;const code=environment&&/windows|desktop/i.test(environment)?`curl.exe -sS -D - -o - -X ${method} ${h}${data} "${String(url).replace(/"/g,'\\"')}"`:`curl -sS -D - -o - -X ${method} ${h}${data} "${String(url).replace(/"/g,'\\"')}"`;return code;}
function apiParseCurl(raw){const text=String(raw??'');const matches=[...text.matchAll(/HTTP\/\d(?:\.\d)?\s+(\d{3})[^\r\n]*\r?\n([\s\S]*?)(?:\r?\n\r?\n)([\s\S]*)/g)];const m=matches[matches.length-1];if(!m)return{status:null,headers:{},bodyText:text,body:null};const headers={};for(const line of m[2].split(/\r?\n/)){const i=line.indexOf(':');if(i>0)headers[line.slice(0,i).trim().toLowerCase()]=line.slice(i+1).trim();}let bodyText=m[3].trim(),body=null;try{body=JSON.parse(bodyText);}catch{}return{status:Number(m[1]),headers,bodyText,body};}
function apiAssert(test,response){const failures=[];const statuses=apiArray(test.expectedStatuses).length?apiArray(test.expectedStatuses):[test.expectedStatus||200];if(response.status===null)failures.push('No HTTP status received');else if(!statuses.includes(response.status))failures.push(`status: expected ${statuses.join('/')} got ${response.status}`);for(const [k,v] of Object.entries(apiObj(test.expectedHeaders)))if(String(response.headers[k.toLowerCase()]||'')!==String(v))failures.push(`header ${k}: expected ${v}`);if(test.expectContentType){const ct=response.headers['content-type']||'';if(!ct.toLowerCase().includes(String(test.expectContentType).toLowerCase()))failures.push(`content-type: expected ${test.expectContentType}`);}for(const [p,v] of Object.entries(apiObj(test.expectedBody)))if(JSON.stringify(apiJsonPath(response.body,p))!==JSON.stringify(v))failures.push(`body.${p}: expected ${JSON.stringify(v)}`);if(test.responseSchema&&response.body!==null)failures.push(...apiValidateSchema(response.body,test.responseSchema,test.responseSchema,'$.response'));return failures;}
async function runUniversalApiContractTesting(options={}){if(typeof options.execute!=='function')return{available:false,error:'No command executor supplied.'};const baseUrl=String(options.baseUrl||'').replace(/\/$/,'');let discovery=options.discovery||null;if(!discovery&&options.discover!==false)discovery=await apiDiscover(options);let contracts=apiArray(options.contracts);if(!contracts.length)contracts=apiArray(discovery?.contracts);contracts=contracts.map(c=>({...c}));if(options.maxEndpoints)contracts=contracts.slice(0,Math.max(1,Number(options.maxEndpoints)));const results=[];for(const c of contracts){if(['POST','PUT','PATCH','DELETE'].includes(c.method)&&options.allowMutations!==true)continue;const path=String(c.path||'/').replace(/\{([^}]+)\}/g,'test');const url=apiJoin(baseUrl,path);let body=c.requestBodySample;if(body===undefined&&c.requestSchema)body=apiSample(c.requestSchema);const headers={Accept:'application/json',...(c.headers||{})};if(body!==undefined)headers['Content-Type']='application/json';const ev=await (async()=>{const started=Date.now();try{return{ok:true,raw:await options.execute(apiCommand(options.environment||'',url,c.method,headers,body),{phase:'api-contract',timeoutMs:options.timeoutMs||20000}),elapsedMs:Date.now()-started};}catch(e){return{ok:false,error:e?.message||String(e),elapsedMs:Date.now()-started};}})();const raw=ev.raw?.stdout||ev.raw?.output||ev.raw?.result||ev.raw||'';const response=ev.ok?apiParseCurl(raw):{status:null,headers:{},bodyText:'',body:null};const failures=ev.ok?apiAssert({...c,responseSchema:apiResolveSchema(c.openApiDocument||{},c.responseSchema||c.responses?.[String(response.status)]?.content?.['application/json']?.schema||null)},response):[apiRedact(ev.error||'request failed')];results.push({endpoint:`${c.method} ${c.path}`,source:c.source,operationId:c.operationId,status:response.status,elapsedMs:ev.elapsedMs,passed:failures.length===0,failures:failures.map(apiRedact),request:{method:c.method,url:apiRedact(url),body:c.method==='GET'||c.method==='HEAD'?undefined:body},response:{headers:response.headers,body:response.body===null?undefined:response.body}});}
// Safe negative tests: only GET unknown-route and schema-required-field checks; mutation negatives require explicit opt-in.
if(options.negativeTests!==false){const gets=contracts.filter(c=>c.method==='GET').slice(0,Math.max(1,Number(options.maxNegativeTests??2)));for(const c of gets){const bad=apiJoin(baseUrl,`${String(c.path||'/').replace(/\/$/,'')}/__agent_not_found__`);const ev=await options.execute(apiCommand(options.environment||'',bad,'GET',{Accept:'application/json'}),{phase:'api-negative',timeoutMs:options.timeoutMs||20000});const raw=ev?.stdout||ev?.output||ev?.result||ev||'';const r=apiParseCurl(raw);const passed=[404,410].includes(Number(r.status));results.push({endpoint:`GET ${bad}`,negative:true,status:r.status,passed,failures:passed?[]:[`negative route expected 404/410 got ${r.status}`],request:{method:'GET',url:apiRedact(bad)}});}}
const failed=results.filter(r=>!r.passed);return{available:true,version:UNIVERSAL_API_TESTING_VERSION,discovery,contracts:contracts.length,results,status:failed.length?'failed':'passed',summary:{total:results.length,passed:results.length-failed.length,failed:failed.length,negative:results.filter(r=>r.negative).length,mutationsAllowed:options.allowMutations===true},capability:'empirical-api-contract-and-integration-testing'};}

const AI_TOOLS = [{
    function_declarations: [
        { name: "architecture_loop", description: "وكيل معماري شامل يحول Discovery إلى دورة هندسية كاملة: فهم المعمارية، تحليل القيود، التخطيط، التصميم، التنفيذ متعدد الملفات، التحقق، والإصلاح.", parameters: { type: "OBJECT", properties: { path: { type: "STRING", description: "مسار المشروع أو المجلد المراد تحليله." }, objective: { type: "STRING", description: "الهدف المعماري المطلوب." }, constraints: { type: "OBJECT", description: "قيود اختيارية مثل الحفاظ على API والبيانات وتقليل الاعتماديات." } } } },
        { name: "runtime_verify", description: "تحقق تجريبي فعلي: Tests + Build + تشغيل المشروع + مراقبة العملية والمنافذ + API smoke + قراءة السجلات + تصنيف الخطأ + إعادة Architecture Diff بعد التنفيذ.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" }, runBuild: { type: "BOOLEAN" }, runTests: { type: "BOOLEAN" }, runRuntime: { type: "BOOLEAN" }, startCommand: { type: "STRING" }, healthUrl: { type: "STRING" }, apiPath: { type: "STRING" }, maxRetries: { type: "INTEGER" }, runtimeChecks: { type: "INTEGER" } } } },
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

/**
 * Universal Architect Operating Loop
 * -----------------------------------
 * Environment-neutral orchestration layer.
 * It converts architectural discovery into an executable engineering model:
 * Discovery -> Understanding -> Planning -> Constraints -> Design ->
 * Cross-file Implementation -> Validation -> Repair.
 */

const UNIVERSAL_ARCHITECT_VERSION = '1.0-loop';

function architectUnique(list, value) {
    if (value && !list.includes(value)) list.push(value);
}

function architectArray(value) {
    return Array.isArray(value) ? value : [];
}

function architectNormalizeSnapshot(scanResult = {}) {
    const architecture = scanResult.architecture || {};
    const components = architectArray(architecture.components);
    const relations = architectArray(architecture.relations);
    const layers = architecture.layers && typeof architecture.layers === 'object' ? architecture.layers : {};
    const warnings = architectArray(scanResult.warnings);

    const dependencyMap = {};
    for (const component of components) {
        dependencyMap[component.path] = {
            role: component.role || 'Other',
            localDependencies: architectArray(component.localDependencies),
            externalDependencies: architectArray(component.externalDependencies),
            imports: architectArray(component.imports),
            exports: architectArray(component.exports),
            ipcChannels: architectArray(component.ipcChannels)
        };
    }

    return {
        root: scanResult.root || '.',
        project: scanResult.project || {},
        summary: scanResult.summary || {},
        layers,
        components,
        relations,
        dependencyMap,
        externalDependencies: architectArray(architecture.externalDependencies),
        electron: architecture.electron || { detected: false, ipcChannels: [], bridgeFiles: [] },
        warnings,
        truncated: Boolean(scanResult.summary?.truncated)
    };
}

function architectUnderstand(snapshot) {
    const boundaries = [];
    const roleCounts = {};
    for (const [role, files] of Object.entries(snapshot.layers)) {
        roleCounts[role] = architectArray(files).length;
    }

    for (const relation of snapshot.relations) {
        const from = snapshot.dependencyMap[relation.from]?.role || 'Other';
        const to = snapshot.dependencyMap[relation.to]?.role || 'Other';
        if (from !== to) {
            const boundary = `${from} -> ${to}`;
            architectUnique(boundaries, boundary);
        }
    }

    const componentCount = snapshot.components.length;
    const relationDensity = componentCount > 0 ? Number((snapshot.relations.length / componentCount).toFixed(2)) : 0;
    const highCoupling = snapshot.components
        .filter(component => architectArray(component.localDependencies).length >= 12)
        .map(component => component.path);

    return {
        roleCounts,
        boundaries,
        componentCount,
        relationDensity,
        highCoupling,
        entryPoints: architectArray(snapshot.project.entryPoints),
        externalDependencies: snapshot.externalDependencies,
        electronDetected: Boolean(snapshot.electron.detected),
        confidence: snapshot.truncated ? 'partial' : (componentCount ? 'structural' : 'low')
    };
}

function architectBuildConstraints(snapshot, options = {}) {
    const requested = options.constraints && typeof options.constraints === 'object' ? options.constraints : {};
    const constraints = {
        preserveApis: requested.preserveApis !== false,
        preserveData: requested.preserveData !== false,
        minimizeDependencies: requested.minimizeDependencies !== false,
        avoidBreakingChanges: requested.avoidBreakingChanges !== false,
        validateBeforeCommit: requested.validateBeforeCommit !== false,
        securityReview: requested.securityReview !== false,
        performanceReview: requested.performanceReview !== false,
        deploymentCompatibility: requested.deploymentCompatibility !== false,
        custom: architectArray(requested.custom)
    };

    const risks = [];
    if (snapshot.truncated) risks.push('Discovery result is partial; implementation requires a focused rescan before destructive changes.');
    if (snapshot.electron.detected) risks.push('Electron/IPC boundary detected; verify both renderer and bridge/main sides.');
    if (snapshot.externalDependencies.length > 25) risks.push('Large external dependency surface; avoid unnecessary package churn.');
    if (snapshot.components.length === 0) risks.push('No structural components were discovered; planning confidence is low.');

    return { constraints, risks };
}

function architectDesign(snapshot, understanding, constraints, options = {}) {
    const objective = options.objective || 'Improve or construct the requested software architecture while preserving working behavior.';
    const layers = Object.entries(snapshot.layers).map(([role, files]) => ({
        role,
        files: architectArray(files),
        responsibility: {
            UI: 'Presentation and interaction',
            Logic: 'Domain and application logic',
            Backend: 'Server and service boundaries',
            Data: 'Persistent/configuration data',
            Bridge: 'Environment and process boundary',
            Config: 'Build/runtime configuration',
            Other: 'Unclassified or infrastructure artifacts'
        }[role] || 'Other repository responsibility'
    }));

    const changeZones = [];
    for (const component of snapshot.components) {
        if (component.role !== 'Other' || architectArray(component.localDependencies).length > 0) {
            changeZones.push({
                path: component.path,
                role: component.role,
                impact: architectArray(component.localDependencies).length + architectArray(component.ipcChannels).length,
                dependencies: architectArray(component.localDependencies),
                external: architectArray(component.externalDependencies)
            });
        }
    }
    changeZones.sort((a, b) => b.impact - a.impact);

    const targetOrder = ['Config', 'Data', 'Backend', 'Logic', 'Bridge', 'UI'];
    const implementationOrder = layers
        .sort((a, b) => targetOrder.indexOf(a.role) - targetOrder.indexOf(b.role))
        .map(layer => layer.role);

    return {
        objective,
        architectureStyle: understanding.boundaries.length > 4 ? 'layered-with-cross-boundaries' : 'modular-layered',
        layers,
        boundaries: understanding.boundaries,
        changeZones: changeZones.slice(0, 80),
        implementationOrder,
        constraints,
        designRules: [
            'Preserve public contracts unless the objective explicitly requires a breaking change.',
            'Patch root causes before symptoms and keep related cross-file changes in one coherent change set.',
            'Prefer existing project conventions over introducing a new framework or dependency.',
            'For boundary changes, inspect both producer and consumer sides before editing.',
            'Keep each implementation step independently verifiable and reversible.'
        ]
    };
}

function architectImplementationPlan(design, snapshot) {
    const operations = [];
    const touched = new Set();
    const add = (operation) => {
        if (!operation?.path || touched.has(`${operation.action}:${operation.path}`)) return;
        touched.add(`${operation.action}:${operation.path}`);
        operations.push(operation);
    };

    for (const zone of design.changeZones.slice(0, 80)) {
        add({ action: 'inspect', path: zone.path, reason: `Confirm current ${zone.role} contract before modification.` });
        for (const dependency of zone.dependencies.slice(0, 12)) {
            add({ action: 'inspect', path: dependency, reason: `Trace dependency impact from ${zone.path}.` });
        }
    }

    return {
        mode: 'agent-executable',
        strategy: 'inspect -> patch/create -> analyze -> validate -> repair',
        operations,
        creationPolicy: 'Create new files only when the existing architecture cannot satisfy the objective without violating constraints.',
        modificationPolicy: 'Prefer surgical replacement for localized edits; use full-file writes only when the file is being deliberately reconstructed.',
        safety: {
            snapshotBeforeWrite: true,
            analyzeBeforeCommit: true,
            validateAfterBatch: true,
            repairOnFailure: true
        },
        affectedFiles: operations.map(operation => operation.path).slice(0, 120)
    };
}

function architectValidationPlan(design, snapshot) {
    const checks = [
        { id: 'syntax', description: 'Parse or syntax-check every changed source file.' },
        { id: 'imports', description: 'Verify local imports/exports and unresolved references.' },
        { id: 'architecture', description: 'Re-run discovery and compare expected layer/boundary relationships.' },
        { id: 'integration', description: 'Verify changed interfaces across producer/consumer boundaries.' },
        { id: 'regression', description: 'Run available project tests, smoke checks, or safe runtime verification.' },
        { id: 'constraints', description: 'Re-check preservation, dependency, security, and deployment constraints.' }
    ];

    if (snapshot.electron.detected) checks.push({ id: 'ipc', description: 'Validate IPC channel names, registration, and consumer symmetry.' });

    return { checks, passCondition: 'All mandatory checks pass or an explicit non-blocking exception is recorded.' };
}

function architectRepairPlan(validation, design, architectureExpansion = null) {
    return {
        policy: 'Failure classification first; repair root cause, then affected dependants, then re-validate.',
        architectureExpansion,
        stages: [
            'Classify failure as syntax, dependency, contract, integration, runtime, or environment issue.',
            'Rollback only the smallest unsafe change when the architecture cannot be safely repaired in place.',
            'Apply the smallest root-cause patch consistent with the design rules.',
            'Re-run validation checks affected by the repair.',
            'Re-run discovery if the repair changes boundaries, entry points, or dependency graphs.'
        ],
        escalation: 'Stop further writes when repeated repairs do not converge or when repository evidence contradicts the current architecture model.'
    };
}

function runUniversalArchitectLoop(scanResult, options = {}) {
    const snapshot = architectNormalizeSnapshot(scanResult);
    const understanding = architectUnderstand(snapshot);
    const constraintResult = architectBuildConstraints(snapshot, options);
    const design = architectDesign(snapshot, understanding, constraintResult.constraints, options);
    const implementation = architectImplementationPlan(design, snapshot);
    const validation = architectValidationPlan(design, snapshot);
    const architectureExpansion = runUniversalArchitectureExpansion(scanResult, { environment: options.environment || 'Unknown', baseline: options.baseline || null, runtimeEvidence: options.runtimeEvidence || null });

    const repair = architectRepairPlan(validation, design, architectureExpansion);
    return {
        loopVersion: UNIVERSAL_ARCHITECT_VERSION,
        environment: options.environment || 'Unknown',
        root: snapshot.root,
        objective: design.objective,
        stages: [
            { name: 'Discovery', status: 'complete', output: snapshot.summary },
            { name: 'Architecture Understanding', status: 'complete', output: understanding },
            { name: 'Constraint Analysis', status: 'complete', output: constraintResult },
            { name: 'Architecture Planning', status: 'complete', output: { objective: design.objective, implementationOrder: design.implementationOrder } },
            { name: 'Design', status: 'complete', output: design },
            { name: 'Cross-file Implementation', status: 'ready', output: implementation },
            { name: 'Validation', status: 'ready', output: validation },
            { name: 'Repair', status: 'ready', output: repair }
        ],
        architectureModel: {
            project: snapshot.project,
            layers: snapshot.layers,
            boundaries: understanding.boundaries,
            components: snapshot.components,
            relations: snapshot.relations,
            externalDependencies: snapshot.externalDependencies,
            electron: snapshot.electron,
            confidence: understanding.confidence
        },
        executionProtocol: [
            'Use this model before writing code for non-trivial architecture work.',
            'Execute cross-file changes in dependency-aware order.',
            'Analyze and validate after each coherent batch.',
            'Invoke the repair policy automatically when validation fails.',
            'Finish with a fresh discovery scan so the architecture model reflects the new state.'
        ]
    };
}

/**
 * Universal Architecture Expansion 2.0
 * Runtime + Infrastructure + Framework/Language + Diff + Validation.
 */
const UNIVERSAL_ARCHITECTURE_EXPANSION_VERSION = '2.0-universal';
function ua2Array(value){return Array.isArray(value)?value:[];}
function ua2String(value){return typeof value==='string'?value:'';}
function ua2Lower(value){return ua2String(value).toLowerCase();}
function ua2Unique(values){return [...new Set(ua2Array(values).filter(Boolean))];}
function ua2ClassifyArtifact(filePath=''){
 const p=ua2Lower(filePath).replace(/\\/g,'/'),name=p.split('/').pop()||p;
 if(/dockerfile|docker-compose|compose\.ya?ml/.test(name))return'docker';
 if(/\.ya?ml$/.test(name)&&/(k8s|kube|kubernetes|helm|deployment|service|ingress|statefulset|daemonset|configmap|secret)/.test(p))return'kubernetes';
 if(/(^|\/)(helm|charts)(\/|$)/.test(p)||/chart\.ya?ml|values\.ya?ml/.test(name))return'helm';
 if(/\.tf$|\.tfvars$/.test(name)||/(^|\/)terraform(\/|$)/.test(p))return'terraform';
 if(/\.github\/workflows\/.+\.ya?ml$/.test(p))return'github-actions';
 if(/nginx|caddy|traefik|haproxy/.test(name))return'proxy';
 if(/systemd|\.service$/.test(name))return'systemd';
 if(/serverless|template\.ya?ml|sam/.test(name))return'serverless';
 if(/package\.json|package-lock\.json|pnpm-lock\.yaml|yarn\.lock/.test(name))return'node-runtime';
 if(/requirements\.txt|pyproject\.toml|poetry\.lock|pipfile/.test(name))return'python-runtime';
 if(/pom\.xml|build\.gradle|settings\.gradle|gradlew/.test(name))return'java-runtime';
 if(/cargo\.toml|cargo\.lock/.test(name))return'rust-runtime';
 if(/go\.mod|go\.sum/.test(name))return'go-runtime';
 if(/gemfile|gemspec/.test(name))return'ruby-runtime';
 return'other';
}
function ua2DetectLanguagesAndFrameworks(components=[],project={}){
 const languages=new Map(),frameworks=new Set(),add=(x,n=1)=>languages.set(x,(languages.get(x)||0)+n);
 for(const c of ua2Array(components)){const p=ua2Lower(c.path);
  if(/\.(js|mjs|cjs)$/.test(p))add('JavaScript'); else if(/\.tsx?$/.test(p))add('TypeScript'); else if(/\.jsx$/.test(p)){add('JavaScript');frameworks.add('React');} else if(/\.py$/.test(p))add('Python'); else if(/\.(java|kt|kts)$/.test(p))add(/\.kt|kts/.test(p)?'Kotlin':'Java'); else if(/\.go$/.test(p))add('Go'); else if(/\.rs$/.test(p))add('Rust'); else if(/\.rb$/.test(p))add('Ruby'); else if(/\.(c|h)$/.test(p))add('C'); else if(/\.(cpp|cc|hpp)$/.test(p))add('C++'); else if(/\.cs$/.test(p))add('C#'); else if(/\.php$/.test(p))add('PHP'); else if(/\.swift$/.test(p))add('Swift'); else if(/\.dart$/.test(p)){add('Dart');frameworks.add('Flutter');}
  if(/vite\.config|vite\./.test(p))frameworks.add('Vite'); if(/next\.config|(^|\/)next\.json$/.test(p))frameworks.add('Next.js'); if(/angular\.json/.test(p))frameworks.add('Angular'); if(/svelte\.config|\.svelte$/.test(p))frameworks.add('Svelte'); if(/electron/.test(p))frameworks.add('Electron'); if(/express|koa|fastify|nest/.test(p))frameworks.add('Node.js Web'); if(/django|flask|fastapi/.test(p))frameworks.add('Python Web'); if(/spring/.test(p))frameworks.add('Spring'); if(/\.csproj$|\.sln$/.test(p))frameworks.add('.NET');
 }
 for(const dep of Object.keys(project.dependencies||{})){const d=ua2Lower(dep);if(d==='react'||d.startsWith('react-'))frameworks.add('React ecosystem');if(d==='vue'||d.startsWith('vue-'))frameworks.add('Vue ecosystem');if(d.includes('electron'))frameworks.add('Electron');if(['express','fastify','koa','@nestjs/core'].includes(d))frameworks.add('Node backend');}
 return{languages:[...languages.entries()].sort((a,b)=>b[1]-a[1]).map(([name,files])=>({name,files})),frameworks:[...frameworks].sort()};
}
function ua2ExtractInfrastructure(components=[]){
 const x={artifacts:[],providers:new Set(),deploymentModels:new Set(),orchestration:new Set(),ciCd:[],services:[],runtimeConfig:[]};
 for(const c of ua2Array(components)){const type=ua2ClassifyArtifact(c.path);if(type==='other')continue;x.artifacts.push({path:c.path,type});const p=ua2Lower(c.path);
  if(type==='docker'){x.orchestration.add('Docker');x.deploymentModels.add('containerized');} if(type==='kubernetes'){x.orchestration.add('Kubernetes');x.deploymentModels.add('container-orchestrated');} if(type==='helm')x.orchestration.add('Helm'); if(type==='terraform'){x.providers.add('Terraform');x.deploymentModels.add('infrastructure-as-code');} if(type==='github-actions')x.ciCd.push(c.path); if(type==='proxy')x.services.push({kind:'edge-proxy',path:c.path}); if(type==='systemd')x.services.push({kind:'system-service',path:c.path}); if(type.endsWith('-runtime'))x.runtimeConfig.push({kind:type,path:c.path}); if(/aws|amazon/.test(p))x.providers.add('AWS');if(/azure/.test(p))x.providers.add('Azure');if(/gcp|google-cloud/.test(p))x.providers.add('GCP');if(/vercel/.test(p))x.providers.add('Vercel');if(/supabase/.test(p))x.providers.add('Supabase');
 }
 return{artifacts:x.artifacts,providers:[...x.providers].sort(),deploymentModels:[...x.deploymentModels].sort(),orchestration:[...x.orchestration].sort(),ciCd:ua2Unique(x.ciCd),services:x.services,runtimeConfig:x.runtimeConfig};
}
function ua2InferRuntimeTopology(snapshot={}){const t={processes:[],boundaries:[],entrypoints:ua2Array(snapshot.project?.entryPoints).slice(0,50),ports:[],envReferences:[],confidence:'low'};for(const c of ua2Array(snapshot.components)){const p=ua2Lower(c.path);if(/server|api|worker|daemon|service|consumer|producer|main|electron/.test(p))t.processes.push({path:c.path,role:c.role||'Other'});for(const ext of ua2Array(c.externalDependencies))if(/(redis|postgres|mysql|mongodb|kafka|rabbitmq|nats|sqs|sns|sqlite|supabase|firebase|grpc|graphql)/i.test(ext))t.boundaries.push({from:c.path,target:ext,kind:'external-service'});}t.processes=t.processes.slice(0,100);t.boundaries=t.boundaries.slice(0,200);t.confidence=t.processes.length||t.boundaries.length?'inferred':'unknown';return t;}
function ua2BuildValidationProtocol(snapshot={},environment='Unknown'){const commands=[],scripts=snapshot.project?.scripts||{},add=(kind,command,reason)=>{if(command&&!commands.some(x=>x.command===command))commands.push({kind,command,reason});};add('syntax','node --check <changed-js-files>','Fast JavaScript syntax validation when Node is available.');if(scripts.test)add('tests','npm test','Run repository test suite.');if(scripts.lint)add('lint','npm run lint','Run repository linter.');if(scripts.build)add('build','npm run build','Verify production/build integration.');if(scripts.typecheck)add('typecheck','npm run typecheck','Verify static type contracts.');if(environment==='Desktop')add('runtime','node --version && npm --version','Confirm local runtime availability.');if(environment==='GitHub Cloud')add('ci','git diff --check','Detect patch formatting errors in CI context.');return{environment,commands,strategy:'syntax -> dependency graph -> tests -> lint/typecheck -> build -> runtime smoke -> architecture rescan',failurePolicy:'Classify the first failing layer, repair the root cause, and re-run only affected checks before the full gate.'};}
function ua2ArchitectureDiff(previous=null,current={}){if(!previous||typeof previous!=='object')return{available:false,reason:'No baseline architecture model supplied.'};const p=new Map(ua2Array(previous.components).map(x=>[x.path,x])),c=new Map(ua2Array(current.components).map(x=>[x.path,x])),added=[...c.keys()].filter(k=>!p.has(k)),removed=[...p.keys()].filter(k=>!c.has(k)),changed=[];for(const[path,now]of c){const before=p.get(path);if(!before)continue;const bd=JSON.stringify(ua2Unique(before.localDependencies||[]).sort()),nd=JSON.stringify(ua2Unique(now.localDependencies||[]).sort()),br=before.role||'Other',nr=now.role||'Other';if(bd!==nd||br!==nr)changed.push({path,fromRole:br,toRole:nr,dependenciesChanged:bd!==nd});}const risk=removed.length>10||changed.length>25?'high':(added.length||removed.length||changed.length?'review':'low');return{available:true,added,removed,changed,risk,summary:{added:added.length,removed:removed.length,changed:changed.length}};}
function runUniversalArchitectureExpansion(scanResult={},options={}){const a=scanResult.architecture||{},current={components:ua2Array(a.components),layers:a.layers||{},relations:ua2Array(a.relations),externalDependencies:ua2Array(a.externalDependencies),project:scanResult.project||{}};const stack=ua2DetectLanguagesAndFrameworks(current.components,current.project),infrastructure=ua2ExtractInfrastructure(current.components),runtimeTopology=ua2InferRuntimeTopology(current),validationProtocol=ua2BuildValidationProtocol(current,options.environment||'Unknown'),diff=ua2ArchitectureDiff(options.baseline||null,current),unknowns=[];if(!infrastructure.artifacts.length)unknowns.push('No infrastructure/deployment manifests were discovered.');if(runtimeTopology.confidence==='unknown')unknowns.push('Runtime process topology is not directly observable from the static repository scan.');if(!diff.available)unknowns.push('No architecture baseline was supplied, so post-change architectural drift cannot yet be measured.');return{version:UNIVERSAL_ARCHITECTURE_EXPANSION_VERSION,stack,infrastructure,runtimeTopology,architectureDiff:diff,validationProtocol,unknowns,capabilityMatrix:{staticArchitecture:'high',infrastructureAnalysis:infrastructure.artifacts.length?'detected':'not-observed',runtimeTopology:runtimeTopology.confidence,frameworkDetection:stack.frameworks.length?'detected':'limited',languageDetection:stack.languages.length?'detected':'limited',architectureDriftDetection:diff.available?'enabled':'awaiting-baseline',empiricalRuntimeVerification:options.runtimeEvidence?'available':'requires-runtime-evidence'}};}

// --- [AI Engine Logic] ---


/** Universal Agent Operating Loop 1.0 */
const UNIVERSAL_AGENT_OPERATING_LOOP_VERSION='1.0-operating-loop';
async function runUniversalAgentOperatingLoop(options={}){
 const root=options.root||'.'; const environment=options.environment||'Unknown';
 const objective=options.objective||''; const constraints=options.constraints||{};
 const discover=typeof performCloudArchitectureDiscovery==='function'?(()=>performCloudArchitectureDiscovery(root)):(typeof performArchitectureDiscovery==='function'?(()=>performArchitectureDiscovery(root)):null);
 if(!discover)return{available:false,status:'discovery-unavailable',version:UNIVERSAL_AGENT_OPERATING_LOOP_VERSION};
 const initialScan=await discover();
 const plan=runUniversalArchitectLoop(initialScan,{environment,objective,constraints});
 const allowed=new Set(['read_file','write_file','replace_file_content','multi_replace_file_content','analyze_file','list_files','fast_file_search']);
 const history=[{role:'user',parts:[{text:'Implementation mission. Objective: '+objective+'\nArchitecture plan:\n'+JSON.stringify(plan).slice(-24000)+'\nRules: inspect before writing; implement only the objective; preserve contracts; use the smallest safe cross-file change; do not call architecture_loop or runtime_verify; do not redesign unrelated code.'}]}];
 const executions=[]; let changed=false;
 for(let turn=0;turn<5;turn++){
  const response=await callAiBrain(history); const candidate=response?.candidates?.[0]; if(!candidate?.content?.parts?.length)break;
  history.push(candidate.content); const calls=candidate.content.parts.filter(p=>p.functionCall&&allowed.has(p.functionCall.name)); if(!calls.length)break;
  for(const part of calls.slice(0,8)){
   const {name,args={}}=part.functionCall; const path=normalizePathForCloud(args.path||''); let result;
   if(name==='read_file'||name==='analyze_file')result=typeof getGithubFileContent==='function'?await getGithubFileContent(path):await callLocalBridge('read',{path});
   else if(name==='list_files')result=typeof listGithubFiles==='function'?await listGithubFiles(path||''):await callLocalBridge('list',{path:path||'.'});
   else if(name==='write_file'){result=typeof writeFile==='function'?await writeFile(path,args.content||'','Universal Agent Operating Loop implementation'):await callLocalBridge('write',{path,content:args.content||''});changed=true;}
   else if(name==='replace_file_content'){result=typeof replaceFileContent==='function'?await replaceFileContent(path,args.targetContent||'',args.replacementContent||''):await callLocalBridge('write',{path,content:args.replacementContent||''});changed=true;}
   else {let current=typeof getGithubFileContent==='function'?await getGithubFileContent(path):await callLocalBridge('read',{path});if(current&&typeof current==='object'&&current.content)current=current.content;let updated=String(current||'');for(const r of (args.replacements||[]))if(updated.includes(r.targetContent))updated=updated.replace(r.targetContent,r.replacementContent);result=typeof writeFile==='function'?await writeFile(path,updated,'Universal Agent Operating Loop batch'):await callLocalBridge('write',{path,content:updated});changed=true;}
   executions.push({turn,name,path,result:typeof result==='string'?result:JSON.stringify(result)}); history.push({role:'function',parts:[{functionResponse:{name,response:{content:typeof result==='string'?result:JSON.stringify(result)}}}]});
  }
 }
 let verification=null;
 if(changed&&options.verify!==false&&typeof runClosedRuntimeRepairLoop==='function'){
  verification=await runClosedRuntimeRepairLoop({environment,root,snapshot:initialScan,baseline:initialScan,runBuild:options.runBuild!==false,runTests:options.runTests!==false,runRuntime:options.runRuntime!==false,startCommand:options.startCommand||'',healthUrl:options.healthUrl||'',apiPath:options.apiPath||'',maxRetries:options.maxRetries??1,runtimeChecks:options.runtimeChecks??3,maxRepairAttempts:options.maxRepairAttempts??2,execute:async command=>typeof callLocalBridge==='function'?callLocalBridge('cmd',{command}):null,discover,repair:async({failure})=>{
    const h=[{role:'user',parts:[{text:'Repair only the first evidenced root cause. Objective: '+objective+'\nEvidence:\n'+JSON.stringify(failure).slice(-16000)+'\nInspect implicated files and apply the smallest safe fix.'}]}]; let applied=false; const results=[];
    for(let t=0;t<3;t++){const r=await callAiBrain(h);const c=r?.candidates?.[0];if(!c?.content?.parts?.length)break;h.push(c.content);const calls=c.content.parts.filter(p=>p.functionCall&&['read_file','write_file','replace_file_content','multi_replace_file_content','analyze_file'].includes(p.functionCall.name));if(!calls.length)break;for(const part of calls.slice(0,6)){const {name,args={}}=part.functionCall;const path=normalizePathForCloud(args.path||'');let out;if(name==='read_file'||name==='analyze_file')out=typeof getGithubFileContent==='function'?await getGithubFileContent(path):await callLocalBridge('read',{path});else if(name==='write_file'){out=typeof writeFile==='function'?await writeFile(path,args.content||'','Closed runtime repair'):await callLocalBridge('write',{path,content:args.content||''});applied=true;}else if(name==='replace_file_content'){out=typeof replaceFileContent==='function'?await replaceFileContent(path,args.targetContent||'',args.replacementContent||''):await callLocalBridge('write',{path,content:args.replacementContent||''});applied=true;}else{let cur=typeof getGithubFileContent==='function'?await getGithubFileContent(path):await callLocalBridge('read',{path});if(cur&&typeof cur==='object'&&cur.content)cur=cur.content;let upd=String(cur||'');for(const x of (args.replacements||[]))if(upd.includes(x.targetContent))upd=upd.replace(x.targetContent,x.replacementContent);out=typeof writeFile==='function'?await writeFile(path,upd,'Closed runtime repair batch'):await callLocalBridge('write',{path,content:upd});applied=true;}results.push({name,path,result:typeof out==='string'?out:JSON.stringify(out)});}if(applied)break;}
    return{applied,results};
  }});
 }
 const finalScan=await discover(); const before={components:initialScan?.architecture?.components||initialScan?.components||[]}; const after={components:finalScan?.architecture?.components||finalScan?.components||[]}; const diff=typeof ua2ArchitectureDiff==='function'?ua2ArchitectureDiff(before,after):null;
 return{available:true,version:UNIVERSAL_AGENT_OPERATING_LOOP_VERSION,status:verification?.status||'implemented',objective,plan,implementation:{changed,executions},verification,architectureDiff:diff,finalDiscoverySummary:finalScan?.summary||null,closedLoop:Boolean(changed&&verification)};
}

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

/** Universal Empirical Runtime Verification Engine 1.0 */
const UNIVERSAL_RUNTIME_VERIFICATION_VERSION='1.0-empirical';
function urvArray(v){return Array.isArray(v)?v:[];}
function urvString(v){return typeof v==='string'?v:'';}
function urvRedact(v){let s=typeof v==='string'?v:JSON.stringify(v??'');return s.replace(/(api[_-]?key|token|secret|password|authorization|bearer)\s*[:=]\s*([^\s,;]+)/gi,'$1=[REDACTED]').replace(/(sk-[A-Za-z0-9_-]{10,})/g,'[REDACTED_KEY]');}
function urvIsWindows(env=''){return /windows|desktop/i.test(env);}
function urvScripts(snapshot={}){return snapshot.project?.scripts&&typeof snapshot.project.scripts==='object'?snapshot.project.scripts:{};}
function urvScript(name,scripts){return scripts[name]?`npm run ${name}`:null;}
function urvNormalize(raw,phase,command,startedAt){let text='',exitCode=null,ok=null,error=null;if(raw&&typeof raw==='object'){if(typeof raw.exitCode==='number')exitCode=raw.exitCode;if(typeof raw.code==='number'&&exitCode===null)exitCode=raw.code;if(typeof raw.success==='boolean')ok=raw.success;if(typeof raw.ok==='boolean'&&ok===null)ok=raw.ok;text=[raw.stdout,raw.stderr,raw.output,raw.result,raw.message].filter(Boolean).join('\n');if(raw.error)error=raw.error?.message||String(raw.error);}else{text=String(raw??'');}const lower=text.toLowerCase();if(ok===null&&exitCode!==null)ok=exitCode===0;if(ok===null)ok=!/\b(error|failed|fatal|exception)\b|❌/i.test(text);return{phase,command,ok:Boolean(ok),exitCode,elapsedMs:Date.now()-startedAt,output:urvRedact(text).slice(-12000),error:error?urvRedact(error):null,signals:{syntax:/syntaxerror|unexpected token/i.test(lower),moduleMissing:/cannot find module|module not found|err_module_not_found/i.test(lower),testFailure:/test(s)? failed|failing|assertion/i.test(lower),buildFailure:/build failed|compilation failed|ts\(\d+\)|webpack.*error|vite.*error/i.test(lower),portFailure:/econnrefused|connection refused|failed to connect/i.test(lower)}};}
async function urvExec(options,phase,command){const t=Date.now();try{return urvNormalize(await options.execute(command,{phase,timeoutMs:options.timeoutMs||120000}),phase,command,t);}catch(e){return urvNormalize({success:false,error:e?.message||String(e)},phase,command,t);}}
function urvFailureClass(e){const t=urvString(e?.output).toLowerCase();if(e?.signals?.syntax)return'syntax-error';if(e?.signals?.moduleMissing)return'dependency-or-import-error';if(e?.signals?.buildFailure)return'build-error';if(e?.signals?.testFailure)return'test-failure';if(e?.signals?.portFailure)return'runtime-connectivity-error';if(/permission denied|access is denied|eacces/.test(t))return'permission-error';if(/enoent|not recognized as an internal or external command/.test(t))return'environment-or-command-error';return'runtime-verification-failure';}
function urvCommands(snapshot,options={}){const scripts=urvScripts(snapshot),out=[],add=(phase,command,reason)=>{if(command&&!out.some(x=>x.phase===phase))out.push({phase,command,reason});};const entry=urvArray(snapshot.project?.entryPoints).find(p=>/\.(js|mjs|cjs)$/.test(p));if(entry&&options.syntax!==false)add('syntax',`node --check "${entry}"`,'Syntax validation.');const test=options.testCommand||urvScript('test',scripts);if(options.runTests!==false&&test)add('tests',test,'Repository tests.');const lint=options.lintCommand||urvScript('lint',scripts);if(options.runLint&&lint)add('lint',lint,'Repository lint.');const typecheck=options.typecheckCommand||urvScript('typecheck',scripts);if(options.runTypecheck&&typecheck)add('typecheck',typecheck,'Type validation.');const build=options.buildCommand||urvScript('build',scripts);if(options.runBuild!==false&&build)add('build',build,'Production build.');return out;}
function urvStart(environment,root,command,logFile){if(urvIsWindows(environment)){const r=String(root||'.').replace(/'/g,"''");const c=String(command||'npm start').replace(/'/g,"''");return`powershell -NoProfile -Command "Set-Location -LiteralPath '${r}'; $p=Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','${c} > ${logFile} 2>&1' -PassThru; $p.Id"`;}return`cd "${String(root||'.').replace(/"/g,'\\"')}" && (${command||'npm start'} > "${logFile}" 2>&1 & echo $!)`;}
function urvMonitor(environment,pid){pid=String(pid||'').replace(/\D/g,'');return urvIsWindows(environment)?`powershell -NoProfile -Command "if (Get-Process -Id ${pid} -ErrorAction SilentlyContinue) { 'RUNNING' } else { 'STOPPED' }"`:`kill -0 ${pid} 2>/dev/null && echo RUNNING || echo STOPPED`;}
function urvPorts(environment){return urvIsWindows(environment)?`powershell -NoProfile -Command "(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty LocalPort | Sort-Object -Unique) -join ','"`:`ss -ltnH 2>/dev/null | awk '{print $4}' | sed 's/.*://g' | sort -n | uniq | paste -sd, -`;}
function urvStop(environment,pid){pid=String(pid||'').replace(/\D/g,'');return urvIsWindows(environment)?`powershell -NoProfile -Command "Stop-Process -Id ${pid} -Force -ErrorAction SilentlyContinue"`:`kill ${pid} 2>/dev/null || true`;}
function urvLog(environment,root,logFile){return urvIsWindows(environment)?`powershell -NoProfile -Command "Set-Location -LiteralPath '${String(root||'.').replace(/'/g,"''")}'; if (Test-Path '${logFile}') { Get-Content '${logFile}' -Tail 120 }"`:`cd "${String(root||'.').replace(/"/g,'\\"')}" && tail -n 120 "${logFile}" 2>/dev/null || true`;}
function urvHttp(environment,url){return urvIsWindows(environment)?`curl.exe -sS -o NUL -w "%{http_code}" --max-time 10 "${String(url).replace(/"/g,'\\"')}"`:`curl -sS -o /dev/null -w '%{http_code}' --max-time 10 "${String(url).replace(/"/g,'\\"')}"`;}
async function runUniversalRuntimeVerification(options={}){if(typeof options.execute!=='function')return{available:false,version:UNIVERSAL_RUNTIME_VERIFICATION_VERSION,error:'No runtime command executor supplied.'};const env=options.environment||'Unknown',snapshot=options.snapshot||{},root=options.root||snapshot.root||'.',phases=[],commands=urvCommands(snapshot,options),retries=Math.max(0,Number(options.maxRetries??1));for(const item of commands){let ev=null;for(let i=0;i<=retries;i++){ev=await urvExec(options,item.phase,item.command);ev.attempt=i+1;if(ev.ok)break;}phases.push({...item,evidence:ev});if(!ev.ok&&options.stopOnFailure!==false)break;}let pid=null,runtimeStarted=false,ports=[],health=[],runtimeLog=null,apiContractTests=null;const startCommand=options.startCommand||urvScripts(snapshot).start||urvScripts(snapshot).dev;try{if(startCommand&&options.runRuntime!==false&&phases.every(p=>p.evidence.ok)){const logFile=options.logFile||'.agent-runtime.log';const start=await urvExec(options,'start',urvStart(env,root,startCommand,logFile));phases.push({phase:'start',command:start.command,evidence:start});const ids=start.output.match(/\b\d{1,12}\b/g)||[];pid=ids[ids.length-1]||null;runtimeStarted=Boolean(pid)&&start.ok;if(runtimeStarted){for(let i=0;i<Math.max(1,Number(options.runtimeChecks??3));i++){const m=await urvExec(options,'process-monitor',urvMonitor(env,pid));phases.push({phase:'process-monitor',command:m.command,evidence:m});const p=await urvExec(options,'port-monitor',urvPorts(env));phases.push({phase:'port-monitor',command:p.command,evidence:p});ports=urvString(p.output).split(/[,\s]+/).filter(x=>/^\d+$/.test(x));if(options.healthUrl)health.push(await urvExec(options,'api-smoke',urvHttp(env,options.healthUrl)));else if(options.apiPath&&ports[0])health.push(await urvExec(options,'api-smoke',urvHttp(env,`http://127.0.0.1:${ports[0]}${options.apiPath}`)));if(health.some(x=>x.ok))break;}if(runUniversalApiContractTesting&&options.apiTesting!==false&&runtimeStarted){try{const base=options.apiBaseUrl||(options.healthUrl?String(options.healthUrl).replace(/(https?:\/\/[^/]+).*/,'$1'):(ports[0]?`http://127.0.0.1:${ports[0]}`:''));apiContractTests=await runUniversalApiContractTesting({execute:options.execute,environment:env,root,baseUrl:base,timeoutMs:options.apiTimeoutMs||20000,maxEndpoints:options.apiMaxEndpoints||30,maxNegativeTests:options.apiMaxNegativeTests||2,allowMutations:options.apiAllowMutations===true,negativeTests:options.apiNegativeTests!==false});}catch(e){apiContractTests={available:false,status:'failed',summary:{total:0,passed:0,failed:1,negative:0},error:urvRedact(e?.message||String(e))};}}
runtimeLog=await urvExec(options,'runtime-log',urvLog(env,root,options.logFile||'.agent-runtime.log'));phases.push({phase:'runtime-log',command:runtimeLog.command,evidence:runtimeLog});}}}finally{if(pid){const stop=await urvExec(options,'stop',urvStop(env,pid));phases.push({phase:'stop',command:stop.command,evidence:stop});}}const apiFailure=apiContractTests?.status==='failed';const failed=[...phases.map(p=>p.evidence).filter(e=>!e.ok),...health.filter(e=>!e.ok),...(apiFailure?[{phase:'api-contract-suite',ok:false,output:JSON.stringify(apiContractTests).slice(-12000),signals:{}}]:[])],firstFailure=failed[0]||null;let postSnapshot=null,architectureDiff=null,postSnapshotError=null;if(typeof options.discover==='function'){try{postSnapshot=await options.discover();const base=options.baseline||snapshot;const baseArch={components:urvArray(base.architecture?.components||base.components)};const postArch={components:urvArray(postSnapshot?.architecture?.components||postSnapshot?.components)};if(typeof ua2ArchitectureDiff==='function')architectureDiff=ua2ArchitectureDiff(baseArch,postArch);}catch(e){postSnapshotError=urvRedact(e?.message||String(e));}}return{available:true,version:UNIVERSAL_RUNTIME_VERIFICATION_VERSION,status:failed.length?'failed':'passed',classification:firstFailure?urvFailureClass(firstFailure):null,summary:{executedPhases:phases.length,failedPhases:failed.length,runtimeStarted,observedPorts:ports,apiChecks:health.length+(apiContractTests?.summary?.total||0),retriesUsed:phases.reduce((n,p)=>n+Math.max(0,(p.evidence?.attempt||1)-1),0)},phases,healthChecks:health,apiContractTests,runtimeLog,postSnapshot,postSnapshotError,architectureDiff,repair:{required:Boolean(firstFailure),rootCauseClass:firstFailure?urvFailureClass(firstFailure):null},capability:'empirical-runtime-execution'};}

async function runClosedRuntimeRepairLoop(options={}){const maxRepairAttempts=Math.max(0,Math.min(3,Number(options.maxRepairAttempts??2)));let currentSnapshot=options.snapshot||{};const baseline=options.baseline||currentSnapshot;const attempts=[];for(let i=0;i<=maxRepairAttempts;i++){const verification=await runUniversalRuntimeVerification({...options,snapshot:currentSnapshot,baseline,autoRepair:false});attempts.push({attempt:i+1,verification});if(verification.status==='passed')return{...verification,closedRepairLoop:{enabled:true,status:'recovered',repairAttempts:i,attempts}};if(i===maxRepairAttempts||typeof options.repair!=='function')return{...verification,closedRepairLoop:{enabled:true,status:'exhausted',repairAttempts:i,attempts,finalFailure:verification.classification}};let repairResult;try{repairResult=await options.repair({attempt:i+1,environment:options.environment||'Unknown',root:options.root||currentSnapshot.root||'.',snapshot:currentSnapshot,baseline,failure:verification});}catch(e){repairResult={applied:false,error:urvRedact(e?.message||String(e))};}attempts[attempts.length-1].repair=repairResult;if(!repairResult?.applied)return{...verification,closedRepairLoop:{enabled:true,status:'repair-declined',repairAttempts:i,attempts,repairError:repairResult?.error||'Repair callback did not apply a change.'}};if(typeof options.discover==='function')try{currentSnapshot=await options.discover();}catch(e){return{...verification,closedRepairLoop:{enabled:true,status:'rescan-failed',repairAttempts:i+1,attempts,rescanError:urvRedact(e?.message||String(e))}};} }return{available:false,version:UNIVERSAL_RUNTIME_VERIFICATION_VERSION,error:'Closed repair loop terminated unexpectedly.'};}

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
            else if (name === "architecture_loop") {
    try {
        toolResult = await runUniversalAgentOperatingLoop({ environment: "GitHub Cloud", root: safePath || "", objective: args?.objective || "", constraints: args?.constraints || {}, verify: true, maxRepairAttempts: 2 });
    } catch (e) {
        toolResult = { error: "Universal agent operating loop failed.", details: e?.message || String(e) };
    }
}
                else if (name === "runtime_verify") {
                try {
                    const runtimeRoot = args?.path || safePath || "";
                    const initialScan = await performCloudArchitectureDiscovery(runtimeRoot);
                    toolResult = await runClosedRuntimeRepairLoop({
                        environment: "GitHub Cloud",
                        root: runtimeRoot,
                        snapshot: initialScan,
                        baseline: initialScan,
                        runBuild: args?.runBuild !== false,
                        runTests: args?.runTests !== false,
                        runRuntime: args?.runRuntime !== false,
                        startCommand: args?.startCommand || "",
                        healthUrl: args?.healthUrl || "",
                        apiPath: args?.apiPath || "",
                        maxRetries: Number.isInteger(args?.maxRetries) ? args.maxRetries : 1,
                        runtimeChecks: Number.isInteger(args?.runtimeChecks) ? args.runtimeChecks : 3,
                        maxRepairAttempts: 2,
                        execute: async (command) => callLocalBridge('cmd', { command }),
                        repair: async ({ failure }) => {
                            const repairHistory = [{ role: 'user', parts: [{ text: `Autonomous runtime repair task. Repair ONLY the first root cause evidenced below. Do not redesign unrelated code. Do not call runtime_verify. Start by inspecting the implicated file(s), then apply the smallest safe code change. Runtime evidence: ${JSON.stringify(failure).slice(-14000)}` }] }];
                            let applied=false; const results=[];
                            for(let turn=0;turn<3;turn++){
                                const response=await callAiBrain(repairHistory);
                                const candidate=response?.candidates?.[0]; if(!candidate?.content?.parts?.length) break;
                                repairHistory.push(candidate.content);
                                const calls=candidate.content.parts.filter(p=>p.functionCall);
                                if(!calls.length) break;
                                for(const part of calls.slice(0,4)){const {name,args}=part.functionCall;if(!['read_file','write_file','replace_file_content','analyze_file'].includes(name))continue;let result;if(name==='read_file'||name==='analyze_file')result=await getGithubFileContent(normalizePathForCloud(args.path));else if(name==='write_file')result=await writeFile(normalizePathForCloud(args.path), args.content);else result=await replaceFileContent(normalizePathForCloud(args.path),args.targetContent,args.replacementContent);results.push({name,result});if(name==='write_file'||name==='replace_file_content')applied=true;repairHistory.push({role:'function',parts:[{functionResponse:{name,response:{content:typeof result==='string'?result:JSON.stringify(result)}}}]});}
                                if(applied) break;
                            }
                            return {applied,results};
                        },
                        discover: async () => performCloudArchitectureDiscovery(runtimeRoot)
                    });
                } catch (runtimeError) {
                    toolResult = { error: "Empirical runtime verification failed.", details: runtimeError?.message || String(runtimeError) };
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
                else if (name === "skill_manager") toolResult = await universalSkillManager(args?.action || "list", args || {}, {
                    fetchText: async ({repository,path,ref}) => {
                        const endpoint = `https://api.github.com/repos/${repository}/contents/${path}?ref=${encodeURIComponent(ref || "main")}`;
                        const data = await callBridge("github", { endpoint, method: "GET" });
                        const raw = data?.content ? atob(String(data.content).replace(/\s/g, "")) : (typeof data === "string" ? data : JSON.stringify(data));
                        try { return decodeURIComponent(escape(raw)); } catch (_) { return raw; }
                    },
                    readText: async filePath => {
                        if (typeof getGithubFileContent === "function") return await getGithubFileContent(filePath);
                        if (typeof callLocalBridge === "function") return await callLocalBridge("read", { path: filePath });
                        return "";
                    }
                }); toolResult = `✅ العملية [${name}] اكتملت.`;

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


/* --- Integrated Universal Skill System --- */
/**
 * Universal Skill System 1.0
 * Declarative skill registry, loader, composer, validator and lifecycle manager.
 * Skills are data/workflow definitions by default; arbitrary code execution is disabled.
 */
const UNIVERSAL_SKILL_SYSTEM_VERSION = '1.0-universal-skill-system';
const UNIVERSAL_SKILL_STORAGE_KEY = 'universal_skill_registry_v1';

function ussArray(v){ return Array.isArray(v) ? v : []; }
function ussObj(v){ return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; }
function ussStr(v){ return typeof v === 'string' ? v : ''; }
function ussUnique(v){ return [...new Set(ussArray(v).filter(Boolean).map(String))]; }

function ussNormalizeSkill(raw={}, source={}){
    const s = ussObj(raw);
    return {
        id: ussStr(s.id).trim(),
        name: ussStr(s.name || s.title).trim(),
        version: ussStr(s.version || '1.0.0').trim(),
        description: ussStr(s.description).trim(),
        domain: ussStr(s.domain || 'general').trim(),
        triggers: ussUnique(s.triggers),
        tags: ussUnique(s.tags),
        prerequisites: ussUnique(s.prerequisites),
        instructions: ussArray(s.instructions).map(ussStr).filter(Boolean),
        workflow: ussArray(s.workflow).map(step => {
            const x=ussObj(step);
            return {
                id: ussStr(x.id),
                action: ussStr(x.action),
                purpose: ussStr(x.purpose),
                tool: ussStr(x.tool),
                inputs: ussObj(x.inputs),
                expectedEvidence: ussArray(x.expectedEvidence).map(ussStr).filter(Boolean),
                stopConditions: ussArray(x.stopConditions).map(ussStr).filter(Boolean)
            };
        }),
        capabilities: ussArray(s.capabilities).map(x=>{
            const c=ussObj(x);
            return { id:ussStr(c.id), name:ussStr(c.name), description:ussStr(c.description), tools:ussUnique(c.tools), safe: c.safe !== false };
        }),
        constraints: ussUnique(s.constraints),
        validation: {
            required: ussArray(ussObj(s.validation).required).map(ussStr).filter(Boolean),
            commands: ussArray(ussObj(s.validation).commands).map(ussStr).filter(Boolean),
            evidence: ussArray(ussObj(s.validation).evidence).map(ussStr).filter(Boolean)
        },
        outputs: ussArray(s.outputs).map(ussStr).filter(Boolean),
        safety: {
            allowNetwork: Boolean(ussObj(s.safety).allowNetwork),
            allowWrites: Boolean(ussObj(s.safety).allowWrites),
            allowTerminal: Boolean(ussObj(s.safety).allowTerminal),
            allowSecrets: false,
            arbitraryCode: false
        },
        provenance: {
            sourceType: ussStr(source.sourceType || s.provenance?.sourceType || 'inline'),
            repository: ussStr(source.repository || s.provenance?.repository),
            path: ussStr(source.path || s.provenance?.path),
            ref: ussStr(source.ref || s.provenance?.ref || 'main'),
            importedAt: ussStr(source.importedAt || new Date().toISOString()),
            checksum: ussStr(source.checksum || s.provenance?.checksum)
        },
        status: ussStr(source.status || s.status || 'installed') || 'installed'
    };
}

function ussValidateSkill(raw={}){
    const s=ussNormalizeSkill(raw);
    const errors=[];
    if(!s.id) errors.push('id is required');
    if(!s.name) errors.push('name is required');
    if(!s.version) errors.push('version is required');
    if(!s.description) errors.push('description is required');
    if(!s.instructions.length && !s.workflow.length && !s.capabilities.length) errors.push('skill must define instructions, workflow, or capabilities');
    if(s.safety.arbitraryCode) errors.push('arbitraryCode is forbidden');
    for(const c of s.capabilities){ if(c.id && !/^[a-z0-9._-]+$/i.test(c.id)) errors.push(`invalid capability id: ${c.id}`); }
    return {valid:errors.length===0,errors,normalized:s};
}

function ussMatchScore(skill,text=''){
    const q=String(text).toLowerCase(); let score=0;
    for(const t of [...skill.triggers,...skill.tags,...(skill.domain?[skill.domain]:[])]){
        const x=String(t).toLowerCase(); if(x && q.includes(x)) score += skill.triggers.includes(t) ? 5 : 2;
    }
    if(q.includes(String(skill.name).toLowerCase())) score += 8;
    return score;
}

function createUniversalSkillSystem(options={}){
    const registry = new Map();
    const storage = options.storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    function persist(){
        if(!storage) return;
        try { storage.setItem(UNIVERSAL_SKILL_STORAGE_KEY, JSON.stringify([...registry.values()])); } catch(_e){}
    }
    function restore(){
        if(!storage) return;
        try {
            const raw=JSON.parse(storage.getItem(UNIVERSAL_SKILL_STORAGE_KEY)||'[]');
            for(const item of ussArray(raw)){ const v=ussValidateSkill(item); if(v.valid) registry.set(v.normalized.id,v.normalized); }
        } catch(_e){}
    }
    function register(raw, source={}){
        const v=ussValidateSkill(raw);
        if(!v.valid) return {ok:false,operation:'register',errors:v.errors};
        const skill=ussNormalizeSkill(v.normalized,source);
        registry.set(skill.id,skill); persist();
        return {ok:true,operation:'register',skill};
    }
    function get(id){ return registry.get(ussStr(id)) || null; }
    function list(){ return [...registry.values()].map(s=>({id:s.id,name:s.name,version:s.version,domain:s.domain,status:s.status,source:s.provenance})); }
    function remove(id){ const ok=registry.delete(ussStr(id)); persist(); return {ok,operation:'remove',id}; }
    function setStatus(id,status){ const s=get(id); if(!s) return {ok:false,error:'skill_not_found'}; s.status=status; registry.set(s.id,s); persist(); return {ok:true,skill:s}; }
    function compose(taskText='',options={}){
        const ranked=[...registry.values()].filter(s=>s.status!=='disabled'&&s.status!=='quarantined').map(skill=>({skill,score:ussMatchScore(skill,taskText)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
        const selected=ranked.slice(0,Math.max(1,Number(options.maxSkills||3)));
        const instructions=[],workflow=[],constraints=[],capabilities=[],sources=[];
        for(const {skill,score} of selected){
            instructions.push(...skill.instructions.map(x=>`[${skill.id}] ${x}`));
            workflow.push(...skill.workflow.map(x=>({...x,skillId:skill.id,matchScore:score})));
            constraints.push(...skill.constraints.map(x=>`[${skill.id}] ${x}`));
            capabilities.push(...skill.capabilities.map(x=>({...x,skillId:skill.id})));
            sources.push(skill.provenance);
        }
        return {ok:true,query:taskText,selected:selected.map(x=>({id:x.skill.id,name:x.skill.name,version:x.skill.version,score:x.score})),instructions,workflow,constraints,capabilities,sources};
    }
    function scaffold(spec={}){
        const base=ussObj(spec);
        return ussNormalizeSkill({
            id:base.id || `skill.${Date.now()}`,
            name:base.name || 'New Expert Skill',
            version:'0.1.0',
            description:base.description || 'Declarative expert skill',
            domain:base.domain || 'general',
            triggers:ussArray(base.triggers),
            tags:ussArray(base.tags),
            instructions:ussArray(base.instructions).length?base.instructions:['Define the expert procedure and evidence requirements.'],
            workflow:ussArray(base.workflow),
            capabilities:ussArray(base.capabilities),
            constraints:ussArray(base.constraints),
            validation:{required:['Skill definition validates before activation'],evidence:['Execution produces observable evidence']},
            outputs:ussArray(base.outputs),
            safety:{allowNetwork:false,allowWrites:false,allowTerminal:false}
        },{sourceType:'generated-scaffold',status:'installed'});
    }
    restore();
    return {version:UNIVERSAL_SKILL_SYSTEM_VERSION,register,get,list,remove,setStatus,compose,scaffold,validate:ussValidateSkill,normalize:ussNormalizeSkill};
}

const UNIVERSAL_SKILL_SYSTEM = typeof createUniversalSkillSystem === 'function' ? createUniversalSkillSystem() : null;

function universalSkillManager(action,args={},adapter={}){
    const a=String(action||'').toLowerCase();
    if(!UNIVERSAL_SKILL_SYSTEM) return {ok:false,error:'skill_system_unavailable'};
    if(a==='list') return UNIVERSAL_SKILL_SYSTEM.list();
    if(a==='get'||a==='inspect') return UNIVERSAL_SKILL_SYSTEM.get(args.skillId||args.id);
    if(a==='validate') return UNIVERSAL_SKILL_SYSTEM.validate(args.definition||args.skill||{});
    if(a==='register'||a==='install') return UNIVERSAL_SKILL_SYSTEM.register(args.definition||args.skill||{},args.source||{});
    if(a==='activate') return UNIVERSAL_SKILL_SYSTEM.setStatus(args.skillId||args.id,'active');
    if(a==='deactivate') return UNIVERSAL_SKILL_SYSTEM.setStatus(args.skillId||args.id,'disabled');
    if(a==='quarantine') return UNIVERSAL_SKILL_SYSTEM.setStatus(args.skillId||args.id,'quarantined');
    if(a==='remove') return UNIVERSAL_SKILL_SYSTEM.remove(args.skillId||args.id);
    if(a==='compose'||a==='resolve') return UNIVERSAL_SKILL_SYSTEM.compose(args.task||args.prompt||'',args);
    if(a==='build') return {ok:true,skill:UNIVERSAL_SKILL_SYSTEM.scaffold(args)};
    if(a==='import_github'||a==='import_repo'){
        if(typeof adapter.fetchText!=='function') return {ok:false,error:'github_adapter_unavailable'};
        const repo=ussStr(args.repository); const path=ussStr(args.path||'skill.json'); const ref=ussStr(args.ref||'main');
        if(!repo||!path) return {ok:false,error:'repository_and_path_required'};
        return Promise.resolve(adapter.fetchText({repository:repo,path,ref})).then(text=>{
            let def; try{def=JSON.parse(String(text));}catch(e){return {ok:false,error:'skill_source_must_be_valid_json',details:String(e.message||e)}}
            return UNIVERSAL_SKILL_SYSTEM.register(def,{sourceType:'github',repository:repo,path,ref});
        });
    }
    if(a==='import_local'||a==='import_file'){
        if(typeof adapter.readText!=='function') return {ok:false,error:'local_adapter_unavailable'};
        const path=ussStr(args.path); if(!path) return {ok:false,error:'path_required'};
        return Promise.resolve(adapter.readText(path)).then(text=>{let def;try{def=JSON.parse(String(text));}catch(e){return {ok:false,error:'skill_source_must_be_valid_json',details:String(e.message||e)}}return UNIVERSAL_SKILL_SYSTEM.register(def,{sourceType:'local',path});});
    }
    return {ok:false,error:'unknown_skill_action',actions:['list','inspect','validate','register','activate','deactivate','quarantine','remove','compose','build','import_github','import_local']};
}


const UNIVERSAL_SKILL_TOOL_DECLARATION = {
  name: "skill_manager",
  description: "Universal Skill System: list, inspect, validate, install, activate, deactivate, quarantine, compose, import or build declarative expert skills. Skills are evidence-driven definitions; arbitrary code execution is forbidden.",
  parameters: { type: "OBJECT", properties: {
    action: { type: "STRING", enum: ["list","inspect","validate","register","activate","deactivate","quarantine","remove","compose","build","import_github","import_local"] },
    skillId: { type: "STRING" },
    repository: { type: "STRING" },
    path: { type: "STRING" },
    ref: { type: "STRING" },
    task: { type: "STRING" },
    maxSkills: { type: "INTEGER" },
    definition: { type: "OBJECT" },
    source: { type: "OBJECT" },
    name: { type: "STRING" },
    id: { type: "STRING" },
    version: { type: "STRING" },
    description: { type: "STRING" },
    domain: { type: "STRING" },
    triggers: { type: "ARRAY", items: { type: "STRING" } },
    tags: { type: "ARRAY", items: { type: "STRING" } },
    instructions: { type: "ARRAY", items: { type: "STRING" } },
    workflow: { type: "ARRAY", items: { type: "OBJECT" } },
    capabilities: { type: "ARRAY", items: { type: "OBJECT" } }
  }, required: ["action"] }
};

/* --- Universal Skill System runtime bridge --- */
(function(){
  if (typeof AI_TOOLS !== 'undefined' && AI_TOOLS[0]?.function_declarations && !AI_TOOLS[0].function_declarations.some(x=>x.name==='skill_manager')) AI_TOOLS[0].function_declarations.push(UNIVERSAL_SKILL_TOOL_DECLARATION);
  if (typeof TOOL_GROUPS !== 'undefined' && !TOOL_GROUPS.SKILL_SYSTEM) TOOL_GROUPS.SKILL_SYSTEM=['skill_manager'];
})();


/* --- Integrated Universal Skill Synthesis Engine --- */
/**
 * Universal Skill Synthesis Engine 1.0
 * Converts external/local knowledge sources into validated declarative Skills.
 * No arbitrary source code execution; synthesis is evidence/provenance driven.
 */
const UNIVERSAL_SKILL_SYNTHESIS_VERSION='1.0-synthesis';
function usseArray(v){return Array.isArray(v)?v:[];}function usseObj(v){return v&&typeof v==='object'&&!Array.isArray(v)?v:{};}function usseStr(v){return typeof v==='string'?v:'';}
function usseClean(s){return usseStr(s).replace(/\r/g,'').replace(/\s+/g,' ').trim();}
function usseRelevant(path=''){return /\.(md|markdown|txt|json|ya?ml|js|mjs|cjs|ts|tsx|py|java|kt|go|rs|rb|php|cs|cpp|h|pdf)$/i.test(path)&&!/(node_modules|dist|build|coverage|\.git)/i.test(path);}
function usseExtractUnits(sources=[],limits={}){const maxFiles=Number(limits.maxFiles||80),maxChars=Number(limits.maxCharsPerFile||120000);const units=[];for(const src of usseArray(sources).slice(0,maxFiles)){const path=usseStr(src.path),text=usseStr(src.text).slice(0,maxChars);if(!path||!text||!usseRelevant(path))continue;const headings=[...text.matchAll(/^\s{0,3}(#{1,6})\s+(.+)$/gm)].map(m=>usseClean(m[2])).filter(Boolean).slice(0,40);const rules=[...text.matchAll(/(?:must|should|shall|required|never|always|avoid|do not|لا يجب|يجب|ينبغي|تجنب)\b[^\n.;]{0,240}/gi)].map(m=>usseClean(m[0])).slice(0,40);const codeSignals=[...text.matchAll(/\b(?:function|class|interface|workflow|pipeline|tool|command|script|endpoint|route|handler|validator|parser)\b[^\n]{0,180}/gi)].map(m=>usseClean(m[0])).slice(0,40);units.push({path,headings,rules,codeSignals,excerpt:text.slice(0,Math.min(text.length,18000)),characters:text.length});}return units;}
function usseSynthesizeSkill(input={},options={}){const units=usseExtractUnits(input.sources||[],options);const name=usseStr(input.name||input.topic||'Synthesized Expert Skill');const id=usseStr(input.id||('skill.'+name.toLowerCase().replace(/[^a-z0-9]+/g,'.').replace(/^\.|\.$/g,'')))||('skill.'+Date.now());const domain=usseStr(input.domain||'general');const headings=[...new Set(units.flatMap(x=>x.headings))].slice(0,40);const rules=[...new Set(units.flatMap(x=>x.rules))].slice(0,50);const signals=[...new Set(units.flatMap(x=>x.codeSignals))].slice(0,50);const instructions=[`Use the synthesized knowledge from ${units.length} analyzed source files as task context.`,`Prefer evidence from cited source paths over unsupported assumptions.`,...rules.slice(0,20)];const workflow=[{id:'source-analysis',action:'analyze_sources',purpose:'Review synthesized source units before acting.',tool:'discovery_scan',expectedEvidence:['source inventory','relevant knowledge units'],stopConditions:['source set is empty']}];if(headings.length)workflow.push({id:'expert-procedure',action:'apply_domain_knowledge',purpose:'Apply extracted domain procedures and concepts.',tool:'skill_context',inputs:{topics:headings.slice(0,15)},expectedEvidence:['task-specific evidence'],stopConditions:['evidence conflicts with source']});return{skill:{id,name,version:'0.1.0',description:usseStr(input.description||`Synthesized expert skill derived from ${units.length} source files.`),domain,triggers:usseArray(input.triggers).length?input.triggers:headings.slice(0,12),tags:[domain,'synthesized','evidence-driven'],prerequisites:[],instructions,workflow,capabilities:signals.slice(0,15).map((x,i)=>({id:`cap.${i+1}`,name:x.slice(0,100),description:'Capability inferred from source evidence.',tools:['discovery_scan','read_file'],safe:true})),constraints:['Do not treat inferred knowledge as fact without source evidence.','Do not execute imported source code as part of skill synthesis.'],validation:{required:['skill schema validation','provenance recorded'],commands:[],evidence:['source paths','source excerpts']},outputs:['validated skill definition','source provenance','knowledge units'],safety:{allowNetwork:false,allowWrites:false,allowTerminal:false,allowSecrets:false,arbitraryCode:false},provenance:{sourceType:usseStr(input.sourceType||'synthesized'),repository:usseStr(input.repository),path:usseStr(input.path),ref:usseStr(input.ref||'main')},status:'draft'},evidence:{sources:units.map(u=>({path:u.path,characters:u.characters,headings:u.headings,rules:u.rules})),unitCount:units.length,topic:name,domain},limitations:units.length?'Synthesis is source-structure aware; semantic claims should be validated by the model and runtime evidence.':'No relevant sources were available for synthesis.'};}
function usseValidateSynthesis(result={}){const skill=usseObj(result.skill),errors=[];if(!skill.id)errors.push('missing skill id');if(!skill.name)errors.push('missing skill name');if(!skill.description)errors.push('missing description');if(!usseArray(skill.instructions).length&&!usseArray(skill.workflow).length)errors.push('missing procedure');if(skill.safety?.arbitraryCode)errors.push('arbitrary code is forbidden');if(!usseArray(result.evidence?.sources).length)errors.push('missing provenance evidence');return{valid:!errors.length,errors,result};}
function universalSkillSynthesisManager(action,args={},adapter={}){const a=String(action||'').toLowerCase();if(a==='synthesize'||a==='build'){return usseSynthesizeSkill(args,args.options||{});}if(a==='validate'){return usseValidateSynthesis(args.result||args.synthesis||{});}if(a==='extract'){return{ok:true,version:UNIVERSAL_SKILL_SYNTHESIS_VERSION,units:usseExtractUnits(args.sources||[],args.options||{})};}if(a==='import_github_sources'){if(typeof adapter.fetchSources!=='function')return{ok:false,error:'github_source_adapter_unavailable'};return Promise.resolve(adapter.fetchSources(args)).then(sources=>usseSynthesizeSkill({...args,sources,sourceType:'github'},args.options||{}));}if(a==='import_local_sources'){if(typeof adapter.readSources!=='function')return{ok:false,error:'local_source_adapter_unavailable'};return Promise.resolve(adapter.readSources(args)).then(sources=>usseSynthesizeSkill({...args,sources,sourceType:'local'},args.options||{}));}return{ok:false,error:'unknown_synthesis_action',actions:['synthesize','extract','validate','import_github_sources','import_local_sources']};}
const UNIVERSAL_SKILL_SYNTHESIS_ENGINE={version:UNIVERSAL_SKILL_SYNTHESIS_VERSION,synthesize:usseSynthesizeSkill,extract:usseExtractUnits,validate:usseValidateSynthesis,manage:universalSkillSynthesisManager};


const UNIVERSAL_SKILL_SYNTHESIS_TOOL_DECLARATION={name:'skill_synthesis',description:'Synthesize a declarative expert Skill from GitHub or local source material; extract evidence, build a draft, and validate it. Imported source code is never executed.',parameters:{type:'OBJECT',properties:{action:{type:'STRING',enum:['synthesize','extract','validate','import_github_sources','import_local_sources']},name:{type:'STRING'},id:{type:'STRING'},domain:{type:'STRING'},topic:{type:'STRING'},description:{type:'STRING'},repository:{type:'STRING'},path:{type:'STRING'},ref:{type:'STRING'},task:{type:'STRING'},sources:{type:'ARRAY',items:{type:'OBJECT'}},result:{type:'OBJECT'},synthesis:{type:'OBJECT'},options:{type:'OBJECT'}},required:['action']}};

/* skill synthesis runtime bridge */
(function(){if(typeof AI_TOOLS!=='undefined'&&AI_TOOLS[0]?.function_declarations&&!AI_TOOLS[0].function_declarations.some(x=>x.name==='skill_synthesis'))AI_TOOLS[0].function_declarations.push(UNIVERSAL_SKILL_SYNTHESIS_TOOL_DECLARATION);})();
