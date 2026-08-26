/**
 * 🛡️ UNIVERSAL SOVEREIGN BRIDGE (V4.0)
 * Handles Supabase, Gemini AI, GitHub, and Omni-URL Fetching.
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

    // 1. طلبات جلب الروابط الخارجية (Omni-Fetch)
    if (path === "/fetch_url") {
      const targetUrl = url.searchParams.get("url");
      if (!targetUrl) return new Response("Missing URL", { status: 400 });

      try {
        const response = await fetch(targetUrl);
        const text = await response.text();
        return new Response(text, { status: 200, headers: corsHeaders });
      } catch (e) {
        return new Response(`Error fetching URL: ${e.message}`, { status: 500, headers: corsHeaders });
      }
    }

    // 2. طلبات Gemini AI
    if (path.includes("/models/")) {
      const targetUrl = `https://generativelanguage.googleapis.com${path}${url.search ? url.search + '&' : '?'}key=${env.GEMINI_API_KEY}`;
      return await forwardRequest(targetUrl, request, null, corsHeaders);
    }

    // 3. طلبات GitHub API
    if (path.startsWith("/repos/")) {
      const targetUrl = `https://api.github.com${path}${url.search}`;
      const authHeader = `Bearer ${env.GITHUB_TOKEN}`;
      return await forwardRequest(targetUrl, request, authHeader, corsHeaders);
    }

    // 4. طلبات Supabase
    if (path.startsWith("/rest/v1/")) {
      const targetUrl = `${env.SUPABASE_URL}${path}${url.search}`;
      const authHeaders = {
        "apikey": env.SUPABASE_KEY,
        "Authorization": `Bearer ${env.SUPABASE_KEY}`
      };
      return await forwardRequest(targetUrl, request, authHeaders, corsHeaders);
    }

    return new Response("🛡️ VSA Universal Bridge V4 Active.", { status: 200, headers: corsHeaders });
  }
};

async function forwardRequest(url, originalRequest, customAuth, corsHeaders) {
  const newHeaders = new Headers(originalRequest.headers);
  if (typeof customAuth === 'string') newHeaders.set("Authorization", customAuth);
  else if (customAuth && typeof customAuth === 'object') Object.keys(customAuth).forEach(k => newHeaders.set(k, customAuth[k]));

  const modifiedRequest = new Request(url, {
    method: originalRequest.method,
    headers: newHeaders,
    body: originalRequest.body
  });

  const response = await fetch(modifiedRequest);
  const newResponse = new Response(response.body, response);
  Object.keys(corsHeaders).forEach(k => newResponse.headers.set(k, corsHeaders[k]));
  return newResponse;
}
