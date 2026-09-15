/**
 * Mastermind AI - Desktop Pro Edition Core
 * Optimized for Windows Local Execution with Advanced Core Synergy
 */

const SUPABASE_URL = 'https://ozcffmadatsfyyldqmdl.supabase.co';
const SUPABASE_KEY = (typeof window !== 'undefined' && typeof window.__SUPABASE_PUBLIC_KEY__ === 'string') ? window.__SUPABASE_PUBLIC_KEY__ : '';
const SUPABASE_BRIDGE_URL = 'https://ozcffmadatsfyyldqmdl.supabase.co/functions/v1/vsa-bridge';

// --- [Globals] ---
let chatHistory = [];
let stopAiRequested = false;
let aiAbortController = null; // 🛑 نظام القطع الفوري للاتصال

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
  "memory": "Use Sovereign Memory only for durable engineering patterns or user-approved knowledge. A correction becomes a reusable protocol only after successful verification; do not store unverified assumptions as fact.",
  "encoding_integrity": "If runtime returns unreadable placeholder characters such as ???? and evidence indicates an encoding mismatch, stop repeated blind retries and report the environment limitation until a safe alternate path is available.",
  "tool_discovery": "If the current filtered tool set cannot satisfy the objective, use request_tool_discovery rather than inventing a function name or claiming unavailable capability.",
  "interrupt_resume": "Honor graceful_interrupt and resume_from_checkpoint semantics; preserve mission state and evidence context before pausing or resuming multi-step work.",
  "environment": "Windows Desktop via Electron and native runtime bridge",
  "environment_execution": "Native operations may use run_terminal_command, PowerShell or CMD, task/process inspection, and local file tools through the Desktop bridge. Respect existing application and OS boundaries.",
  "response_style": "Decisive, evidence-driven, architecturally aware, transparent about uncertainty. Default to the closed Agent Operating Loop for multi-step engineering tasks."
}
`;

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
    CORE: ["architecture_loop", "runtime_verify", "read_file", "write_file", "replace_file_content", "multi_replace_file_content", "thought", "repairSystem", "request_tool_discovery", "run_terminal_command", "list_local_files", "list_files", "analyze_file", "fast_file_search", "discovery_scan"],
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
    const text = String(prompt || '').toLowerCase();
    const selected = new Set(TOOL_GROUPS.CORE || []);
    const matchedGroups = new Map();

    // Intent Router: semantic aliases + exact tool mentions.
    // This is intentionally local/deterministic so routing adds no model round-trip latency.
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

    // 1) Exact tool names are the strongest signal.
    for (const [group, tools] of Object.entries(TOOL_GROUPS)) {
        for (const tool of (tools || [])) {
            if (tool && text.includes(String(tool).toLowerCase())) addScore(group, 5, `tool:${tool}`);
        }
    }

    // 2) Semantic intent profiles.
    for (const [group, signals] of Object.entries(INTENT_PROFILES)) {
        for (const signal of signals) {
            if (text.includes(signal.toLowerCase())) addScore(group, 2, `signal:${signal}`);
        }
    }

    // 3) Existing KEYWORD_MAP remains the fast path and backwards compatibility layer.
    for (const [group, keywords] of Object.entries(KEYWORD_MAP || {})) {
        for (const keyword of (keywords || [])) {
            if (text.includes(String(keyword).toLowerCase())) addScore(group, 2, `keyword:${keyword}`);
        }
    }

    // 4) Extended toolbox aliases become real intent hints instead of unused metadata.
    for (const [alias, entry] of Object.entries(EXTENDED_TOOLBOX_CATALOG || {})) {
        if (text.includes(String(alias).toLowerCase()) && entry?.group) addScore(entry.group, 3, `catalog:${alias}`);
    }

    // 5) Open the strongest relevant groups. One strong intent can open one group;
    // multiple genuinely present intents can open up to three groups.
    const ranked = [...matchedGroups.entries()]
        .filter(([group]) => group !== 'CORE' && Array.isArray(TOOL_GROUPS[group]))
        .sort((a, b) => b[1].score - a[1].score);
    const strong = ranked.filter(([, info]) => info.score >= 2).slice(0, 3);
    for (const [group] of strong) {
        for (const tool of TOOL_GROUPS[group]) selected.add(tool);
    }

    // 6) Preserve discovered capabilities across the current conversation.
    for (const turn of history) {
        for (const part of (turn.parts || [])) {
            if (!part.functionResponse || part.functionResponse.name !== 'request_tool_discovery') continue;
            const response = String(part.functionResponse.response?.content || '');
            for (const groupName of Object.keys(TOOL_GROUPS)) {
                if (response.includes(groupName)) {
                    for (const tool of TOOL_GROUPS[groupName]) selected.add(tool);
                    addScore(groupName, 1, 'history-discovery');
                }
            }
        }
    }

    const declarations = AI_TOOLS[0].function_declarations.filter(td => selected.has(td.name));
    const topIntent = ranked[0]?.[0] || 'CORE';
    const topScore = ranked[0]?.[1]?.score || 0;
    if (!topScore && history.length < 3) {
        logToTerminal('Intent Router: low-confidence intent; CORE + tool discovery retained.', 'info');
    } else if (topScore) {
        logToTerminal(`Intent Router: ${topIntent} score=${topScore}; tools=${declarations.length}`, 'info');
    }
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

// --- [Main Run Tool Loop] ---
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
            else if (name === "runtime_verify") {
                try {
                    const runtimeRoot = args?.path || args?.path || ".";
                    const initialScan = await performArchitectureDiscovery(runtimeRoot);
                    toolResult = await runClosedRuntimeRepairLoop({
                        environment: "Windows Desktop",
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
                                for(const part of calls.slice(0,4)){const {name,args}=part.functionCall;if(!['read_file','write_file','replace_file_content','analyze_file'].includes(name))continue;let result;if(name==='read_file'||name==='analyze_file')result=await callLocalBridge('read', args);else if(name==='write_file')result=await callLocalBridge('write', args);else result=await (async a=>{const current=await callLocalBridge('read',{path:a.path});const content=current?.content??current?.output??current;if(typeof content!=='string'||!content.includes(a.targetContent))return '❌ target not found';return await callLocalBridge('write',{path:a.path,content:content.replace(a.targetContent,a.replacementContent)});})(args);results.push({name,result});if(name==='write_file'||name==='replace_file_content')applied=true;repairHistory.push({role:'function',parts:[{functionResponse:{name,response:{content:typeof result==='string'?result:JSON.stringify(result)}}}]});}
                                if(applied) break;
                            }
                            return {applied,results};
                        },
                        discover: async () => performArchitectureDiscovery(runtimeRoot)
                    });
                } catch (runtimeError) {
                    toolResult = { error: "Empirical runtime verification failed.", details: runtimeError?.message || String(runtimeError) };
                }
            }
            else if (name === "read_file") toolResult = await callLocalBridge('read', args);
            else if (name === "write_file") toolResult = await callLocalBridge('write', args);
            else if (name === "discovery_scan") {
                toolResult = performArchitectureDiscovery(args?.path || ".");
            }
            else if (name === "architecture_loop") {
    try {
        toolResult = await runUniversalAgentOperatingLoop({ environment: "Windows Desktop", root: safePath || "", objective: args?.objective || "", constraints: args?.constraints || {}, verify: true, maxRepairAttempts: 2 });
    } catch (e) {
        toolResult = { error: "Universal agent operating loop failed.", details: e?.message || String(e) };
    }
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
