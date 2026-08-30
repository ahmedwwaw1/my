// ================================================================
//  🚀 VSA Sovereign Bridge V6.7 - DYNAMIC MODEL SYNC
//  التحديث: مزامنة اسم النموذج المختار + تحسين تتبع الأخطاء
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
    const url = new URL(req.url);
    const path = url.pathname;
    const body = await req.json().catch(() => ({}));
    const { prompt, systemInstruction, contents, tools, model: requestedModel } = body;

    const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    // [مسار GitHub]
    if (path.includes("/github/")) {
      let githubPath = path.split("/github/")[1] || "";
      githubPath = githubPath.replace(/^contents\//, "");
      const res = await fetch(`https://api.github.com/repos/ahmedwwaw1/my/contents/${githubPath}`, {
        method: req.method,
        headers: { "Authorization": `Bearer ${GITHUB_TOKEN}`, "Accept": "application/vnd.github.v3+json", "User-Agent": "VSA-Bridge-V6.7" },
        body: req.method !== "GET" ? JSON.stringify(body) : null
      });
      return new Response(await res.text(), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // [مسار Gemini]
    if (GEMINI_API_KEY && (prompt || contents)) {
      const modelName = requestedModel || "gemini-3.5-flash-lite"; // استخدام النموذج المختار من الواجهة
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

      const res = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: contents || [{ role: "user", parts: [{ text: prompt || "مرحبا" }] }],
          tools,
          system_instruction: { parts: [{ text: systemInstruction }] }
        })
      });

      const data = await res.json();
      if (res.ok && data.candidates?.[0]) {
        const parts = data.candidates[0].content.parts;
        return new Response(JSON.stringify({
          text: parts.find((p: any) => p.text)?.text || "",
          functionCall: parts.find((p: any) => p.functionCall)?.functionCall || null,
          provider: `${modelName} (Agentic)`
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ error: data.error?.message || "Google API Error", text: "⚠️ واجه Gemini مشكلة في المعالجة السحابية." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ status: "online", message: "VSA Bridge V6.7 Active" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
