/**
 * VSA Academy Sovereign Bridge - TRANSPARENT RESILIENCE ENGINE
 * ---------------------------------------------------------------
 * هذا الإصدار يضمن الشفافية المطلقة في ذكر اسم الموديل الذي رد فعلياً.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

// 🎯 قائمة النماذج السيادية لعام 2026
const MODEL_ROUTES = [
    { key: "gemini-3.7-flash", id: "gemini-3.7-flash" },
    { key: "gemini-3.6-flash", id: "gemini-3.6-flash" },
    { key: "gemini-3.5-flash-lite", id: "gemini-3.5-flash-lite" },
    { key: "gemini-3.5-flash", id: "gemini-3.5-flash" },
    { key: "gemini-3.1-flash-lite", id: "gemini-3.1-flash-lite" },
    { key: "gemini-3-flash-preview", id: "gemini-3-flash-preview" },
    //{ key: "gemini-2.5-pro", id: "gemini-2.5-pro" },
    //{ key: "gemini-2.5-flash-lite", id: "gemini-2.5-flash-lite" },
    //{ key: "gemini-2.5-flash", id: "gemini-2.5-flash" },
    //{ key: "gemini-omni-1.1-flash", id: "gemini-omni-1.1-flash" },
    //{ key: "gemini-3.1-flash-lite-image", id: "gemini-3.1-flash-lite-image" },
    //{ key: "gemini-3-pro-image", id: "gemini-3-pro-image" },
    //{ key: "gemini-3.1-flash-image", id: "gemini-3.1-flash-image" }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { action, payload, model: requestedModel, endpoint, method, body } = await req.json()

    if (action === 'health_check') {
        return new Response(JSON.stringify({ status: "ok", message: "VSA Bridge 2026 Online" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'chat') {
      const apiKey = Deno.env.get("GEMINI_API_KEY")

      let rawId = String(requestedModel || "").trim().toLowerCase();

      // العثور على الفهرس المختار لبدء اللوب منه ومن ثم النزول لأسفل
      let startIndex = MODEL_ROUTES.findIndex(r => rawId.includes(r.key));
      if (startIndex === -1) startIndex = 0;

      const allModelIds = [];
      // إضافة النموذج المختار وما يليه في القائمة (حسب طلب المستخدم: يبدأ من تحت النموذج المحدد)
      for (let i = startIndex; i < MODEL_ROUTES.length; i++) {
          allModelIds.push(MODEL_ROUTES[i].id);
      }
      // إذا أردت تدوير اللوب ليعود للبداية في حال فشل الجميع (اختياري)
      for (let i = 0; i < startIndex; i++) {
          allModelIds.push(MODEL_ROUTES[i].id);
      }

      const userPreference = MODEL_ROUTES[startIndex].id;
      let lastError = null;

      for (const modelId of allModelIds) {
          try {
              const fetchWithVersion = async (version) => {
                  const url = `https://generativelanguage.googleapis.com/${version}/models/${modelId}:generateContent?key=${apiKey}`;
                  return await fetch(url, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                          system_instruction: payload.system_instruction,
                          contents: payload.contents,
                          tools: payload.tools,
                          generation_config: payload.generationConfig || { maxOutputTokens: 4096 }
                      })
                  });
              };

              let response = await fetchWithVersion('v1beta');
              if (response.status === 404) response = await fetchWithVersion('v1');

              const data = await response.json();

              if (!response.ok) {
                  lastError = data.error?.message || "Model Unavailable";
                  continue;
              }

              // ✅ الشفافية: نرسل اسم الموديل الذي نجح فعلياً في المتغير used_model
              return new Response(JSON.stringify({
                  ...data,
                  used_model: modelId,
                  fallback_active: userPreference !== modelId
              }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

          } catch (err) {
              lastError = err.message;
              continue;
          }
      }
      throw new Error(`كافة النماذج المتاحة استهلكت حصتها. آخر خطأ: ${lastError}`);
    }

    if (action === 'github') {
      const githubToken = Deno.env.get("GITHUB_TOKEN")
      const res = await fetch(endpoint, {
        method: method || 'GET',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined
      })
      const data = await res.json()
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: corsHeaders
    })
  }
})