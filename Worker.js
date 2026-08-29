// ============================================================
//  🚀 VSA Universal Bridge V4.6 - QUOTA AWARE & STABLE
//  التحديث: معالجة خطأ 429 + توجيه النماذج للأسماء الرسمية المستقرة
// ============================================================

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname;

        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, User-Agent',
            'Access-Control-Expose-Headers': '*',
        };

        if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

        if (path.startsWith('/gemini')) {
            const apiKey = env.GEMINI_API_KEY;
            if (!apiKey) return errorResponse('GEMINI_API_KEY not set', 500, corsHeaders);

            try {
                const body = await request.json();
                let requestedModel = (body.model || '').toLowerCase();

                // 🧠 خريطة النماذج الرسمية (Official Google Model IDs)
                // جوجل لا تقبل حالياً سوى هذه المسميات في الـ API الرسمي
                let finalModel = 'gemini-1.5-flash'; // الافتراضي السريع

                if (requestedModel.includes('pro')) {
                    finalModel = 'gemini-1.5-pro'; // للذكاء العالي (حصة محدودة جداً 2 RPM)
                } else if (requestedModel.includes('2.0') || requestedModel.includes('3.6') || requestedModel.includes('3.7')) {
                    finalModel = 'gemini-2.0-flash-exp'; // للجيل القادم
                } else if (requestedModel.includes('flash-lite') || requestedModel.includes('3.1') || requestedModel.includes('3.5')) {
                    finalModel = 'gemini-1.5-flash'; // الأسرع والأكثر استقراراً
                }

                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${finalModel}:generateContent?key=${apiKey}`;

                const geminiResponse = await fetch(geminiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                // معالجة ذكية للأخطاء الشائعة (429 و 404)
                if (geminiResponse.status === 429) {
                    return errorResponse("⚠️ استنفدت حصة الطلبات لهذا النموذج (الحد الأقصى لـ Pro هو 2/دقيقة). يرجى الانتظار 60 ثانية أو استخدام نسخة Flash.", 429, corsHeaders);
                }

                if (!geminiResponse.ok) {
                    const errorData = await geminiResponse.json();
                    const msg = errorData.error?.message || "Google API Error";
                    return errorResponse(`Google API (${geminiResponse.status}): ${msg}`, geminiResponse.status, corsHeaders);
                }

                return createCORSResponse(geminiResponse, corsHeaders);
            } catch (e) {
                return errorResponse(`Bridge Logic Failure: ${e.message}`, 400, corsHeaders);
            }
        }

        // --- مسار البحث الصاروخي ---
        if (path === '/search') {
            const query = url.searchParams.get('q');
            if (!query) return errorResponse('Missing query', 400, corsHeaders);
            let results = "🔍 **نتائج البحث السريع:**\n\n";
            try {
                const gRes = await fetch(`https://www.googleapis.com/customsearch/v1?key=${env.GOOGLE_SEARCH_KEY}&cx=${env.GOOGLE_SEARCH_CX}&q=${encodeURIComponent(query)}&num=5`);
                const gData = await gRes.json();
                if (gData.items) {
                    gData.items.forEach((item, i) => {
                        results += `${i+1}. ${item.link.includes('youtube.com') ? "🎥 " : "🌐 "}${item.title}\n   🔗 ${item.link}\n\n`;
                    });
                }
            } catch (e) {}
            return new Response(JSON.stringify({ success: true, results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        return new Response('🚀 VSA Bridge V4.6 Active.', { status: 200, headers: corsHeaders });
    }
};

function createCORSResponse(originalResponse, corsHeaders) {
    const response = new Response(originalResponse.body, originalResponse);
    Object.entries(corsHeaders).forEach(([key, value]) => { response.headers.set(key, value); });
    return response;
}

function errorResponse(message, status, corsHeaders) {
    return new Response(JSON.stringify({ error: message }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
