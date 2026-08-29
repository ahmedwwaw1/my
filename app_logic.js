// ================================================================
//  🖥️  APP LOGIC - UI Interface for VSA Academy
//  المسؤول عن: الأزرار، المحادثة، عرض البطاقات، والبحث.
//  يعتمد على: ai_engine_core.js (المحرك الرئيسي)
//  تم التعديل: إضافة فحص لـ window.callAiBrain لتجنب الأخطاء
// ================================================================

(function() {
    "use strict";

    // ============================================================
    //  1.  إعدادات واجهة المستخدم (لا توجد مفاتيح هنا!)
    // ============================================================
    const PROXY_URL = 'https://ozcffmadatsfyyldqmdl.supabase.co/functions/v1/vsa-bridge/'; // جسر Supabase الجديد

    let allData = [];
    let isDataLoaded = false;
    let modalHistory = [];
    let modalHistoryIndex = -1;
    let selectedFiles = [];
    let chatHistory = [];

    // ============================================================
    //  2.  دوال تحميل البيانات وعرضها (JSON المحلية أولاً)
    // ============================================================

    async function loadWebsiteData() {
        // محاولة تحميل البيانات من ملفات JSON المحلية أولاً
        try {
            const jsonFiles = [
                'vsa.json',
                'technical-analysis.json',
                'Time-analysis.json',
                'rw.json',
                'investment.json',
                'crypto_alerts.json'
            ];

            let allLocalData = [];

            for (const file of jsonFiles) {
                try {
                    const response = await fetch(file + '?v=' + Date.now());
                    if (response.ok) {
                        const data = await response.json();
                        if (Array.isArray(data)) {
                            allLocalData = allLocalData.concat(data);
                            console.log(`✅ تم تحميل ${file} بنجاح (${data.length} عنصر).`);
                        } else {
                            console.warn(`⚠️ الملف ${file} ليس مصفوفة، تم تخطيه.`);
                        }
                    } else {
                        console.warn(`⚠️ الملف ${file} غير موجود (${response.status}).`);
                    }
                } catch (e) {
                    console.warn(`⚠️ فشل تحميل ${file}: ${e.message}`);
                }
            }

            if (allLocalData.length > 0) {
                allData = allLocalData;
                isDataLoaded = true;
                render(allData);
                handleRoute();
                document.getElementById('statusMsg').innerText = `✅ تم تحميل ${allData.length} بطاقة من الملفات المحلية.`;
                console.log("🚀 تم تحميل البيانات من JSON المحلية بنجاح.");
                return;
            } else {
                console.warn("⚠️ لم يتم العثور على بيانات في الملفات المحلية. سنحاول الجسر.");
            }
        } catch (e) {
            console.warn("⚠️ فشل تحميل البيانات من الملفات المحلية، سننتقل إلى الجسر.", e);
        }

        // ==========================================================
        //  الخيار الاحتياطي: محاولة جلب البيانات عبر الجسر
        // ==========================================================
        try {
            const response = await fetch(PROXY_URL + 'supabase/cards');
            if (!response.ok) throw new Error("فشل جلب البيانات عبر الجسر");
            const cards = await response.json();
            // معالجة البيانات (نفس الهيكل السابق)
            // ... (يمكن إعادة استخدام نفس المنطق من الإصدار السابق)
            allData = cards.map(card => ({
                id: card.id,
                title: card.title,
                category: card.category,
                content: card.content,
                image: card.image_url,
                videos: card.videos || null,
                links: card.links || [],
                images: card.images || [],
                pdfs: card.pdfs || [],
                recommendations: [],
                thematic_index: null
            }));
            isDataLoaded = true;
            render(allData);
            handleRoute();
            document.getElementById('statusMsg').innerText = '✅ تم تحميل البيانات عبر الجسر.';
            console.log("✅ تم تحميل البيانات عبر الجسر بنجاح.");
        } catch (e) {
            console.error("❌ فشل تحميل البيانات من جميع المصادر:", e);
            document.getElementById('statusMsg').innerText = '❌ فشل تحميل البيانات. تأكد من الملفات المحلية أو الجسر.';
            allData = [];
            render(allData);
        }
    }

    function render(dataArray) {
        const mainGrid = document.getElementById('mainGrid');
        if (!mainGrid) return;
        mainGrid.innerHTML = '';
        if (dataArray.length === 0) {
            document.getElementById('statusMsg').innerText = 'لا توجد بطاقات معروضة في هذا القسم.';
            return;
        }
        document.getElementById('statusMsg').innerText = '';

        dataArray.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'card';
            card.style.animationDelay = `${index * 0.05}s`;
            card.addEventListener('click', () => openDetails(item.id));

            let mediaContent = item.image ?
                `<div class="card-media-top"><img src="${item.image}" alt="${item.title}" loading="lazy"></div>` :
                `<div class="card-media-top"><img src="https://via.placeholder.com/360x203/222/0088cc?text=VSA" loading="lazy"></div>`;

            card.innerHTML = `
                ${mediaContent}
                <div class="card-body-container">
                    <h3>${item.title || 'بدون عنوان'}</h3>
                    <div class="card-content">${item.content || ''}</div>
                </div>
            `;
            mainGrid.appendChild(card);
        });
    }

    // ============================================================
    //  3.  دوال التنقل والبحث (نفس الكود السابق - بدون تغيير)
    // ============================================================
    function handleRoute() {
        const hash = window.location.hash || '#/';
        const searchInput = document.getElementById('globalSearch');
        if (searchInput) searchInput.value = '';

        let filtered = [];
        let title = 'أكاديمية VSA';

        if (hash === '#/investment') {
            filtered = allData.filter(d => d.category === 'invest');
            title = 'دليل الاستثمار في العراق';
        } else if (hash === '#/time-analysis') {
            filtered = allData.filter(d => d.category === 'time-analysis');
            title = 'التحليل الزمني';
        } else if (hash === '#/rw') {
            filtered = allData.filter(d => d.category === 'rw');
            title = 'مكتبة وايكوف';
        } else if (hash === '#/technical-analysis') {
            filtered = allData.filter(d => d.category === 'technical-analysis');
            title = 'مدارس التحليل الفني';
        } else if (hash === '#/crypto') {
            filtered = allData.filter(d => d.category === 'high_volume');
            title = '🤖 تنبيهات بث حي لحركة العملات الرقمية';
        } else {
            filtered = allData.filter(d => d.category === 'vsa');
            title = 'أكاديمية VSA والتداول';
        }

        document.getElementById('pageTitle').innerText = title;
        render(filtered);
        setActiveNav(hash);
    }

    function setActiveNav(hash) {
        const map = {
            '#/': 'btn-vsa',
            '#/investment': 'btn-invest',
            '#/time-analysis': 'btn-time-analysis',
            '#/rw': 'btn-rw',
            '#/technical-analysis': 'btn-technical-analysis',
            '#/crypto': 'btn-crypto'
        };
        const id = map[hash] || 'btn-vsa';
        document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
        const el = document.getElementById(id);
        if (el) el.classList.add('active');
    }

    // ============================================================
    //  4.  دوال البحث (نفس الكود السابق - بدون تغيير)
    // ============================================================
    function setupSearch() {
        const input = document.getElementById('globalSearch');
        const dropdown = document.getElementById('searchDropdown');
        if (!input || !dropdown) return;

        let currentItems = [];

        input.addEventListener('input', function() {
            const term = this.value.toLowerCase().trim();
            if (term === '') { dropdown.style.display = 'none'; return; }

            dropdown.innerHTML = '';
            currentItems = [];
            let hasResults = false;

            allData.forEach(item => {
                if ((item.title && item.title.toLowerCase().includes(term)) ||
                    (item.content && item.content.toLowerCase().includes(term))) {
                    hasResults = true;
                    addSearchItem(`📄 ${item.title}`, item.id);
                }
                if (item.videos) {
                    item.videos.forEach(vid => {
                        if (vid.title && vid.title.toLowerCase().includes(term)) {
                            hasResults = true;
                            addSearchItem(`🎥 ${vid.title}`, item.id, vid.id);
                        }
                        if (vid.chapters) {
                            vid.chapters.forEach(ch => {
                                if (ch.text && ch.text.toLowerCase().includes(term)) {
                                    hasResults = true;
                                    addSearchItem(`⏱️ ${ch.text} (${vid.title})`, item.id, vid.id, ch.time);
                                }
                            });
                        }
                    });
                }
                if (item.images) {
                    item.images.forEach(img => {
                        if (img.title && img.title.toLowerCase().includes(term)) {
                            hasResults = true;
                            addSearchItem(`🖼️ ${img.title}`, item.id, null, null, 'image', img.url);
                        }
                    });
                }
                if (item.pdfs) {
                    item.pdfs.forEach(pdf => {
                        if (pdf.title && pdf.title.toLowerCase().includes(term)) {
                            hasResults = true;
                            addSearchItem(`📄 ${pdf.title}`, item.id, null, null, 'pdf', pdf.url);
                        }
                    });
                }
                if (item.links) {
                    item.links.forEach(link => {
                        if (link.text && link.text.toLowerCase().includes(term)) {
                            hasResults = true;
                            addSearchItem(`🔗 ${link.text}`, item.id, null, null, 'link', link.url);
                        }
                    });
                }
            });

            function addSearchItem(text, itemId, videoId = null, time = null, type = null, url = null) {
                const div = document.createElement('div');
                div.className = 'search-item';
                div.innerHTML = text;
                div.addEventListener('click', () => {
                    if (url) {
                        window.open(url, '_blank');
                    } else if (videoId) {
                        openDetails(itemId);
                        setTimeout(() => {
                            const item = allData.find(d => String(d.id) === String(itemId));
                            if (item) playSpecificVideo(item, videoId, parseTimeToSeconds(time));
                        }, 500);
                    } else {
                        openDetails(itemId);
                    }
                    dropdown.style.display = 'none';
                    input.value = '';
                });
                dropdown.appendChild(div);
                currentItems.push(div);
            }

            if (hasResults) {
                dropdown.style.display = 'block';
            } else {
                dropdown.innerHTML = '<div class="search-item" style="color:#aaa; cursor:default;">عذراً، لم يتم العثور على نتائج.</div>';
                dropdown.style.display = 'block';
            }
        });

        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
    }

    // ============================================================
    //  5.  دوال المودال (نفس الكود السابق - بدون تغيير)
    // ============================================================
    function openDetails(id, isHistory = false) {
        const item = allData.find(d => String(d.id) === String(id));
        if (!item) return;

        if (!isHistory) {
            modalHistory = modalHistory.slice(0, modalHistoryIndex + 1);
            modalHistory.push(String(id));
            modalHistoryIndex = modalHistory.length - 1;
        }

        document.getElementById('modalTitle').innerText = item.title || '';
        document.getElementById('modalContent').innerText = item.content || '';

        const videoContainer = document.getElementById('popupVideoContainer');
        const linksContainer = document.getElementById('popupLinksContainer');
        const playlistSection = document.getElementById('playlistSection');
        const playlistContainer = document.getElementById('playlistContainer');
        const chaptersSection = document.getElementById('chaptersSection');
        const chaptersContainer = document.getElementById('chaptersContainer');
        const imagesSection = document.getElementById('imagesSection');
        const imagesContainer = document.getElementById('imagesContainer');
        const pdfsSection = document.getElementById('pdfsSection');
        const pdfsContainer = document.getElementById('pdfsContainer');

        videoContainer.style.display = 'none';
        videoContainer.innerHTML = '';
        linksContainer.innerHTML = '';
        playlistSection.style.display = 'none';
        playlistContainer.innerHTML = '';
        chaptersSection.style.display = 'none';
        chaptersContainer.innerHTML = '';
        imagesSection.style.display = 'none';
        imagesContainer.innerHTML = '';
        pdfsSection.style.display = 'none';
        pdfsContainer.innerHTML = '';

        if (item.videos && item.videos.length > 0) {
            playlistSection.style.display = 'block';
            item.videos.forEach((vid, idx) => {
                const btn = document.createElement('button');
                btn.className = 'chapter-row-btn';
                btn.innerHTML = `▶️ ${vid.title || `الدرس ${idx + 1}`}`;
                btn.addEventListener('click', () => playSpecificVideo(item, idx));
                playlistContainer.appendChild(btn);
            });
            playSpecificVideo(item, 0);
        } else if (item.videoUrl) {
            videoContainer.style.display = 'block';
            videoContainer.innerHTML = `<video src="${item.videoUrl}" controls autoplay style="width:100%; height:100%;"></video>`;
        }

        if (item.chapters && item.chapters.length > 0) {
            chaptersSection.style.display = 'block';
            item.chapters.forEach(ch => {
                const btn = document.createElement('button');
                btn.className = 'chapter-row-btn';
                btn.innerHTML = `<span>${ch.text}</span><span class="chapter-time-badge">${ch.time}</span>`;
                btn.addEventListener('click', () => {
                    const player = document.querySelector('#popupVideoContainer video');
                    if (player) {
                        const secs = parseTimeToSeconds(ch.time);
                        player.currentTime = secs;
                        player.play();
                    }
                });
                chaptersContainer.appendChild(btn);
            });
        }

        if (item.images && item.images.length > 0) {
            imagesSection.style.display = 'block';
            item.images.forEach(img => {
                const card = document.createElement('div');
                card.className = 'gallery-card';
                card.innerHTML = `
                    <img src="${img.url}" class="gallery-thumb" alt="${img.title}">
                    <span class="gallery-card-title">${img.title}</span>
                `;
                card.addEventListener('click', () => {
                    videoContainer.style.display = 'block';
                    videoContainer.innerHTML = `<img src="${img.url}" style="width:100%; height:100%; object-fit:contain;">`;
                });
                imagesContainer.appendChild(card);
            });
        }

        if (item.pdfs && item.pdfs.length > 0) {
            pdfsSection.style.display = 'block';
            item.pdfs.forEach(pdf => {
                const btn = document.createElement('button');
                btn.className = 'pdf-list-item';
                btn.innerHTML = `<span>📄 ${pdf.title}</span>`;
                btn.addEventListener('click', () => {
                    window.open(pdf.url, '_blank');
                });
                pdfsContainer.appendChild(btn);
            });
        }

        if (item.links && item.links.length > 0) {
            item.links.forEach(link => {
                const a = document.createElement('a');
                a.href = link.url;
                a.target = '_blank';
                a.className = 'dynamic-link-btn';
                a.innerText = link.text || 'رابط';
                a.style.cssText = 'display:inline-block; padding:8px 16px; background:#2b2d30; color:#dfe1e5; border-radius:8px; margin:4px; text-decoration:none;';
                linksContainer.appendChild(a);
            });
        }

        document.getElementById('myModal').style.display = 'block';
        updateModalNavButtons();
    }

    function closeModal() {
        document.getElementById('myModal').style.display = 'none';
        const video = document.querySelector('#popupVideoContainer video');
        if (video) video.pause();
        modalHistory = [];
        modalHistoryIndex = -1;
    }

    function playSpecificVideo(item, videoIndex, seekSeconds = 0) {
        const container = document.getElementById('popupVideoContainer');
        const vid = item.videos[videoIndex];
        if (!vid) return;

        container.style.display = 'block';
        if (vid.videoDirectUrl || vid.url) {
            const url = vid.videoDirectUrl || vid.url;
            if (url.includes('youtube')) {
                container.innerHTML = `<iframe src="${url.replace('watch?v=', 'embed/')}" style="width:100%; height:100%; border:none;" allowfullscreen></iframe>`;
            } else {
                container.innerHTML = `<video src="${url}" controls autoplay style="width:100%; height:100%;"></video>`;
                if (seekSeconds > 0) {
                    setTimeout(() => {
                        const player = container.querySelector('video');
                        if (player) player.currentTime = seekSeconds;
                    }, 500);
                }
            }
        }
        const chaptersSection = document.getElementById('chaptersSection');
        const chaptersContainer = document.getElementById('chaptersContainer');
        if (vid.chapters && vid.chapters.length > 0) {
            chaptersSection.style.display = 'block';
            chaptersContainer.innerHTML = '';
            vid.chapters.forEach(ch => {
                const btn = document.createElement('button');
                btn.className = 'chapter-row-btn';
                btn.innerHTML = `<span>${ch.text}</span><span class="chapter-time-badge">${ch.time}</span>`;
                btn.addEventListener('click', () => {
                    const player = container.querySelector('video');
                    if (player) {
                        const secs = parseTimeToSeconds(ch.time);
                        player.currentTime = secs;
                        player.play();
                    }
                });
                chaptersContainer.appendChild(btn);
            });
        } else {
            chaptersSection.style.display = 'none';
        }
        document.querySelectorAll('#playlistContainer .chapter-row-btn').forEach((b, idx) => {
            b.classList.toggle('active', idx === videoIndex);
        });
    }

    function parseTimeToSeconds(timeStr) {
        if (!timeStr) return 0;
        const parts = timeStr.split(':').map(Number);
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        return parseFloat(timeStr) || 0;
    }

    function modalGoBack() {
        if (modalHistoryIndex > 0) {
            modalHistoryIndex--;
            openDetails(modalHistory[modalHistoryIndex], true);
        }
    }

    function modalGoForward() {
        if (modalHistoryIndex < modalHistory.length - 1) {
            modalHistoryIndex++;
            openDetails(modalHistory[modalHistoryIndex], true);
        }
    }

    function updateModalNavButtons() {
        const back = document.getElementById('modalBackBtn');
        const forward = document.getElementById('modalForwardBtn');
        if (back) back.disabled = (modalHistoryIndex <= 0);
        if (forward) forward.disabled = (modalHistoryIndex >= modalHistory.length - 1);
    }

    // ============================================================
    //  6.  دوال المحادثة (AI Chat Interface) - مُصلحة
    // ============================================================
    function autoResizeInput() {
        const input = document.getElementById('aiInput');
        if (input) {
            input.style.height = 'auto';
            input.style.height = (input.scrollHeight) + 'px';
        }
    }

    function toggleAiChat() {
        const box = document.getElementById('aiChatBox');
        const btn = document.getElementById('aiToggleBtn');
        if (box.style.display === 'flex') {
            box.style.display = 'none';
            btn.style.display = 'flex';
        } else {
            box.style.display = 'flex';
            btn.style.display = 'none';
            document.getElementById('aiInput').focus();
        }
    }

    // متغير عالمي لحفظ سياق المحادثة الجارية
    window.currentChatContext = [];

    window.sendAiMessage = async function() {
        const input = document.getElementById('aiInput');
        const btn = document.getElementById('aiSendBtn');
        const msg = input.value.trim();
        if (!msg) return;

        addMessageToUI('user', msg);
        input.value = '';
        autoResizeInput();
        btn.disabled = true;
        btn.innerText = '⏳';

        try {
            if (typeof window.callAiBrain !== 'function') {
                throw new Error('محرك الذكاء الاصطناعي لم يتم تحميله. يرجى التحديث.');
            }

            // إرسال الرسالة مع السياق الكامل لضمان حرية الحوار وتذكر الكلام
            const result = await window.callAiBrain(msg, window.geminiApiKey || 'PROXY_MODE', document.getElementById('modelSelector').value, window.currentChatContext);

            // تحديث السياق بالرد الجديد
            if (result.fullHistory) {
                window.currentChatContext = result.fullHistory;
            }

            addMessageToUI('ai', result.text || 'تمت المعالجة.', result.model || 'AI');
        } catch (error) {
            console.error('AI Error:', error);
            addMessageToUI('ai', `⚠️ خطأ: ${error.message}`);
        } finally {
            btn.disabled = false;
            btn.innerText = '🚀';
        }
    };

    function addMessageToUI(sender, text, modelName = null) {
        const container = document.getElementById('aiMessages');
        const div = document.createElement('div');
        div.className = `msg ${sender}`;

        const content = document.createElement('div');
        content.className = 'msg-content';
        if (sender === 'ai' && typeof marked !== 'undefined') {
            content.innerHTML = marked.parse(text);
        } else {
            content.innerText = text;
        }
        div.appendChild(content);

        if (sender === 'ai' && modelName) {
            const badge = document.createElement('div');
            badge.className = 'model-badge';
            badge.innerText = modelName;
            div.appendChild(badge);
        }

        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

    // ============================================================
    //  7.  الإعدادات والتهيئة
    // ============================================================
    function initSettings() {
        document.getElementById('aiSettingsBtn').addEventListener('click', async function() {
            const key = prompt('🔐 الرجاء إدخال مفتاح Gemini API (اختياري - إذا كان الجسر يعمل، يمكنك تركه فارغاً):');
            if (key) {
                window.geminiApiKey = key.trim();
                localStorage.setItem('gemini_api_key', key.trim());
                alert('✅ تم حفظ المفتاح محلياً (سيُستخدم فقط إذا فشل الجسر).');
            } else {
                alert('ℹ️ سيتم استخدام الجسر الآمن (Cloudflare) للاتصال بـ Gemini.');
            }
        });

        const savedKey = localStorage.getItem('gemini_api_key');
        if (savedKey) window.geminiApiKey = savedKey;
    }

    // ============================================================
    //  8.  بدء التشغيل
    // ============================================================
    document.addEventListener('DOMContentLoaded', function() {
        loadWebsiteData();
        setupSearch();
        initSettings();

        const input = document.getElementById('aiInput');
        if (input) {
            input.addEventListener('input', autoResizeInput);
        }

        window.modalGoBack = modalGoBack;
        window.modalGoForward = modalGoForward;
        window.closeModal = closeModal;
        window.openDetails = openDetails;
        window.toggleAiChat = toggleAiChat;
        window.playSpecificVideo = playSpecificVideo;
        window.parseTimeToSeconds = parseTimeToSeconds;

        window.addEventListener('hashchange', handleRoute);
        window.addEventListener('load', handleRoute);
    });

})();