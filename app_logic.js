        let allData = [];
        let isDataLoaded = false;

        const grid = document.getElementById('mainGrid');
        const searchInput = document.getElementById('globalSearch');
        const pageTitle = document.getElementById('pageTitle');
        const statusMsg = document.getElementById('statusMsg');

        // جلب البيانات الأولية فور تحميل السكربت
        document.addEventListener('DOMContentLoaded', () => {
            loadWebsiteData();
        });

        // مصفوفة تتبع تاريخ ومسار التنقل داخل الـ Modal
        let modalHistory = [];
        let modalHistoryIndex = -1;

        // المتغير العام لحفظ البطاقة التي تحتوي على thematic_index الأصلي
        let originalThematicItem = null;

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
            const backBtn = document.getElementById('modalBackBtn');
            const forwardBtn = document.getElementById('modalForwardBtn');
            if (!backBtn || !forwardBtn) return;

            backBtn.disabled = (modalHistoryIndex <= 0);
            forwardBtn.disabled = (modalHistoryIndex >= modalHistory.length - 1);
        }

        // دالة تحويل صيغة الوقت (01:45) إلى ثواني نقية
        function parseTimeToSeconds(timeStr) {
            if (!timeStr) return 0;
            if (typeof timeStr === 'number') return timeStr;
            const parts = timeStr.split(':').map(Number);
            if (parts.length === 2) {
                return parts[0] * 60 + parts[1]; // دقائق : ثواني
            } else if (parts.length === 3) {
                return parts[0] * 3600 + parts[1] * 60 + parts[2]; // ساعات : دقائق : ثواني
            }
            return parseFloat(timeStr) || 0;
        }

        // دالة مساعدة للعثور على فيديو عبر video_id
        function findVideoById(item, videoId) {
            if (!item.videos) return null;
            return item.videos.find(v => v.id === videoId);
        }

        // دالة لتشغيل فيديو معين (من خلال معرف الفيديو) مع إمكانية البحث في كل البيانات
        // هذه النسخة المعدلة تحافظ على originalThematicItem ولا تغلق الـ Modal
        function playSpecificVideo(initialItem, videoIdOrIndex, seekSeconds = 0) {
            let targetItem = initialItem;
            let videoObj = null;
            let videoIndex = -1;

            // إذا كان المطلوب رقماً (فهرس) نتعامل معه كفهرس داخل initialItem
            if (typeof videoIdOrIndex === 'number') {
                videoIndex = videoIdOrIndex;
                videoObj = targetItem.videos[videoIndex];
            } else {
                // البحث عن الفيديو في initialItem أولاً
                videoIndex = targetItem.videos.findIndex(v => v.id === videoIdOrIndex);
                if (videoIndex !== -1) {
                    videoObj = targetItem.videos[videoIndex];
                } else {
                    // إذا لم نجده، نبحث في allData بالكامل
                    for (let item of allData) {
                        if (item.videos && Array.isArray(item.videos)) {
                            const foundIndex = item.videos.findIndex(v => v.id === videoIdOrIndex);
                            if (foundIndex !== -1) {
                                targetItem = item;
                                videoIndex = foundIndex;
                                videoObj = item.videos[foundIndex];
                                break;
                            }
                        }
                    }
                }
            }

            if (!videoObj) {
                console.warn(`⚠️ لم يتم العثور على فيديو بالمعرف: ${videoIdOrIndex}`);
                return;
            }

            // *** التغيير الجوهري: لا نغلق الـ Modal، بل نقوم بتحديث محتوياته ديناميكياً ***
            // 1. تحديث العنوان والوصف ليعكس البطاقة الجديدة (إذا اختلفت)
            document.getElementById('modalTitle').innerText = targetItem.title || '';
            document.getElementById('modalContent').innerText = targetItem.content || '';

            // 2. تشغيل الفيديو الجديد في نفس المشغل
            const videoContainer = document.getElementById('popupVideoContainer');
            const effectiveUrl = videoObj.videoDirectUrl || videoObj.url || videoObj.videoUrl || '';
            if (effectiveUrl && videoContainer) {
                UnifiedPlayer.init(videoContainer, effectiveUrl);
                if (seekSeconds > 0) {
                    setTimeout(() => UnifiedPlayer.seekTo(seekSeconds), 500);
                }
            }
            const modalContent = document.querySelector('.modal-content');
            if (modalContent) {
                // تمرين محتوى المودال بالكامل إلى الأعلى بشكل سلس
                modalContent.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                // حل بديل في حال لم يجد الحاوية، يذهب مباشرة للمشغل
                videoContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            // 3. تحديث قائمة التشغيل (playlist) لتعكس فيديوهات البطاقة الجديدة
            const playlistSection = document.getElementById('playlistSection');
            const playlistContainer = document.getElementById('playlistContainer');
            if (playlistSection && playlistContainer && targetItem.videos && targetItem.videos.length > 0) {
                playlistSection.style.display = 'block';
                playlistContainer.innerHTML = '';
                targetItem.videos.forEach((vid, idx) => {
                    const rowBtn = document.createElement('button');
                    rowBtn.className = 'chapter-row-btn';
                    rowBtn.id = `playlist-item-${idx}`;
                    rowBtn.style.marginBottom = '8px';
                    rowBtn.innerHTML = `<span>▶️ ${vid.title || `الدرس ${idx + 1}`}</span>`;
                    rowBtn.addEventListener('click', () => {
                        playSpecificVideo(targetItem, idx, 0);
                    });
                    playlistContainer.appendChild(rowBtn);
                });
                // إزالة علامة النشاط عن الكل، ثم تفعيل الزر المناسب
                document.querySelectorAll('#playlistContainer .chapter-row-btn').forEach(btn => btn.classList.remove('active'));
                const activeBtn = document.getElementById(`playlist-item-${videoIndex}`);
                if (activeBtn) activeBtn.classList.add('active');
            } else {
                playlistSection.style.display = 'none';
            }

            // 4. تحديث الفصول العادية (chapters) الخاصة بالفيديو الجديد
            const chaptersContainer = document.getElementById('chaptersContainer');
            const chaptersSection = document.getElementById('chaptersSection');
            if (chaptersContainer) chaptersContainer.innerHTML = '';
            if (videoObj.chapters && videoObj.chapters.length) {
                chaptersSection.style.display = 'block';
                videoObj.chapters.forEach(ch => {
                    const btn = document.createElement('button');
                    btn.className = 'chapter-row-btn';
                    btn.innerHTML = `<span>${ch.text}</span><span class="chapter-time-badge">${ch.time}</span>`;
                    const secs = parseTimeToSeconds(ch.time);

                    // حدث الضغط المحدث ليشمل الانتقال التلقائي للأعلى
                    btn.addEventListener('click', () => {
                        UnifiedPlayer.seekTo(secs); // تقديم الفيديو للوقت المطلوب

                        // 🚀 بلوك الانتقال التلقائي المضاف لقائمة الطوابع الزمنية العادية
                        const modalContentElement = document.querySelector('.modal-content');
                        if (modalContentElement) {
                            modalContentElement.scrollTo({ top: 0, behavior: 'smooth' });
                        } else if (videoContainer) {
                            videoContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                    });

                    chaptersContainer.appendChild(btn);
                });
            } else {
                chaptersSection.style.display = 'none';
            }

            // 6. **الحفاظ على thematic_index الأصلي**: لا نغيره، بل نستخدم originalThematicItem (إن وُجد)
            const thematicSection = document.getElementById('thematicSection');
            const thematicContainer = document.getElementById('thematicContainer');
            if (originalThematicItem && originalThematicItem.thematic_index && originalThematicItem.thematic_index.length > 0) {
                thematicSection.style.display = 'block';
                // نعيد بناء المحتوى من originalThematicItem (نفس القائمة الثابتة)
                thematicContainer.innerHTML = '';
                originalThematicItem.thematic_index.forEach(topic => {
                    const topicDiv = document.createElement('div');
                    topicDiv.style.marginBottom = '20px';
                    topicDiv.innerHTML = `<h4 style="color: var(--accent-color); margin: 10px 0 8px 0;">📌 ${topic.topic_name}</h4>`;
                    const chaptersDiv = document.createElement('div');
                    chaptersDiv.className = 'chapters-flex-list';
                    chaptersDiv.style.maxHeight = '200px';
                    topic.chapters.forEach(ch => {
                        const chapBtn = document.createElement('button');
                        chapBtn.className = 'chapter-row-btn';
                        chapBtn.style.padding = '8px 12px';
                        chapBtn.innerHTML = `
                        <span>${ch.text}</span>
                        <span class="chapter-time-badge">${ch.time} • ${ch.video_id || ''}</span>
                    `;
                        chapBtn.addEventListener('click', () => {
                            if (ch.video_id) {
                                const seekSec = parseTimeToSeconds(ch.time);
                                // نستخدم originalThematicItem كقاعدة للبحث (لأنه يحتفظ بالفهارس الأصلية)
                                playSpecificVideo(originalThematicItem, ch.video_id, seekSec);
                            } else {
                                alert('لم يتم تحديد الفيديو لهذا الفصل');
                            }
                        });
                        chaptersDiv.appendChild(chapBtn);
                    });
                    topicDiv.appendChild(chaptersDiv);
                    thematicContainer.appendChild(topicDiv);
                });
            } else {
                thematicSection.style.display = 'none';
            }
        }
        // اضافة ملف json
        // دالة جلب ومعالجة البيانات مع نظام استرداد احتياطي (Fallback) للعمل على GitHub
        async function loadWebsiteData() {
            const SUPABASE_URL = 'https://ozcffmadatsfyyldqmdl.supabase.co';
            const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96Y2ZmbWFkYXRzZnl5bGRxbWRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc5NzUxMSwiZXhwIjoyMTAyMzczNTExfQ.WkAWW7iXgstl4YX7be_O4K20YvyXvh0eNJ4eALpv9Wg';

            const headers = {
                'apikey': SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
            };

            const processCryptoAlerts = async () => {
                let cryptoAlerts = [];
                try {
                    const cryptoRes = await fetch('crypto_alerts.json?v=' + new Date().getTime());
                    if (cryptoRes.ok) {
                        cryptoAlerts = await cryptoRes.json();
                        cryptoAlerts.forEach(alert => {
                            const alertDate = new Date(alert.timestamp);
                            const formattedTime = alertDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
                            const formattedDate = alertDate.toLocaleDateString(undefined);
                            allData.push({
                                id: `crypto-${alert.symbol}-${alert.timestamp}`,
                                title: `🚨 حركة قوية على زوج: ${alert.symbol}`,
                                category: 'high_volume',
                                content: `💵 السعر الحالي: ${alert.price} USDT\n📊 حجم التداول: ${alert.volume.toLocaleString()}\n📈 نسبة التغيير (24س): ${alert.change_percent}%\n🕒 وقت التنبيه المحلي: ${formattedTime} - ${formattedDate}`,
                                image: '', videos: null, links: [], images: null, pdfs: null, recommendations: [], thematic_index: null
                            });
                        });
                    }
                } catch (e) { console.warn("Could not load crypto_alerts.json"); }
            };

            try {
                // محاولة جلب البيانات من Supabase
                const [cardsRes, videosRes, chaptersRes, assetsRes] = await Promise.all([
                    fetch(`${SUPABASE_URL}/rest/v1/cards?select=*`, { headers }),
                    fetch(`${SUPABASE_URL}/rest/v1/videos?select=*&order=order_index`, { headers }),
                    fetch(`${SUPABASE_URL}/rest/v1/video_chapters?select=*`, { headers }),
                    fetch(`${SUPABASE_URL}/rest/v1/card_assets?select=*`, { headers })
                ]);

                if (!cardsRes.ok) throw new Error("Supabase returned error status");

                const cards = await cardsRes.json();
                const videos = await videosRes.json();
                const chapters = await chaptersRes.json();
                const assets = await assetsRes.json();

                allData = cards.map(card => {
                    const cardVideos = videos.filter(v => v.card_id === card.id).map(v => ({
                        ...v,
                        chapters: chapters.filter(ch => ch.video_id === v.id).map(ch => ({
                            time: ch.chapter_time,
                            text: ch.chapter_text
                        }))
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

                await processCryptoAlerts();
                isDataLoaded = true;
                render(allData);
                console.log("✅ تم تحميل البيانات من Supabase بنجاح.");
                if (typeof handleRoute === 'function') handleRoute();

            } catch (error) {
                console.warn("⚠️ فشل جلب البيانات من Supabase (CORS أو خلل اتصال). بدء نظام الاسترداد المحلي...", error);
                try {
                    // نظام الاسترداد من ملفات JSON المحلية المتاحة في المشروع
                    const localFiles = ['vsa.json', 'data.json', 'technical-analysis.json', 'Time-analysis.json'];
                    const fetchPromises = localFiles.map(file =>
                        fetch(file + '?v=' + new Date().getTime()).then(res => res.ok ? res.json() : []).catch(() => [])
                    );

                    const results = await Promise.all(fetchPromises);
                    allData = results.flat();

                    await processCryptoAlerts();

                    isDataLoaded = true;
                    render(allData);
                    console.log("🚀 تم تفعيل وضع البيانات المحلية (Local Fallback Mode) بنجاح.");
                    if (typeof handleRoute === 'function') handleRoute();
                } catch (fallbackError) {
                    console.error("❌ فشل النظام تماماً في تحميل أي بيانات:", fallbackError);
                    statusMsg.innerText = "عذراً، حدث خلل في الاتصال بالبيانات.";
                }
            }
        }

        function render(dataArray) {
            const mainGrid = document.getElementById('mainGrid');
            if (!mainGrid) return;

            mainGrid.innerHTML = '';

            if (dataArray.length === 0) {
                if (isDataLoaded) {
                    statusMsg.innerText = "لا توجد بطاقات معروضة في هذا القسم";
                }
                return;
            }
            statusMsg.innerText = '';

            const fragment = document.createDocumentFragment();

            dataArray.forEach((item, index) => {
                const card = document.createElement('div');
                card.className = 'card';
                // Add staggered animation delay
                card.style.animationDelay = `${index * 0.05}s`;

                card.addEventListener('click', function () {
                    openDetails(item.id);
                });

                let mediaContent = '';
                if (item.image && item.image.trim() !== '') {
                    mediaContent = `<div class="card-media-top"><img src="${item.image}" alt="${item.title || ''}" loading="lazy"></div>`;
                } else {
                    mediaContent = `<div class="card-media-top"><img src="https://via.placeholder.com/360x203/222/0088cc?text=VSA+Academy" alt="VSA" loading="lazy"></div>`;
                }

                card.innerHTML = `
                ${mediaContent}
                <div class="card-body-container">
                    <h3>${item.title || 'بدون عنوان'}</h3>
                    <div class="card-content">${item.content || ''}</div>
                </div>
            `;
                fragment.appendChild(card);
            });
            mainGrid.appendChild(fragment);
        }
        // اضافة قسم  دالة التوجه بين الاقسام
        function handleRoute() {
            const hash = window.location.hash || '#/';
            if (searchInput) searchInput.value = '';

            if (hash === '#/investment') {
                const filtered = allData.filter(d => d.category === 'invest');
                pageTitle.innerText = 'دليل الاستثمار في العراق';
                render(filtered);
                setActiveNav('btn-invest');
            }
            else if (hash === '#/time-analysis') {
                const filtered = allData.filter(d => d.category === 'time-analysis');
                pageTitle.innerText = ' التحليل الزمني ';
                render(filtered);
                setActiveNav('btn-time-analysis');
            }

            else if (hash === '#/rw') {
                const filtered = allData.filter(d => d.category === 'rw');
                pageTitle.innerText = ' مكتبة وايكوف';
                render(filtered);
                setActiveNav('btn-rw');
            }

            else if (hash === '#/technical-analysis') {
                const filtered = allData.filter(d => d.category === 'technical-analysis');
                pageTitle.innerText = 'مدارس التحليل الفني';
                render(filtered);
                setActiveNav('btn-technical-analysis');
            }
            // 🛠️ المسار الجديد لعرض تنبيهات الكريبتو القادمة من البوت
            else if (hash === '#/crypto') {
                const filtered = allData.filter(d => d.category === 'high_volume');
                pageTitle.innerText = '🤖 تنبيهات بث حي لحركة العملات الرقمية';
                render(filtered);
                setActiveNav('btn-crypto');
            }
            else {
                const filtered = allData.filter(d => d.category === 'vsa');
                pageTitle.innerText = 'أكاديمية VSA والتداول';
                render(filtered);
                setActiveNav('btn-vsa');
            }

        }

        function setActiveNav(id) {
            document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
            const activeLink = document.getElementById(id);
            if (activeLink) activeLink.classList.add('active');
        }

        const dropdown = document.getElementById('searchDropdown');

        if (searchInput && dropdown) {
            let currentDropdownItems = [];

            function performSearch() {
                const term = searchInput.value.toLowerCase().trim();

                if (term === '') {
                    dropdown.innerHTML = '';
                    dropdown.style.display = 'none';
                    currentDropdownItems = [];
                    return;
                }

                dropdown.innerHTML = '';
                currentDropdownItems = [];
                let hasResults = false;

                allData.forEach(item => {

                    // ── فيديو مباشر ──
                    if (item.videoUrl && item.videoUrl.toLowerCase().includes(term)) {
                        hasResults = true;
                        createDropdownItem(`📺 فيديو: ${item.title}`, item.id, item.videoUrl);
                    }

                    // ── فيديوهات الكورس + فصولها الزمنية ──
                    if (item.videos && Array.isArray(item.videos)) {
                        item.videos.forEach((subVid, subIdx) => {

                            // عنوان الدرس
                            if (subVid.title && subVid.title.toLowerCase().includes(term)) {
                                hasResults = true;
                                createDropdownItem(
                                    `🎥 درس: ${subVid.title} (${item.title})`,
                                    item.id, null, subIdx, null, null, null, null
                                );
                            }

                            // فصول هذا الدرس
                            if (subVid.chapters && Array.isArray(subVid.chapters)) {
                                subVid.chapters.forEach(ch => {
                                    if (ch.text && ch.text.toLowerCase().includes(term)) {
                                        hasResults = true;
                                        createDropdownItem(
                                            `⏱️ ${ch.time} — ${ch.text} (${subVid.title || item.title})`,
                                            item.id, null, subIdx, null, null, ch.time, null
                                        );
                                    }
                                });
                            }
                        });
                    }

                    // ── الفهارس الموضوعية ──
                    if (item.thematic_index && Array.isArray(item.thematic_index)) {
                        item.thematic_index.forEach(topic => {

                            // اسم الموضوع نفسه
                            if (topic.topic_name && topic.topic_name.toLowerCase().includes(term)) {
                                hasResults = true;
                                createDropdownItem(
                                    `📌 موضوع: ${topic.topic_name} (${item.title})`,
                                    item.id, null, null, null, null, null, null
                                );
                            }

                            // فصول الموضوع
                            if (topic.chapters && Array.isArray(topic.chapters)) {
                                topic.chapters.forEach(ch => {
                                    if (ch.text && ch.text.toLowerCase().includes(term)) {
                                        hasResults = true;
                                        createDropdownItem(
                                            `📌 ${topic.topic_name} • ${ch.time} — ${ch.text}`,
                                            item.id, null, null, null, null, ch.time, ch.video_id
                                        );
                                    }
                                });
                            }
                        });
                    }

                    // ── الصور ──
                    if (item.images && Array.isArray(item.images)) {
                        item.images.forEach((imgItem, imgIdx) => {
                            const imgTitle = typeof imgItem === 'string' ? `صورة ${imgIdx + 1}` : (imgItem.title || `صورة ${imgIdx + 1}`);
                            const imgUrl = typeof imgItem === 'string' ? imgItem : imgItem.url;
                            if (imgTitle.toLowerCase().includes(term) || (imgUrl && imgUrl.toLowerCase().includes(term))) {
                                hasResults = true;
                                createDropdownItem(`🖼️ صورة: ${imgTitle} (${item.title})`, item.id, null, null, imgIdx, null, null, null);
                            }
                        });
                    }

                    // ── ملفات PDF ──
                    if (item.pdfs && Array.isArray(item.pdfs)) {
                        item.pdfs.forEach((pdfItem, pdfIdx) => {
                            const pdfTitle = typeof pdfItem === 'string' ? `ملف ${pdfIdx + 1}` : (pdfItem.title || `ملف ${pdfIdx + 1}`);
                            const pdfUrl = typeof pdfItem === 'string' ? pdfItem : pdfItem.url;
                            if (pdfTitle.toLowerCase().includes(term) || (pdfUrl && pdfUrl.toLowerCase().includes(term))) {
                                hasResults = true;
                                createDropdownItem(`📄 PDF: ${pdfTitle} (${item.title})`, item.id, null, null, null, pdfIdx, null, null);
                            }
                        });
                    }

                    // ── الروابط ──
                    if (item.links && Array.isArray(item.links)) {
                        item.links.forEach(link => {
                            const matchText = link.text && link.text.toLowerCase().includes(term);
                            const matchUrl = link.url && link.url.toLowerCase().includes(term);
                            if (matchText || matchUrl) {
                                hasResults = true;
                                createDropdownItem(`🔗 رابط: ${link.text || 'مشاهدة'}`, item.id, link.url);
                            }
                        });
                    }

                    // ── عنوان البطاقة ومحتواها ──
                    const matchTitle = item.title && item.title.toLowerCase().includes(term);
                    const matchContent = item.content && item.content.toLowerCase().includes(term);
                    if (matchTitle || matchContent) {
                        hasResults = true;
                        createDropdownItem(`🗂️ بطاقة: ${item.title}`, item.id);
                    }
                });

                // ── بناء عنصر القائمة ──
                // directUrl | videoIdx | imageIdx | pdfIdx | chapterTime | thematicVideoId
                function createDropdownItem(displayText, itemId, directUrl = null, videoIdx = null, imageIdx = null, pdfIdx = null, chapterTime = null, thematicVideoId = null) {
                    const div = document.createElement('div');
                    div.className = 'search-item';

                    let icon = '📄';
                    if (displayText.includes('🎥') || displayText.includes('📺')) icon = '🎬';
                    else if (displayText.includes('🖼️')) icon = '🖼️';
                    else if (displayText.includes('🔗')) icon = '🔗';
                    else if (displayText.includes('📌') || displayText.includes('⏱️')) icon = '🎯';

                    div.innerHTML = `<span class="search-item-icon">${icon}</span> <span>${displayText}</span>`;

                    currentDropdownItems.push({ itemId, directUrl, videoIdx, imageIdx, pdfIdx, chapterTime, thematicVideoId });
                    div.addEventListener('click', () => {
                        executeSearchAction(itemId, directUrl, videoIdx, imageIdx, pdfIdx, chapterTime, thematicVideoId);
                    });
                    dropdown.appendChild(div);
                }

                if (hasResults) {
                    dropdown.style.display = 'block';
                } else {
                    dropdown.innerHTML = `<div class="search-item" style="color: #aaa; cursor: default;">عذراً، لم يتم العثور على عناوين أو روابط مطابقة...</div>`;
                    dropdown.style.display = 'block';
                }
            }

            searchInput.addEventListener('input', performSearch);
            searchInput.addEventListener('focus', () => {
                if (searchInput.value.trim() !== '') performSearch();
            });

            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    if (currentDropdownItems.length > 0) {
                        e.preventDefault();
                        const f = currentDropdownItems[0];
                        executeSearchAction(f.itemId, f.directUrl, f.videoIdx, f.imageIdx, f.pdfIdx, f.chapterTime, f.thematicVideoId);
                    }
                }
            });

            function executeSearchAction(itemId, directUrl, videoIdx = null, imageIdx = null, pdfIdx = null, chapterTime = null, thematicVideoId = null) {
                if (directUrl) {
                    window.open(directUrl, '_blank');
                } else {
                    openDetails(itemId);

                    // فيديو + قفز لطابع زمني (فصل)
                    if (videoIdx !== null && chapterTime !== null) {
                        setTimeout(() => {
                            const item = allData.find(d => String(d.id) === String(itemId));
                            if (item) playSpecificVideo(item, videoIdx, parseTimeToSeconds(chapterTime));
                        }, 500);

                        // فيديو بدون طابع زمني (درس)
                    } else if (videoIdx !== null) {
                        setTimeout(() => { playPlaylistItem(itemId, videoIdx); }, 450);
                    }

                    // فصل من الفهرس الموضوعي → يحدد الفيديو بـ video_id ويقفز للوقت
                    if (thematicVideoId !== null) {
                        setTimeout(() => {
                            const item = allData.find(d => String(d.id) === String(itemId));
                            if (item) {
                                const secs = chapterTime ? parseTimeToSeconds(chapterTime) : 0;
                                playSpecificVideo(item, thematicVideoId, secs);
                            }
                        }, 500);
                    }

                    // صورة محددة
                    if (imageIdx !== null) {
                        setTimeout(() => {
                            const cards = document.querySelectorAll('#imagesContainer .gallery-card');
                            if (cards[imageIdx]) cards[imageIdx].click();
                        }, 500);
                    }

                    // PDF محدد
                    if (pdfIdx !== null) {
                        setTimeout(() => {
                            const btns = document.querySelectorAll('#pdfsContainer .pdf-list-item');
                            if (btns[pdfIdx]) btns[pdfIdx].click();
                        }, 500);
                    }
                }
                dropdown.style.display = 'none';
                searchInput.value = '';
                currentDropdownItems = [];
            }

            document.addEventListener('click', (event) => {
                if (!searchInput.contains(event.target) && !dropdown.contains(event.target)) {
                    dropdown.style.display = 'none';
                }
            });
        }

        window.addEventListener('hashchange', handleRoute);
        window.addEventListener('load', handleRoute);
        document.addEventListener('DOMContentLoaded', loadWebsiteData);

        let ytSdkPromise = null;
        let fbSdkPromise = null;
        let vimeoSdkPromise = null;

        function loadYouTubeSDK() {
            if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
            if (ytSdkPromise) return ytSdkPromise;
            ytSdkPromise = new Promise((resolve) => {
                if (window.YT && window.YT.Player) {
                    resolve(window.YT);
                    return;
                }
                const oldCallback = window.onYouTubeIframeAPIReady;
                window.onYouTubeIframeAPIReady = () => {
                    if (oldCallback) oldCallback();
                    resolve(window.YT);
                };
                const script = document.createElement('script');
                script.src = "https://www.youtube.com/iframe_api";
                script.async = true;
                document.head.appendChild(script);
            });
            return ytSdkPromise;
        }

        function loadFacebookSDK() {
            if (window.FB) return Promise.resolve(window.FB);
            if (fbSdkPromise) return fbSdkPromise;
            fbSdkPromise = new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = "https://connect.facebook.net/ar_AR/sdk.js";
                script.async = true;
                script.defer = true;
                script.onload = () => {
                    window.FB.init({
                        xfbml: true,
                        version: 'v16.0'
                    });
                    resolve(window.FB);
                };
                document.head.appendChild(script);
            });
            return fbSdkPromise;
        }

        function loadVimeoSDK() {
            if (window.Vimeo) return Promise.resolve(window.Vimeo);
            if (vimeoSdkPromise) return vimeoSdkPromise;
            vimeoSdkPromise = new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = "https://player.vimeo.com/api/player.js";
                script.async = true;
                script.onload = () => {
                    resolve(window.Vimeo);
                };
                document.head.appendChild(script);
            });
            return vimeoSdkPromise;
        }

        function getYouTubeId(url) {
            if (!url) return null;
            const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
            const match = url.match(regExp);
            return (match && match[2].length === 11) ? match[2] : null;
        }

        function getVimeoId(url) {
            if (!url) return null;
            const regExp = /(?:vimeo\.com\/|video\/)(\d+)/;
            const match = url.match(regExp);
            return match ? match[1] : null;
        }

        function getGoogleDriveId(url) {
            if (!url) return null;
            const regExp = /(?:file\/d\/|id=)([^/\?&]+)/;
            const match = url.match(regExp);
            return match ? match[1] : null;
        }

        function getTikTokId(url) {
            if (!url) return null;
            const regExp = /\/video\/(\d+)/;
            const match = url.match(regExp);
            return match ? match[1] : null;
        }

        const UnifiedPlayer = {
            currentType: null,
            apiPlayer: null,
            element: null,
            supportsSeeking: false,
            pendingSeek: null,

            detectVideoType: function (url) {
                if (!url) return null;
                url = url.trim();

                if (url.includes('youtube.com') || url.includes('youtu.be')) {
                    return 'youtube';
                }
                if (url.includes('vimeo.com')) {
                    return 'vimeo';
                }
                if (url.includes('facebook.com') || url.includes('fb.watch')) {
                    return 'facebook';
                }
                if (url.includes('drive.google.com')) {
                    const lowerDrive = url.toLowerCase();
                    if (lowerDrive.includes('.pdf') || lowerDrive.includes('pdf')) {
                        return 'pdf';
                    }
                    if (
                        lowerDrive.includes('.jpg') || lowerDrive.includes('.jpeg') ||
                        lowerDrive.includes('.png') || lowerDrive.includes('.webp') ||
                        lowerDrive.includes('.gif') || lowerDrive.includes('.svg')
                    ) {
                        return 'image';
                    }
                    return 'google-drive';
                }
                if (url.includes('tiktok.com')) {
                    return 'tiktok';
                }
                if (url.includes('t.me/')) {
                    const lower = url.toLowerCase();
                    if (lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.includes('/videos/') || lower.includes('recording')) {
                        return 'html5';
                    }
                    const parts = url.split('/');
                    if (parts.length > 4 && !isNaN(parseInt(parts[parts.length - 1]))) {
                        return 'telegram-embed';
                    }
                }

                const lowerUrl = url.toLowerCase();

                // كشف ملفات PDF
                if (
                    lowerUrl.endsWith('.pdf') ||
                    lowerUrl.includes('.pdf?') ||
                    lowerUrl.includes('type=pdf') ||
                    (lowerUrl.includes('drive.google.com') && lowerUrl.includes('.pdf'))
                ) {
                    return 'pdf';
                }

                // كشف ملفات الصور
                if (
                    lowerUrl.endsWith('.jpg') ||
                    lowerUrl.endsWith('.jpeg') ||
                    lowerUrl.endsWith('.png') ||
                    lowerUrl.endsWith('.gif') ||
                    lowerUrl.endsWith('.webp') ||
                    lowerUrl.endsWith('.svg') ||
                    lowerUrl.endsWith('.bmp') ||
                    lowerUrl.includes('.jpg?') ||
                    lowerUrl.includes('.jpeg?') ||
                    lowerUrl.includes('.png?') ||
                    lowerUrl.includes('.webp?') ||
                    lowerUrl.includes('type=image')
                ) {
                    return 'image';
                }

                if (
                    lowerUrl.endsWith('.mp4') ||
                    lowerUrl.endsWith('.webm') ||
                    lowerUrl.endsWith('.ogg') ||
                    lowerUrl.includes('raw=1') ||
                    lowerUrl.includes('dl=1') ||
                    lowerUrl.includes('/videos/') ||
                    lowerUrl.includes('recording') ||
                    (lowerUrl.includes('github.com') && lowerUrl.includes('/raw/'))
                ) {
                    return 'html5';
                }

                return 'html5';
            },

            init: async function (container, url) {
                this.cleanup();
                if (!url || url.trim() === '') return;

                const type = this.detectVideoType(url);
                this.currentType = type;
                this.supportsSeeking = (type === 'youtube' || type === 'vimeo' || type === 'facebook' || type === 'html5');
                this.pendingSeek = null;

                const notice = document.getElementById('chaptersUnsupportedNotice');
                if (notice) {
                    notice.style.display = this.supportsSeeking ? 'none' : 'block';
                }

                container.innerHTML = '<div style="display:flex; justify-content:center; align-items:center; height:100%; color:#fff; font-size:1.2rem;">⏱️ جاري تحميل المشغل...</div>';
                container.style.display = 'block';

                try {
                    if (type === 'youtube') {
                        const ytId = getYouTubeId(url);
                        if (!ytId) throw new Error("لم يتم العثور على معرف فيديو يوتيوب");

                        await loadYouTubeSDK();

                        const playerDivId = 'yt-player-target';
                        container.innerHTML = `<div id="${playerDivId}"></div>`;

                        this.apiPlayer = new YT.Player(playerDivId, {
                            height: '100%',
                            width: '100%',
                            videoId: ytId,
                            playerVars: {
                                'autoplay': 1,
                                'controls': 1,
                                'rel': 0,
                                'showinfo': 0,
                                'modestbranding': 1
                            },
                            events: {
                                'onReady': (event) => {
                                    const player = event.target;
                                    if (this.pendingSeek !== null) {
                                        player.seekTo(this.pendingSeek, true);
                                        this.pendingSeek = null;
                                    }
                                }
                            }
                        });
                    }
                    else if (type === 'vimeo') {
                        const vimeoId = getVimeoId(url);
                        if (!vimeoId) throw new Error("لم يتم العثور على معرف فيديو فيميو");

                        await loadVimeoSDK();

                        const iframe = document.createElement('iframe');
                        iframe.src = `https://player.vimeo.com/video/${vimeoId}?autoplay=1&api=1`;
                        iframe.allow = "autoplay; fullscreen; picture-in-picture";
                        iframe.style.width = "100%";
                        iframe.style.height = "100%";
                        iframe.style.border = "none";

                        container.innerHTML = '';
                        container.appendChild(iframe);

                        this.apiPlayer = new Vimeo.Player(iframe);
                        this.apiPlayer.ready().then(() => {
                            if (this.pendingSeek !== null) {
                                this.apiPlayer.setCurrentTime(this.pendingSeek);
                                this.pendingSeek = null;
                            }
                        });
                    }
                    else if (type === 'facebook') {
                        await loadFacebookSDK();

                        const fbDivId = 'fb-player-target';
                        container.innerHTML = `
                        <div class="fb-video" id="${fbDivId}"
                             data-href="${url}"
                             data-allowfullscreen="true"
                             data-autoplay="true"
                             data-controls="true"
                             style="width:100%; height:100%; display:block;">
                        </div>
                    `;

                        FB.XFBML.parse(container);

                        const self = this;
                        const readySubscription = (msg) => {
                            if (msg.type === 'video') {
                                self.apiPlayer = msg.instance;
                                if (self.pendingSeek !== null) {
                                    self.apiPlayer.seek(self.pendingSeek);
                                    self.apiPlayer.play();
                                    self.pendingSeek = null;
                                }
                            }
                        };

                        if (!window._fbReadySubscribed) {
                            FB.Event.subscribe('xfbml.ready', readySubscription);
                            window._fbReadySubscribed = true;
                        }
                    }
                    else if (type === 'google-drive') {
                        const driveId = getGoogleDriveId(url);
                        if (!driveId) throw new Error("لم يتم العثور على معرف ملف جوجل درايف");

                        container.innerHTML = `
                        <iframe src="https://drive.google.com/file/d/${driveId}/preview"
                                frameborder="0"
                                allowfullscreen
                                style="width:100%; height:100%; border:none;">
                        </iframe>
                    `;
                    }
                    else if (type === 'tiktok') {
                        const tiktokId = getTikTokId(url);
                        const embedUrl = tiktokId ? `https://www.tiktok.com/embed/v2/${tiktokId}` : url;

                        container.innerHTML = `
                        <iframe src="${embedUrl}"
                                frameborder="0"
                                allow="autoplay; fullscreen"
                                allowfullscreen
                                style="width:100%; height:100%; border:none;">
                        </iframe>
                    `;
                    }
                    else if (type === 'telegram-embed') {
                        const embedUrl = url.includes('?embed=1') ? url : `${url}?embed=1`;
                        container.innerHTML = `
                        <div style="position:relative; width:100%; height:100%; background:#0d0d0d; display:flex; flex-direction:column;">
                            <iframe src="${embedUrl}"
                                    frameborder="0"
                                    allowfullscreen
                                    style="width:100%; flex:1; border:none;">
                            </iframe>
                            <div style="background:#1a1a2e; border-top:1px solid #2d2d3a; padding:10px 14px; display:flex; align-items:center; justify-content:space-between; gap:10px; font-size:0.85rem; flex-shrink:0;">
                                <span style="color:#ffb300;">⚠️ للحصول على طوابع زمنية، أضف رابط الفيديو المباشر (.mp4) في حقل <code style="background:#111; padding:2px 6px; border-radius:4px;">videoDirectUrl</code></span>
                                <a href="${url}" target="_blank" style="color:#0088cc; font-weight:bold; text-decoration:none; white-space:nowrap;">🔗 فتح في تيليغرام</a>
                            </div>
                        </div>
                    `;
                    }
                    else if (type === 'pdf') {
                        // تحديد رابط العرض المناسب
                        let pdfEmbedUrl = url;

                        // Google Drive PDF: تحويل رابط المشاركة إلى رابط معاينة
                        if (url.includes('drive.google.com')) {
                            const driveId = getGoogleDriveId(url);
                            if (driveId) {
                                pdfEmbedUrl = `https://drive.google.com/file/d/${driveId}/preview`;
                            }
                        }
                        // Dropbox: تحويل dl=0 إلى raw=1
                        else if (url.includes('dropbox.com')) {
                            pdfEmbedUrl = url.replace('dl=0', 'raw=1').replace('dl=1', 'raw=1');
                            if (!pdfEmbedUrl.includes('raw=1')) {
                                pdfEmbedUrl += (pdfEmbedUrl.includes('?') ? '&' : '?') + 'raw=1';
                            }
                        }

                        container.innerHTML = `
                        <div style="position:relative; width:100%; height:100%; background:#1a1a1e; display:flex; flex-direction:column; border-radius:12px; overflow:hidden;">
                            <div style="background:#18181c; border-bottom:1px solid #2d2d35; padding:10px 16px; display:flex; align-items:center; flex-shrink:0;">
                                <span style="color:#00d4ff; font-weight:700; font-size:0.95rem;">📄 عارض PDF</span>
                            </div>
                            <iframe
                                src="${pdfEmbedUrl}"
                                style="flex:1; width:100%; border:none; background:#fff;"
                                allowfullscreen
                                loading="lazy"
                                onerror="this.parentElement.innerHTML='<div style=\\'display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:16px;padding:24px;text-align:center;\\'><span style=\\'font-size:3rem;\\'>📄</span><p style=\\'color:#aaa;\\'>تعذّر عرض الملف مباشرةً. قد يكون بسبب قيود CORS أو إعدادات الخادم.</p><a href=\\'${url}\\' target=\\'_blank\\' style=\\'background:#00d4ff;color:#000;padding:10px 24px;border-radius:8px;font-weight:bold;text-decoration:none;\\'>🔗 فتح الملف في تبويب جديد</a></div>'">
                            </iframe>
                        </div>
                    `;
                        container.style.display = 'block';
                    }
                    else if (type === 'image') {
                        // تحويل رابط Google Drive لصورة مباشرة
                        let imgSrc = url;
                        if (url.includes('drive.google.com')) {
                            const driveId = getGoogleDriveId(url);
                            if (driveId) {
                                imgSrc = `https://drive.google.com/uc?export=view&id=${driveId}`;
                            }
                        }

                        container.innerHTML = `
                        <div data-imgwrapper="1" style="position:relative; width:100%; height:100%; background:#0d0d0f; display:flex; flex-direction:column; border-radius:12px; overflow:hidden;">
                            <div style="background:#18181c; border-bottom:1px solid #2d2d35; padding:10px 16px; display:flex; align-items:center; justify-content:space-between; flex-shrink:0;">
                                <span style="color:#00d4ff; font-weight:700; font-size:0.95rem;">🖼️ عارض الصورة</span>
                                <div style="display:flex; gap:10px; align-items:center;">
                                    <button onclick="const img=this.closest('[data-imgwrapper]').querySelector('[data-imgviewer] img');let s=parseFloat(img.dataset.scale||1);s=Math.min(s+0.25,4);img.dataset.scale=s;img.style.transform='scale('+s+')';" style="background:#2a2a35;color:#fff;border:1px solid #3d3d4a;border-radius:7px;padding:5px 12px;cursor:pointer;font-size:1rem;">＋</button>
                                    <button onclick="const img=this.closest('[data-imgwrapper]').querySelector('[data-imgviewer] img');let s=parseFloat(img.dataset.scale||1);s=Math.max(s-0.25,0.25);img.dataset.scale=s;img.style.transform='scale('+s+')';" style="background:#2a2a35;color:#fff;border:1px solid #3d3d4a;border-radius:7px;padding:5px 12px;cursor:pointer;font-size:1rem;">－</button>
                                    <button onclick="const img=this.closest('[data-imgwrapper]').querySelector('[data-imgviewer] img');img.dataset.scale=1;img.style.transform='scale(1)';" style="background:#2a2a35;color:#aaa;border:1px solid #3d3d4a;border-radius:7px;padding:5px 12px;cursor:pointer;font-size:0.8rem;">إعادة ضبط</button>
                                </div>
                            </div>
                            <div data-imgviewer="1" style="flex:1;overflow:auto;display:flex;align-items:center;justify-content:center;padding:16px;">
                                <img src="${imgSrc}"
                                     data-scale="1"
                                     alt="صورة"
                                     style="max-width:100%;max-height:100%;object-fit:contain;transition:transform 0.2s ease;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,0.6);transform-origin:center center;"
                                     onerror="this.parentElement.innerHTML='<div style=\\'display:flex;flex-direction:column;align-items:center;justify-content:center;height:200px;gap:12px;text-align:center;\\'><span style=\\'font-size:2.5rem;\\'>🖼️</span><p style=\\'color:#aaa;margin:0;\\'>تعذّر تحميل الصورة</p><a href=\\'${imgSrc}\\' target=\\'_blank\\' style=\\'background:#00d4ff;color:#000;padding:8px 20px;border-radius:8px;font-weight:bold;text-decoration:none;\\'>🔗 فتح في تبويب جديد</a></div>'"
                                />
                            </div>
                        </div>
                    `;
                        container.style.display = 'block';
                    }
                    else if (type === 'html5') {
                        let directUrl = url;

                        if (directUrl.includes('dropbox.com')) {
                            if (directUrl.includes('dl=0')) {
                                directUrl = directUrl.replace('dl=0', 'raw=1');
                            } else if (directUrl.includes('dl=1')) {
                                directUrl = directUrl.replace('dl=1', 'raw=1');
                            } else if (!directUrl.includes('raw=1')) {
                                directUrl += (directUrl.includes('?') ? '&' : '?') + 'raw=1';
                            }
                        }

                        const video = document.createElement('video');
                        video.src = directUrl;
                        video.controls = true;
                        video.autoplay = true;
                        video.style.width = "100%";
                        video.style.height = "100%";
                        video.style.background = "#000";
                        video.style.border = "none";

                        container.innerHTML = '';
                        container.appendChild(video);
                        this.element = video;

                        video.addEventListener('loadedmetadata', () => {
                            if (this.pendingSeek !== null) {
                                video.currentTime = this.pendingSeek;
                                video.play();
                                this.pendingSeek = null;
                            }
                        });
                    }
                } catch (err) {
                    console.error("UnifiedPlayer Init Error: ", err);
                    container.innerHTML = `<div style="display:flex; justify-content:center; align-items:center; height:100%; color:#ff4d4d; font-size:1rem; padding: 20px; text-align:center;">❌ فشل تحميل الفيديو: ${err.message}</div>`;
                }
            },

            seekTo: function (seconds) {
                if (!this.supportsSeeking) return;

                if (this.currentType === 'youtube') {
                    if (this.apiPlayer && typeof this.apiPlayer.seekTo === 'function') {
                        this.apiPlayer.seekTo(seconds, true);
                        if (this.apiPlayer.playVideo) this.apiPlayer.playVideo();
                    } else {
                        this.pendingSeek = seconds;
                    }
                }
                else if (this.currentType === 'vimeo') {
                    if (this.apiPlayer && typeof this.apiPlayer.setCurrentTime === 'function') {
                        this.apiPlayer.setCurrentTime(seconds);
                        this.apiPlayer.play();
                    } else {
                        this.pendingSeek = seconds;
                    }
                }
                else if (this.currentType === 'facebook') {
                    if (this.apiPlayer && typeof this.apiPlayer.seek === 'function') {
                        this.apiPlayer.seek(seconds);
                        this.apiPlayer.play();
                    } else {
                        this.pendingSeek = seconds;
                    }
                }
                else if (this.currentType === 'html5') {
                    if (this.element) {
                        this.element.currentTime = seconds;
                        this.element.play();
                    } else {
                        this.pendingSeek = seconds;
                    }
                }
            },

            cleanup: function () {
                if (this.currentType === 'youtube' && this.apiPlayer && typeof this.apiPlayer.destroy === 'function') {
                    try { this.apiPlayer.destroy(); } catch (e) { }
                }
                if (this.currentType === 'facebook' && this.apiPlayer) {
                    try {
                        if (typeof this.apiPlayer.pause === 'function') this.apiPlayer.pause();
                    } catch (e) { }
                }
                if (this.currentType === 'vimeo' && this.apiPlayer) {
                    try {
                        if (typeof this.apiPlayer.unload === 'function') this.apiPlayer.unload();
                    } catch (e) { }
                }
                if (this.element) {
                    try {
                        this.element.pause();
                        this.element.src = "";
                        this.element.load();
                    } catch (e) { }
                }

                this.currentType = null;
                this.apiPlayer = null;
                this.element = null;
                this.supportsSeeking = false;
                this.pendingSeek = null;
            }
        };

        function openDetails(id, isHistoryNavigation = false) {
            const selectedItem = allData.find(item => String(item.id) === String(id));
            if (!selectedItem) return;

            if (!isHistoryNavigation) {
                if (modalHistory.length === 0 || document.getElementById('myModal').style.display !== "block") {
                    modalHistory = [String(id)];
                    modalHistoryIndex = 0;
                    // عند فتح نافذة جديدة، نقوم بتصفير originalThematicItem مؤقتاً
                    // ثم سنعيد تعيينه لاحقاً إذا كان العنصر يحتوي على thematic_index
                    originalThematicItem = null;
                } else {
                    modalHistory = modalHistory.slice(0, modalHistoryIndex + 1);
                    modalHistory.push(String(id));
                    modalHistoryIndex++;
                }
            }

            updateModalNavButtons();

            document.getElementById('modalTitle').innerText = selectedItem.title || '';
            document.getElementById('modalContent').innerText = selectedItem.content || '';

            const videoContainer = document.getElementById('popupVideoContainer');
            const linksContainer = document.getElementById('popupLinksContainer');
            const chaptersContainer = document.getElementById('chaptersContainer');
            const chaptersSection = document.getElementById('chaptersSection');
            const playlistSection = document.getElementById('playlistSection');
            const playlistContainer = document.getElementById('playlistContainer');
            const thematicSection = document.getElementById('thematicSection');
            const thematicContainer = document.getElementById('thematicContainer');
            const imagesSection = document.getElementById('imagesSection');
            const imagesContainer = document.getElementById('imagesContainer');
            const pdfsSection = document.getElementById('pdfsSection');
            const pdfsContainer = document.getElementById('pdfsContainer');

            if (videoContainer) { videoContainer.innerHTML = ''; videoContainer.style.display = 'none'; }
            if (linksContainer) { linksContainer.innerHTML = ''; }
            if (chaptersContainer) { chaptersContainer.innerHTML = ''; }
            if (chaptersSection) { chaptersSection.style.display = 'none'; }
            if (playlistSection) { playlistSection.style.display = 'none'; }
            if (playlistContainer) { playlistContainer.innerHTML = ''; }
            if (thematicSection) { thematicSection.style.display = 'none'; }
            if (thematicContainer) { thematicContainer.innerHTML = ''; }
            if (imagesSection) { imagesSection.style.display = 'none'; }
            if (imagesContainer) { imagesContainer.innerHTML = ''; }
            if (pdfsSection) { pdfsSection.style.display = 'none'; }
            if (pdfsContainer) { pdfsContainer.innerHTML = ''; }

            function createDynamicButton(url, text) {
                const btn = document.createElement('a');
                btn.href = url;
                btn.target = '_blank';
                btn.innerText = text;

                btn.style.cssText = "text-decoration:none; padding:14px 28px; border-radius:10px; font-weight:bold; font-size:1rem; transition:all 0.25s ease; box-shadow:0 4px 15px rgba(0,0,0,0.3); display:inline-block; margin:8px; text-align:center;";

                const lowerUrl = url.toLowerCase();
                if (lowerUrl.includes('t.me') || lowerUrl.includes('telegram.org')) {
                    btn.style.backgroundColor = '#0088cc'; btn.style.color = '#ffffff'; btn.innerText = '🔹 ' + text;
                } else if (lowerUrl.includes('facebook.com')) {
                    btn.style.backgroundColor = '#1877f2'; btn.style.color = '#ffffff'; btn.innerText = '🔵 ' + text;
                } else if (lowerUrl.includes('binance.com')) {
                    btn.style.backgroundColor = '#fcd535'; btn.style.color = '#111111'; btn.innerText = '🔸 ' + text;
                } else if (lowerUrl.endsWith('.pdf') || lowerUrl.includes('.pdf?') || lowerUrl.includes('type=pdf')) {
                    btn.style.backgroundColor = '#e53935'; btn.style.color = '#ffffff'; btn.innerText = '📄 ' + text;
                } else if (
                    lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg') || lowerUrl.endsWith('.png') ||
                    lowerUrl.endsWith('.webp') || lowerUrl.endsWith('.gif') || lowerUrl.endsWith('.svg') ||
                    lowerUrl.includes('type=image')
                ) {
                    btn.style.backgroundColor = '#7b1fa2'; btn.style.color = '#ffffff'; btn.innerText = '🖼️ ' + text;
                } else {
                    btn.style.backgroundColor = '#222222'; btn.style.color = '#00ff88'; btn.style.border = '1px solid #333'; btn.innerText = '🔗 ' + text;
                }

                btn.onmouseenter = () => { btn.style.transform = 'translateY(-3px)'; btn.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)'; };
                btn.onmouseleave = () => { btn.style.transform = 'translateY(0)'; btn.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)'; };

                linksContainer.appendChild(btn);
            }

            // إذا كان الكارت يحتوي على مصفوفة فيديوهات فرعية، نقوم ببناء قائمة التشغيل الجانبية
            if (selectedItem.videos && selectedItem.videos.length > 0) {
                if (playlistSection && playlistContainer) {
                    playlistSection.style.display = 'block';
                    selectedItem.videos.forEach((vid, idx) => {
                        const rowBtn = document.createElement('button');
                        rowBtn.className = 'chapter-row-btn';
                        rowBtn.id = `playlist-item-${idx}`;
                        rowBtn.style.marginBottom = '8px';
                        rowBtn.innerHTML = `<span>▶️ ${vid.title || `الدرس ${idx + 1}`}</span>`;
                        rowBtn.addEventListener('click', () => {
                            playPlaylistItem(selectedItem.id, idx);
                        });
                        playlistContainer.appendChild(rowBtn);
                    });

                    // تشغيل الدرس الأول تلقائياً عند فتح الكارت
                    playPlaylistItem(selectedItem.id, 0);
                }
            } else {
                // الحالة الافتراضية للكروت العادية التي تحتوي على فيديو واحد فقط مباشر
                const effectiveVideoUrl = (selectedItem.videoDirectUrl && selectedItem.videoDirectUrl.trim() !== '')
                    ? selectedItem.videoDirectUrl
                    : selectedItem.videoUrl;

                if (effectiveVideoUrl && effectiveVideoUrl.trim() !== '') {
                    const isUsingDirectFallback = selectedItem.videoDirectUrl && selectedItem.videoDirectUrl.trim() !== ''
                        && selectedItem.videoUrl && (selectedItem.videoUrl.includes('t.me/') || selectedItem.videoUrl.includes('telegram'));
                    UnifiedPlayer.init(videoContainer, effectiveVideoUrl, isUsingDirectFallback ? selectedItem.videoUrl : null);
                }

                if (selectedItem.chapters && selectedItem.chapters.length > 0) {
                    if (chaptersSection) chaptersSection.style.display = 'block';
                    selectedItem.chapters.forEach(chapter => {
                        const chapBtn = document.createElement('button');
                        chapBtn.className = 'chapter-row-btn';
                        chapBtn.innerHTML = `
                        <span>${chapter.text}</span>
                        <span class="chapter-time-badge">${chapter.time}</span>
                    `;
                        const seconds = parseTimeToSeconds(chapter.time);
                        chapBtn.addEventListener('click', () => {
                            UnifiedPlayer.seekTo(seconds);
                        });
                        chaptersContainer.appendChild(chapBtn);
                    });
                }
            }

            // ========== عرض الفهارس الموضوعية (thematic_index) ==========
            // إذا كان العنصر الحالي يحتوي على thematic_index، نجعله originalThematicItem
            if (selectedItem.thematic_index && selectedItem.thematic_index.length > 0) {
                originalThematicItem = selectedItem;
                if (thematicSection) thematicSection.style.display = 'block';
                thematicContainer.innerHTML = '';
                selectedItem.thematic_index.forEach(topic => {
                    const topicDiv = document.createElement('div');
                    topicDiv.style.marginBottom = '20px';
                    topicDiv.innerHTML = `<h4 style="color: var(--accent-color); margin: 10px 0 8px 0;">📌 ${topic.topic_name}</h4>`;
                    const chaptersDiv = document.createElement('div');
                    chaptersDiv.className = 'chapters-flex-list';
                    chaptersDiv.style.maxHeight = '200px';
                    topic.chapters.forEach(ch => {
                        const chapBtn = document.createElement('button');
                        chapBtn.className = 'chapter-row-btn';
                        chapBtn.style.padding = '8px 12px';
                        chapBtn.innerHTML = `
                        <span>${ch.text}</span>
                        <span class="chapter-time-badge">${ch.time} • ${ch.video_id || ''}</span>
                    `;
                        chapBtn.addEventListener('click', () => {
                            if (ch.video_id) {
                                const seekSec = parseTimeToSeconds(ch.time);
                                playSpecificVideo(selectedItem, ch.video_id, seekSec);
                            } else {
                                alert('لم يتم تحديد الفيديو لهذا الفصل');
                            }
                        });
                        chaptersDiv.appendChild(chapBtn);
                    });
                    topicDiv.appendChild(chaptersDiv);
                    thematicContainer.appendChild(topicDiv);
                });
            } else {
                // إذا كان العنصر الحالي لا يحتوي على thematic_index، نخفي القسم
                // ولكن لا نمسح originalThematicItem لكي يظل متاحاً إذا أردنا استخدامه لاحقاً
                if (thematicSection) thematicSection.style.display = 'none';
            }

            if (selectedItem.links && Array.isArray(selectedItem.links)) {
                selectedItem.links.forEach(link => {
                    if (link.url) createDynamicButton(link.url, link.text || 'مشاهدة الدرس');
                });
            }

            // ========== معرض الصور المستقل (images: []) ==========
            if (selectedItem.images && selectedItem.images.length > 0 && imagesSection && imagesContainer) {
                imagesSection.style.display = 'block';
                imagesContainer.innerHTML = '';

                const openImageInViewer = (url, title, cardEl) => {
                    imagesContainer.querySelectorAll('.gallery-card').forEach(c => c.classList.remove('active'));
                    if (cardEl) cardEl.classList.add('active');
                    UnifiedPlayer.init(videoContainer, url);
                };

                // فتح الصورة الأولى تلقائياً
                const firstImg = selectedItem.images[0];
                const firstUrl = typeof firstImg === 'string' ? firstImg : firstImg.url;
                UnifiedPlayer.init(videoContainer, firstUrl);

                selectedItem.images.forEach((imgItem, idx) => {
                    const imgUrl = typeof imgItem === 'string' ? imgItem : imgItem.url;
                    const imgTitle = typeof imgItem === 'string' ? `صورة ${idx + 1}` : (imgItem.title || `صورة ${idx + 1}`);

                    // الكارد الغلاف
                    const card = document.createElement('div');
                    card.className = 'gallery-card' + (idx === 0 ? ' active' : '');
                    card.title = imgTitle;

                    // الصورة المصغرة
                    const thumb = document.createElement('img');
                    thumb.className = 'gallery-thumb';
                    thumb.src = imgUrl;
                    thumb.alt = imgTitle;
                    thumb.loading = 'lazy';

                    // بديل عند فشل التحميل
                    thumb.onerror = function () {
                        const ph = document.createElement('div');
                        ph.className = 'gallery-thumb-placeholder';
                        ph.innerHTML = `<span>🖼️</span>`;
                        card.replaceChild(ph, thumb);
                    };

                    // العنوان
                    const titleEl = document.createElement('span');
                    titleEl.className = 'gallery-card-title';
                    titleEl.textContent = imgTitle;

                    card.appendChild(thumb);
                    card.appendChild(titleEl);
                    card.addEventListener('click', () => openImageInViewer(imgUrl, imgTitle, card));
                    imagesContainer.appendChild(card);
                });
            }

            // ========== قائمة PDF المستقلة (pdfs: []) ==========
            if (selectedItem.pdfs && selectedItem.pdfs.length > 0 && pdfsSection && pdfsContainer) {
                pdfsSection.style.display = 'block';
                pdfsContainer.innerHTML = '';

                const openPdfInViewer = (url, btn) => {
                    pdfsContainer.querySelectorAll('.pdf-list-item').forEach(b => b.classList.remove('active'));
                    if (btn) btn.classList.add('active');
                    UnifiedPlayer.init(videoContainer, url);
                };

                // فتح الـ PDF الأول تلقائياً
                const firstPdf = selectedItem.pdfs[0];
                const firstPdfUrl = typeof firstPdf === 'string' ? firstPdf : firstPdf.url;
                UnifiedPlayer.init(videoContainer, firstPdfUrl);

                selectedItem.pdfs.forEach((pdfItem, idx) => {
                    const pdfUrl = typeof pdfItem === 'string' ? pdfItem : pdfItem.url;
                    const pdfTitle = typeof pdfItem === 'string' ? `ملف ${idx + 1}` : (pdfItem.title || `ملف ${idx + 1}`);

                    const btn = document.createElement('button');
                    btn.className = 'pdf-list-item' + (idx === 0 ? ' active' : '');
                    btn.innerHTML = `<span class="pdf-icon">📄</span><span>${pdfTitle}</span>`;
                    btn.addEventListener('click', () => openPdfInViewer(pdfUrl, btn));
                    pdfsContainer.appendChild(btn);
                });
            }

            const recContainer = document.getElementById('recommendationsContainer');
            const recList = document.getElementById('recommendationsList');

            if (recContainer && recList) {
                recList.innerHTML = '';
                if (selectedItem.recommendations && selectedItem.recommendations.length > 0) {
                    let hasRecs = false;
                    selectedItem.recommendations.forEach(recId => {
                        const recItem = allData.find(item => String(item.id) === String(recId));
                        if (recItem) {
                            hasRecs = true;
                            const recCard = document.createElement('div');
                            recCard.className = 'rec-item-card';
                            recCard.innerHTML = `
                            <h4>${recItem.title}</h4>
                            <span class="watch-now">مشاهدة الآن ←</span>
                        `;
                            recCard.addEventListener('click', () => {
                                openDetails(recItem.id);
                            });
                            recList.appendChild(recCard);
                        }
                    });
                    recContainer.style.display = hasRecs ? 'block' : 'none';
                } else {
                    recContainer.style.display = 'none';
                }
            }

            document.getElementById('myModal').style.display = "block";
        }

        // دالة لتشغيل عنصر من قائمة التشغيل داخل الـ Modal وتحديث الفصول التابعة له
        function playPlaylistItem(courseId, videoIndex) {
            const selectedItem = allData.find(item => String(item.id) === String(courseId));
            if (!selectedItem || !selectedItem.videos || !selectedItem.videos[videoIndex]) return;
            playSpecificVideo(selectedItem, videoIndex, 0);
        }

        function closeModal() {
            document.getElementById('myModal').style.display = "none";
            UnifiedPlayer.cleanup();
            modalHistory = [];
            modalHistoryIndex = -1;
            originalThematicItem = null; // إعادة تعيين المتغير عند إغلاق النافذة
        }

        // ==========================================
        // === UI & Interaction Logic ===
        // ==========================================

        let aiTimerInterval = null;
        let aiTimerSeconds = 0;

        function startAiTimer() {
            const timerBadge = document.getElementById('aiDynamicTimer');
            if (!timerBadge) return;
            timerBadge.style.display = 'inline-block';
            aiTimerSeconds = 0;
            timerBadge.innerText = '0:00';

            if (aiTimerInterval) clearInterval(aiTimerInterval);
            aiTimerInterval = setInterval(() => {
                aiTimerSeconds++;
                const mins = Math.floor(aiTimerSeconds / 60);
                const secs = aiTimerSeconds % 60;
                timerBadge.innerText = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
            }, 1000);
        }

        function stopAiTimer() {
            const timerBadge = document.getElementById('aiDynamicTimer');
            if (timerBadge) timerBadge.style.display = 'none';
            if (aiTimerInterval) clearInterval(aiTimerInterval);
        }

        function toggleTerminal() {
            const term = document.getElementById('aiTerminal');
            const isOpening = term.style.display !== 'flex';
            term.style.display = isOpening ? 'flex' : 'none';
            if (isOpening) {
                if (document.getElementById('terminalOutput').innerHTML === '') {
                    logToTerminal('Microsoft Windows [Version 10.0.19045.4780]', 'info');
                    logToTerminal('(c) Microsoft Corporation. All rights reserved.', 'info');
                    logToTerminal('', 'info');
                }
                const output = document.getElementById('terminalOutput');
                output.scrollTop = output.scrollHeight;
            }
        }

        function logToTerminal(msg, type = 'info') {
            const output = document.getElementById('terminalOutput');
            const time = new Date().toLocaleTimeString('ar-EG', { hour12: false });

            const entry = document.createElement('div');
            entry.style.marginBottom = '2px';

            let typeClass = 'terminal-info';
            if (type === 'error') typeClass = 'terminal-error';
            if (type === 'success') typeClass = 'terminal-success';
            if (type === 'command') typeClass = 'terminal-cmd';

            if (type === 'command') {
                entry.innerHTML = `<span class="terminal-prompt">PS D:\\New folder\\my&gt;</span> <span class="${typeClass}">${msg}</span>`;
            } else {
                entry.innerHTML = `<span style="color: #6e7073; font-size: 11px;">[${time}]</span> <span class="${typeClass}">${msg}</span>`;
            }

            output.appendChild(entry);
            output.scrollTop = output.scrollHeight;
        }

        // 🚨 نظام الإنقاذ المستقل (Independent Emergency Core)
        (function() {
            const overlay = document.getElementById('emergencyOverlay');
            const status = document.getElementById('emergencyStatus');

            // 1. التشغيل التلقائي عند اكتشاف انهيار (بعد 5 ثوان من عدم استجابة الصفحة)
            window.addEventListener('load', () => {
                setTimeout(() => {
                    if (!document.body.innerHTML.includes('ai-widget') || typeof allData === 'undefined') {
                        showEmergencyUI("تنبيه: تم اكتشاف فشل في تحميل مكونات النظام الأساسية.");
                    }
                }, 5000);
            });

            // 2. مراقبة الأخطاء القاتلة
            window.onerror = function(msg, url, lineNo, columnNo, error) {
                if (performance.now() < 10000) { // فقط في أول 10 ثوان
                    showEmergencyUI("خطأ برمي حرج: " + msg);
                }
                return false;
            };

            // 3. اختصار لوحة المفاتيح
            window.addEventListener('keydown', function(e) {
                if (e.ctrlKey && e.shiftKey && e.code === 'KeyE') {
                    e.preventDefault();
                    showEmergencyUI("وضع الإصلاح اليدوي مفعل.");
                }
            });

            function showEmergencyUI(msg) {
                overlay.style.display = 'flex';
                status.innerText = "🚨 " + msg;
            }

            window.emergencyRepair = async function() {
                status.innerText = "⏳ جاري الاتصال بـ GitHub ومزامنة التوكن...";
                try {
                    const SUPABASE_URL = 'https://ozcffmadatsfyyldqmdl.supabase.co';
                    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96Y2ZmbWFkYXRzZnl5bGRxbWRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njc5NzUxMSwiZXhwIjoyMTAyMzczNTExfQ.WkAWW7iXgstl4YX7be_O4K20YvyXvh0eNJ4eALpv9Wg';

                    const res = await fetch(`${SUPABASE_URL}/rest/v1/secret_settings?id=eq.github_token`, {
                        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
                    });
                    const data = await res.json();
                    const token = data.length > 0 ? data[0].secret_value.trim().replace(/^['"]|['"]$/g, '') : null;

                    if (!token) throw new Error("لم يتم العثور على GitHub Token. يرجى إدخاله يدوياً.");

                    status.innerText = "🔍 جاري البحث عن آخر نسخة سليمة (Rollback point)...";

                    const commitsRes = await fetch(`https://api.github.com/repos/ahmedwwaw1/my/commits?path=index.html&per_page=5`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const commits = await commitsRes.json();

                    if (commits.length < 2) throw new Error("لا توجد نسخ سابقة للعودة إليها.");

                    const prevCommitSha = commits[1].sha;
                    status.innerText = `📦 تم العثور على نسخة سليمة (${prevCommitSha.substring(0,7)}). جاري الاستعادة...`;

                    const contentRes = await fetch(`https://api.github.com/repos/ahmedwwaw1/my/contents/index.html?ref=${prevCommitSha}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const contentData = await contentRes.json();
                    const safeContent = decodeURIComponent(escape(atob(contentData.content)));

                    status.innerText = "🚀 جاري إعادة الكتابة على GitHub... يرجى الانتظار.";

                    const currentFileRes = await fetch(`https://api.github.com/repos/ahmedwwaw1/my/contents/index.html`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const currentFileData = await currentFileRes.json();

                    const finalUpdate = await fetch(`https://api.github.com/repos/ahmedwwaw1/my/contents/index.html`, {
                        method: 'PUT',
                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            message: "🚨 استعادة الطوارئ: العودة لآخر نسخة سليمة قبل العطل",
                            content: btoa(unescape(encodeURIComponent(safeContent))),
                            sha: currentFileData.sha
                        })
                    });

                    if (finalUpdate.ok) {
                        status.innerText = "✅ تمت عملية الإصلاح بنجاح! سيتم إعادة تشغيل الموقع الآن...";
                        setTimeout(() => window.location.reload(), 2000);
                    } else {
                        throw new Error("فشل تحديث الملف. تأكد من صلاحيات التوكن.");
                    }

                } catch (err) {
                    status.innerText = `❌ خطأ في الإصلاح: ${err.message}`;
                    status.style.color = "#ff3d00";
                }
            };
        })();
