/**
 * VSA Academy Sovereign Bridge - Triple Backup Logic (Deno/Supabase)
 * ---------------------------------------------------------------
 * هذا الكود يطبق نظام الحماية الثلاثي: التبديل التلقائي بين Groq, Mistral, و Gemini.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "npm:@google/generative-ai"
import { Groq } from "npm:groq-sdk"
import MistralClient from "npm:@mistralai/mistralai"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { action, payload, model: requestedModel } = await req.json()

    if (action === 'chat') {
      const prompt = extractPrompt(payload)

      // 1. محاولة استخدام Groq (الأسرع عالمياً)
      try {
        const groqKey = Deno.env.get("GROQ_API_KEY")
        if (groqKey) {
          const groq = new Groq({ apiKey: groqKey })
          const res = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.3-70b-specdec",
          })
          return sendSuccess(res.choices[0].message.content, "Groq (Llama 3.3)")
        }
      } catch (e) { console.warn("Groq failed, switching to Mistral...") }

      // 2. محاولة استخدام Mistral (الاحتياطي الأول)
      try {
        const mistralKey = Deno.env.get("MISTRAL_API_KEY")
        if (mistralKey) {
          const client = new MistralClient(mistralKey)
          const res = await client.chat({
            model: "mistral-large-latest",
            messages: [{ role: "user", content: prompt }],
          })
          return sendSuccess(res.choices[0].message.content, "Mistral Large")
        }
      } catch (e) { console.warn("Mistral failed, switching to Gemini...") }

      // 3. محاولة استخدام Gemini (خط الدفاع الأخير)
      try {
        const geminiKey = Deno.env.get("GEMINI_API_KEY")
        if (geminiKey) {
          const genAI = new GoogleGenerativeAI(geminiKey)
          const model = genAI.getGenerativeModel({ model: requestedModel || "gemini-1.5-flash" })
          const result = await model.generateContent(payload.contents || prompt)
          const response = await result.response
          return sendSuccess(response.text(), "Gemini (Direct)")
        }
      } catch (e) {
        return new Response(JSON.stringify({ error: "All AI models are currently exhausted." }), {
          status: 500, headers: corsHeaders
        })
      }
    }

    // معالجة العمليات الأخرى (GitHub)
    if (action === 'github') {
       return await handleGithub(req)
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: corsHeaders
    })
  }
})

// دوال مساعدة
function extractPrompt(payload) {
  if (typeof payload === 'string') return payload
  if (payload.contents && payload.contents[0]?.parts) return payload.contents[0].parts[0].text
  return JSON.stringify(payload)
}

function sendSuccess(text, provider) {
  return new Response(JSON.stringify({
    candidates: [{ content: { parts: [{ text: text }] } }],
    provider_info: provider
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

async function handleGithub(req) {
    const { endpoint, method, body } = await req.json()
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
