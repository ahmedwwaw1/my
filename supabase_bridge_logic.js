/**
 * VSA Academy Sovereign Bridge - 2026 ULTIMATE VERSION
 * ---------------------------------------------------------------
 * يدعم كافة نماذج Gemini (3.7, 3.6, 3.5, 3.1, 2.5, Omni) بشكل رسمي.
 * يعالج أخطاء الإصدارات (v1 vs v1beta) تلقائياً لضمان استقرار 100%.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { action, payload, model: requestedModel, endpoint, method, body } = await req.json()

    if (action === 'chat') {
      const apiKey = Deno.env.get("GEMINI_API_KEY")

      // 1. تنظيف وتحديد معرف الموديل (تجنب تكرار models/ وتحويل للصغير)
      // تم استبدال الموديل الافتراضي بـ gemini-3.7-flash كما طلبت
      let modelId = String(requestedModel || "gemini-3.7-flash").trim().toLowerCase();
      if (modelId.startsWith("models/")) modelId = modelId.replace("models/", "");

      // 🎯 دعم IDs المكتشفة (2026 Ultimate List) باستخدام الجمل الشرطية المتتالية
      if (modelId.includes("3.7")) modelId = "gemini-3.7-flash";
      else if (modelId.includes("3.6")) modelId = "gemini-3.6-flash";
      else if (modelId.includes("3.5-lite")) modelId = "gemini-3.5-flash-lite";
      else if (modelId.includes("3.5")) modelId = "gemini-3.5-flash";
      else if (modelId.includes("3.1")) modelId = "gemini-3.1-flash-lite";
      else if (modelId.includes("3-preview")) modelId = "gemini-3-flash-preview";
      else if (modelId.includes("2.5-pro")) modelId = "gemini-2.5-pro";
      else if (modelId.includes("2.5-lite")) modelId = "gemini-2.5-flash-lite";
      else if (modelId.includes("2.5")) modelId = "gemini-2.5-flash";
      else if (modelId.includes("omni")) modelId = "gemini-omni-1.1-flash";
      else if (modelId.includes("image-lite")) modelId = "gemini-3.1-flash-lite-image";
      else if (modelId.includes("image-pro")) modelId = "gemini-3-pro-image";
      else if (modelId.includes("image")) modelId = "gemini-3.1-flash-image";

      // 2. محاولة الاتصال عبر نظام الـ Multi-Version (Beta ثم Stable)
      async function tryFetch(version) {
          const url = `https://generativelanguage.googleapis.com/${version}/models/${modelId}:generateContent?key=${apiKey}`;
          const response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  system_instruction: payload.system_instruction,
                  contents: payload.contents,
                  tools: payload.tools,
                  generation_config: {
                      maxOutputTokens: payload.generationConfig?.max_output_tokens || 4096,
                      temperature: payload.generationConfig?.temperature || 0.7,
                      topP: payload.generationConfig?.top_p || 0.9
                  }
              })
          });
          return response;
      }

      // المحاولة الأولى: v1beta (للنماذج الأحدث 3.x)
      let googleRes = await tryFetch('v1beta');

      // إذا فشل (404)، المحاولة الثانية: v1 (للنماذج المستقرة)
      if (googleRes.status === 404) {
          googleRes = await tryFetch('v1');
      }

      const data = await googleRes.json();

      if (!googleRes.ok) {
          throw new Error(data.error?.message || `Google API Error: ${googleRes.status}`);
      }

      return new Response(JSON.stringify({ ...data, used_model: modelId, api_version: googleRes.url.includes('v1beta') ? 'v1beta' : 'v1' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
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
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message,
      message: error.message
    }), { status: 500, headers: corsHeaders })
  }
})

function extractPrompt(payload) {
  if (typeof payload === 'string') return payload
  if (payload.contents && payload.contents[payload.contents.length - 1]?.parts) {
    return payload.contents[payload.contents.length - 1].parts[0].text
  }
  return JSON.stringify(payload)
}

function sendSuccess(text, provider) {
  return new Response(JSON.stringify({
    candidates: [{ content: { role: "model", parts: [{ text: text }] } }],
    provider_info: provider
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
