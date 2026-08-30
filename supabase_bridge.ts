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
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not found in secrets");

    // --- أ. مسار البحث ---
    if (path.includes("/search")) {
      const query = url.searchParams.get("q");
      const googleKey = Deno.env.get("GOOGLE_SEARCH_KEY");
      const googleCx = Deno.env.get("GOOGLE_SEARCH_CX");
      let results = "🔍 **نتائج البحث المباشرة:**\n\n";

      if (googleKey && googleCx && query) {
        const gRes = await fetch(`https://www.googleapis.com/customsearch/v1?key=${googleKey}&cx=${googleCx}&q=${encodeURIComponent(query)}&num=5`);
        const gData = await gRes.json();
        if (gData.items) {
          gData.items.forEach((item: any, i: number) => {
            results += `${i+1}. ${item.link.includes('youtube.com') ? "🎥 " : "🌐 "}${item.title}\n   🔗 ${item.link}\n\n`;
          });
        }
      }
      return new Response(JSON.stringify({ success: true, results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- ب. مسار Gemini (بالمكتبة الحديثة @google/genai) ---
    if (req.method === "POST") {
      const body = await req.json();

      // 1. تهيئة العميل (بناءً على نصيحة الخبير)
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

      // 2. إعداد ميزة التفكير المتطورة
      const modelName = body.model || "gemini-3.5-flash-lite";
      const config = {
        thinkingConfig: {
          thinkingLevel: body.config?.thinkingConfig?.thinkingLevel || "MEDIUM"
        }
      };

      // 3. إرسال الطلب بالصيغة الحديثة
      // نمرر الـ prompt مباشرة أو الـ contents
      const prompt = body.contents?.[0]?.parts?.[0]?.text || "مرحبا";

      const response = await ai.models.generateContent({
        model: modelName,
        contents: body.contents, // تمرير السياق الكامل للذاكرة
        config: config
      });

      // 4. إعادة النتيجة بتنسيق متوافق مع الواجهة
      return new Response(JSON.stringify({
        candidates: [{
          content: {
            role: "model",
            parts: [{ text: response.text }]
          }
        }]
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
