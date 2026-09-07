// ============================================================
//  🚀 VSA Universal Bridge V5.1 - OFFICIAL SDK (Edge Compatible)
//  التحديث: إصلاح مشكلة الاستيراد في Cloudflare
// ============================================================

// استيراد النسخة المتوافقة مع Edge من مكتبة جوجل الرسمية
import { GoogleGenAI } from "@google/generative-ai";

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

        // 1. مسار Gemini API عبر المكتبة الرسمية
        if (path.startsWith('/gemini')) {
            const apiKey = env.GEMINI_API_KEY;
            if (!apiKey) return errorResponse('GEMINI_API_KEY not set', 500, corsHeaders);

            try {
                const body = await request.json();
                const requestedModel = (body.model || 'gemini-1.5-flash').toLowerCase().trim();

                // تهيئة المكتبة الرسمية
                const genAI = new GoogleGenAI(apiKey);
                const model = genAI.getGenerativeModel({ model: requestedModel });

                // إرسال الطلب (المكتبة تتكفل بالباقي)
                const result = await model.generateContent(body.contents);
                const response = await result.response;
                const text = response.text();

                return new Response(JSON.stringify({
                    candidates: [{ content: { role: "model", parts: [{ text: text }] } }]
                }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

            } catch (e) {
                return errorResponse(`Official SDK Error: ${e.message}`, 400, corsHeaders);
            }
        }

        // مسار البحث كما هو
        if (path === '/search') {
            const query = url.searchParams.get('q');
            if (!query) return errorResponse('Missing query', 400, corsHeaders);
            let combinedResults = "";
            try {
                const gRes = await fetch(`https://www.googleapis.com/customsearch/v1?key=${env.GOOGLE_SEARCH_KEY}&cx=${env.GOOGLE_SEARCH_CX}&q=${encodeURIComponent(query)}&num=5`);
                const gData = await gRes.json();
                if (gData.items) {
                    combinedResults += "🔍 **نتائج البحث:**\n\n";
                    gData.items.forEach((item, i) => { combinedResults += `${i+1}. ${item.title}\n   🔗 ${item.link}\n\n`; });
                }
            } catch (e) {}
            return new Response(JSON.stringify({ success: true, results: combinedResults }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        return new Response('🚀 VSA Bridge V5.1 Active.', { status: 200, headers: corsHeaders });
    }
};

function errorResponse(message, status, corsHeaders) {
    return new Response(JSON.stringify({ error: message }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
