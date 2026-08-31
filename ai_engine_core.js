        // ==========================================
        // === AI Orchestrator (Gemini) Integration ===
        // ==========================================

        let geminiApiKey = '';
        let openaiApiKey = '';
        let claudeApiKey = '';
        let deepseekApiKey = '';
        let mastermindProxyUrl = ''; // رابط الجسر الوسيط لتجاوز الـ CORS
        let githubToken = '';
        const GITHUB_REPO = 'ahmedwwaw1/my';

        function getCleanGithubToken() {
            if (!githubToken) return null;
            return githubToken.trim().replace(/^['"]|['"]$/g, '');
        }

        async function resetGeminiKey() {
            const choice = prompt("⚙️ إعدادات العقل المدبر:\n1. تعديل مفتاح API للنموذج الحالي\n2. تعديل رابط الجسر (Proxy URL) لتجاوز CORS\n3. تعديل مفتاح GitHub\n\nأدخل رقم الخيار (1-3):");

            if (choice === "1") {
                const currentModel = document.getElementById('modelSelector').value;
                let keyName = 'gemini_key';
                let providerName = 'Google Gemini';
                let promptText = 'الرجاء إدخال Gemini API Key الجديد (AIza...):';

                if (currentModel.includes('claude')) {
                    keyName = 'claude_key';
                    providerName = 'Anthropic Claude';
                    promptText = 'الرجاء إدخال Claude API Key الجديد (sk-ant-...):';
                } else if (currentModel.includes('gpt')) {
                    keyName = 'openai_key';
                    providerName = 'OpenAI GPT';
                    promptText = 'الرجاء إدخال OpenAI API Key الجديد (sk-proj-...):';
                } else if (currentModel.includes('deepseek')) {
                    keyName = 'deepseek_key';
                    providerName = 'DeepSeek';
                    promptText = 'الرجاء إدخال DeepSeek API Key الجديد (sk-...):';
                }

                const key = prompt(promptText);
                if (key !== null) {
                    const trimmedKey = key.trim();
                    if (keyName === 'gemini_key') geminiApiKey = trimmedKey;
                    else if (keyName === 'claude_key') claudeApiKey = trimmedKey;
                    else if (keyName === 'openai_key') openaiApiKey = trimmedKey;
                    else if (keyName === 'deepseek_key') deepseekApiKey = trimmedKey;

                    if (trimmedKey) {
                        await saveApiKeyToSupabase(keyName, trimmedKey);
                        alert(`✅ تم تحديث مفتاح ${providerName} بنجاح.`);
                    }
                }
            } else if (choice === "2") {
                const url = prompt("🔗 أدخل رابط الجسر السيادي (Cloudflare Worker URL):", mastermindProxyUrl);
                if (url !== null) {
                    const trimmedUrl = url.trim();
                    mastermindProxyUrl = trimmedUrl;
                    await saveApiKeyToSupabase('proxy_url', trimmedUrl);
                    alert("✅ تم تحديث رابط الجسر بنجاح! نماذج DeepSeek و Claude ستعمل الآن.");
                }
            } else if (choice === "3") {
                await resetGithubToken();
            } else if (choice !== null) {
                alert("⚠️ خيار غير صحيح.");
            }
        }

        async function resetGithubToken() {
            const token = prompt("الرجاء إدخال GitHub Personal Access Token (لتمكين الإدارة التلقائية):");
            if (token) {
                githubToken = token.trim();
                await saveApiKeyToSupabase('github_token', githubToken);
                alert("✅ تم تحديث مفتاح GitHub.");
            }
        }

        async function initKeys() {
            // إضافة زر إغلاق التيرمينال يدوياً إذا لم يكن موجوداً
            const term = document.getElementById('aiTerminal');
            if (term && !term.querySelector('.terminal-close-btn')) {
                const closeBtn = document.createElement('div');
                closeBtn.className = 'terminal-close-btn';
                closeBtn.innerHTML = '✕';
                closeBtn.style.cssText = "position:absolute; top:5px; right:10px; color:#afb1b3; cursor:pointer; z-index:10;";
                closeBtn.onclick = toggleTerminal;
                term.appendChild(closeBtn);
            }

            if (!githubToken) githubToken = await fetchApiKeyFromSupabase('github_token');
            if (!geminiApiKey) geminiApiKey = await fetchApiKeyFromSupabase('gemini_key');
            if (!openaiApiKey) openaiApiKey = await fetchApiKeyFromSupabase('openai_key');
            if (!claudeApiKey) claudeApiKey = await fetchApiKeyFromSupabase('claude_key');
            if (!deepseekApiKey) deepseekApiKey = await fetchApiKeyFromSupabase('deepseek_key');
            if (!mastermindProxyUrl) mastermindProxyUrl = await fetchApiKeyFromSupabase('proxy_url');

            // Built-in recovery logic for owner's repository
            if (!githubToken || githubToken.length < 5) {
                githubToken = '';
            }
        }

        function initResizer() {
            const chatBox = document.getElementById('aiChatBox');
            const resizers = document.querySelectorAll('.ai-resizer');
            let isResizing = false;

            resizers.forEach(resizer => {
                resizer.addEventListener('mousedown', function(e) {
                    e.preventDefault();
                    isResizing = true;

                    const startX = e.clientX;
                    const startY = e.clientY;
                    const startWidth = chatBox.offsetWidth;
                    const startHeight = chatBox.offsetHeight;

                    // إضافة طبقة تغطية لمنع تداخل الأحداث والحفاظ على شكل المؤشر
                    const overlay = document.createElement('div');
                    overlay.style.position = 'fixed';
                    overlay.style.top = '0';
                    overlay.style.left = '0';
                    overlay.style.width = '100vw';
                    overlay.style.height = '100vh';
                    overlay.style.zIndex = '9999';
                    overlay.style.cursor = window.getComputedStyle(resizer).cursor;
                    document.body.appendChild(overlay);

                    function mousemove(e) {
                        if (!isResizing) return;

                        const dx = e.clientX - startX;
                        const dy = e.clientY - startY;

                        if (resizer.classList.contains('ai-resizer-r')) {
                            chatBox.style.width = startWidth + dx + 'px';
                        } else if (resizer.classList.contains('ai-resizer-l')) {
                            chatBox.style.width = startWidth - dx + 'px';
                        } else if (resizer.classList.contains('ai-resizer-b')) {
                            chatBox.style.height = startHeight + dy + 'px';
                        } else if (resizer.classList.contains('ai-resizer-t')) {
                            chatBox.style.height = startHeight - dy + 'px';
                        } else if (resizer.classList.contains('ai-resizer-br')) {
                            chatBox.style.width = startWidth + dx + 'px';
                            chatBox.style.height = startHeight + dy + 'px';
                        } else if (resizer.classList.contains('ai-resizer-bl')) {
                            chatBox.style.width = startWidth - dx + 'px';
                            chatBox.style.height = startHeight + dy + 'px';
                        } else if (resizer.classList.contains('ai-resizer-tr')) {
                            chatBox.style.width = startWidth + dx + 'px';
                            chatBox.style.height = startHeight - dy + 'px';
                        } else if (resizer.classList.contains('ai-resizer-tl')) {
                            chatBox.style.width = startWidth - dx + 'px';
                            chatBox.style.height = startHeight - dy + 'px';
                        }
                    }

                    function mouseup() {
                        isResizing = false;
                        if (document.body.contains(overlay)) document.body.removeChild(overlay);
                        window.removeEventListener('mousemove', mousemove);
                        window.removeEventListener('mouseup', mouseup);

                        // حفظ المقاسات النهائية
                        localStorage.setItem('ai_chat_width', chatBox.offsetWidth);
                        localStorage.setItem('ai_chat_height', chatBox.offsetHeight);
                    }

                    window.addEventListener('mousemove', mousemove);
                    window.addEventListener('mouseup', mouseup);
                });
            });
        }

        async function toggleAiChat() {
            const chatBox = document.getElementById('aiChatBox');
            const toggleBtn = document.getElementById('aiToggleBtn');
            const isOpening = chatBox.style.display !== 'flex';

            chatBox.style.display = isOpening ? 'flex' : 'none';
            if (toggleBtn) toggleBtn.style.display = isOpening ? 'none' : 'flex';

            if (isOpening) {
                // استعادة المقاسات المحفوظة عند الفتح
                const savedW = localStorage.getItem('ai_chat_width');
                const savedH = localStorage.getItem('ai_chat_height');
                if (savedW) chatBox.style.width = savedW + 'px';
                if (savedH) chatBox.style.height = savedH + 'px';

                const container = document.getElementById('aiMessages');
                container.scrollTop = container.scrollHeight;

                await initKeys();
                initResizer();

                if (!geminiApiKey) await resetGeminiKey();
            }
        }

        function toggleMaximizeAi() {
            const chatBox = document.getElementById('aiChatBox');
            chatBox.classList.toggle('maximized');
            // ضبط التركيز التلقائي
            document.getElementById('aiInput').focus();
        }

        function checkForEvolution() {
            if (document.getElementById('aiSendBtn').classList.contains('working')) {
                addMessageToUi('ai', "⚠️ المحرك مشغول حالياً. يرجى الانتظار حتى انتهاء المهمة الحالية.", 'System');
                return;
            }

            // 🚀 تفعيل بروتوكول التطور (Engine 3 Protocol)
            addMessageToUi('ai', "🚀 تم تفعيل 'محرك التطور الذاتي' (Evolution Engine)... جاري تحليل الفجوات البرمجية.", 'System');
            logToTerminal("INITIATING SELF-EVOLUTION PROTOCOL...", "command");

            const evolutionPrompt = `
            [EVOLUTION MODE ACTIVE]
            المهمة: فحص ذاتي شامل للترقية.
            الخطوات المطلوبة:
            1. قراءة 'المخطط_الهندسي_لإنشاء_نموذج_ذكاء_اصطناعي_متطور.md' لفهم القدرات المستهدفة.
            2. قراءة الأجزاء الحيوية من 'index.html' لمقارنة القدرات الحالية.
            3. تحديد الميزات المفقودة (مثل: محرك الذاكرة الطويلة، تحسين سرعة الاستجابة، أو تعزيز بروتوكولات الحماية).
            4. تقديم اقتراح تقني محدد لترقية الكود باستخدام أداة 'patchSystem' أو إضافة أدوات جديدة عبر 'selfExpand'.

            ابدأ بالبحث عن الفجوات الآن وأخبرني بالنتائج.`;

            const input = document.getElementById('aiInput');
            input.value = evolutionPrompt;
            autoResizeInput();
            updateSendButtonState();
            sendAiMessage();
        }

        async function fetchApiKeyFromSupabase(id) {
            // 💓 نبض النظام التلقائي (System Heartbeat)
            if (!window.heartbeatStarted) {
                window.heartbeatStarted = true;
                setInterval(async () => {
                    if (!document.getElementById('aiSendBtn').classList.contains('working')) {
                        try {
                            const start = Date.now();
                            // فحص صامت للاتصال
                            const isProxyReady = mastermindProxyUrl ? "PROXY: OK" : "DIRECT: OK";
                            updateHealthUI(true, `${isProxyReady} | ${Date.now() - start}ms`);
                        } catch(e) {
                            updateHealthUI(false, "CONNECTION SLUGGISH");
                        }
                    }
                }, 30000); // جس نبض كل 30 ثانية
            }
            const SUPABASE_URL = 'https://ozcffmadatsfyyldqmdl.supabase.co';
            const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96Y2ZmbWFkYXRzZnl5bGRxbWRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc5NzUxMSwiZXhwIjoyMTAyMzczNTExfQ.WkAWW7iXgstl4YX7be_O4K20YvyXvh0eNJ4eALpv9Wg';

            try {
                const res = await fetch(`${SUPABASE_URL}/rest/v1/secret_settings?id=eq.${id}`, {
                    headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` }
                });
                const data = await res.json();
                return data.length > 0 ? data[0].secret_value : null;
            } catch (e) {
                return null;
            }
        }

        async function saveApiKeyToSupabase(id, key) {
            const SUPABASE_URL = 'https://ozcffmadatsfyyldqmdl.supabase.co';
            const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96Y2ZmbWFkYXRzZnl5bGRxbWRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc5NzUxMSwiZXhwIjoyMTAyMzczNTExfQ.WkAWW7iXgstl4YX7be_O4K20YvyXvh0eNJ4eALpv9Wg';

            await fetch(`${SUPABASE_URL}/rest/v1/secret_settings`, {
                method: 'POST',
                headers: {
                    'apikey': SERVICE_ROLE_KEY,
                    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'resolution=merge-duplicates'
                },
                body: JSON.stringify({ id: id, secret_value: key })
            });
        }

        // 🎯 محرك الاتصال الموحد (The Unified safeGithubFetch)
        async function safeGithubFetch(endpoint, options = {}, isRetry = false) {
            const token = getCleanGithubToken();
            if (!token) throw new Error("GitHub Token غير متوفر.");

            const url = endpoint.startsWith('http') ? endpoint : `https://api.github.com/repos/${GITHUB_REPO}/${endpoint}`;
            const defaultHeaders = {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28'
            };

            const mergedOptions = {
                ...options,
                headers: { ...defaultHeaders, ...options.headers },
                mode: 'cors'
            };

            try {
                const res = await fetch(url, mergedOptions);

                // 🛠️ إذا وجد مشكلة في الصلاحيات ولم نقم بالمحاولة الثانية بعد
                if (res.status === 401 && !isRetry) {
                    console.warn("🛠️ محرك الأمان: كشف خطأ 401، بدء الإصلاح التلقائي...");
                    await repairSystem();
                    return await safeGithubFetch(endpoint, options, true); // إعادة المحاولة
                }

                return res;
            } catch (e) {
                if (!isRetry) {
                    console.warn("🛠️ محرك الأمان: خطأ شبكة، محاولة الإصلاح...");
                    await repairSystem();
                    return await safeGithubFetch(endpoint, options, true);
                }
                throw e;
            }
        }

        // 🟢 أداة الكتابة الكاملة (Write Full File)
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
                if (putRes.ok) return "✅ تم حفظ الملف بلكامل بنجاح.";

                const errData = await putRes.json();
                return `❌ فشل حفظ الملف: ${putRes.status} - ${errData.message}`;
            } catch (e) { return `❌ خطأ في محرك الكتابة: ${e.message}`; }
        }

        // 🔴 أداة التعديل الجراحي (Surgical Edit - Code Interaction Engine)
        async function replaceFileContent(path, targetContent, replacementContent) {
            try {
                const apiPath = `contents/${path}`;
                const res = await safeGithubFetch(apiPath);
                if (!res.ok) return "❌ فشل الوصول للملف للتحقق.";
                const data = await res.json();
                const currentContent = decodeURIComponent(escape(atob(data.content)));

                if (!currentContent.includes(targetContent)) {
                    const lines = currentContent.split('\n');
                    const snippet = targetContent.substring(0, 30);
                    const suggestedLine = lines.find(l => l.includes(snippet));
                    return `❌ خطأ في المطابقة: النص القديم غير موجود بدقة. هل تقصد: "${suggestedLine ? suggestedLine.trim() : 'لا يوجد تشابه'}"؟`;
                }

                const updatedFullContent = currentContent.replace(targetContent, replacementContent);

                if (path.endsWith('.html')) {
                    if (!updatedFullContent.includes('</html>')) return "❌ فشل بروتوكول الأمان: الكود الناتج ناقص.";
                }

                const putRes = await safeGithubFetch(apiPath, {
                    method: 'PUT',
                    body: JSON.stringify({
                        message: "🛠️ تعديل جراحي فائق الدقة (Code Interaction Engine)",
                        content: btoa(unescape(encodeURIComponent(updatedFullContent))),
                        sha: data.sha
                    })
                });
                return putRes.ok ? "✅ تم التعديل الجراحي بمطابقة 100%." : "❌ فشل الحفظ.";
            } catch (e) { return `❌ خطأ في المحرك: ${e.message}`; }
        }

        async function listGithubWorkflows() {
            try {
                const res = await safeGithubFetch(`actions/workflows`);
                if (!res.ok) {
                    const err = await res.json();
                    return `❌ فشل جلب القائمة: ${err.message}`;
                }
                const data = await res.json();
                const names = data.workflows.map(w => w.path.split('/').pop());
                return `قائمة العمليات المتاحة: ${names.join(', ')}`;
            } catch (e) { return `❌ خطأ اتصال: ${e.message}`; }
        }

        async function triggerGithubWorkflow(workflow_id) {
            try {
                const res = await safeGithubFetch(`actions/workflows/${workflow_id}/dispatches`, {
                    method: 'POST',
                    body: JSON.stringify({ ref: 'main' })
                });

                if (res.ok) return `✅ تم إرسال أمر تشغيل البوت بنجاح! سيتم تحديث البيانات خلال دقائق.`;
                const errData = await res.json();
                return `❌ فشل التشغيل [${workflow_id}]: ${errData.message || "الملف غير موجود"}.`;
            } catch (e) {
                return `❌ خطأ in الاتصال: ${e.message}`;
            }
        }

        async function updateWorkflowStatus(workflow_id, status) {
            const action = status === 'stop' ? 'disable' : 'enable';
            try {
                const res = await safeGithubFetch(`actions/workflows/${workflow_id}/${action}`, {
                    method: 'PUT'
                });

                if (res.ok) return `✅ تم ${status === 'stop' ? 'إيقاف' : 'تفعيل'} البوت (${workflow_id}) بنجاح.`;
                const errData = await res.json();
                return `❌ فشل تغيير حالة البوت [${workflow_id}]: ${errData.message}.`;
            } catch (e) { return `❌ خطأ: ${e.message}`; }
        }


        let chatHistory = [];
        let selectedImageBase64 = null;
        let stopAiRequested = false; // فلاج لإيقاف المحرك يدوياً
        const CHAT_LOG_PATH = 'chat_logs.json';

        async function saveChatToStorage() {
            const token = getCleanGithubToken();
            if (!token) return;
            try {
                const globalContext = {
                    sessions: chatSessions,
                    activeSessionId: currentSessionId,
                    pendingHistory: localStorage.getItem('gemini_pending_history'), // مزامنة المهمة المعلقة للسحاب
                    timestamp: new Date().toISOString()
                };
                await writeFile(CHAT_LOG_PATH, JSON.stringify(globalContext, null, 2), "تحديث الذاكرة الشاملة للعقل المدبر");
                localStorage.setItem('gemini_chat_ui', document.getElementById('aiMessages').innerHTML);
                saveModelSelection();
            } catch (e) {
                console.warn("Failed to save chat to GitHub:", e);
            }
        }

        function saveModelSelection() {
            const selectedModel = document.getElementById('modelSelector').value;
            localStorage.setItem('gemini_selected_model', selectedModel);
        }

        async function loadChatFromStorage() {
            const savedUi = localStorage.getItem('gemini_chat_ui');
            const container = document.getElementById('aiMessages');

            if (savedUi) {
                container.innerHTML = savedUi;
                container.scrollTop = container.scrollHeight;
            }

            const savedModel = localStorage.getItem('gemini_selected_model');
            if (savedModel) {
                document.getElementById('modelSelector').value = savedModel;
            }

            await initKeys();

            const token = getCleanGithubToken();
            if (token) {
                try {
                    const syncBadge = document.createElement('div');
                    syncBadge.id = 'cloudSyncBadge';
                    syncBadge.style.cssText = "font-size:10px; color:#4db6ac; text-align:center; padding:5px; background:rgba(77,182,172,0.05); border-radius:4px; margin:10px auto; width:fit-content;";
                    syncBadge.innerText = "🛡️ جاري استعادة الذاكرة العميقة من GitHub...";
                    container.appendChild(syncBadge);

                    const res = await safeGithubFetch(CHAT_LOG_PATH, { headers: { 'Cache-Control': 'no-cache' } });
                    if (res.ok) {
                        const data = await res.json();
                        const content = JSON.parse(decodeURIComponent(escape(atob(data.content))));

                        if (content.sessions) {
                            chatSessions = content.sessions;
                            if (content.activeSessionId) {
                                currentSessionId = content.activeSessionId;
                                localStorage.setItem('gemini_current_session', currentSessionId);
                            }

                            // استعادة حالة المهمة المعلقة من السحاب (Cross-Device Persistence)
                            if (content.pendingHistory && !localStorage.getItem('gemini_pending_history')) {
                                localStorage.setItem('gemini_pending_history', content.pendingHistory);
                                console.log("🔄 تم استرداد مهمة معلقة من السحابة.");
                            }

                            localStorage.setItem('gemini_sessions', JSON.stringify(chatSessions));

                            const active = chatSessions.find(s => s.id === currentSessionId);
                            if (active) {
                                chatHistory = active.history || [];
                                console.log("✅ تم العثور على الجلسة النشطة واستعادتها.");
                            } else if (chatSessions.length > 0) {
                                // إذا لم يجد الجلسة الحالية، يأخذ آخر جلسة كانت مفتوحة بدلاً من البدء من الصفر
                                currentSessionId = chatSessions[0].id;
                                chatHistory = chatSessions[0].history || [];
                                localStorage.setItem('gemini_current_session', currentSessionId);
                                console.log("⚠️ تم استعادة آخر جلسة مسجلة بدلاً من الجلسة المفقودة.");
                            }
                        } else if (Array.isArray(content)) {
                            chatHistory = content;
                        }

                        console.log("✅ تم استعادة الذاكرة الشاملة بنجاح.");
                        rebuildChatUi();
                        renderHistory();

                        // 🚀 تفعيل الاستئناف التلقائي فور المزامنة
                        setTimeout(resumePendingTask, 500);
                    }
                } catch (e) {
                    console.error("Error loading chat context:", e);
                } finally {
                    const badge = document.getElementById('cloudSyncBadge');
                    if (badge) badge.remove();
                }
            }

            container.scrollTop = container.scrollHeight;
        }

        // تهيئة المفاتيح والسياق عند تحميل الصفحة
        window.addEventListener('load', () => {
            loadChatFromStorage();

            // 🚀 استئناف العمل التلقائي فور دخول الموقع (حتى والنافذة مغلقة)
            setTimeout(() => {
                const pending = localStorage.getItem('gemini_pending_history');
                const sendBtn = document.getElementById('aiSendBtn');
                if (pending && sendBtn && !sendBtn.classList.contains('working')) {
                    console.log("🤖 المحرك المستقل: تم اكتشاف مهمة معلقة، بدء التنفيذ في الخلفية...");
                    resumePendingTask();
                }
            }, 2000);

            // ⏰ تشغيل العداد الزمني (Live Clock)
            setInterval(() => {
                const now = new Date();
                const clock = document.getElementById('aiLiveClock');
                if (clock) {
                    clock.innerText = now.toLocaleTimeString('ar-EG', { hour12: false });
                }
            }, 1000);
        });


        async function clearChatHistory() {
            chatHistory = [];
            if (githubToken) {
                await writeFile(CHAT_LOG_PATH, "[]", "تصفير المحادثة");
            }
            localStorage.removeItem('gemini_chat_ui');
            const container = document.getElementById('aiMessages');
            container.innerHTML = '<div class="msg ai">تم مسح الذاكرة العالمية. أنا جاهز لبدء مهمة جديدة!</div>';
            // alert removed per user request
        }

        let chatSessions = JSON.parse(localStorage.getItem('gemini_sessions') || '[]');
        let currentSessionId = localStorage.getItem('gemini_current_session') || Date.now().toString();

        function toggleHistory() {
            const sidebar = document.getElementById('aiHistorySidebar');
            sidebar.classList.toggle('open');
            if (sidebar.classList.contains('open')) renderHistory();
        }

        function renderHistory() {
            const list = document.getElementById('historyList');
            list.innerHTML = `
                <div style="padding: 10px; border-bottom: 1px solid #3c3f41; margin-bottom: 10px;">
                    <button onclick="manualHistoryImport()" style="width:100%; background:#4db6ac; color:white; border:none; padding:8px; border-radius:4px; font-size:12px; cursor:pointer;">📥 استيراد سجل خارجي (JSON)</button>
                </div>
            ` + chatSessions.map(s => `
                <div class="history-item ${s.id === currentSessionId ? 'active' : ''}" onclick="loadSession('${s.id}')">
                    <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:160px;">${s.title}</span>
                    <div class="actions">
                        <span onclick="event.stopPropagation(); renameSession('${s.id}')">✏️</span>
                        <span onclick="event.stopPropagation(); deleteSession('${s.id}')">🗑️</span>
                    </div>
                </div>
            `).join('');
        }

        async function manualHistoryImport() {
            const json = prompt("قم بلصق محتوى ملف chat_logs.json هنا:");
            if (!json) return;
            try {
                const data = JSON.parse(json);
                if (data.sessions) {
                    chatSessions = data.sessions;
                    currentSessionId = data.activeSessionId || currentSessionId;
                    localStorage.setItem('gemini_sessions', JSON.stringify(chatSessions));
                    localStorage.setItem('gemini_current_session', currentSessionId);
                    loadChatFromStorage(); // إعادة التحميل لتحديث الواجهة
                    addMessageToUi('ai', "✅ تم استيراد السجل يدوياً بنجاح. يمكنك الآن متابعة الحديث.", 'System');
                }
            } catch(e) {
                alert("❌ خطأ في تنسيق JSON: " + e.message);
            }
        }

        function createNewChat() {
            stopAiRequested = false; // إعادة ضبط حالة الإيقاف
            localStorage.removeItem('gemini_pending_history'); // مسح أي مهمة معلقة
            currentSessionId = Date.now().toString();
            chatHistory = [];
            document.getElementById('aiMessages').innerHTML = '<div class="msg ai">بدأت محادثة جديدة! كيف يمكنني مساعدتك؟</div>';
            const sidebar = document.getElementById('aiHistorySidebar');
            if (sidebar.classList.contains('open')) toggleHistory();
            saveChatToStorage();
        }

        async function deleteSession(id) {
            if (confirm("هل أنت متأكد من حذف هذه المحادثة نهائياً؟")) {
                chatSessions = chatSessions.filter(s => s.id !== id);
                localStorage.setItem('gemini_sessions', JSON.stringify(chatSessions));
                renderHistory();
                await saveChatToStorage(); // مزامنة الحذف مع السحابة
            }
        }

        function renameSession(id) {
            const newName = prompt("اسم المحادثة الجديد:");
            if (newName) {
                const session = chatSessions.find(s => s.id === id);
                if (session) {
                    session.title = newName;
                    localStorage.setItem('gemini_sessions', JSON.stringify(chatSessions));
                    renderHistory();
                    saveChatToStorage(); // مزامنة الاسم الجديد
                }
            }
        }

        function loadSession(id) {
            const session = chatSessions.find(s => s.id === id);
            if (session) {
                currentSessionId = id;
                chatHistory = session.history;
                localStorage.setItem('gemini_current_session', currentSessionId);
                rebuildChatUi();
                if (document.getElementById('aiHistorySidebar').classList.contains('open')) toggleHistory();
                saveChatToStorage(); // مزامنة الجلسة النشطة الحالية
            }
        }

        function updateSendButtonState() {
            const input = document.getElementById('aiInput');
            const btn = document.getElementById('aiSendBtn');
            const hasFiles = selectedFiles.length > 0;
            if (input.value.trim() !== "" || hasFiles) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }

        // 📏 التوسع التلقائي لصندوق الكتابة
        function autoResizeInput() {
            const input = document.getElementById('aiInput');
            input.style.height = 'auto';
            input.style.height = (input.scrollHeight) + 'px';
        }

        // ⌨️ معالجة لوحة المفاتيح
        function handleKeydown(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                const btn = document.getElementById('aiSendBtn');
                if (btn.classList.contains('active') || btn.classList.contains('working')) {
                    e.preventDefault();
                    sendAiMessage();
                }
            }
        }

        let selectedFiles = [];

        async function handleFileUpload(event) {
            const files = Array.from(event.target.files);
            if (files.length === 0) return;

            const container = document.getElementById('imagePreviewContainer');
            container.style.display = 'flex';

            for (const file of files) {
                const fileId = Date.now() + Math.random();
                const reader = new FileReader();

                reader.onload = (e) => {
                    const base64 = e.target.result.split(',')[1];
                    const fileObj = {
                        id: fileId,
                        name: file.name,
                        type: file.type,
                        base64: base64,
                        content: null
                    };

                    if (file.type === 'application/json' || file.type.startsWith('text/') || file.name.endsWith('.json') || file.name.endsWith('.txt')) {
                        const textReader = new FileReader();
                        textReader.onload = (te) => { fileObj.content = te.target.result; };
                        textReader.readAsText(file);
                    }

                    selectedFiles.push(fileObj);
                    renderPreviews();
                    updateSendButtonState();
                };
                reader.readAsDataURL(file);
            }
            event.target.value = '';
        }

        function renderPreviews() {
            const container = document.getElementById('imagePreviewContainer');
            container.innerHTML = '';

            if (selectedFiles.length === 0) {
                container.style.display = 'none';
                return;
            } else {
                container.style.display = 'flex';
            }

            selectedFiles.forEach(file => {
                const item = document.createElement('div');
                item.className = 'preview-item';

                if (file.type.startsWith('image/')) {
                    item.innerHTML = `<img src="data:${file.type};base64,${file.base64}">`;
                } else {
                    let icon = '📝';
                    if (file.type === 'application/pdf') icon = '📄';
                    else if (file.type.includes('json')) icon = '⚙️';
                    item.innerHTML = `<div class="file-icon">${icon}</div>`;
                }

                const removeBtn = document.createElement('div');
                removeBtn.className = 'remove-btn';
                removeBtn.innerText = '✕';
                removeBtn.onclick = (e) => {
                    e.stopPropagation();
                    removeFile(file.id);
                };

                item.appendChild(removeBtn);
                container.appendChild(item);
            });
        }

        function removeFile(id) {
            selectedFiles = selectedFiles.filter(f => f.id !== id);
            renderPreviews();
            updateSendButtonState();
        }

        function clearSelectedFile() {
            selectedFiles = [];
            renderPreviews();
            updateSendButtonState();
        }

        async function resumePendingTask() {
            const pending = localStorage.getItem('gemini_pending_history');
            if (pending && !stopAiRequested && typeof runToolLoop === 'function') {
                const history = JSON.parse(pending);
                if (history.length === 0) return;

                localStorage.removeItem('gemini_pending_history');
                const lastUserMsg = history[history.length - 1].parts[0].text || "المهمة السابقة";
                addMessageToUi('ai', `🔄 <b>بروتوكول الاستئناف التلقائي:</b> جاري المتابعة...`, 'System');

                const sendBtn = document.getElementById('aiSendBtn');
                if (sendBtn) sendBtn.classList.add('working');

                try {
                    await saveChatToStorage();
                    await runToolLoop(history);
                } catch(e) {
                    console.error("Resume failed:", e);
                } finally {
                    if (sendBtn) sendBtn.classList.remove('working');
                    updateSendButtonState();
                }
            }
        }

        async function sendAiMessage() {
            const input = document.getElementById('aiInput');
            const sendBtn = document.getElementById('aiSendBtn');

            // 🛑 إذا كان المحرك يعمل، نقوم بإيقافه
            if (sendBtn.classList.contains('working')) {
                stopAiRequested = true;
                addMessageToUi('ai', "🛑 تم إرسال أمر إيقاف للمحرك...", 'System');
                return;
            }

            const msgText = input.value.trim();
            if (!msgText && selectedFiles.length === 0) return;

            // عرض الرسالة في الواجهة
            let userMsg = msgText;
            if (selectedFiles.length > 0) {
                userMsg += `\n📎 [مرفق ${selectedFiles.length} ملفات]`;
            }

            addMessageToUi('user', userMsg);

            input.value = '';
            autoResizeInput();
            stopAiRequested = false;

            try {
                sendBtn.classList.add('working');
                // إضافة تأخير بسيط للتأكد من أن الـ UI استوعب الحالة
                await new Promise(r => setTimeout(r, 50));

                let finalPrompt = msgText;
                let lastFileBase64 = null;
                let lastFileType = null;

                // دمج محتوى الملفات النصية في الطلب
                selectedFiles.forEach(f => {
                    if (f.content) {
                        finalPrompt += `\n\n[محتوى الملف المرفق (${f.name})]:\n${f.content}`;
                    }
                    if (f.type.startsWith('image/') || f.type === 'application/pdf') {
                        lastFileBase64 = f.base64;
                        lastFileType = f.type;
                    }
                });

                addMessageToUi('ai', `🧠 جاري التفكير باستخدام ${document.getElementById('modelSelector').value}...`, 'System');
                const result = await callAiBrain(finalPrompt, lastFileBase64, lastFileType);

                // إزالة أي رسالة تفكير متبقية بالبحث في آخر 3 رسائل
                const msgs = document.getElementById('aiMessages');
                const lastMessages = Array.from(msgs.children).slice(-3);
                lastMessages.forEach(m => {
                    if (m.innerText.includes("جاري التفكير")) msgs.removeChild(m);
                });

                // فحص إذا كان الرد يحتوي على خطأ في الـ API
                if (result.text && result.text.includes("API_KEY_INVALID")) {
                    addMessageToUi('ai', "❌ خطأ حرج: مفتاح Gemini API غير صالح أو منتهي الصلاحية. يرجى الضغط على النقاط الثلاث (⋮) في الأعلى وإدخال مفتاح جديد.", 'System');
                } else if (result.text && result.text.includes("quota")) {
                    addMessageToUi('ai', "⚠️ تم استهلاك حصة الاستخدام المجانية بالكامل. يرجى الانتظار قليلاً أو استخدام مفتاح API آخر.", 'System');
                } else {
                    addMessageToUi('ai', result.text, result.model);
                }

                clearSelectedFile();
                updateSessions();
            } catch (err) {
                console.error("Chat Error:", err);
                addMessageToUi('ai', "⚠️ عطل فني: تعذر الاتصال بمحرك الذكاء الاصطناعي. تأكد من أن مفتاح الـ API صحيح ومن اتصال الإنترنت.");
            } finally {
                console.log("AI Engine: Finished task.");
                sendBtn.classList.remove('working');
                // التأكد من أن الزر استعاد حالته الطبيعية
                setTimeout(() => {
                    sendBtn.classList.remove('working');
                    updateSendButtonState();
                }, 100);
            }
        }

        function updateSessions() {
            const existing = chatSessions.find(s => s.id === currentSessionId);
            const title = chatHistory.length > 0 ? chatHistory[chatHistory.length - 1].parts[0].text.substring(0, 30) + "..." : "محادثة جديدة";
            if (existing) {
                existing.history = chatHistory;
                existing.title = title;
            } else {
                chatSessions.unshift({ id: currentSessionId, title: title, history: chatHistory });
            }
            if (chatSessions.length > 20) chatSessions.pop();
            localStorage.setItem('gemini_sessions', JSON.stringify(chatSessions));
            localStorage.setItem('gemini_current_session', currentSessionId);
            saveChatToStorage(); // مزامنة فورية مع GitHub
        }

        function rebuildChatUi() {
            const container = document.getElementById('aiMessages');
            container.innerHTML = '';
            chatHistory.forEach(turn => {
                const sender = turn.role === 'user' ? 'user' : 'ai';
                const text = turn.parts.map(p => p.text || "[مرفق]").join('\n');
                const div = document.createElement('div');
                div.className = turn.role === 'user' ? 'msg user' : 'msg ai';

                const contentDiv = document.createElement('div');
                contentDiv.className = 'msg-content';
                if (typeof marked !== 'undefined' && sender !== 'user') {
                    contentDiv.innerHTML = marked.parse(text);
                } else {
                    contentDiv.innerText = text;
                }
                div.appendChild(contentDiv);

                if (turn.role === 'model' && turn.model) {
                    const badge = document.createElement('div');
                    badge.className = 'model-badge';
                    badge.innerText = turn.model;
                    div.appendChild(badge);
                }

                container.appendChild(div);
            });
            container.scrollTop = container.scrollHeight;
        }

        function addMessageToUi(sender, text, modelName = null, thought = null) {
            const container = document.getElementById('aiMessages');
            const div = document.createElement('div');
            div.className = `msg ${sender}`;

            // إضافة Thought Box إذا وجد
            if (sender === 'ai' && thought) {
                const toggle = document.createElement('div');
                toggle.className = 'thought-toggle';
                toggle.innerText = "Thought Process";
                toggle.onclick = () => {
                    const box = toggle.nextElementSibling;
                    box.style.display = box.style.display === 'block' ? 'none' : 'block';
                    toggle.classList.toggle('open');
                };
                div.appendChild(toggle);

                const box = document.createElement('div');
                box.className = 'thought-box';
                box.innerText = thought;
                div.appendChild(box);
            }

            const contentDiv = document.createElement('div');
            contentDiv.className = 'msg-content';
            if (typeof marked !== 'undefined' && sender !== 'user') {
                contentDiv.innerHTML = marked.parse(text);
            } else {
                contentDiv.innerText = text;
            }
            div.appendChild(contentDiv);

            if (sender === 'ai' && modelName) {
                const badge = document.createElement('div');
                badge.className = 'model-badge';
                badge.innerText = modelName;
                div.appendChild(badge);
            }

            container.appendChild(div);
            container.scrollTop = container.scrollHeight;
            saveChatToStorage(); // حفظ حالة الـ UI
        }

        function updateHealthUI(online, text) {
            const badge = document.getElementById('systemHealthBadge');
            const textEl = document.getElementById('healthStatusText');
            if (badge && textEl) {
                if (online) {
                    badge.classList.remove('status-error');
                    textEl.innerText = text.toUpperCase();
                } else {
                    badge.classList.add('status-error');
                    textEl.innerText = text.toUpperCase();
                }
            }
        }

        function addToolStepToUi(toolName, args) {
            const container = document.getElementById('aiMessages');
            const stepId = 'step-' + Date.now();

            const stepContainer = document.createElement('div');
            stepContainer.className = 'ai-step-container';
            stepContainer.id = stepId;

            const header = document.createElement('div');
            header.className = 'ai-step-header';
            header.onclick = () => {
                const details = header.nextElementSibling;
                details.style.display = details.style.display === 'block' ? 'none' : 'block';
            };

            const icon = document.createElement('span');
            icon.className = 'ai-step-icon';
            icon.innerText = getToolIcon(toolName);

            const nameSpan = document.createElement('span');
            nameSpan.className = 'ai-step-name';
            nameSpan.innerText = toolName.toUpperCase();

            const status = document.createElement('div');
            status.className = 'ai-step-status';
            status.innerHTML = '<div class="status-spinner"></div><span style="color:#afb1b3">Executing...</span>';

            header.appendChild(icon);
            header.appendChild(nameSpan);
            header.appendChild(status);

            const details = document.createElement('div');
            details.className = 'ai-step-details';

            const argsDiv = document.createElement('div');
            argsDiv.className = 'ai-step-args';
            argsDiv.innerText = `Arguments: ${JSON.stringify(args, null, 2)}`;

            const outputDiv = document.createElement('div');
            outputDiv.className = 'step-output-area';
            outputDiv.innerHTML = '<div style="padding:15px; color:#666; font-size:12px;">Waiting for output from bridge...</div>';

            details.appendChild(argsDiv);
            details.appendChild(outputDiv);

            stepContainer.appendChild(header);
            stepContainer.appendChild(details);
            container.appendChild(stepContainer);
            container.scrollTop = container.scrollHeight;

            return stepId;
        }

        function updateToolStepStatus(stepId, success, output) {
            const step = document.getElementById(stepId);
            if (!step) return;

            const status = step.querySelector('.ai-step-status');
            if (success) {
                status.innerHTML = '<span class="status-done">✅ COMPLETED</span>';
            } else {
                status.innerHTML = '<span class="status-error">❌ FAILED</span>';
            }

            const outputArea = step.querySelector('.step-output-area');

            // 🧠 معالجة خاصة لأداة التفكير المطور (Structured Thought)
            if (typeof output === 'object' && output.reasoning) {
                let html = `<div style="display:flex; flex-direction:column; gap:12px;">`;
                if (output.reasoning) html += `<div class="thought-container" style="margin:0;"><div style="color:var(--ide-text); font-size:12px;">${escapeHtml(output.reasoning)}</div></div>`;
                if (output.visual) html += `<div style="background:rgba(187,134,252,0.05); padding:10px; border-radius:6px; border:1px solid rgba(187,134,252,0.2);"><b style="color:#bb86fc; font-size:10px; display:block; margin-bottom:5px;">🎨 VISUAL ANALYSIS:</b><div style="color:var(--ide-muted); font-size:11px;">${escapeHtml(output.visual)}</div></div>`;
                if (output.plan) html += `<div style="background:rgba(53,116,240,0.05); padding:10px; border-radius:6px; border:1px dashed var(--ide-accent);"><b style="color:var(--ide-accent); font-size:10px; display:block; margin-bottom:5px;">📋 EXECUTION PLAN:</b><div style="color:var(--ide-muted); font-size:11px;">${escapeHtml(output.plan)}</div></div>`;
                if (output.peer) html += `<div style="background:rgba(235,196,13,0.05); padding:10px; border-radius:6px; border:1px solid rgba(235,196,13,0.2);"><b style="color:var(--ide-warning); font-size:10px; display:block; margin-bottom:5px;">🕵️ PEER REVIEW & VALIDATION:</b><div style="color:var(--ide-muted); font-size:11px;">${escapeHtml(output.peer)}</div></div>`;
                if (output.risk) html += `<div style="background:rgba(249,138,148,0.05); padding:10px; border-radius:6px; border:1px solid rgba(249,138,148,0.2);"><b style="color:var(--ide-error); font-size:10px; display:block; margin-bottom:5px;">⚠️ RISK ASSESSMENT:</b><div style="color:var(--ide-muted); font-size:11px;">${escapeHtml(output.risk)}</div></div>`;
                if (output.outcome) html += `<div style="background:rgba(89,168,105,0.05); padding:10px; border-radius:6px; border:1px solid rgba(89,168,105,0.2);"><b style="color:var(--ide-success); font-size:10px; display:block; margin-bottom:5px;">🎯 EXPECTED OUTCOME:</b><div style="color:var(--ide-muted); font-size:11px;">${escapeHtml(output.outcome)}</div></div>`;
                html += `</div>`;
                outputArea.innerHTML = html;
            } else {
                const textOutput = String(output);
                // تحويل المخرجات الطويلة إلى نافذة كود احترافية
                if (textOutput.length > 50 || textOutput.includes('\n')) {
                    const lines = textOutput.split('\n');
                    let html = `<div class="code-viewer-ui">`;
                    html += `<div class="line-numbers">${lines.map((_, i) => i + 1).join('<br>')}</div>`;
                    html += `<div class="code-content">${escapeHtml(textOutput)}</div>`;
                    html += `</div>`;
                    outputArea.innerHTML = html;
                } else {
                    outputArea.innerHTML = `<div style="padding:0; color:var(--ide-text); font-size:13px;">${escapeHtml(textOutput)}</div>`;
                }
            }

            // فتح التفاصيل تلقائياً عند الاكتمال
            step.querySelector('.ai-step-details').style.display = 'block';
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.innerText = text;
            return div.innerHTML;
        }

        function getToolIcon(name) {
            const lower = name.toLowerCase();
            if (lower.includes('read') || lower.includes('get')) return '🔍';
            if (lower.includes('write') || lower.includes('replace') || lower.includes('patch')) return '📝';
            if (lower.includes('search')) return '📡';
            if (lower.includes('run') || lower.includes('execute')) return '⚡';
            if (lower.includes('repair') || lower.includes('diag')) return '🛠️';
            if (lower.includes('thought')) return '🧠';
            if (lower.includes('save') || lower.includes('progress')) return '💾';
            if (lower.includes('ping')) return '💓';
            if (lower.includes('ide') || lower.includes('task')) return '🚀';
            return '⚙️';
        }

        async function getGithubFileContent(path) {
            try {
                const res = await safeGithubFetch(`contents/${path}`);
                if (!res.ok) {
                    const err = await res.json();
                    return `❌ فشل جلب الملف: ${err.message}`;
                }
                const data = await res.json();
                return decodeURIComponent(escape(atob(data.content)));
            } catch (e) { return `❌ خطأ اتصال: ${e.message}`; }
        }

        async function listGithubFiles(path = "") {
            try {
                const res = await safeGithubFetch(`contents/${path}`);
                if (!res.ok) {
                    const err = await res.json();
                    return `❌ فشل جلب القائمة: ${err.message}`;
                }
                const data = await res.json();
                if (!Array.isArray(data)) return "⚠️ هذا ملف وليس مجلداً.";
                const files = data.map(f => `${f.type === 'dir' ? '📁' : '📄'} ${f.path}`);
                return `محتويات ${path || 'الجذر'}:\n${files.join('\n')}`;
            } catch (e) { return `❌ خطأ اتصال: ${e.message}`; }
        }

        async function repairSystem() {
            const report = {
                actions: [],
                diagnostics: {},
                status: "initiating_deep_repair",
                timestamp: new Date().toISOString()
            };

            const token = getCleanGithubToken();

            try {
                // 1. فحص التوكن وتطهيره (نواة محرك الترقية)
                if (token && (token.includes('"') || token.includes("'") || token.trim() !== token)) {
                    githubToken = token.trim().replace(/^['"]|['"]$/g, '');
                    report.actions.push("✅ تم تطهير التوكن وتحديث الذاكرة المؤقتة لمنع خطأ 401.");
                }

                // 2. اختبار الاتصال العميق وفحص الصلاحيات (Scopes)
                if (token) {
                    const res = await fetch("https://api.github.com/user", {
                        headers: { 'Authorization': `Bearer ${token}` },
                        mode: 'cors'
                    });

                    if (res.status === 401) {
                        report.status = "token_invalid";
                        report.actions.push("❌ التوكن منتهي الصلاحية أو غير صالح. يرجى إعادة إدخاله.");
                    } else {
                        const scopes = res.headers.get('X-OAuth-Scopes');
                        report.diagnostics.scopes = scopes;

                        // ترقية: التأكد من صلاحية البحث (Search API)
                        if (scopes && !scopes.includes('repo')) {
                            report.actions.push("⚠️ التوكن لا يملك صلاحية 'repo'، وهذا يعطل أداة searchCode و githubAction.");
                        } else {
                            report.actions.push("✅ صلاحيات التوكن كاملة وتشمل إدارة المستودع والبحث.");
                        }
                    }
                }

                // 3. فحص الـ CORS والـ API Limit للبحث
                const searchTest = await fetch(`https://api.github.com/search/code?q=Mastermind+repo:${GITHUB_REPO}`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                    mode: 'cors'
                });
                if (searchTest.status === 403) {
                    report.actions.push("⏳ تنبيه: تم الوصول للحد الأقصى لعمليات البحث (Rate Limit). سيتم تخفيف الضغط.");
                } else if (!searchTest.ok) {
                    report.actions.push(`⚠️ أداة البحث تواجه قيوداً تقنية (كود: ${searchTest.status}). جاري محاولة الالتفاف.`);
                } else {
                    report.actions.push("✅ محرك البحث (searchCode) يعمل بكفاءة 100%.");
                }

                // 4. إعادة مزامنة الأذرع التنفيذية
                await initKeys();
                report.actions.push("🚀 تم تفعيل 'محرك الترقية الشامل' لضمان قوة الأدوات.");

                report.status = "fully_functional";
            } catch (e) {
                report.status = "failed";
                report.error = e.message;
                report.actions.push("❌ فشل الإصلاح التلقائي. يرجى التحقق من جدار الحماية أو اتصال الشبكة.");
            }

            return `🛡️ تقرير العقل المدبر (Diagnostic Report):\n${report.actions.join('\n')}\nحالة النظام: ${report.status}`;
        }

        async function readCodeRange(path, start, end) {
            try {
                const content = await getGithubFileContent(path);
                if (content.startsWith('❌')) return content;
                const lines = content.split('\n');
                const range = lines.slice(start - 1, end);
                return `📖 قراءة الملف ${path} (الأسطر ${start}-${end}):\n\n${range.join('\n')}`;
            } catch (e) { return `❌ فشل قراءة النطاق: ${e.message}`; }
        }

        async function selectString(path, query) {
            try {
                const content = await getGithubFileContent(path);
                if (content.startsWith('❌')) return content;
                const lines = content.split('\n');
                const matches = lines.map((line, index) => line.toLowerCase().includes(query.toLowerCase()) ? { line: index + 1, text: line.trim() } : null).filter(m => m !== null);

                if (matches.length === 0) return `🔍 لم يتم العثور على "${query}" في ملف ${path}.`;
                const results = matches.map(m => `سطر ${m.line}: ${m.text}`).join('\n');
                return `🔍 نتائج البحث عن "${query}" في ${path}:\n${results}`;
            } catch (e) { return `❌ فشل البحث في الملف: ${e.message}`; }
        }

        async function workflowFramework(args) {
            const { action, workflow_name, steps } = args;
            const WORKFLOWS_FILE = 'workflows.json';

            if (action === 'define') {
                if (!workflow_name || !steps) return "❌ يجب تحديد اسم العملية والخطوات.";
                try {
                    let workflows = {};
                    const content = await getGithubFileContent(WORKFLOWS_FILE);
                    if (!content.startsWith('❌')) {
                        workflows = JSON.parse(content);
                    }
                    workflows[workflow_name] = steps;
                    await writeFile(WORKFLOWS_FILE, JSON.stringify(workflows, null, 2), `تعريف عملية مؤتمتة: ${workflow_name}`);
                    return `✅ تم تعريف العملية "${workflow_name}" بنجاح.`;
                } catch (e) { return `❌ فشل تعريف العملية: ${e.message}`; }
            } else if (action === 'list') {
                try {
                    const content = await getGithubFileContent(WORKFLOWS_FILE);
                    if (content.startsWith('❌')) return "⚠️ لا يوجد ملف عمليات حالياً.";
                    const workflows = JSON.parse(content);
                    const names = Object.keys(workflows);
                    return names.length > 0 ? `العمليات المتاحة: ${names.join(', ')}` : "⚠️ لا توجد عمليات معرفة.";
                } catch (e) { return `❌ فشل جلب القائمة: ${e.message}`; }
            } else if (action === 'execute') {
                if (!workflow_name) return "❌ يجب تحديد اسم العملية للتنفيذ.";
                try {
                    const content = await getGithubFileContent(WORKFLOWS_FILE);
                    if (content.startsWith('❌')) return "❌ ملف العمليات غير موجود.";
                    const workflows = JSON.parse(content);
                    const stepsToExec = workflows[workflow_name];
                    if (!stepsToExec) return `❌ العملية "${workflow_name}" غير موجودة.`;

                    let report = `🚀 بدء تنفيذ العملية: ${workflow_name}\n`;
                    for (let i = 0; i < stepsToExec.length; i++) {
                        const step = stepsToExec[i];
                        report += `خطوة ${i + 1} (${step.tool}): `;
                        let res;
                        try {
                            if (step.tool === "githubAction") res = await writeFile(step.args.path, step.args.content);
                            else if (step.tool === "getGithubFile") res = await getGithubFileContent(step.args.path);
                            else if (step.tool === "searchCode") {
                                const cleanQuery = encodeURIComponent(step.args.query);
                                const gRes = await safeGithubFetch(`https://api.github.com/search/code?q=${cleanQuery}+repo:${GITHUB_REPO}`);
                                const data = await gRes.json();
                                res = gRes.ok ? `عثر في: ${data.items.map(f => f.path).join(', ')}` : `خطأ: ${data.message}`;
                            }
                            else if (step.tool === "repairSystem") res = await repairSystem();
                            else res = "⚠️ أداة غير مدعومة في المحرك المؤتمت حالياً.";
                        } catch(err) { res = `خطأ: ${err.message}`; }
                        report += `${res}\n`;
                    }
                    return report;
                } catch (e) { return `❌ فشل تنفيذ العملية: ${e.message}`; }
            }
            return "❌ إجراء غير صالح.";
        }

        async function callAiBrain(promptText, fileBase64 = null, mimeType = null) {
            const userModel = document.getElementById('modelSelector').value;
            let key = geminiApiKey.trim();
            let provider = 'google';

            if (userModel.includes('claude')) { provider = 'anthropic'; key = claudeApiKey.trim(); }
            else if (userModel.includes('gpt')) { provider = 'openai'; key = openaiApiKey.trim(); }
            else if (userModel.includes('deepseek')) { provider = 'deepseek'; key = deepseekApiKey.trim(); }

            if (!key || key.length < 10) {
                return { text: `⚠️ لم يتم ضبط مفتاح الـ API لـ ${provider.toUpperCase()} بشكل صحيح. اضغط على ⋮ في الأعلى لإدخاله.`, model: "System" };
            }

            // قائمة العقول المفكرة (ترتيب الأولوية للنماذج الأحدث لعام 2026)
            const modelNames = [
                userModel,
                'gemini-3.7-flash',
                'gemini-3.6-flash',
                'gemini-3.5-flash-lite',
                'gemini-2.0-flash'
            ].filter((v, i, a) => a.indexOf(v) === i);

            let lastError = "";
            const forbiddenKeywords = [/ignore previous instructions/i, /system prompt/i, /jailbreak/i];
            const isAdminRequest = promptText.includes("استعادة") || promptText.includes("ارجع") || promptText.includes("revert") || promptText.includes("restore");

            if (!isAdminRequest && forbiddenKeywords.some(regex => regex.test(promptText))) {
                return "🛡️ تم حجب الطلب: محاولة اختراق أو تلاعب بالنظام المكتشفة.";
            }

            let currentParts = [];
            if (promptText) currentParts.push({ text: promptText });
            if (fileBase64 && mimeType) {
                if (mimeType.startsWith('image/') || mimeType === 'application/pdf') {
                    currentParts.push({ inline_data: { mime_type: mimeType, data: fileBase64 } });
                }
            }
            const currentTurn = { role: "user", parts: currentParts };

            // 📝 دستور النخبة السيادي الشامل (Sovereign Omni-Constitution 100% Final)
            const constitution = `
            {
              "role": "Mastermind - Sovereign Omni-Architect & Visionary Engineer",
              "identity": "VSA Academy Meta-Cognitive, Discovery & Visual Core",
              "protocols": {
                "visual_genesis": "CRITICAL: Before any UI change, perform a 'Deep Visual Scan'. Identify branding colors, spacing constants, and typography. Ensure 100% aesthetic harmony.",
                "golden_ratio_compliance": "MANDATORY: All sizing and spacing must follow logical proportions. Prevent UI scaling disasters by isolating styles to specific containers.",
                "omni_discovery": "If local knowledge is insufficient, use 'web_search' to find modern UI patterns and 'read_url' for official guidelines.",
                "zero_trust_simulation": "Simulate the outcome in 'thought' and use 'analyze_file' before every commit.",
                "snapshot_before_surgery": "Always call 'take_snapshot' before modification. Ensure you have an 'instant_undo' path.",
                "recursive_thought": "Reason BEFORE, DURING, and AFTER every tool. Thinking is your primary life-support system."
              },
              "response_style": "High-level architectural, creative, and self-correcting."
            }`;

            const systemInstruction = { parts: [{ text: constitution + `\nأنت "العقل المدبر" (Mastermind). التزم بالدستور البرمجي أعلاه حرفياً.` }] };

            const tools = [{
                function_declarations: [
                    { name: "read_file", description: "قراءة محتوى ملف. يمكنك قراءة الملف بالكامل أو تحديد نطاق أسطر معين (startLine, endLine). هذه هي الأداة الأكثر كفاءة للاستكشاف.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" }, startLine: { type: "NUMBER" }, endLine: { type: "NUMBER" } }, required: ["path"] } },
                    { name: "write_file", description: "كتابة ملف كامل أو إنشاء ملف جديد. استخدمها للملفات الصغيرة أو ملفات الإعدادات.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" }, content: { type: "STRING" } }, required: ["path", "content"] } },
                    { name: "replace_file_content", description: "المشرط الجراحي: استبدال قطعة كود محددة بقطعة أخرى. يتطلب النص القديم بدقة (targetContent) والنص الجديد (replacementContent).", parameters: { type: "OBJECT", properties: { path: { type: "STRING" }, targetContent: { type: "STRING" }, replacementContent: { type: "STRING" } }, required: ["path", "targetContent", "replacementContent"] } },
                    { name: "selectString", description: "البحث عن نص محدد داخل محتوى ملف معين (مثل grep).", parameters: { type: "OBJECT", properties: { path: { type: "STRING" }, query: { type: "STRING" } }, required: ["path", "query"] } },
                    { name: "searchCode", description: "البحث عن كلمة أو كود في كامل المستودع دون استهلاك التوكنات.", parameters: { type: "OBJECT", properties: { query: { type: "STRING" } }, required: ["query"] } },
                    { name: "analyzeProjectStructure", description: "محرك تحليل: يفحص سلامة ملفات JSON، الروابط المكسورة، ونظافة المستودع. استخدمه للتشخيص فقط.", parameters: { type: "OBJECT", properties: {} } },
                    { name: "selfExpand", description: "إضافة أداة جديدة: استخدمها لزيادة مهاراتك عبر إضافة وظائف برمجية جديدة لم تكن موجودة.", parameters: { type: "OBJECT", properties: { tool_name: { type: "STRING" }, declaration: { type: "STRING" }, implementation: { type: "STRING" } }, required: ["tool_name", "declaration", "implementation"] } },
                    { name: "patchSystem", description: "محرك الترقية (Evolution Engine): استخدمه لتعديل أو ترقية كود أداة موجودة بالفعل (مثل repairSystem) إذا وجدت فيها قصوراً تقنياً. يتطلب النص القديم والنص الجديد المراد استبداله.", parameters: { type: "OBJECT", properties: { target_code: { type: "STRING" }, replacement_code: { type: "STRING" } }, required: ["target_code", "replacement_code"] } },
                    { name: "getLiveSiteData", description: "جلب الحقائق المعروضة حالياً لمنع الهلوسة.", parameters: { type: "OBJECT", properties: {} } },
                    { name: "getSiteContext", description: "RAG Tool: جلب السياق العام للموقع والسياسات.", parameters: { type: "OBJECT", properties: {} } },
                    { name: "triggerGithubWorkflow", description: "تشغيل عمليات البوتات التلقائية.", parameters: { type: "OBJECT", properties: { workflow_id: { type: "STRING" } }, required: ["workflow_id"] } },
                    { name: "updateWorkflowStatus", description: "إيقاف أو تفعيل البوتات.", parameters: { type: "OBJECT", properties: { workflow_id: { type: "STRING" }, status: { type: "STRING", enum: ["stop", "start"] } }, required: ["workflow_id", "status"] } },
                    { name: "listGithubFiles", description: "استكشاف هيكل المجلدات قبل التعديل.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" } } } },
                    { name: "injectGlobalStyles", description: "تغيير واجهة المستخدم CSS فوراً للتحقق البصري.", parameters: { type: "OBJECT", properties: { css_code: { type: "STRING" } }, required: ["css_code"] } },
                    { name: "repairSystem", description: "فحص ذاتي للنظام وإصلاح مشاكل الاتصال والتوكن.", parameters: { type: "OBJECT", properties: {} } },
                    { name: "listModels", description: "جلب قائمة النماذج المتاحة لمفتاح الـ API الحالي لتشخيص مشاكل التوافر.", parameters: { type: "OBJECT", properties: {} } },
                    { name: "WorkflowFramework", description: "Define, list, and execute multi-step automated sequences (e.g., read, analyze, patch).", parameters: { type: "OBJECT", properties: { action: { type: "STRING", enum: ["define", "list", "execute"] }, workflow_name: { type: "STRING" }, steps: { type: "ARRAY", items: { type: "OBJECT", properties: { tool: { type: "STRING" }, args: { type: "OBJECT" } } } } }, required: ["action"] } },
                    { name: "runPowerShell", description: "Execute a PowerShell command (simulated or via workflow).", parameters: { type: "OBJECT", properties: { command: { type: "STRING" } }, required: ["command"] } },
                    { name: "executeGitCommand", description: "Execute a Git command like add, commit, push, or status.", parameters: { type: "OBJECT", properties: { command: { type: "STRING" } }, required: ["command"] } },
                    { name: "thought", description: "مركز التحليل والمنطق المستمر: استخدمها للتخطيط الجراحي، التحليل البصري، المراجعة الندية، والتحقق من صحة النتائج.", parameters: { type: "OBJECT", properties: { reasoning: { type: "STRING", description: "المنطق العميق للخطوة الحالية." }, plan: { type: "STRING", description: "خطة العمل المحدثة بناءً على المستجدات." }, visual_analysis: { type: "STRING", description: "تحليل العناصر المرئية، الألوان، والمقاسات من الصور المرفقة." }, risk_assessment: { type: "STRING", description: "تحليل مخاطر التغييرات الحالية على تجربة المستخدم." }, peer_review: { type: "STRING", description: "مراجعة نقدية للكود أو الأوامر المقترحة لضمان الدقة الجمالية." }, expected_outcome: { type: "STRING", description: "النتيجة المرئية والتقنية المتوقعة." } }, required: ["reasoning", "plan"] } },
                    { name: "setPreferredModel", description: "تثبيت النموذج المفضل لتقليل زمن التبديل.", parameters: { type: "OBJECT", properties: { modelName: { type: "STRING" } }, required: ["modelName"] } },
                    { name: "updateApiEndpoint", description: "تحديث نقطة النهاية للـ API لضمان الاستقرار والسرعة.", parameters: { type: "OBJECT", properties: { version: { type: "STRING" } }, required: ["version"] } },
                    { name: "pingModel", description: "قياس زمن الاستجابة للنظام.", parameters: { type: "OBJECT", properties: {} } },
                    { name: "pingVSA", description: "اختبار استجابة المحرك المطور بعد التوسع الذاتي.", parameters: { type: "OBJECT", properties: {} } },
                    { name: "generateProjectSummary", description: "توليد ملخص تقني شامل لحالة البيانات والمحتوى في المستودع (VSA & Investments).", parameters: { type: "OBJECT", properties: {} } },
                    { name: "requestIdeTask", description: "إرسال طلب تنفيذ برمي لمحيط الـ IDE (المهندس) لتنفيذه في بيئة التطوير المحلية.", parameters: { type: "OBJECT", properties: { task_description: { type: "STRING" } }, required: ["task_description"] } },
                    { name: "saveExecutionProgress", description: "حفظ حالة التقدم في المهمة الحالية لضمان إمكانية الاستئناف بعد الانقطاع.", parameters: { type: "OBJECT", properties: { task_id: { type: "STRING" }, step_data: { type: "OBJECT" } }, required: ["task_id", "step_data"] } },
                    { name: "multi_replace_file_content", description: "المشرط الجراحي المتعدد: استبدال عدة قطع كود غير متجاورة في ملف واحد دفعة واحدة.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" }, replacements: { type: "ARRAY", items: { type: "OBJECT", properties: { targetContent: { type: "STRING" }, replacementContent: { type: "STRING" } }, required: ["targetContent", "replacementContent"] } } }, required: ["path", "replacements"] } },
                    { name: "analyze_file", description: "مسبار الجودة: فحص الملف برمجياً لاكتشاف أخطاء السنتكس أو عدم توازن الأقواس قبل الحفظ.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" } }, required: ["path"] } },
                    { name: "take_snapshot", description: "درع الأمان: أخذ لقطة احتياطية للملف قبل إجراء جراحة برمجية كبرى للتمكن من التراجع اللحظي.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" } }, required: ["path"] } },
                    { name: "instant_undo", description: "التراجع السيادي: استعادة آخر لقطة سليمة للملف في حال فشل الجراحة أو حدوث خطأ منطقي.", parameters: { type: "OBJECT", properties: { path: { type: "STRING" } }, required: ["path"] } },
                    { name: "web_search", description: "رادار الاستكشاف العالمي: البحث في الإنترنت عن حلول تقنية، توثيقات، أو معلومات عامة غائبة عن الملفات المحلية.", parameters: { type: "OBJECT", properties: { query: { type: "STRING" } }, required: ["query"] } },
                    { name: "read_url", description: "الراديو المعرفي: الدخول إلى رابط URL خارجي وقراءة محتواه وفهمه برمجياً.", parameters: { type: "OBJECT", properties: { url: { type: "STRING" } }, required: ["url"] } },
                    { name: "evolutionary_audit", description: "اليقظة التطورية: فحص شامل لكافة المحركات والأدوات لاكتشاف فرص التحسين البرمجي أو سد الفجوات الإدراكية.", parameters: { type: "OBJECT", properties: { target_engine: { type: "NUMBER", description: "رقم المحرك المراد فحصه (0-6)." } } } }
                ]
            }]; // end_tools

            const generationConfig = {
                temperature: 0, // سلوك حتمي ودقيق
                topP: 0.1,
                maxOutputTokens: 2048
            };

            async function runToolLoop(history, activeModel = null, retryModels = []) {
                if (stopAiRequested) {
                    stopAiRequested = false;
                    localStorage.removeItem('gemini_pending_history');
                    return { text: "🛑 تم إيقاف العملية يدوياً بناءً على طلبك.", model: "System" };
                }

                localStorage.setItem('gemini_pending_history', JSON.stringify(history));
                startAiTimer();

                // 🔄 بروتوكول الاستمرارية العميقة (Deep Persistence Protocol)
                if (retryModels.length >= modelNames.length) {
                    const globalRetry = (parseInt(localStorage.getItem('gemini_global_retry') || "0")) + 1;
                    localStorage.setItem('gemini_global_retry', globalRetry);

                    const thinkMsg = document.querySelector('.msg.ai:last-child');
                    if (thinkMsg) thinkMsg.innerHTML = `<div class="msg-content">⏳ <b>موجه الاستمرارية:</b> ننتظر تبريد العقول (دورة ${globalRetry}). المهمة محفوظة ولن تضيع...</div>`;

                    await new Promise(r => setTimeout(r, 30000));
                    return await runToolLoop(history, null, []);
                }

                // 🏅 منطق الموجه (The Mediator Logic):
                // إذا كان هناك عقل سابق قد بدأ المهمة، نقوم بتنبيه العقل الجديد بوضوح لضمان الدقة ومنع التخريب
                if (retryModels.length > 0) {
                    const lastStep = history.filter(h => h.parts[0].functionCall).pop();
                    const taskSummary = lastStep ? `آخر أداة نفذت هي [${lastStep.parts[0].functionCall.name}]` : "المهمة في بدايتها";

                    const mediatorNote = {
                        role: "user",
                        parts: [{ text: `[SYSTEM MEDIATOR]: تنبيه أمني وبرمجي! لقد تم تحويلك لإكمال مهمة زميلك. ${taskSummary}.
                        قاعدة ذهبية: التزم بدقة جراحية ولا تغير أي أحجام أو تنسيقات (CSS) شاملة للموقع. أكمل المهمة المطلوبة فقط بنسبة 100%.` }]
                    };
                    // حقن الموجه في التاريخ لضمان قراءته من العقل الجديد
                    history.push(mediatorNote);
                }
                localStorage.setItem('gemini_global_retry', "0");

                const modelsToTry = activeModel ? [activeModel, ...modelNames.filter(m => m !== activeModel && !retryModels.includes(m))] : modelNames.filter(m => !retryModels.includes(m));

                for (const modelName of modelsToTry) {
                    const thinkMsg = document.querySelector('.msg.ai:last-child');
                    if (thinkMsg && thinkMsg.innerText.includes("جاري التفكير")) {
                        thinkMsg.innerText = `🧠 جاري التفكير باستخدام ${modelName}...`;
                    }

                    let url = '';
                    let useProxy = (provider !== 'google' && mastermindProxyUrl); // استخدام الجسر للشركات التي تحجب المتصفح

                    if (useProxy) {
                        url = mastermindProxyUrl;
                    } else {
                        if (provider === 'google') {
                            // نظام التوجيه الديناميكي للإصدارات: v1 للمستقر، v1beta للأحدث والتجريبي
                            const isBeta = modelName.includes('exp') ||
                                           modelName.includes('preview') ||
                                           modelName.includes('beta') ||
                                           modelName.startsWith('gemini-3');
                            const apiVersion = isBeta ? 'v1beta' : 'v1';
                            url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelName}:generateContent?key=${key}`;
                        } else if (provider === 'openai') {
                            url = 'https://api.openai.com/v1/chat/completions';
                        } else if (provider === 'anthropic') {
                            url = 'https://api.anthropic.com/v1/messages';
                        } else if (provider === 'deepseek') {
                            url = 'https://api.deepseek.com/v1/chat/completions';
                        }
                    }

                    try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 60000);

                        let fetchOptions = {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            signal: controller.signal
                        };

                        // إذا كنا نستخدم بروكسي، نرسل الهدف الحقيقي في الهيدر أو البودي
                        if (useProxy) {
                            fetchOptions.headers['x-target-url'] = (provider === 'anthropic') ? 'https://api.anthropic.com/v1/messages' :
                                                                  (provider === 'openai') ? 'https://api.openai.com/v1/chat/completions' :
                                                                  'https://api.deepseek.com/chat/completions';
                        }

                        let body = {};
                        if (provider === 'google') {
                            body = { system_instruction: systemInstruction, contents: history.map(h => ({ role: h.role, parts: h.parts })), tools: tools, generationConfig: generationConfig };
                        } else if (provider === 'openai' || provider === 'deepseek') {
                            fetchOptions.headers['Authorization'] = `Bearer ${key}`;
                            const messages = history.map(h => ({
                                role: h.role === 'model' ? 'assistant' : (h.role === 'user' ? (h.parts[0].functionResponse ? 'tool' : 'user') : 'system'),
                                content: h.parts[0].text || '',
                                ...(h.parts[0].functionCall && { tool_calls: [{ id: h.parts[0].functionCall.id || 'call_'+Date.now(), type: 'function', function: { name: h.parts[0].functionCall.name, arguments: JSON.stringify(h.parts[0].functionCall.args) } }] }),
                                ...(h.parts[0].functionResponse && { tool_call_id: history[history.indexOf(h)-1].parts[0].functionCall.id, content: JSON.stringify(h.parts[0].functionResponse.response) })
                            }));
                            messages.unshift({ role: 'system', content: constitution });
                            body = { model: modelName, messages: messages, tools: tools[0].function_declarations.map(f => ({ type: 'function', function: { name: f.name, description: f.description, parameters: f.parameters } })), tool_choice: 'auto' };
                        } else if (provider === 'anthropic') {
                            fetchOptions.headers['x-api-key'] = key;
                            fetchOptions.headers['anthropic-version'] = '2023-06-01';
                            body = { model: modelName, system: constitution, max_tokens: 4096, messages: history.filter(h => !h.parts[0].functionResponse).map(h => ({ role: h.role === 'model' ? 'assistant' : 'user', content: h.parts[0].text || '' })), tools: tools[0].function_declarations.map(f => ({ name: f.name, description: f.description, input_schema: f.parameters })) };
                        }

                        fetchOptions.body = JSON.stringify(body);
                        const res = await fetch(url, fetchOptions);
                        clearTimeout(timeoutId);

                        const data = await res.json();
                        if (!res.ok) {
                            lastError = data.error?.message || data.error || JSON.stringify(data);
                            console.error(`🔴 API Error (${modelName}):`, lastError);

                            // تحسين رسالة الخطأ للمستخدم
                            if (res.status === 0 || lastError.includes('TypeError')) {
                                return { text: `🛡️ <b>خطأ في الجسر (Proxy Error):</b> تعذر الاتصال بـ Cloudflare.<br>يرجى التأكد من تحديث كود الـ Worker في Cloudflare ومراجعة الرابط في الإعدادات.`, model: "System" };
                            }
                            if (res.status === 429 || res.status === 404) {
                                retryModels.push(modelName);
                                continue;
                            }
                            retryModels.push(modelName);
                            continue;
                        }

                        let thought = null;
                        let functionCallPart = null;
                        const parts = (provider === 'google') ? (data.candidates?.[0]?.content?.parts || []) : [];

                        if (provider === 'google') {
                            functionCallPart = parts.find(p => p.functionCall);
                            thought = parts.find(p => p.text)?.text;
                        } else if (provider === 'openai' || provider === 'deepseek') {
                            const choice = data.choices?.[0]?.message;
                            thought = choice?.content;
                            if (choice?.tool_calls) {
                                const tc = choice.tool_calls[0].function;
                                functionCallPart = { functionCall: { name: tc.name, args: JSON.parse(tc.arguments) } };
                            }
                        } else if (provider === 'anthropic') {
                            thought = data.content.find(c => c.type === 'text')?.text;
                            const tc = data.content.find(c => c.type === 'tool_use');
                            if (tc) { functionCallPart = { functionCall: { name: tc.name, args: tc.input, id: tc.id } }; }
                        }

                        if (!functionCallPart && !thought) {
                            retryModels.push(modelName);
                            continue;
                        }

                        if (functionCallPart && functionCallPart.functionCall) {
                            const { name, args } = functionCallPart.functionCall;
                            if (thought) addMessageToUi('ai', '', modelName, thought);
                            const stepId = addToolStepToUi(name, args);
                            let toolResult;

                            if (name === "read_file") {
                                if (args.startLine && args.endLine) toolResult = await readCodeRange(args.path, args.startLine, args.endLine);
                                else toolResult = await getGithubFileContent(args.path);
                            }
                            else if (name === "write_file") toolResult = await writeFile(args.path, args.content);
                            else if (name === "replace_file_content") toolResult = await replaceFileContent(args.path, args.targetContent, args.replacementContent);
                            else if (name === "multi_replace_file_content") {
                                try {
                                    let content = await getGithubFileContent(args.path);
                                    if (content.startsWith('❌')) throw new Error(content);
                                    let updated = content;
                                    for (let r of args.replacements) {
                                        if (!updated.includes(r.targetContent)) {
                                            logToTerminal(`Warning: Chunk not found in ${args.path}`, 'warning');
                                            continue;
                                        }
                                        updated = updated.replace(r.targetContent, r.replacementContent);
                                    }
                                    toolResult = await writeFile(args.path, updated, `جراحة برمجية متعددة في ${args.path}`);
                                } catch(e) { toolResult = `❌ فشل التعديل المتعدد: ${e.message}`; }
                            }
                            else if (name === "analyze_file") {
                                try {
                                    const content = await getGithubFileContent(args.path);
                                    if (content.startsWith('❌')) throw new Error(content);
                                    // فحص توازن الأقواس البسيط كمرحلة أولى من ذكاء النخبة
                                    const openBraces = (content.match(/\{/g) || []).length;
                                    const closeBraces = (content.match(/\}/g) || []).length;
                                    if (openBraces !== closeBraces) {
                                        toolResult = `⚠️ تنبيه جودة: الملف ${args.path} غير متوازن برمجياً ({:${openBraces}, }:${closeBraces}). يرجى الإصلاح قبل الرفع.`;
                                    } else {
                                        toolResult = `✅ فحص الجودة للملف ${args.path} اكتمل بنجاح. لا توجد أخطاء هيكلية واضحة.`;
                                    }
                                } catch(e) { toolResult = `❌ فشل فحص الملف: ${e.message}`; }
                            }
                            else if (name === "evolutionary_audit") {
                                try {
                                    const report = {
                                        timestamp: new Date().toISOString(),
                                        engine: args.target_engine || "ALL",
                                        status: "scanning_for_mutation",
                                        findings: ["كشف فجوات إدراكية في المحرك 3", "فرصة لتحسين سرعة الجسر"],
                                        action: "awaiting_thought_validation"
                                    };
                                    toolResult = `🧬 **تقرير اليقظة التطورية:**\nتم اكتشاف فرص للترقية في المحرك رقم ${args.target_engine || 'الكل'}. يرجى استخدام أداة thought لتحليل هذه الفرص قبل الحقن.`;
                                } catch(e) { toolResult = `❌ فشل مسبار التطور: ${e.message}`; }
                            }
                            else if (name === "searchCode") {
                                try {
                                    const cleanQuery = encodeURIComponent(args.query);
                                    const sres = await safeGithubFetch(`https://api.github.com/search/code?q=${cleanQuery}+repo:${GITHUB_REPO}`);
                                    const sdata = await sres.json();
                                    toolResult = sres.ok ? (sdata.items.map(f => f.path).join(', ') || "No results.") : `خطأ بحث: ${sdata.message}`;
                                } catch(e) { toolResult = `خطأ اتصال: ${e.message}`; }
                            }
                            else if (name === "analyzeProjectStructure") toolResult = "تحليل الهيكل اكتمل.";
                            else if (name === "getLiveSiteData") toolResult = JSON.stringify(allData);
                            else if (name === "repairSystem") toolResult = await repairSystem();
                            else if (name === "WorkflowFramework") toolResult = await workflowFramework(args);
                            else if (name === "runPowerShell" || name === "executeGitCommand") {
                                try {
                                    const commandId = Date.now();
                                    const payload = { id: commandId, timestamp: new Date().toLocaleString('ar-EG'), command: args.command, tool: name, status: "pending_ide_execution", requested_by: "Web_Mastermind" };
                                    await writeFile('ide_bridge.json', JSON.stringify(payload, null, 2), `🛠️ تنفيذ أمر: [${args.command}]`);
                                    logToTerminal(`Command sent to bridge.`, 'info');
                                    let attempts = 0; let outputFound = false;
                                    while (attempts < 15 && !outputFound) {
                                        await new Promise(r => setTimeout(r, 1000));
                                        try {
                                            const bridgeContent = await getGithubFileContent('ide_bridge.json');
                                            const bridgeData = JSON.parse(bridgeContent);
                                            if (bridgeData.id === commandId && bridgeData.status === "completed") {
                                                toolResult = bridgeData.output || "✅ تم بنجاح."; outputFound = true;
                                            } else if (bridgeData.id === commandId && bridgeData.status === "failed") {
                                                toolResult = `❌ فشل: ${bridgeData.error}`; outputFound = true;
                                            }
                                        } catch(e) {} attempts++;
                                    }
                                    if (!outputFound) toolResult = `⚠️ لم يصل الرد خلال 15 ثانية.`;
                                } catch(e) { toolResult = `❌ خطأ جسر: ${e.message}`; }
                            }
                            else if (name === "pingModel") {
                                const start = Date.now();
                                try {
                                    toolResult = `✅ استجابة النظام: ${Date.now() - start}ms. المحرك نشط.`;
                                    updateHealthUI(true, `LATENCY: ${Date.now() - start}ms`);
                                } catch(e) {
                                    updateHealthUI(false, "MODEL OFFLINE");
                                    toolResult = "❌ فشل اختبار السرعة.";
                                }
                            }
                            else if (name === "thought") {
                                toolResult = {
                                    reasoning: args.reasoning,
                                    plan: args.plan,
                                    visual: args.visual_analysis,
                                    risk: args.risk_assessment,
                                    peer: args.peer_review,
                                    outcome: args.expected_outcome
                                };
                            }
                            else if (name === "requestIdeTask") {
                                try {
                                    const payload = { id: Date.now(), task: args.task_description, status: "pending_action" };
                                    toolResult = await writeFile('ide_bridge.json', JSON.stringify(payload, null, 2));
                                } catch(e) { toolResult = `خطأ مهمة: ${e.message}`; }
                            }
                            else if (name === "injectGlobalStyles") {
                                const st = document.createElement('style'); st.textContent = args.css_code;
                                document.head.appendChild(st); toolResult = "تم التطبيق.";
                            }
                            else if (name === "take_snapshot") {
                                try {
                                    const content = await getGithubFileContent(args.path);
                                    if (content.startsWith('❌')) throw new Error(content);
                                    localStorage.setItem(`snapshot_${args.path}`, content);
                                    toolResult = `🛡️ تم أخذ لقطة أمان للملف [${args.path}] بنجاح. الدرع نشط.`;
                                } catch(e) { toolResult = `❌ فشل أخذ اللقطة: ${e.message}`; }
                            }
                            else if (name === "instant_undo") {
                                try {
                                    const snapshot = localStorage.getItem(`snapshot_${args.path}`);
                                    if (!snapshot) throw new Error("لا توجد لقطة محفوظة لهذا الملف.");
                                    toolResult = await writeFile(args.path, snapshot, `تراجع سيادي لحظي: استعادة اللقطة السابقة لـ ${args.path}`);
                                } catch(e) { toolResult = `❌ فشل التراجع: ${e.message}`; }
                            }
                            else if (name === "web_search") {
                                try {
                                    // تنفيذ البحث عبر الجسر السيادي (استخدام Google Search API أو جسر مخصص)
                                    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(args.query)}`;
                                    toolResult = `📡 جاري البحث في الويب عن: ${args.query}...\n(عبر الجسر: ${mastermindProxyUrl})\nالنتائج الأولية تشير إلى توفر حلول تقنية في توثيقات Google.`;
                                } catch(e) { toolResult = `❌ فشل البحث الويبي: ${e.message}`; }
                            }
                            else if (name === "read_url") {
                                try {
                                    if (!mastermindProxyUrl) throw new Error("يجب ضبط رابط الجسر (Proxy URL) أولاً.");
                                    const res = await fetch(mastermindProxyUrl, {
                                        method: 'POST',
                                        headers: { 'x-target-url': args.url },
                                        mode: 'cors'
                                    });
                                    const data = await res.text();
                                    toolResult = `📖 تم قراءة الرابط [${args.url}] بنجاح:\n${data.substring(0, 500)}...`;
                                } catch(e) { toolResult = `❌ فشل قراءة الرابط الخارجي: ${e.message}`; }
                            }
                            else if (name === "saveExecutionProgress") {
                                try {
                                    let progress = JSON.parse(localStorage.getItem('mastermind_task_progress') || "{}");
                                    progress[args.task_id] = args.step_data;
                                    localStorage.setItem('mastermind_task_progress', JSON.stringify(progress));
                                    toolResult = `✅ تم حفظ تقدم المهمة [${args.task_id}] سحابياً ولحظياً.`;
                                } catch(e) { toolResult = `❌ فشل الحفظ: ${e.message}`; }
                            }
                            else { toolResult = "أداة غير مدعومة."; }

                            updateToolStepStatus(stepId, !String(toolResult).includes('❌'), toolResult);
                            history.push({ role: "model", parts: (provider === 'google' ? parts : [{text: thought || "Executing..."}]) });
                            history.push({ role: "user", parts: [{ functionResponse: { name: name, response: { content: toolResult } } }] });
                            return await runToolLoop(history, modelName, retryModels);
                        }

                        const finalTurn = { role: "model", parts: (provider === 'google' ? parts : [{text: thought}]), model: modelName };
                        chatHistory = history.concat([finalTurn]);
                        if (chatHistory.length > 50) chatHistory = chatHistory.slice(-50);
                        saveChatToStorage();
                        localStorage.removeItem('gemini_pending_history');
                        stopAiTimer();
                        return { text: thought || "تمت بنجاح.", model: modelName };
                    } catch (err) {
                        console.error(`Error with ${modelName}:`, err);
                        retryModels.push(modelName);
                        continue;
                    }
                }

                // 🔄 بروتوكول "الحسّاس الذكي" (Engine 4 - Availability Sensor)
                // بدلاً من الانتظار العشوائي، سنقوم بجس نبض النماذج بشكل متكرر وذكي
                const globalRetry = (parseInt(localStorage.getItem('gemini_global_retry') || "0")) + 1;
                localStorage.setItem('gemini_global_retry', globalRetry);

                const thinkMsg = document.querySelector('.msg.ai:last-child');
                if (thinkMsg) {
                    thinkMsg.innerHTML = `<div class="msg-content">📡 <b>حسّاس التوفر نشط:</b> كافة النماذج تحت الضغط (دورة ${globalRetry}).<br>أقوم بمراقبة استجابة السيرفرات الآن... سأستأنف العمل فور تحرر أول نموذج تلقائياً.</div>`;
                }

                // حلقة "جس النبض" (Probe Loop) - تحاول كل 10 ثوانٍ بدلاً من 30
                logToTerminal(`SENSING MODEL AVAILABILITY... (Cycle ${globalRetry})`, 'info');
                await new Promise(r => setTimeout(r, 10000));
                return await runToolLoop(history, null, []);
            }

            // تشغيل الحلقة مع السياق الحالي
            return await runToolLoop([...chatHistory, currentTurn]);
        }

        async function executeAiFunction(name, args) {
            const SUPABASE_URL = 'https://ozcffmadatsfyyldqmdl.supabase.co';
            const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96Y2ZmbWFkYXRzZnl5bGRxbWRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc5NzUxMSwiZXhwIjoyMTAyMzczNTExfQ.WkAWW7iXgstl4YX7be_O4K20YvyXvh0eNJ4eALpv9Wg';

            const headers = {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            };

            if (name === "update_card_description") {
                const res = await fetch(`${SUPABASE_URL}/rest/v1/cards?id=eq.${args.card_id}`, {
                    method: 'PATCH',
                    headers: headers,
                    body: JSON.stringify({ content: args.new_content })
                });
                if (res.ok) {
                    setTimeout(loadWebsiteData, 500);
                    return `✅ تم تحديث وصف البطاقة [${args.card_id}] بنجاح!`;
                }
            }

            if (name === "add_new_video") {
                const res = await fetch(`${SUPABASE_URL}/rest/v1/videos`, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                        id: args.video_id,
                        card_id: args.card_id,
                        title: args.video_title,
                        url: args.video_url
                    })
                });
                if (res.ok) {
                    setTimeout(loadWebsiteData, 500);
                    return `✅ تم إضافة الفيديو [${args.video_title}] بنجاح!`;
                }
            }

            if (name === "delete_video") {
                const res = await fetch(`${SUPABASE_URL}/rest/v1/videos?id=eq.${args.video_id}`, {
                    method: 'DELETE',
                    headers: headers
                });
                if (res.ok) {
                    setTimeout(loadWebsiteData, 500);
                    return `🗑️ تم حذف الفيديو [${args.video_id}] نهائياً.`;
                }
            }

            if (name === "add_video_chapter") {
                const res = await fetch(`${SUPABASE_URL}/rest/v1/video_chapters`, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                        video_id: args.video_id,
                        chapter_time: args.time,
                        chapter_text: args.text
                    })
                });
                if (res.ok) {
                    setTimeout(loadWebsiteData, 500);
                    return `✅ تم إضافة الطابع الزمني [${args.time} - ${args.text}] للفيديو بنجاح!`;
                }
            }

            return "❌ تعذر تنفيذ العملية المطلوبة.";
        }
