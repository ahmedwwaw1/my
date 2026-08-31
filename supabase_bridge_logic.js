/**
 * VSA Academy Sovereign Bridge - REPAIRED FOR TOOL ACCESS
 * ---------------------------------------------------------------
 * هذا الكود يضمن تمرير الدستور (System Instruction) والأدوات (Tools) للنموذج.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenAI } from "npm:@google/genai"
import Groq from "npm:groq-sdk"
import { Mistral } from "npm:@mistralai/mistralai"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { action, payload, model: requestedModel, endpoint, method, body } = await req.json()

    if (action === 'chat') {
      let lastError = null

      // 1. محاولة Groq (المستوى الأول) - حالياً يدعم النص فقط في هذا الجسر
      try {
        const groqKey = Deno.env.get("GROQ_API_KEY")
        if (groqKey) {
          const prompt = extractPrompt(payload)
          const groq = new Groq({ apiKey: groqKey })
          const res = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.3-70b-specdec",
          })
          return sendSuccess(res.choices[0].message.content, "Groq (Llama 3.3)")
        }
      } catch (e) { console.warn("Groq level failed") }

      // 2. محاولة Gemini (خط الدفاع الأساسي والأذكى للأدوات)
      try {
        const geminiKey = Deno.env.get("GEMINI_API_KEY")
        if (geminiKey) {
          const ai = new GoogleGenAI({ apiKey: geminiKey })

          // تأمين تمرير كامل البيانات (الدستور، الأدوات، التاريخ)
          const genConfig = {
            model: requestedModel || "gemini-3.5-flash-lite",
            systemInstruction: payload.system_instruction,
            contents: payload.contents || [{ role: "user", parts: [{ text: extractPrompt(payload) }] }],
            tools: payload.tools,
            generationConfig: payload.generationConfig
          }

          const res = await ai.models.generateContent(genConfig)

          // إرجاع النتيجة بتنسيق يتوافق مع Frontend (سواء نص أو Function Call)
          return new Response(JSON.stringify(res), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      } catch (e) {
        console.error("Gemini critical failure:", e.message)
        lastError = e
      }

      throw new Error(lastError ? `Bridge exhausted all options: ${lastError.message}` : "Bridge Configuration Error")
    }

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
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message, message: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
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
    candidates: [{ content: { parts: [{ text: text }] } }],
    provider_info: provider
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
