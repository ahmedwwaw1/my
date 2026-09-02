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

// 🎯 قائمة النماذج السيادية - خريطة التحويل لعام 2026
// نقوم بربط الأسماء المستقبلية بنماذج حقيقية موجودة حالياً لضمان العمل
const MODEL_ROUTES = [
    { key: "3.7", id: "gemini-2.0-flash-exp" },
    { key: "3.6", id: "gemini-2.0-flash-exp" },
    { key: "3.5-lite", id: "gemini-1.5-flash" },
    { key: "3.5", id: "gemini-1.5-flash" },
    { key: "3.1", id: "gemini-1.5-flash" },
    { key: "3-preview", id: "gemini-1.5-pro" },
    { key: "2.5-pro", id: "gemini-1.5-pro" },
    { key: "2.5-lite", id: "gemini-1.5-flash" },
    { key: "2.5", id: "gemini-1.5-flash" },
    { key: "omni", id: "gemini-1.5-flash" },
    { key: "image-lite", id: "gemini-1.5-flash" },
    { key: "image-pro", id: "gemini-1.5-pro" },
    { key: "image", id: "gemini-1.5-flash" }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const requestData = await req.json();
    const { action, payload, model: requestedModel, endpoint, method, body } = requestData;

    if (action === 'chat') {
      const apiKey = Deno.env.get("GEMINI_API_KEY")
      if (!apiKey) throw new Error("GEMINI_API_KEY is missing in Supabase Secrets");

      let rawId = String(requestedModel || "").trim().toLowerCase();

      // البحث عن النموذج المناسب أو استخدام الافتراضي
      const route = MODEL_ROUTES.find(r => rawId.includes(r.key)) || MODEL_ROUTES[3]; // الافتراضي 3.5
      const modelId = route.id;

      try {
          const fetchWithVersion = async (version) => {
              const url = `https://generativelanguage.googleapis.com/${version}/models/${modelId}:generateContent?key=${apiKey}`;

              // إضافة تايم أوت لكل طلب داخلي لمنع التعليق
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 ثانية كحد أقصى للنموذج الواحد

              try {
                  const response = await fetch(url, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      signal: controller.signal,
                      body: JSON.stringify({
                          system_instruction: payload.system_instruction,
                          contents: payload.contents,
                          tools: payload.tools,
                          generation_config: payload.generationConfig || { maxOutputTokens: 4096 }
                      })
                  });
                  clearTimeout(timeoutId);
                  return response;
              } catch (e) {
                  clearTimeout(timeoutId);
                  throw e;
              }
          };

          let response = await fetchWithVersion('v1beta');
          if (response.status === 404) response = await fetchWithVersion('v1');

          const data = await response.json();

          if (!response.ok) {
              throw new Error(data.error?.message || `Google API Error: ${response.status}`);
          }

          // ✅ الشفافية: نرسل اسم الموديل الحقيقي المستخدم
          return new Response(JSON.stringify({
              ...data,
              used_model: modelId,
              requested_label: requestedModel
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      } catch (err) {
          throw new Error(`خطأ في استدعاء النموذج (${modelId}): ${err.message}`);
      }
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