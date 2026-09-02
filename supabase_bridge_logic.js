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

// 🎯 قائمة النماذج السيادية
const MODEL_ROUTES = [
    { key: "3.7", id: "gemini-3.7-flash" },
    { key: "3.6", id: "gemini-3.6-flash" },
    { key: "3.5-lite", id: "gemini-3.5-flash-lite" },
    { key: "3.5", id: "gemini-3.5-flash" },
    { key: "3.1", id: "gemini-3.1-flash-lite" },
    { key: "3-preview", id: "gemini-3-flash-preview" },
    { key: "2.5-pro", id: "gemini-2.5-pro" },
    { key: "2.5-lite", id: "gemini-2.5-flash-lite" },
    { key: "2.5", id: "gemini-2.5-flash" },
    { key: "omni", id: "gemini-omni-1.1-flash" },
    { key: "image-lite", id: "gemini-3.1-flash-lite-image" },
    { key: "image-pro", id: "gemini-3-pro-image" },
    { key: "image", id: "gemini-3.1-flash-image" }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { action, payload, model: requestedModel, endpoint, method, body } = await req.json()

    if (action === 'chat') {
      const apiKey = Deno.env.get("GEMINI_API_KEY")

      let rawId = String(requestedModel || "").trim().toLowerCase();
      const userPreference = MODEL_ROUTES.find(r => rawId.includes(r.key))?.id;

      // بناء قائمة الفحص: المفضل أولاً، ثم البقية بالترتيب الموجود في المصفوفة
      const allModelIds = userPreference
          ? [userPreference, ...MODEL_ROUTES.map(r => r.id).filter(id => id !== userPreference)]
          : MODEL_ROUTES.map(r => r.id);

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