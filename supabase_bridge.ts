// ============================================================
//  🚀 VSA Sovereign Bridge V5.2 - SUPABASE EDITION (Deno)
//  المهمة: هجرة شاملة لـ Gemini (الرسمي) + GitHub + Search
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenAI } from "https://esm.sh/@google/genai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, User-Agent, apikey, x-client-info",
};

serve(async (req) => {
  const url = new URL(req.url);
  const path = url.pathname;

  // 1. معالجة طلبات OPTIONS لـ CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ============================================================
    //  أ. مسار Gemini API (بالمكتبة الرسمية)
    // ============================================================
    if (path.includes("/gemini")) {
      const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
      if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not found in secrets");

      const body = await req.json();
      const genAI = new GoogleGenAI(GEMINI_API_KEY);

      const modelName = body.model || "gemini-3.5-flash-lite";
      const model = genAI.getGenerativeModel({
        model: modelName,
        thinkingConfig: body.config?.thinkingConfig || { thinkingLevel: "MEDIUM" }
      });

      const result = await model.generateContent({
        contents: body.contents,
        tools: body.tools,
        generationConfig: body.generationConfig
      });

      const response = await result.response;
      return new Response(JSON.stringify({
        candidates: [{ content: { role: "model", parts: [{ text: response.text() }] } }]
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ============================================================
    //  ب. مسار GitHub API (الهجرة الكاملة)
    // ============================================================
    if (path.includes("/github/")) {
      const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN");
      if (!GITHUB_TOKEN) throw new Error("GITHUB_TOKEN not found in secrets");

      const githubPath = path.split("/github/")[1];
      const githubUrl = `https://api.github.com/repos/ahmedwwaw1/my/${githubPath}`;

      const res = await fetch(githubUrl, {
        method: req.method,
        headers: {
          "Authorization": `Bearer ${GITHUB_TOKEN}`,
          "Accept": "application/vnd.github.v3+json",
          "User-Agent": "VSA-Supabase-Bridge/5.2",
          "Content-Type": "application/json",
        },
        body: req.method !== "GET" ? await req.text() : null,
      });

      const data = await res.text();
      return new Response(data, {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ============================================================
    //  ج. مسار البحث الهجين (Multi-Engine)
    // ============================================================
    if (path.includes("/search")) {
      const query = url.searchParams.get("q");
      const googleKey = Deno.env.get("GOOGLE_SEARCH_KEY");
      const googleCx = Deno.env.get("GOOGLE_SEARCH_CX");
      const tavilyKey = Deno.env.get("TAVILY_API_KEY");

      let results = "🔍 **نتائج البحث من قلب Supabase:**\n\n";

      // البحث عبر جوجل
      if (googleKey && googleCx && query) {
        const gRes = await fetch(`https://www.googleapis.com/customsearch/v1?key=${googleKey}&cx=${googleCx}&q=${encodeURIComponent(query)}&num=5`);
        const gData = await gRes.json();
        if (gData.items) {
          gData.items.forEach((item: any, i: number) => {
            results += `${i+1}. ${item.link.includes('youtube.com') ? "🎥 " : "🌐 "}${item.title}\n   🔗 ${item.link}\n\n`;
          });
        }
      }

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response("🚀 VSA Supabase Bridge Active.", { headers: corsHeaders });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
