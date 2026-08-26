/**
 * 🛡️ SOVEREIGN BRIDGE (Cloudflare Worker Template)
 * وظيفته: إخفاء مفاتيح Supabase و GitHub عن المتصفح.
 * ---------------------------------------------------
 * كيفية الاستخدام:
 * 1. قم بإنشاء Worker جديد في Cloudflare.
 * 2. انسخ هذا الكود وضعه هناك.
 * 3. قم بضبط Variables في Cloudflare (SUPABASE_KEY, SUPABASE_URL).
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. السماح بطلبات CORS
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // 2. توجيه الطلبات إلى Supabase مع إضافة المفاتيح سراً
    if (path.startsWith("/rest/v1/")) {
      const targetUrl = `${env.SUPABASE_URL}${path}${url.search}`;

      const newHeaders = new Headers(request.headers);
      newHeaders.set("apikey", env.SUPABASE_KEY);
      newHeaders.set("Authorization", `Bearer ${env.SUPABASE_KEY}`);

      const modifiedRequest = new Request(targetUrl, {
        method: request.method,
        headers: newHeaders,
        body: request.body,
        redirect: "follow",
      });

      const response = await fetch(modifiedRequest);
      const newResponse = new Response(response.body, response);
      Object.keys(corsHeaders).forEach(k => newResponse.headers.set(k, corsHeaders[k]));
      return newResponse;
    }

    return new Response("🛡️ VSA Sovereign Bridge Active.", { status: 200, headers: corsHeaders });
  }
};
