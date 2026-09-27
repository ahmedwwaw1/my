/**
 * Mastermind Site Context Agent
 * --------------------------------
 * يتتبع مكان المستخدم داخل الموقع ويحوّل الموقع إلى "خريطة سياق"
 * تستطيع واجهة Mastermind إرسالها إلى النموذج قبل تنفيذ أي أمر.
 *
 * لا يقوم هذا الملف بتعديل JSON بنفسه؛ بل يحدد بدقة:
 * - المسار/القسم الحالي
 * - البطاقة/الكورس الحالي
 * - الدرس الحالي
 * - الفصل/الطابع الزمني الحالي
 * - ملف JSON ومؤشر JSON Pointer
 * - هوية عنصر DOM المرتبط
 */
(function () {
    'use strict';

    const SOURCE_FILES = {
        data: 'My location data/data.json',
        vsa: 'My location data/vsa.json',
        'technical-analysis': 'My location data/technical-analysis.json',
        'time-analysis': 'My location data/Time-analysis.json',
        'pdf-images': 'My location data/PDF-images.json',
        crypto: 'ScriptBot/ScriptBot json/crypto_alerts.json'
    };

    const ROUTE_INFO = {
        '#/': { key: 'home', title: 'أكاديمية VSA والتداول', category: 'vsa' },
        '#/rw': { key: 'rw', title: 'التحليل الحجمي', category: 'rw' },
        '#/time-analysis': { key: 'time-analysis', title: 'التحليل الزمني', category: 'time-analysis' },
        '#/technical-analysis': { key: 'technical-analysis', title: 'مدارس التحليل الفني', category: 'technical-analysis' },
        '#/investment': { key: 'investment', title: 'دليل الاستثمار في العراق', category: 'invest' },
        '#/crypto': { key: 'crypto', title: 'تنبيهات بث حي لحركة العملات الرقمية', category: 'high_volume' }
    };

    const state = {
        route: null,
        course: null,
        lesson: null,
        chapter: null,
        thematic: null,
        lastUpdated: 0
    };

    function safeString(value) {
        return value == null ? '' : String(value);
    }

    function sourceFile(source) {
        return SOURCE_FILES[source] || (source ? 'My location data/' + source + '.json' : '');
    }

    function pointerSegment(value) {
        return safeString(value).replace(/~/g, '~0').replace(/\\//g, '~1');
    }

    function pointerForCourse(item) {
        if (!item || item._mmIndex == null || !item._mmSource) return null;
        return '/' + pointerSegment(item._mmIndex);
    }

    function pointerForLesson(item, videoIndex) {
        const base = pointerForCourse(item);
        return base == null ? null : base + '/videos/' + pointerSegment(videoIndex);
    }

    function pointerForChapter(item, videoIndex, chapterIndex) {
        const base = pointerForLesson(item, videoIndex);
        return base == null ? null : base + '/chapters/' + pointerSegment(chapterIndex);
    }

    function pointerForThematic(item, topicIndex, chapterIndex) {
        const base = pointerForCourse(item);
        if (base == null) return null;
        const topic = base + '/thematic_index/' + pointerSegment(topicIndex);
        return chapterIndex == null ? topic : topic + '/chapters/' + pointerSegment(chapterIndex);
    }

    function routeInfo() {
        const hash = window.location.hash || '#/';
        return ROUTE_INFO[hash] || {
            key: 'custom',
            title: document.getElementById('pageTitle')?.innerText || 'صفحة الموقع',
            category: null
        };
    }

    function clearLowerContext() {
        state.lesson = null;
        state.chapter = null;
        state.thematic = null;
    }

    function setCourse(item, domElement = null) {
        if (!item || typeof item !== 'object') return;
        state.course = {
            id: safeString(item.id),
            title: safeString(item.title),
            category: safeString(item.category),
            source: safeString(item._mmSource),
            sourceFile: sourceFile(item._mmSource),
            sourceIndex: item._mmIndex == null ? null : Number(item._mmIndex),
            jsonPointer: pointerForCourse(item),
            dom: domElement ? {
                tag: domElement.tagName?.toLowerCase() || '',
                id: domElement.id || '',
                selectorHint: '[data-mm-entity="course"][data-mm-id="' + safeString(item.id).replace(/"/g, '\\\"') + '"]'
            } : null
        };
        clearLowerContext();
        state.lastUpdated = Date.now();
        renderContextBar();
    }

    function setLesson(item, videoIndex, seekSeconds = 0, domElement = null) {
        if (!item) return;
        const videos = Array.isArray(item.videos) ? item.videos : [];
        const idx = Number(videoIndex);
        const video = Number.isInteger(idx) && idx >= 0 ? videos[idx] : null;
        if (!video) {
            clearLowerContext();
            renderContextBar();
            return;
        }

        setCourse(item);
        state.lesson = {
            id: safeString(video.id),
            title: safeString(video.title || ('الدرس ' + (idx + 1))),
            index: idx,
            url: safeString(video.url || video.videoUrl || video.videoDirectUrl),
            sourceFile: sourceFile(item._mmSource),
            jsonPointer: pointerForLesson(item, idx),
            seekSeconds: Number.isFinite(Number(seekSeconds)) ? Number(seekSeconds) : 0,
            dom: domElement ? {
                tag: domElement.tagName?.toLowerCase() || '',
                id: domElement.id || ''
            } : null
        };
        state.chapter = null;
        state.thematic = null;
        state.lastUpdated = Date.now();
        renderContextBar();
    }

    function setChapter(item, videoIndex, chapterIndex, seekSeconds = 0, domElement = null) {
        if (!item) return;
        const videos = Array.isArray(item.videos) ? item.videos : [];
        const idx = Number(videoIndex);
        const cidx = Number(chapterIndex);
        const video = Number.isInteger(idx) ? videos[idx] : null;
        const chapter = video && Array.isArray(video.chapters) ? video.chapters[cidx] : null;
        if (!video || !chapter) return;

        setLesson(item, idx, seekSeconds, null);
        state.chapter = {
            index: cidx,
            time: safeString(chapter.time),
            title: safeString(chapter.text),
            videoId: safeString(video.id),
            sourceFile: sourceFile(item._mmSource),
            jsonPointer: pointerForChapter(item, idx, cidx),
            dom: domElement ? {
                tag: domElement.tagName?.toLowerCase() || '',
                id: domElement.id || ''
            } : null
        };
        state.lastUpdated = Date.now();
        renderContextBar();
    }

    function setThematic(item, topicIndex, chapterIndex = null, domElement = null) {
        if (!item) return;
        const topics = Array.isArray(item.thematic_index) ? item.thematic_index : [];
        const tidx = Number(topicIndex);
        const topic = topics[tidx];
        if (!topic) return;

        setCourse(item);
        state.thematic = {
            topicIndex: tidx,
            topicTitle: safeString(topic.topic_name),
            chapterIndex: chapterIndex == null ? null : Number(chapterIndex),
            sourceFile: sourceFile(item._mmSource),
            jsonPointer: pointerForThematic(item, tidx, chapterIndex),
            chapter: null,
            dom: domElement ? {
                tag: domElement.tagName?.toLowerCase() || '',
                id: domElement.id || ''
            } : null
        };

        if (chapterIndex != null && Array.isArray(topic.chapters)) {
            const cidx = Number(chapterIndex);
            const ch = topic.chapters[cidx];
            if (ch) {
                state.thematic.chapter = {
                    time: safeString(ch.time),
                    title: safeString(ch.text),
                    videoId: safeString(ch.video_id)
                };
            }
        }

        state.lesson = null;
        state.chapter = null;
        state.lastUpdated = Date.now();
        renderContextBar();
    }

    function refreshRoute() {
        state.route = routeInfo();
        renderContextBar();
    }

    function buildRegistry() {
        let data;
        try {
            data = typeof allData !== 'undefined' && Array.isArray(allData) ? allData : [];
        } catch (_) {
            data = [];
        }

        const entities = [];
        data.forEach((item, index) => {
            const source = safeString(item._mmSource);
            const sourceIndex = item._mmIndex == null ? index : Number(item._mmIndex);
            const coursePointer = '/' + pointerSegment(sourceIndex);

            entities.push({
                type: 'course',
                id: safeString(item.id),
                title: safeString(item.title),
                sourceFile: sourceFile(source),
                jsonPointer: coursePointer
            });

            if (Array.isArray(item.videos)) {
                item.videos.forEach((video, videoIndex) => {
                    const videoPointer = coursePointer + '/videos/' + videoIndex;
                    entities.push({
                        type: 'lesson',
                        id: safeString(video.id),
                        parentId: safeString(item.id),
                        title: safeString(video.title),
                        sourceFile: sourceFile(source),
                        jsonPointer: videoPointer
                    });

                    if (Array.isArray(video.chapters)) {
                        video.chapters.forEach((chapter, chapterIndex) => {
                            entities.push({
                                type: 'chapter',
                                id: safeString(video.id) + ':chapter:' + chapterIndex,
                                parentId: safeString(video.id),
                                title: safeString(chapter.text),
                                time: safeString(chapter.time),
                                sourceFile: sourceFile(source),
                                jsonPointer: videoPointer + '/chapters/' + chapterIndex
                            });
                        });
                    }
                });
            }

            if (Array.isArray(item.thematic_index)) {
                item.thematic_index.forEach((topic, topicIndex) => {
                    const topicPointer = coursePointer + '/thematic_index/' + topicIndex;
                    entities.push({
                        type: 'thematic-topic',
                        id: safeString(item.id) + ':topic:' + topicIndex,
                        parentId: safeString(item.id),
                        title: safeString(topic.topic_name),
                        sourceFile: sourceFile(source),
                        jsonPointer: topicPointer
                    });

                    if (Array.isArray(topic.chapters)) {
                        topic.chapters.forEach((chapter, chapterIndex) => {
                            entities.push({
                                type: 'thematic-chapter',
                                id: safeString(item.id) + ':topic:' + topicIndex + ':chapter:' + chapterIndex,
                                parentId: safeString(item.id) + ':topic:' + topicIndex,
                                title: safeString(chapter.text),
                                time: safeString(chapter.time),
                                videoId: safeString(chapter.video_id),
                                sourceFile: sourceFile(source),
                                jsonPointer: topicPointer + '/chapters/' + chapterIndex
                            });
                        });
                    }
                });
            }
        });

        window.MASTERMIND_SITE_REGISTRY = {
            version: '1.0.0',
            generatedAt: new Date().toISOString(),
            route: routeInfo(),
            sources: SOURCE_FILES,
            entities
        };
        return window.MASTERMIND_SITE_REGISTRY;
    }

    function getContext() {
        state.route = routeInfo();

        // محاولة استعادة البطاقة الحالية من العنوان إن لم تُلتقط بالنقر.
        if (!state.course) {
            try {
                const title = document.getElementById('modalTitle')?.innerText?.trim();
                const data = typeof allData !== 'undefined' && Array.isArray(allData) ? allData : [];
                if (title) {
                    const item = data.find(x => safeString(x.title).trim() === title);
                    if (item) setCourse(item);
                }
            } catch (_) {}
        }

        buildRegistry();

        return {
            currentUrl: window.location.href,
            route: state.route,
            course: state.course,
            lesson: state.lesson,
            chapter: state.chapter,
            thematic: state.thematic,
            registrySummary: {
                entities: window.MASTERMIND_SITE_REGISTRY.entities.length,
                sources: Object.keys(SOURCE_FILES)
            },
            updatedAt: new Date(state.lastUpdated || Date.now()).toISOString()
        };
    }

    function resolveEntities(query = '') {
        buildRegistry();
        const q = safeString(query).toLowerCase().trim();
        if (!q || !window.MASTERMIND_SITE_REGISTRY?.entities) return [];
        const tokens = q.split(/[^a-z0-9\\u0600-\\u06ff]+/i).filter(t => t.length >= 2);
        const scored = window.MASTERMIND_SITE_REGISTRY.entities.map(entity => {
            const title = safeString(entity.title).toLowerCase();
            const id = safeString(entity.id).toLowerCase();
            let score = 0;
            if (q === title || q === id) score += 100;
            if (title.includes(q) || id.includes(q)) score += 50;
            for (const token of tokens) {
                if (title.includes(token)) score += 8;
                if (id.includes(token)) score += 5;
            }
            return { entity, score };
        }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
        return scored.slice(0, 8).map(x => x.entity);
    }

    function getPromptContext(userRequest = '') {
        const c = getContext();
        const matches = resolveEntities(userRequest);
        const matchLines = matches.length
            ? ['مطابقات من خريطة بيانات الموقع لطلب المستخدم:',
                ...matches.map(e => '- ' + e.type + ' | ' + e.title + ' | id=' + e.id + ' | JSON=' + e.sourceFile + ' | pointer=' + e.jsonPointer)]
            : ['لا توجد مطابقة مباشرة في خريطة البيانات؛ استخدم السياق الحالي والبحث داخل JSON.'];

        return [
            '[MASTERmind SITE CONTEXT]',
            'المكان الحالي: ' + safeString(c.route?.title),
            'المسار: ' + safeString(c.route?.key) + ' | hash=' + safeString(window.location.hash || '#/'),
            'الرابط: ' + c.currentUrl,
            c.course ? (
                'الكورس/البطاقة: ' + c.course.title +
                ' | id=' + c.course.id +
                ' | JSON=' + c.course.sourceFile +
                ' | pointer=' + c.course.jsonPointer
            ) : 'الكورس/البطاقة: غير محدد',
            c.lesson ? (
                'الدرس: ' + c.lesson.title +
                ' | id=' + c.lesson.id +
                ' | JSON pointer=' + c.lesson.jsonPointer
            ) : 'الدرس: غير محدد',
            c.chapter ? (
                'الفصل/الطابع: ' + c.chapter.title +
                ' | time=' + c.chapter.time +
                ' | pointer=' + c.chapter.jsonPointer
            ) : 'الفصل/الطابع: غير محدد',
            c.thematic ? (
                'الفهرس الموضوعي: ' + c.thematic.topicTitle +
                (c.thematic.chapter ? ' | chapter=' + c.thematic.chapter.title + ' | time=' + c.thematic.chapter.time : '') +
                ' | pointer=' + c.thematic.jsonPointer
            ) : 'الفهرس الموضوعي: غير محدد',
            ...matchLines,
            'قاعدة التنفيذ: استخدم السياق الحالي وهوية الكيان المطابقة للطلب، اقرأ ملف JSON المستهدف أولاً، وطابق id/pointer قبل أي كتابة. لا تعدّل ملفاً آخر بالاعتماد على اسم مشابه فقط.',
            '[/MASTERmind SITE CONTEXT]'
        ].join('\\n');
    }

    function contextSummary(c) {
        const parts = [safeString(c.route?.title)];
        if (c.course?.title) parts.push(c.course.title);
        if (c.lesson?.title) parts.push(c.lesson.title);
        if (c.chapter?.title) parts.push(c.chapter.title);
        else if (c.thematic?.chapter?.title) parts.push(c.thematic.chapter.title);
        return parts.filter(Boolean).join(' ← ');
    }

    function renderContextBar() {
        let bar = document.getElementById('mmSiteContextBar');
        const chat = document.getElementById('aiChatBox');
        if (!chat) return;

        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'mmSiteContextBar';
            bar.style.cssText = [
                'display:flex',
                'align-items:center',
                'gap:10px',
                'padding:7px 12px',
                'border-bottom:1px solid rgba(255,255,255,.07)',
                'background:rgba(20,24,28,.96)',
                'font-size:11px',
                'color:#b7c0ca',
                'direction:rtl',
                'overflow:hidden',
                'white-space:nowrap'
            ].join(';');

            const dot = document.createElement('span');
            dot.id = 'mmSiteContextDot';
            dot.style.cssText = 'width:7px;height:7px;border-radius:50%;background:#4db6ac;box-shadow:0 0 8px rgba(77,182,172,.7);flex:0 0 auto;';
            bar.appendChild(dot);

            const label = document.createElement('span');
            label.id = 'mmSiteContextText';
            label.style.cssText = 'overflow:hidden;text-overflow:ellipsis;';
            bar.appendChild(label);

            const button = document.createElement('button');
            button.type = 'button';
            button.id = 'mmSiteContextCopy';
            button.textContent = 'نسخ السياق';
            button.style.cssText = 'margin-right:auto;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:#9fd7ff;border-radius:6px;padding:3px 7px;font-size:10px;cursor:pointer;';
            button.onclick = async function () {
                try {
                    await navigator.clipboard.writeText(getPromptContext());
                    button.textContent = 'تم النسخ ✓';
                    setTimeout(() => button.textContent = 'نسخ السياق', 1200);
                } catch (_) {
                    button.textContent = 'تعذر النسخ';
                    setTimeout(() => button.textContent = 'نسخ السياق', 1200);
                }
            };
            bar.appendChild(button);

            const header = chat.querySelector('.ai-header');
            if (header) header.insertAdjacentElement('afterend', bar);
            else chat.prepend(bar);
        }

        const c = getContext();
        const text = document.getElementById('mmSiteContextText');
        if (text) text.textContent = '📍 ' + contextSummary(c);

        const dot = document.getElementById('mmSiteContextDot');
        if (dot) {
            const mapped = Boolean(c.course?.sourceFile || c.thematic?.sourceFile || c.lesson?.sourceFile);
            dot.style.background = mapped ? '#4db6ac' : '#f5b942';
            dot.style.boxShadow = mapped ? '0 0 8px rgba(77,182,172,.7)' : '0 0 8px rgba(245,185,66,.7)';
        }
    }

    function findCourseFromElement(el) {
        const id = el?.dataset?.mmId;
        if (!id) return null;
        try {
            const data = typeof allData !== 'undefined' && Array.isArray(allData) ? allData : [];
            return data.find(x => safeString(x.id) === safeString(id)) || null;
        } catch (_) {
            return null;
        }
    }

    function onDocumentClick(event) {
        const target = event.target?.closest?.('[data-mm-entity]');
        if (!target) return;

        const entity = target.dataset.mmEntity;

        if (entity === 'course') {
            const item = findCourseFromElement(target);
            if (item) setCourse(item, target);
            return;
        }

        if (entity === 'lesson' || entity === 'chapter' || entity === 'thematic-chapter' || entity === 'thematic-topic') {
            const courseId = target.dataset.mmCourseId;
            let item = null;
            try {
                const data = typeof allData !== 'undefined' && Array.isArray(allData) ? allData : [];
                item = data.find(x => safeString(x.id) === safeString(courseId)) || null;
            } catch (_) {}

            if (!item) return;

            if (entity === 'lesson') {
                setLesson(item, Number(target.dataset.mmVideoIndex), 0, target);
            } else if (entity === 'chapter') {
                setChapter(item, Number(target.dataset.mmVideoIndex), Number(target.dataset.mmChapterIndex), Number(target.dataset.mmSeek || 0), target);
            } else if (entity === 'thematic-topic') {
                setThematic(item, Number(target.dataset.mmTopicIndex), null, target);
            } else if (entity === 'thematic-chapter') {
                setThematic(item, Number(target.dataset.mmTopicIndex), Number(target.dataset.mmChapterIndex), target.dataset.mmSeek || 0, target);
            }
        }
    }

    function scheduleRefresh() {
        setTimeout(() => {
            refreshRoute();
            try { buildRegistry(); } catch (_) {}
        }, 0);
    }

    function init() {
        document.addEventListener('click', onDocumentClick, true);
        window.addEventListener('hashchange', scheduleRefresh);
        window.addEventListener('popstate', scheduleRefresh);
        window.addEventListener('load', scheduleRefresh);

        const observer = new MutationObserver(() => {
            const modal = document.getElementById('myModal');
            const title = document.getElementById('modalTitle')?.innerText?.trim();
            if (modal && title && modal.style.display === 'block') {
                try {
                    const data = typeof allData !== 'undefined' && Array.isArray(allData) ? allData : [];
                    const item = data.find(x => safeString(x.title).trim() === title);
                    if (item && (!state.course || state.course.id !== safeString(item.id))) {
                        setCourse(item);
                    }
                } catch (_) {}
            }
            renderContextBar();
        });

        observer.observe(document.body, { childList: true, subtree: true, characterData: true });

        setTimeout(() => {
            refreshRoute();
            renderContextBar();
        }, 50);
    }

    window.MastermindSiteContext = {
        version: '1.0.0',
        getContext,
        getPromptContext,
        resolveEntities,
        buildRegistry,
        setCourse,
        setLesson,
        setChapter,
        setThematic,
        refreshRoute
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})();
