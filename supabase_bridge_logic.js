/**
 * VSA Academy Sovereign Bridge - ULTRA-STABLE ESM VERSION
 * ---------------------------------------------------------------
 * هذا التحديث يستخدم روابط esm.sh لتجنب خطأ "Failed to bundle" في Supabase.
 * يدعم التبديل التلقائي: Groq -> Mistral -> Gemini 3.7.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// استيراد المكتبات عبر روابط ESM المستقرة
import { GoogleGenAI } from "https://esm.sh/@google/genai"
import Groq from "https://esm.sh/groq-sdk"
import { Mistral } from "https://esm.sh/@mistralai/mistralai"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { action, payload, model: requestedModel, endpoint, method, body } = await req.json()

    // --- [1. محرك الدردشة الذكي] ---
    if (action === 'chat') {
      const userPrompt = extractPrompt(payload)
      let lastError = null

      // المستوى الأول: Groq
      try {
        const groqKey = Deno.env.get("GROQ_API_KEY")
        if (groqKey) {
          const groq = new Groq({ apiKey: groqKey })
          const res = await groq.chat.completions.create({
            messages: [{ role: "user", content: userPrompt }],
            model: "llama-3.3-70b-specdec",
          })
          return sendSuccess(res.choices[0].message.content, "Groq (Llama 3.3)")
        }
      } catch (e) { console.warn("Groq level skipped:", e.message); lastError = e; }

      // المستوى الثاني: Mistral
      try {
        const mistralKey = Deno.env.get("MISTRAL_API_KEY")
        if (mistralKey) {
          const mistral = new Mistral({ apiKey: mistralKey })
          const res = await mistral.chat.complete({
            model: "mistral-large-latest",
            messages: [{ role: "user", content: userPrompt }],
          })
          return sendSuccess(res.choices[0].message.content, "Mistral Large")
        }
      } catch (e) { console.warn("Mistral level skipped:", e.message); lastError = e; }

      // المستوى الثالث (السيادي): Gemini 3.x
      try {
        const geminiKey = Deno.env.get("GEMINI_API_KEY")
        if (geminiKey) {
          const ai = new GoogleGenAI({ apiKey: geminiKey })

          let modelId = String(requestedModel || "gemini-3.7-flash").trim().toLowerCase();
          if (modelId.includes("3.7")) modelId = "gemini-3.7-flash";
          else if (modelId.includes("3.6")) modelId = "gemini-3.6-flash";
          else if (modelId.includes("3.1")) modelId = "gemini-3.1-flash-lite";

          const genConfig = {
            model: modelId,
            contents: payload.contents,
            config: {
              systemInstruction: payload.system_instruction?.parts?.[0]?.text || payload.system_instruction,
              tools: payload.tools?.map(tool => ({
                functionDeclarations: (tool.function_declarations || tool.functionDeclarations)?.map(f => ({
                  name: f.name,
                  description: f.description,
                  parameters: f.parameters
                }))
              })),
              generationConfig: {
                maxOutputTokens: payload.generationConfig?.max_output_tokens || 4096,
                temperature: payload.generationConfig?.temperature || 0.7,
                topP: payload.generationConfig?.top_p || 0.9
              }
            }
          }

          const res = await ai.models.generateContent(genConfig)

          const output = {
            candidates: res.candidates.map(c => ({
              content: {
                role: "model",
                parts: c.content.parts.map(p => {
                    if (p.functionCall) return { functionCall: p.functionCall };
                    if (p.text) return { text: p.text };
                    return p;
                })
              }
            })),
            provider_info: `Gemini (${modelId})`
          }

          return new Response(JSON.stringify(output), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      } catch (e) {
        console.error("Gemini critical failure:", e.message)
        lastError = e
      }

      throw new Error(`Omni-Bridge Exhausted: ${lastError?.message}`)
    }

    // --- [2. محرك ملفات GitHub] ---
    if (action === 'github') {
      const res = await fetch(endpoint, {
        method: method || 'GET',
        headers: {
          'Authorization': `Bearer ${Deno.env.get("GITHUB_TOKEN")}`,
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

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: corsHeaders
    })
  }
})

function extractPrompt(payload) {
  if (typeof payload === 'string') return payload
  if (payload.contents && payload.contents.length > 0) {
    const lastPart = payload.contents[payload.contents.length - 1].parts[0]
    return lastPart.text || ""
  }
  return ""
}

function sendSuccess(text, provider) {
  return new Response(JSON.stringify({
    candidates: [{ content: { role: "model", parts: [{ text: text }] } }],
    provider_info: provider
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
