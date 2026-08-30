// ================================================================
//  🧠 SUPABASE EDGE FUNCTION - DYNAMIC TRIPLE FAILOVER BRIDGE (V5.6)
//  جسر سحابي ديناميكي نقي - يستقبل الشخصية والسؤال من المحرك المحلي
//  التنفيذ: [Groq] -> [Mistral] -> [Gemini]
// ================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Groq } from "https://esm.sh/groq-sdk";
import { Mistral } from "https://esm.sh/@mistralai/mistralai";
import { GoogleGenAI } from "https://esm.sh/@google/genai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, User-Agent, apikey, x-client-info",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") || "";
    const MISTRAL_API_KEY = Deno.env.get("MISTRAL_API_KEY") || "";
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";

    // 🌟 استقبال السؤال والتعليمات السيادية القادمة ديناميكياً من العميل 🌟
    const body = await req.json();
    const { prompt, systemInstruction, contents, tools, model: requestedModel } = body;

    if (!prompt && !contents) {
      throw new Error("الرجاء إدخال الـ prompt أو contents");
    }

    // --- [المستوى الأول: Groq] ---
    if (GROQ_API_KEY) {
      try {
        const groq = new Groq({ apiKey: GROQ_API_KEY });
        const chatCompletion = await groq.chat.completions.create({
          messages: [
            { role: "system", content: systemInstruction || "You are a helpful engineer." },
            { role: "user", content: prompt || (contents ? contents[contents.length-1].parts[0].text : "") }
          ],
          model: "llama-3.3-70b-specdec",
        });

        return new Response(JSON.stringify({
          text: chatCompletion.choices[0].message.content,
          provider: "Groq"
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

      } catch (e) {
        console.warn("⚠️ Groq Failover Triggered:", e.message);
      }
    }

    // --- [المستوى الثاني: Mistral] ---
    if (MISTRAL_API_KEY) {
      try {
        const mistral = new Mistral({ apiKey: MISTRAL_API_KEY });
        const result = await mistral.chat.complete({
          model: "mistral-large-latest",
          messages: [
            { role: "system", content: systemInstruction || "You are a helpful engineer." },
            { role: "user", content: prompt || (contents ? contents[contents.length-1].parts[0].text : "") }
          ],
        });

        return new Response(JSON.stringify({
          text: result.choices[0].message.content,
          provider: "Mistral"
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

      } catch (e) {
        console.warn("⚠️ Mistral Failover Triggered:", e.message);
      }
    }

    // --- [المستوى الثالث والأخير: Gemini] ---
    if (GEMINI_API_KEY) {
      const genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      const model = genAI.getGenerativeModel({
        model: requestedModel || "gemini-3.5-flash-lite",
        systemInstruction: systemInstruction
      });

      // جيميناي هنا هو "الجوكر" لأنه يدعم الأدوات (Tools) بشكل كامل في الحلقة الذكية
      const result = await model.generateContent({
        contents: contents || [{ role: "user", parts: [{ text: prompt }] }],
        tools: tools,
        generationConfig: body.generationConfig
      });

      return new Response(JSON.stringify({
        text: result.response.text,
        provider: "Gemini (The Fortress)",
        functionCall: result.response.candidates?.[0]?.content?.parts?.find(p => p.functionCall)
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    throw new Error("🛑 جميع السيرفرات السحابية مستنفذة حالياً.");

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
