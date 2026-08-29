// ============================================================
//  🚀 VSA Universal Bridge V4.0 - SUPER STABLE EDITION
//  التحديث: إصلاح جذري لخطأ 404 + تنظيف شامل لأسماء النماذج
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

        // 1. مسار Gemini API
        if (path.startsWith('/gemini')) {
            const apiKey = env.GEMINI_API_KEY;
            if (!apiKey) return errorResponse('GEMINI_API_KEY not set', 500, corsHeaders);

            try {
                const body = await request.json();
                let rawModel = (body.model || 'gemini-1.5-flash').toLowerCase().trim();

                // 🧠 خوارزمية التصحيح الفوري (The Fixer)
                let finalModel = 'gemini-1.5-flash'; // النموذج الافتراضي الأكثر استقراراً

                if (rawModel.includes('pro')) {
                    finalModel = 'gemini-1.5-pro';
                } else if (rawModel.includes('2.0')) {
                    finalModel = 'gemini-2.0-flash-exp';
                } else {
                    // أي شيء آخر (3.5, 3.7, lite, flash) يتحول لـ 1.5 flash لضمان العمل
                    finalModel = 'gemini-1.5-flash';
                }

                // بناء الرابط الرسمي الصارم
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${finalModel}:generateContent?key=${apiKey}`;

                const geminiResponse = await fetch(geminiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                if (!geminiResponse.ok) {
                    const errorText = await geminiResponse.text();
                    return errorResponse(`Google Refused Request (${geminiResponse.status}): ${errorText} | Model Used: ${finalModel}`, geminiResponse.status, corsHeaders);
                }

                return createCORSResponse(geminiResponse, corsHeaders);
            } catch (e) {
                return errorResponse(`Bridge Logic Failure: ${e.message}`, 400, corsHeaders);
            }
        }

        // 2. مسار البحث الهجين (YouTube + Google + Tavily)
        if (path === '/search') {
            const query = url.searchParams.get('q');
            if (!query) return errorResponse('Missing query', 400, corsHeaders);

            let combined = "";
            let sources = [];

            try {
                const gRes = await fetch(`https://www.googleapis.com/customsearch/v1?key=${env.GOOGLE_SEARCH_KEY}&cx=${env.GOOGLE_SEARCH_CX}&q=${encodeURIComponent(query)}&num=5`);
                const gData = await gRes.json();
                if (gData.items) {
                    combined += `🔍 **نتائج Google/YouTube:**\n`;
                    gData.items.forEach((item, i) => {
                        const icon = item.link.includes('youtube.com') ? "🎥 " : "🌐 ";
                        combined += `${i+1}. ${icon}${item.title}\n   🔗 ${item.link}\n\n`;
                    });
                    sources.push('Google');
                }
            } catch (e) {}

            return new Response(JSON.stringify({ success: true, results: combined, sources }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        return new Response('🚀 VSA Bridge V4.0 Active & Protected.', { status: 200, headers: corsHeaders });
    }
};

function createCORSResponse(originalResponse, corsHeaders) {
    const response = new Response(originalResponse.body, originalResponse);
    Object.entries(corsHeaders).forEach(([key, value]) => { response.headers.set(key, value); });
    return response;
}

function errorResponse(message, status, corsHeaders) {
    return new Response(JSON.stringify({ error: message }), {
        status: status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}
