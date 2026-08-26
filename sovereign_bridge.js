/**
 * 🛡️ UNIVERSAL SOVEREIGN BRIDGE (V4.6 - Ultimate Resilience)
 * Handles Gemini, GitHub, and Supabase with optimized stream handling.
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+/g, '/');

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    try {
      let targetUrl = "";
      let newHeaders = new Headers(request.headers);

      if (path.includes("/models/")) {
        targetUrl = `https://generativelanguage.googleapis.com${path}${url.search ? url.search + '&' : '?'}key=${env.GEMINI_API_KEY}`;
      } else if (path.startsWith("/repos/")) {
        targetUrl = `https://api.github.com${path}${url.search}`;
        newHeaders.set("Authorization", `Bearer ${env.GITHUB_TOKEN}`);
      } else if (path.startsWith("/rest/v1/")) {
        targetUrl = `${env.SUPABASE_URL}${path}${url.search}`;
        newHeaders.set("apikey", env.SUPABASE_KEY);
        newHeaders.set("Authorization", `Bearer ${env.SUPABASE_KEY}`);
      } else if (path === "/fetch_url") {
        const extUrl = url.searchParams.get("url");
        const res = await fetch(extUrl);
        return new Response(await res.text(), { headers: corsHeaders });
      }

      if (!targetUrl) return new Response("Not Found", { status: 404 });

      // معالجة البيانات للجسر لضمان الاستقرار
      const body = (["GET", "HEAD"].includes(request.method)) ? null : await request.clone().arrayBuffer();

      const response = await fetch(targetUrl, {
        method: request.method,
        headers: newHeaders,
        body: body,
        redirect: "follow"
      });

      const resBody = await response.arrayBuffer();
      const finalResponse = new Response(resBody, {
        status: response.status,
        headers: { ...Object.fromEntries(response.headers), ...corsHeaders }
      });

      return finalResponse;

    } catch (e) {
      return new Response(`❌ Bridge Error: ${e.message}`, { status: 500, headers: corsHeaders });
    }
  }
};
