// ================================================================
//  🧠 SUPABASE EDGE FUNCTION - DYNAMIC TRIPLE FAILOVER BRIDGE (V6.2)
//  التحديث: العودة لنظام Deno الصافي لضمان الاستقرار المطلق
//  التنفيذ المباشر عبر Fetch: [Groq] -> [Mistral] -> [Gemini]
// ================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, User-Agent, apikey, x-client-info",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { prompt, systemInstruction, contents, tools, model: requestedModel } = body;

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    const MISTRAL_API_KEY = Deno.env.get("MISTRAL_API_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    const userMessage = prompt || (contents && contents.length > 0 ? contents[contents.length-1].parts[0].text : "مرحبا");

    // --- [المستوى الأول: Groq عبر Fetch المباشر] ---
    if (GROQ_API_KEY) {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "llama-3.3-70b-specdec",
            messages: [{ role: "system", content: systemInstruction }, { role: "user", content: userMessage }]
          })
        });
        if (res.ok) {
          const data = await res.json();
          return new Response(JSON.stringify({ text: data.choices[0].message.content, provider: "Groq" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      } catch (e) {}
    }

    // --- [المستوى الثاني: Mistral عبر Fetch المباشر] ---
    if (MISTRAL_API_KEY) {
      try {
        const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${MISTRAL_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "mistral-large-latest",
            messages: [{ role: "system", content: systemInstruction }, { role: "user", content: userMessage }]
          })
        });
        if (res.ok) {
          const data = await res.json();
          return new Response(JSON.stringify({ text: data.choices[0].message.content, provider: "Mistral" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      } catch (e) {}
    }

    // --- [المستوى الثالث والأخير: Gemini عبر Fetch المباشر - لضمان الاستقرار] ---
    if (GEMINI_API_KEY) {
      const apiVersion = "v1beta";
      const modelName = requestedModel || "gemini-1.5-flash";
      const geminiUrl = `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

      const res = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: contents || [{ role: "user", parts: [{ text: userMessage }] }], tools, systemInstruction: { parts: [{ text: systemInstruction }] } })
      });

      if (res.ok) {
        const data = await res.json();
        return new Response(JSON.stringify({
          text: data.candidates[0].content.parts[0].text,
          provider: "Gemini (Direct Fetch)",
          functionCall: data.candidates[0].content.parts.find((p: any) => p.functionCall)
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    throw new Error("فشلت جميع المحاولات السحابية.");

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
