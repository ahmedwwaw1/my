/**
 * 🛡️ UNIVERSAL SOVEREIGN BRIDGE (V2.0)
 * Handles both Supabase Data and Gemini AI Traffic.
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    // 1. طلبات Gemini AI
    if (path.includes("/models/")) {
      // إعادة بناء الرابط ليوجه إلى جوجل مع إضافة المفتاح من بيئة Cloudflare
      const targetUrl = `https://generativelanguage.googleapis.com${path}${url.search ? url.search + '&' : '?'}key=${env.GEMINI_API_KEY}`;

      const modifiedRequest = new Request(targetUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body
      });

      const response = await fetch(modifiedRequest);
      const newResponse = new Response(response.body, response);
      Object.keys(corsHeaders).forEach(k => newResponse.headers.set(k, corsHeaders[k]));
      return newResponse;
    }

    // 2. طلبات Supabase (قاعدة البيانات)
    if (path.startsWith("/rest/v1/")) {
      const targetUrl = `${env.SUPABASE_URL}${path}${url.search}`;
      const newHeaders = new Headers(request.headers);
      newHeaders.set("apikey", env.SUPABASE_KEY);
      newHeaders.set("Authorization", `Bearer ${env.SUPABASE_KEY}`);

      const modifiedRequest = new Request(targetUrl, {
        method: request.method,
        headers: newHeaders,
        body: request.body
      });

      const response = await fetch(modifiedRequest);
      const newResponse = new Response(response.body, response);
      Object.keys(corsHeaders).forEach(k => newResponse.headers.set(k, corsHeaders[k]));
      return newResponse;
    }

    return new Response("🛡️ VSA Universal Bridge Active.", { status: 200, headers: corsHeaders });
  }
};
