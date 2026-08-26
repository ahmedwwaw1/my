/**
 * 🛡️ UNIVERSAL SOVEREIGN BRIDGE (V4.5 - Steel Edition)
 * Handles Supabase, Gemini AI, GitHub, and Omni-Fetch with maximal robustness.
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
      // 1. طلبات Gemini AI
      if (path.includes("/models/")) {
        const targetUrl = `https://generativelanguage.googleapis.com${path}${url.search ? url.search + '&' : '?'}key=${env.GEMINI_API_KEY}`;
        return await forwardRequest(targetUrl, request, null, corsHeaders);
      }

      // 2. طلبات GitHub
      if (path.startsWith("/repos/")) {
        const targetUrl = `https://api.github.com${path}${url.search}`;
        return await forwardRequest(targetUrl, request, `Bearer ${env.GITHUB_TOKEN}`, corsHeaders);
      }

      // 3. طلبات Supabase
      if (path.startsWith("/rest/v1/")) {
        const targetUrl = `${env.SUPABASE_URL}${path}${url.search}`;
        const authHeaders = {
          "apikey": env.SUPABASE_KEY,
          "Authorization": `Bearer ${env.SUPABASE_KEY}`
        };
        return await forwardRequest(targetUrl, request, authHeaders, corsHeaders);
      }

      // 4. جلب الروابط الخارجية
      if (path === "/fetch_url") {
        const targetUrl = url.searchParams.get("url");
        const res = await fetch(targetUrl);
        return new Response(await res.text(), { headers: corsHeaders });
      }

      return new Response("🛡️ VSA Universal Bridge V4.5 Active.", { headers: corsHeaders });
    } catch (e) {
      return new Response(`❌ Bridge Error: ${e.message}`, { status: 500, headers: corsHeaders });
    }
  }
};

async function forwardRequest(url, originalRequest, customAuth, corsHeaders) {
  const newHeaders = new Headers(originalRequest.headers);
  if (typeof customAuth === 'string') newHeaders.set("Authorization", customAuth);
  else if (customAuth) Object.keys(customAuth).forEach(k => newHeaders.set(k, customAuth[k]));

  const requestOptions = {
    method: originalRequest.method,
    headers: newHeaders,
    redirect: "follow"
  };

  if (!["GET", "HEAD"].includes(originalRequest.method)) {
    requestOptions.body = await originalRequest.arrayBuffer();
  }

  const response = await fetch(url, requestOptions);
  const newResponse = new Response(response.body, response);
  Object.keys(corsHeaders).forEach(k => newResponse.headers.set(k, corsHeaders[k]));
  return newResponse;
}
