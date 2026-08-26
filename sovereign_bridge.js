/**
 * 🛡️ UNIVERSAL SOVEREIGN BRIDGE (V3.0 - Stable Edition)
 * Handles Supabase, Gemini AI, and GitHub API Traffic.
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
      const targetUrl = `https://generativelanguage.googleapis.com${path}${url.search ? url.search + '&' : '?'}key=${env.GEMINI_API_KEY}`;
      return await forwardRequest(targetUrl, request, null, corsHeaders);
    }

    // 2. طلبات GitHub API
    if (path.startsWith("/repos/")) {
      const targetUrl = `https://api.github.com${path}${url.search}`;
      const authHeader = `Bearer ${env.GITHUB_TOKEN}`;
      return await forwardRequest(targetUrl, request, authHeader, corsHeaders);
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

    return new Response("🛡️ VSA Universal Bridge V3 Active.", { status: 200, headers: corsHeaders });
  }
};

async function forwardRequest(url, originalRequest, customAuth, corsHeaders) {
  const newHeaders = new Headers(originalRequest.headers);

  if (typeof customAuth === 'string') {
    newHeaders.set("Authorization", customAuth);
  } else if (customAuth && typeof customAuth === 'object') {
    Object.keys(customAuth).forEach(k => newHeaders.set(k, customAuth[k]));
  }

  const modifiedRequest = new Request(url, {
    method: originalRequest.method,
    headers: newHeaders,
    body: originalRequest.body,
    redirect: "follow"
  });

  const response = await fetch(modifiedRequest);
  const newResponse = new Response(response.body, response);
  Object.keys(corsHeaders).forEach(k => newResponse.headers.set(k, corsHeaders[k]));
  return newResponse;
}
