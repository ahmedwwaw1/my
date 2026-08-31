// ============================================================
//  🚀 VSA Sovereign Bridge V5.4 - OFFICIAL NEXT-GEN SDK
//  التحديث: استخدام مكتبة @google/genai الجديدة 2026
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

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN");
    const TAVILY_API_KEY = Deno.env.get("TAVILY_API_KEY");
    const GITHUB_REPO = "ahmedwwaw1/my"; // يمكن جعلها متغيرة من العميل لاحقاً

    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not found in secrets");

    // --- أ. مسار البحث (Google + Tavily) ---
    if (path.includes("/search")) {
      const query = url.searchParams.get("q");
      const engine = url.searchParams.get("engine") || "auto";
      const googleKey = Deno.env.get("GOOGLE_SEARCH_KEY");
      const googleCx = Deno.env.get("GOOGLE_SEARCH_CX");

      let results = "";
      let sources = [];

      // 1. محاولة البحث عبر Google Search
      if ((engine === "auto" || engine === "google") && googleKey && googleCx && query) {
        try {
          const gRes = await fetch(`https://www.googleapis.com/customsearch/v1?key=${googleKey}&cx=${googleCx}&q=${encodeURIComponent(query)}&num=5`);
          const gData = await gRes.json();
          if (gData.items) {
            results += "🔍 **نتائج بحث Google:**\n\n";
            gData.items.forEach((item: any, i: number) => {
              results += `${i+1}. ${item.link.includes('youtube.com') ? "🎥 " : "🌐 "}${item.title}\n   🔗 ${item.link}\n\n`;
            });
            sources.push("Google");
          }
        } catch (e) { console.error("Google Search Error:", e.message); }
      }

      // 2. محاولة البحث عبر Tavily كبديل أو محرك إضافي
      if ((engine === "tavily" || (engine === "auto" && results === "")) && TAVILY_API_KEY && query) {
        try {
          const tRes = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ api_key: TAVILY_API_KEY, query: query, search_depth: "smart" })
          });
          const tData = await tRes.json();
          if (tData.results) {
            results += "🚀 **نتائج بحث Tavily:**\n\n";
            tData.results.forEach((item: any, i: number) => {
              results += `${i+1}. 🌐 ${item.title}\n   🔗 ${item.url}\n   📝 ${item.content.substring(0, 150)}...\n\n`;
            });
            sources.push("Tavily");
          }
        } catch (e) { console.error("Tavily Search Error:", e.message); }
      }

      if (results === "") results = "🌐 لم يتم العثور على نتائج بحث حالياً.";
      return new Response(JSON.stringify({ success: true, results, sources }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- ب. مسار GitHub (الوكيل المباشر للمستودع) ---
    if (path.includes("/github/")) {
      if (!GITHUB_TOKEN) throw new Error("GITHUB_TOKEN not found in secrets");

      const githubPart = path.split("/github/")[1];
      const targetUrl = `https://api.github.com/repos/${GITHUB_REPO}/${githubPart}`;

      const headers = {
        "Authorization": `token ${GITHUB_TOKEN}`,
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "VSA-Bridge-Edge-Function"
      };

      const options: any = { method: req.method, headers };

      if (req.method === "PUT" || req.method === "POST") {
        const body = await req.json();
        // الحصول على الـ SHA إذا كان تحديثاً لملف
        if (req.method === "PUT" && !body.sha && githubPart.startsWith("contents/")) {
            const checkRes = await fetch(targetUrl, { headers });
            if (checkRes.ok) {
                const checkData = await checkRes.json();
                body.sha = checkData.sha;
            }
        }
        options.body = JSON.stringify(body);
      }

      const gResponse = await fetch(targetUrl, options);
      const gData = await gResponse.json();

      return new Response(JSON.stringify(gData), {
        status: gResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // --- ج. مسار Gemini (الوكيل الذكي الكامل) ---
    if (req.method === "POST") {
      const body = await req.json();

      // 1. تهيئة SDK جوجل
      const genAI = new GoogleGenAI(GEMINI_API_KEY);

      // 2. معالجة التعليمات البرمجية (System Instruction)
      // المكتبة تتوقع نصاً بسيطاً أو كائن Content
      let systemPrompt = "";
      if (body.system_instruction) {
          if (typeof body.system_instruction === 'string') systemPrompt = body.system_instruction;
          else if (body.system_instruction.parts && body.system_instruction.parts[0]) systemPrompt = body.system_instruction.parts[0].text;
      }

      // 3. إعداد النموذج
      // نستخدم gemini-1.5-flash لضمان دعم الأدوات (Function Calling)
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash", // استخدام موديل مستقر يدعم الأدوات
        systemInstruction: systemPrompt,
      });

      // 4. إعداد طلب التوليد
      const generateParams: any = {
        contents: body.contents,
      };

      // إضافة الأدوات فقط إذا كانت موجودة وصحيحة
      if (body.tools && Array.isArray(body.tools) && body.tools.length > 0) {
        generateParams.tools = body.tools;
      }

      if (body.generationConfig) {
        generateParams.generationConfig = body.generationConfig;
      }

      // 5. إرسال الطلب
      const result = await model.generateContent(generateParams);
      const response = await result.response;

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ message: "VSA Bridge V5.4 Ready" }), { headers: corsHeaders });

  } catch (err) {
    console.error("SDK Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
