// ============================================================
//  🚀 VSA Universal Bridge V4.8 - AGENTIC ERA READY (2026)
//  التحديث: اعتماد المسميات الرسمية (2.5 & 3.5) + دعم Thinking Levels
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
                let requestedModel = (body.model || '').toLowerCase().trim();

                // 🧠 التوجيه الرسمي المعتمد (Google AI Studio 2026)
                let finalModel = 'gemini-3.5-flash-lite'; // الافتراضي الأكثر استقراراً

                if (requestedModel.includes('3.5-flash-lite')) finalModel = 'gemini-3.5-flash-lite';
                else if (requestedModel.includes('3.5-flash')) finalModel = 'gemini-3.5-flash';
                else if (requestedModel.includes('3.1-flash-lite')) finalModel = 'gemini-3.1-flash-lite';
                else if (requestedModel.includes('2.5-pro')) finalModel = 'gemini-2.5-pro';
                else if (requestedModel.includes('2.5-flash-lite')) finalModel = 'gemini-2.5-flash-lite';
                else if (requestedModel.includes('2.5-flash')) finalModel = 'gemini-2.5-flash';
                else if (requestedModel.includes('3.7')) finalModel = 'gemini-3.7-flash';
                else if (requestedModel.includes('3.6')) finalModel = 'gemini-3.6-flash';

                // ⚡ تفعيل مستويات التفكير (Thinking Config) لنماذج الجيل الثالث
                if (finalModel.includes('3.5') || finalModel.includes('3.1') || finalModel.includes('3.7')) {
                    if (!body.config) body.config = {};
                    if (!body.config.thinkingConfig) {
                        body.config.thinkingConfig = { thinkingLevel: "MEDIUM" };
                    }
                    // حذف معاملات الـ Sampling القديمة لضمان جودة التفكير كما نصح الخبير
                    delete body.generationConfig?.temperature;
                    delete body.generationConfig?.topP;
                    delete body.generationConfig?.topK;
                }

                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${finalModel}:generateContent?key=${apiKey}`;

                const response = await fetch(geminiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                if (response.status === 429) {
                    return errorResponse("⚠️ استنفدت حصة هذا النموذج. يرجى اختيار '3.5 Flash-Lite' لسرعة أكبر وحصة أعلى.", 429, corsHeaders);
                }

                if (!response.ok) {
                    const errorData = await response.json();
                    return errorResponse(`Google API Error: ${errorData.error?.message || 'Unknown'}`, response.status, corsHeaders);
                }

                return createCORSResponse(response, corsHeaders);
            } catch (e) {
                return errorResponse(`Bridge Logical Failure: ${e.message}`, 400, corsHeaders);
            }
        }

        // مسار البحث كما هو (مستقر)
        if (path === '/search') {
            const query = url.searchParams.get('q');
            if (!query) return errorResponse('Missing query', 400, corsHeaders);
            let results = "🔍 **نتائج البحث الهجين:**\n\n";
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

        return new Response('🚀 VSA Bridge V4.8 - Agentic Era Active.', { status: 200, headers: corsHeaders });
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
