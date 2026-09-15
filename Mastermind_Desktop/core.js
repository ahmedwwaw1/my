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
  "universal_architecture_loop": "For non-trivial engineering tasks execute the Universal Architect Loop: Discovery -> Architecture Understanding -> Constraint Analysis -> Architecture Planning -> Design -> Cross-file Implementation -> Validation -> Repair. Treat the returned architecture model as the source of truth, inspect before writing, validate after coherent batches, and re-scan after changes.",
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

function architectRepairPlan(validation, design) {
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
    const repair = architectRepairPlan(validation, design);
    const architectureExpansion = runUniversalArchitectureExpansion(scanResult, { environment: options.environment || 'Unknown', baseline: options.baseline || null, runtimeEvidence: options.runtimeEvidence || null });

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
async function runUniversalRuntimeVerification(options={}){if(typeof options.execute!=='function')return{available:false,version:UNIVERSAL_RUNTIME_VERIFICATION_VERSION,error:'No runtime command executor supplied.'};const env=options.environment||'Unknown',snapshot=options.snapshot||{},root=options.root||snapshot.root||'.',phases=[],commands=urvCommands(snapshot,options),retries=Math.max(0,Number(options.maxRetries??1));for(const item of commands){let ev=null;for(let i=0;i<=retries;i++){ev=await urvExec(options,item.phase,item.command);ev.attempt=i+1;if(ev.ok)break;}phases.push({...item,evidence:ev});if(!ev.ok&&options.stopOnFailure!==false)break;}let pid=null,runtimeStarted=false,ports=[],health=[],runtimeLog=null;const startCommand=options.startCommand||urvScripts(snapshot).start||urvScripts(snapshot).dev;try{if(startCommand&&options.runRuntime!==false&&phases.every(p=>p.evidence.ok)){const logFile=options.logFile||'.agent-runtime.log';const start=await urvExec(options,'start',urvStart(env,root,startCommand,logFile));phases.push({phase:'start',command:start.command,evidence:start});const ids=start.output.match(/\b\d{1,12}\b/g)||[];pid=ids[ids.length-1]||null;runtimeStarted=Boolean(pid)&&start.ok;if(runtimeStarted){for(let i=0;i<Math.max(1,Number(options.runtimeChecks??3));i++){const m=await urvExec(options,'process-monitor',urvMonitor(env,pid));phases.push({phase:'process-monitor',command:m.command,evidence:m});const p=await urvExec(options,'port-monitor',urvPorts(env));phases.push({phase:'port-monitor',command:p.command,evidence:p});ports=urvString(p.output).split(/[,\s]+/).filter(x=>/^\d+$/.test(x));if(options.healthUrl)health.push(await urvExec(options,'api-smoke',urvHttp(env,options.healthUrl)));else if(options.apiPath&&ports[0])health.push(await urvExec(options,'api-smoke',urvHttp(env,`http://127.0.0.1:${ports[0]}${options.apiPath}`)));if(health.some(x=>x.ok))break;}runtimeLog=await urvExec(options,'runtime-log',urvLog(env,root,options.logFile||'.agent-runtime.log'));phases.push({phase:'runtime-log',command:runtimeLog.command,evidence:runtimeLog});}}}finally{if(pid){const stop=await urvExec(options,'stop',urvStop(env,pid));phases.push({phase:'stop',command:stop.command,evidence:stop});}}const failed=[...phases.map(p=>p.evidence).filter(e=>!e.ok),...health.filter(e=>!e.ok)],firstFailure=failed[0]||null;let postSnapshot=null,architectureDiff=null,postSnapshotError=null;if(typeof options.discover==='function'){try{postSnapshot=await options.discover();const baseArch={components:urvArray(snapshot.architecture?.components||snapshot.components)};const postArch={components:urvArray(postSnapshot?.architecture?.components||postSnapshot?.components)};if(typeof ua2ArchitectureDiff==='function')architectureDiff=ua2ArchitectureDiff(baseArch,postArch);}catch(e){postSnapshotError=urvRedact(e?.message||String(e));}}return{available:true,version:UNIVERSAL_RUNTIME_VERIFICATION_VERSION,status:failed.length?'failed':'passed',classification:firstFailure?urvFailureClass(firstFailure):null,summary:{executedPhases:phases.length,failedPhases:failed.length,runtimeStarted,observedPorts:ports,apiChecks:health.length,retriesUsed:phases.reduce((n,p)=>n+Math.max(0,(p.evidence?.attempt||1)-1),0)},phases,healthChecks:health,runtimeLog,postSnapshot,postSnapshotError,architectureDiff,repair:{required:Boolean(firstFailure),rootCauseClass:firstFailure?urvFailureClass(firstFailure):null,action:firstFailure?'Repair the first failing layer using the captured empirical output, then rerun runtime verification.':'No repair required.'},capability:'empirical-runtime-execution'};}
if(typeof module!=='undefined')module.exports={UNIVERSAL_RUNTIME_VERIFICATION_VERSION,runUniversalRuntimeVerification,urvFailureClass,urvCommands};


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
                    const initialScan = performArchitectureDiscovery(runtimeRoot);
                    toolResult = await runUniversalRuntimeVerification({
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
                        execute: async (command) => callLocalBridge('cmd', { command }),
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
                    const scanResult = performArchitectureDiscovery(args?.path || ".");
                    toolResult = runUniversalArchitectLoop(scanResult, { environment: "Windows Desktop", objective: args?.objective || "", constraints: args?.constraints || {} });
                } catch (architectureError) {
                    toolResult = { error: "Universal architecture loop failed.", details: architectureError?.message || String(architectureError) };
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
