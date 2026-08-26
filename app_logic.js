// ================================================================
//  🌐  APP LOGIC - VSA Academy UI & Interaction (Full Version)
//  الوظيفة: إدارة البيانات، مشغل الفيديو، البحث، المودال، والذكاء الاصطناعي.
// ================================================================

(function(window) {
    let allData = [];
    let isDataLoaded = false;
    let modalHistory = [];
    let modalHistoryIndex = -1;
    let originalThematicItem = null;
    let selectedFiles = [];
    let chatHistory = [];
    let chatSessions = [];
    let currentSessionId = Date.now().toString();

    // ================================================================
    //  1.  إدارة البيانات وجلبها (Data Management)
    // ================================================================
    window.loadWebsiteData = async function() {
        const SUPABASE_URL = 'https://ozcffmadatsfyyldqmdl.supabase.co';
        const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96Y2ZmbWFkYXRzZnl5bGRxbWRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc5NzUxMSwiZXhwIjoyMTAyMzczNTExfQ.WkAWW7iXgstl4YX7be_O4K20YvyXvh0eNJ4eALpv9Wg';
        const headers = { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` };

        try {
            const [cardsRes, videosRes, chaptersRes, assetsRes] = await Promise.all([
                fetch(`${SUPABASE_URL}/rest/v1/cards?select=*`, { headers }),
                fetch(`${SUPABASE_URL}/rest/v1/videos?select=*&order=order_index`, { headers }),
                fetch(`${SUPABASE_URL}/rest/v1/video_chapters?select=*`, { headers }),
                fetch(`${SUPABASE_URL}/rest/v1/card_assets?select=*`, { headers })
            ]);

            if (!cardsRes.ok) throw new Error("Supabase Error");

            const cards = await cardsRes.json();
            const videos = await videosRes.json();
            const chapters = await chaptersRes.json();
            const assets = await assetsRes.json();

            window.allData = cards.map(card => {
                const cardVideos = videos.filter(v => v.card_id === card.id).map(v => ({
                    ...v,
                    chapters: chapters.filter(ch => ch.video_id === v.id).map(ch => ({ time: ch.chapter_time, text: ch.chapter_text }))
                }));
                const cardAssets = assets.filter(a => a.card_id === card.id);
                return {
                    id: card.id, title: card.title, category: card.category, content: card.content, image: card.image_url,
                    videos: cardVideos.length > 0 ? cardVideos : null,
                    links: cardAssets.filter(a => a.asset_type === null || a.asset_type === 'link').map(a => ({ text: a.title, url: a.url })),
                    images: cardAssets.filter(a => a.asset_type === 'image').map(a => ({ title: a.title, url: a.url })),
                    pdfs: cardAssets.filter(a => a.asset_type === 'pdf').map(a => ({ title: a.title, url: a.url })),
                    recommendations: [], thematic_index: null
                };
            });

            window.isDataLoaded = true;
            window.render(window.allData);
            window.handleRoute();
        } catch (error) {
            console.warn("Fallback to Local Mode...");
            const localFiles = ['vsa.json', 'data.json', 'technical-analysis.json', 'Time-analysis.json'];
            const results = await Promise.all(localFiles.map(file => fetch(file).then(res => res.ok ? res.json() : []).catch(() => [])));
            window.allData = results.flat();
            window.isDataLoaded = true;
            window.render(window.allData);
            window.handleRoute();
        }
    };

    window.render = function(dataArray) {
        const grid = document.getElementById('mainGrid');
        const statusMsg = document.getElementById('statusMsg');
        if (!grid) return;
        grid.innerHTML = '';
        if (dataArray.length === 0) { if (window.isDataLoaded) statusMsg.innerText = "لا توجد نتائج."; return; }
        statusMsg.innerText = '';

        dataArray.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'card';
            card.onclick = () => window.openDetails(item.id);
            const img = item.image || 'https://via.placeholder.com/360x203/222/0088cc?text=VSA+Academy';
            card.innerHTML = `<div class="card-media-top"><img src="${img}" loading="lazy"></div><div class="card-body-container"><h3>${item.title || 'بدون عنوان'}</h3><div class="card-content">${item.content || ''}</div></div>`;
            grid.appendChild(card);
        });
    };

    window.handleRoute = function() {
        const hash = window.location.hash || '#/';
        const pageTitle = document.getElementById('pageTitle');
        let filtered = window.allData;
        if (hash === '#/investment') { filtered = window.allData.filter(d => d.category === 'invest'); pageTitle.innerText = 'دليل الاستثمار'; }
        else if (hash === '#/time-analysis') { filtered = window.allData.filter(d => d.category === 'time-analysis'); pageTitle.innerText = 'التحليل الزمني'; }
        else if (hash === '#/rw') { filtered = window.allData.filter(d => d.category === 'rw'); pageTitle.innerText = 'مكتبة وايكوف'; }
        else if (hash === '#/technical-analysis') { filtered = window.allData.filter(d => d.category === 'technical-analysis'); pageTitle.innerText = 'التحليل الفني'; }
        else if (hash === '#/crypto') { filtered = window.allData.filter(d => d.category === 'high_volume'); pageTitle.innerText = 'تنبيهات الكريبتو'; }
        else { filtered = window.allData.filter(d => d.category === 'vsa'); pageTitle.innerText = 'أكاديمية VSA'; }

        window.render(filtered);
        document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
        const activeLink = document.querySelector(`nav a[href="${hash}"]`) || document.getElementById('btn-vsa');
        if (activeLink) activeLink.classList.add('active');
    };

    // ================================================================
    //  2.  مشغل الفيديو والمودال المتطور (Unified Player & Modal)
    // ================================================================
    window.UnifiedPlayer = {
        currentType: null, element: null,
        init: async function(container, url, telegramUrl = null) {
            this.cleanup();
            if (!url) return;
            container.style.display = 'block';

            // التعامل مع فيديوهات يوتيوب
            if (url.includes('youtube.com') || url.includes('youtu.be')) {
                const ytid = this.getYTId(url);
                container.innerHTML = `<iframe src="https://www.youtube.com/embed/${ytid}?autoplay=1" style="width:100%;height:100%;border:none;" allow="autoplay;fullscreen"></iframe>`;
            }
            // التعامل مع الصور كبديل للفيديو
            else if (url.match(/\.(jpeg|jpg|gif|png|webp|svg)$/) || url.includes('type=image')) {
                container.innerHTML = `<img src="${url}" style="width:100%; height:100%; object-fit:contain; border-radius:12px;">`;
            }
            // التعامل مع ملفات PDF
            else if (url.endsWith('.pdf') || url.includes('.pdf?') || url.includes('type=pdf')) {
                container.innerHTML = `<iframe src="${url}" style="width:100%;height:100%;border:none;"></iframe>`;
            }
            // التعامل مع الفيديوهات المباشرة
            else {
                const video = document.createElement('video');
                video.src = url; video.controls = true; video.autoplay = true;
                video.style.width = "100%"; video.style.height = "100%";
                container.innerHTML = ''; container.appendChild(video);
                this.element = video;
            }
        },
        getYTId: function(url) { const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/); return (match && match[2].length === 11) ? match[2] : null; },
        seekTo: function(sec) { if (this.element) this.element.currentTime = sec; },
        cleanup: function() { if (this.element) { this.element.pause(); this.element.src = ""; } }
    };

    window.openDetails = function(id) {
        const item = window.allData.find(d => String(d.id) === String(id));
        if (!item) return;

        // تعيين العناصر الأساسية
        document.getElementById('modalTitle').innerText = item.title;
        document.getElementById('modalContent').innerText = item.content;

        const videoContainer = document.getElementById('popupVideoContainer');
        const linksContainer = document.getElementById('popupLinksContainer');
        const playlistContainer = document.getElementById('playlistContainer');
        const playlistSection = document.getElementById('playlistSection');
        const chaptersContainer = document.getElementById('chaptersContainer');
        const chaptersSection = document.getElementById('chaptersSection');
        const imagesSection = document.getElementById('imagesSection');
        const imagesContainer = document.getElementById('imagesContainer');
        const pdfsSection = document.getElementById('pdfsSection');
        const pdfsContainer = document.getElementById('pdfsContainer');
        const thematicSection = document.getElementById('thematicSection');
        const thematicContainer = document.getElementById('thematicContainer');

        // تصفير الحاويات
        videoContainer.innerHTML = ''; videoContainer.style.display = 'none';
        linksContainer.innerHTML = '';
        if (playlistContainer) playlistContainer.innerHTML = '';
        if (playlistSection) playlistSection.style.display = 'none';
        if (chaptersContainer) chaptersContainer.innerHTML = '';
        if (chaptersSection) chaptersSection.style.display = 'none';
        if (imagesSection) imagesSection.style.display = 'none';
        if (pdfsSection) pdfsSection.style.display = 'none';
        if (thematicSection) thematicSection.style.display = 'none';

        // روابط الأزرار
        if (item.links) {
            item.links.forEach(link => {
                const btn = document.createElement('a');
                btn.href = link.url; btn.target = '_blank'; btn.innerText = link.text;
                btn.className = 'nav-arrow-btn'; btn.style.margin = '5px';
                linksContainer.appendChild(btn);
            });
        }

        // معالجة قائمة التشغيل (Videos)
        if (item.videos && item.videos.length > 0) {
            playlistSection.style.display = 'block';
            item.videos.forEach((vid, idx) => {
                const btn = document.createElement('button');
                btn.className = 'chapter-row-btn';
                btn.innerHTML = `<span>▶️ ${vid.title || `الدرس ${idx+1}`}</span>`;
                btn.onclick = () => window.playSpecificVideo(item, idx);
                playlistContainer.appendChild(btn);
            });
            window.playSpecificVideo(item, 0);
        } else if (item.image) {
            window.UnifiedPlayer.init(videoContainer, item.image);
        }

        // معرض الصور
        if (item.images && item.images.length > 0) {
            imagesSection.style.display = 'block';
            item.images.forEach(img => {
                const card = document.createElement('div');
                card.className = 'gallery-card';
                card.innerHTML = `<img src="${img.url || img}" class="gallery-thumb">`;
                card.onclick = () => window.UnifiedPlayer.init(videoContainer, img.url || img);
                imagesContainer.appendChild(card);
            });
        }

        document.getElementById('myModal').style.display = "block";
    };

    window.playSpecificVideo = function(item, index) {
        const vid = item.videos[index];
        const container = document.getElementById('popupVideoContainer');
        window.UnifiedPlayer.init(container, vid.url || vid.videoDirectUrl);

        // عرض الفصول لهذا الفيديو
        const chaptersContainer = document.getElementById('chaptersContainer');
        const chaptersSection = document.getElementById('chaptersSection');
        chaptersContainer.innerHTML = '';
        if (vid.chapters && vid.chapters.length > 0) {
            chaptersSection.style.display = 'block';
            vid.chapters.forEach(ch => {
                const btn = document.createElement('button');
                btn.className = 'chapter-row-btn';
                btn.innerHTML = `<span>${ch.text}</span><span class="chapter-time-badge">${ch.time}</span>`;
                btn.onclick = () => window.UnifiedPlayer.seekTo(window.parseTimeToSeconds(ch.time));
                chaptersContainer.appendChild(btn);
            });
        }
    };

    window.closeModal = function() {
        document.getElementById('myModal').style.display = "none";
        window.UnifiedPlayer.cleanup();
    };

    window.parseTimeToSeconds = function(time) {
        const parts = time.split(':').map(Number);
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        return parts[0] * 60 + parts[1];
    };

    // ================================================================
    //  3.  منطق البحث والذكاء الاصطناعي (Search & AI Chat)
    // ================================================================
    window.toggleAiChat = async function() {
        const chatBox = document.getElementById('aiChatBox');
        const toggleBtn = document.getElementById('aiToggleBtn');
        const isOpening = chatBox.style.display !== 'flex';
        chatBox.style.display = isOpening ? 'flex' : 'none';
        if (toggleBtn) toggleBtn.style.display = isOpening ? 'none' : 'flex';
        if (isOpening && window.initKeys) await window.initKeys();
    };

    window.sendAiMessage = async function() {
        const input = document.getElementById('aiInput');
        const btn = document.getElementById('aiSendBtn');
        const statusBadge = document.getElementById('healthStatusText');
        const text = input.value.trim();
        if (!text) return;

        window.addMessageToUi('user', text);
        input.value = ''; btn.classList.add('working');
        if (statusBadge) statusBadge.innerText = "AUTONOMOUS AGENT ACTIVE";
        window.startAiTimer();

        try {
            const res = await window.callAiBrain(text);
            window.addMessageToUi('ai', res.text, res.model);
        } catch (e) {
            window.addMessageToUi('ai', "⚠️ تعذر الاتصال بالمحرك الهندسي الذاتي.");
        } finally {
            btn.classList.remove('working');
            if (statusBadge) statusBadge.innerText = "SYSTEM READY";
            window.stopAiTimer();
        }
    };

    // ================================================================
    //  4.  إعدادات المحرك والوقت (AI Settings & Timer)
    // ================================================================
    let aiTimerInterval = null;
    let aiTimerSeconds = 0;

    window.startAiTimer = function() {
        const timerBadge = document.getElementById('aiDynamicTimer');
        if (!timerBadge) return;
        timerBadge.style.display = 'inline-block';
        aiTimerSeconds = 0;
        if (aiTimerInterval) clearInterval(aiTimerInterval);
        aiTimerInterval = setInterval(() => {
            aiTimerSeconds++;
            const mins = Math.floor(aiTimerSeconds / 60);
            const secs = aiTimerSeconds % 60;
            timerBadge.innerText = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        }, 1000);
    };

    window.stopAiTimer = function() {
        if (aiTimerInterval) clearInterval(aiTimerInterval);
    };

    window.resetGeminiKey = async function() {
        const choice = prompt("⚙️ إعدادات المحرك السيادي:\n1. تعديل مفتاح API\n2. تعديل رابط الجسر (Proxy URL)\n3. تعديل مفتاح GitHub\n\nأدخل رقم الخيار (1-3):");

        if (choice === "1") {
            const key = prompt("أدخل مفتاح API الجديد:");
            if (key) {
                window.geminiApiKey = key.trim();
                if (window.saveApiKeyToSupabase) await window.saveApiKeyToSupabase('gemini_key', key);
                alert("✅ تم تحديث المفتاح.");
            }
        } else if (choice === "2") {
            const url = prompt("🔗 أدخل رابط الجسر السيادي (Cloudflare URL):", window.mastermindProxyUrl);
            if (url) {
                window.mastermindProxyUrl = url.trim();
                if (window.saveApiKeyToSupabase) await window.saveApiKeyToSupabase('proxy_url', url);
                alert("✅ تم ربط الجسر بنجاح! النظام الآن مؤمن بالكامل.");
            }
        } else if (choice === "3") {
            const token = prompt("أدخل GitHub Token:");
            if (token) {
                window.githubToken = token.trim();
                if (window.saveApiKeyToSupabase) await window.saveApiKeyToSupabase('github_token', token);
                alert("✅ تم تحديث توكن GitHub.");
            }
        }
    };

    window.addMessageToUi = function(sender, text, model = null) {
        const container = document.getElementById('aiMessages');
        if (!container) return;
        const div = document.createElement('div');
        div.className = `msg ${sender}`;
        const content = document.createElement('div');
        content.className = 'msg-content';

        // 🛡️ معالجة أمنية: تنظيف المخرجات ومنع تنفيذ السكريبتات
        if (typeof marked !== 'undefined' && sender !== 'user') {
            const cleanHtml = marked.parse(text);
            content.innerHTML = cleanHtml;
            // إزالة أي وسوم سكريبت قد تكون تسللت
            const scripts = content.getElementsByTagName('script');
            for (let i = scripts.length - 1; i >= 0; i--) {
                scripts[i].parentNode.removeChild(scripts[i]);
            }
        } else {
            content.innerText = text;
        }

        div.appendChild(content);
        if (model) { const b = document.createElement('div'); b.className = 'model-badge'; b.innerText = model; div.appendChild(b); }
        container.appendChild(div); container.scrollTop = container.scrollHeight;
    };

    window.checkForEvolution = function() {
        const evolutionPrompt = `
        [EVOLUTION MODE ACTIVE]
        المهمة: فحص ذاتي شامل للترقية.
        الخطوات المطلوبة:
        1. تحليل الفجوات البرمجية في index.html و app_logic.js.
        2. تحديد الميزات المفقودة لتعزيز القدرات السيادية.
        3. تقديم اقتراح تقني محدد لترقية الكود.
        ابدأ بالبحث الآن.`;
        const input = document.getElementById('aiInput');
        if (input) {
            input.value = evolutionPrompt;
            window.sendAiMessage();
        }
    };

    // نظام الإنقاذ (Emergency UI Toggle)
    window.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.shiftKey && e.code === 'KeyE') {
            const overlay = document.getElementById('emergencyOverlay');
            if (overlay) overlay.style.display = overlay.style.display === 'flex' ? 'none' : 'flex';
        }
    });

    window.addEventListener('load', window.loadWebsiteData);
    window.addEventListener('hashchange', window.handleRoute);

    console.log("🚀 VSA Academy App Logic V3.0 (Comprehensive) Loaded.");
})(window);
