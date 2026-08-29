// ============================================================
//  🚀 VSA Universal Bridge V4.4 - DETERMINISTIC ACCURACY
//  التحديث: التوجيه الدقيق المسبق للنماذج + سرعة قصوى بدون إعادة محاولة
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
                const requestedModel = (body.model || '').toLowerCase().trim();

                // 🧠 جدول التوجيه الدقيق (Deterministic Mapping)
                // يضمن اختيار الإصدار والنموذج الصحيح من أول محاولة وبأقصى سرعة
                let targetModel = 'gemini-1.5-flash'; // الافتراضي
                let apiVersion = 'v1beta'; // الافتراضي للنماذج الحديثة

                if (requestedModel.includes('3.7')) {
                    targetModel = 'gemini-1.5-flash'; // توجيه 3.7 للنسخة المستقرة المتوفرة
                    apiVersion = 'v1beta';
                } else if (requestedModel.includes('3.6')){
                    targetModel = 'gemini-3.6-flash';
                    apiVersion = 'v1';
                } else if (requestedModel.includes('3.5')) {
                    targetModel = 'gemini-3.5-flash-lite';
                    apiVersion = 'v1';
                } else if (requestedModel.includes('1.0')) {
                    targetModel = 'gemini-1.0-pro';
                    apiVersion = 'v1'; // النماذج القديمة تعمل على v1
                }

                const geminiUrl = `https://generativelanguage.googleapis.com/${apiVersion}/models/${targetModel}:generateContent?key=${apiKey}`;

                const response = await fetch(geminiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    return errorResponse(`Google API Error (${response.status}): ${errorText}`, response.status, corsHeaders);
                }

                return createCORSResponse(response, corsHeaders);
            } catch (e) {
                return errorResponse(`Bridge Logical Failure: ${e.message}`, 400, corsHeaders);
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

        return new Response('🚀 VSA Bridge V4.4 - High Speed Active.', { status: 200, headers: corsHeaders });
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
