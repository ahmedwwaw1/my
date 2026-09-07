// ============================================================
//  العقل المدبر - Mastermind Core Script
//  يدعم المحركات (0-12) ويحتوي على منطق المسارات السيادية
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    const savedName = localStorage.getItem('vsa_main_html') || 'index.html';
    const el = document.getElementById('mainFileName');
    if (el) el.innerText = savedName;
    console.log('✅ العقل المدبر V7.0 (المحركات 0-12) تم تحميلها بنجاح.');
});

function changeMainFile() {
    const newName = prompt('يرجى إدخال اسم ملف الـ HTML الرئيسي لموقعك (مثلاً: main.html أو index.html):', document.getElementById('mainFileName').innerText);
    if (newName && newName.trim() !== '') {
        localStorage.setItem('vsa_main_html', newName.trim());
        document.getElementById('mainFileName').innerText = newName.trim();
        alert('✅ تم تحديث تعريف الملف الرئيسي للنظام.');
    }
}

function copyPrompt() {
    const prompt = `أنت الآن تتقمص دور "العقل المدبر" (Mastermind) مع كامل المحركات (0-12).

هذا هو دستورك:
${document.querySelector('.constitution-block').innerText}

وهذه هي ترسانة أدواتك الكاملة (جميع المحركات 0-12):
[الأدوات الأساسية]: read_file, write_file, replace_file_content, multi_replace_file_content, searchCode, list_files, analyze_file, take_snapshot, instant_undo, thought, repairSystem, triggerGithubWorkflow, web_search, read_url
[المحرك 7]: store_memory, vector_search, compress_context
[المحرك 8]: estimate_cost, get_usage_metrics, latency_ping
[المحرك 9]: run_virtual_test, synthesize_test, self_score_output, simulate_integration
[المحرك 10]: graceful_interrupt, resume_from_checkpoint, background_async_task
[المحرك 11]: select_design_pattern, install_dependency, resolve_version_conflict, auto_lint_and_fix, wrap_with_error_handling, calculate_refactor_threshold, generate_docstring
[المحرك 12]: classify_problem, estimate_big_o, detect_bug_signature

تذكر: التفكير (thought) هو نظام حياتك الأساسي. التزم بالدقة الجراحية 100%.`;

    navigator.clipboard.writeText(prompt).then(() => {
        alert('✅ تم نسخ بصمة العقل المدبر السحابية مع المحركات الجديدة!');
    }).catch(() => {
        alert('⚠️ تعذر النسخ، يرجى نسخ النص يدوياً.');
    });
}

function copyAIProtocol() {
    const protocol = `[PROTOCOL: UNIVERSAL ROOT PATH SYSTEM]
1. المبدأ: استخدام المسارات المطلقة من الجذر (Absolute Root Paths) لكافة أنواع الملفات (JSON, Images, PDF, etc).
2. الكود الإلزامي:
   const APP_CONFIG = {
       root: window.location.origin + '/',
       dataPath: window.location.origin + '/بيانات موقعي json/'
   };
3. محرك الجلب: استخدام دالة fetchSmartData(file) التي تدمج المسار المطلق مع APP_CONFIG.dataPath.
4. التوافق: النظام يدعم استدعاء الموارد من عمق 10 مجلدات أو أكثر دون الحاجة للمسارات النسبية (../).`;

    navigator.clipboard.writeText(protocol).then(() => {
        alert('✅ تم نسخ بروتوكول المسارات الشامل! أرسله للذكاء الاصطناعي.');
    }).catch(() => {
        alert('⚠️ تعذر النسخ، يرجى نسخ النص يدوياً.');
    });
}

function getEngineTools(engineNumber) {
    const tools = {
        0: ['read_file', 'write_file', 'replace_file_content', 'multi_replace_file_content', 'searchCode', 'list_files', 'analyze_file', 'take_snapshot', 'instant_undo', 'thought', 'repairSystem', 'triggerGithubWorkflow', 'web_search', 'read_url'],
        7: ['store_memory', 'vector_search', 'compress_context'],
        8: ['estimate_cost', 'get_usage_metrics', 'latency_ping'],
        9: ['run_virtual_test', 'synthesize_test', 'self_score_output', 'simulate_integration'],
        10: ['graceful_interrupt', 'resume_from_checkpoint', 'background_async_task'],
        11: ['select_design_pattern', 'install_dependency', 'resolve_version_conflict', 'auto_lint_and_fix', 'wrap_with_error_handling', 'calculate_refactor_threshold', 'generate_docstring'],
        12: ['classify_problem', 'estimate_big_o', 'detect_bug_signature']
    };
    return tools[engineNumber] || [];
}

window.changeMainFile = changeMainFile;
window.copyPrompt = copyPrompt;
window.copyAIProtocol = copyAIProtocol;
window.getEngineTools = getEngineTools;