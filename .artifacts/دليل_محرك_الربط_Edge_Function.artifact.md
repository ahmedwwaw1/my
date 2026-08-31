# توثيق محرك الربط السيادي (Supabase Edge Function & callBridge)

هذا المستند يشرح الهيكلية البرمجية الجديدة التي تعتمد على **Supabase Edge Functions** كجسر وسيط آمن لتنفيذ عمليات الذكاء الاصطناعي وإدارة الملفات، بعيداً عن مخاطر المتصفح وقيود الـ CORS.

---

## 1. نظرة عامة: لماذا Edge Functions؟

في السابق، كان الموقع يتصل مباشرة بـ APIs (مثل GitHub و Gemini)، مما أدى لمشكلتين:
1.  **الأمان:** تسريب مفاتيح الـ API في "Network Tab" بالمتصفح.
2.  **CORS:** حظر المتصفح للطلبات الموجهة لشركات مثل DeepSeek أو Anthropic.

**الحل:** تم نقل كافة المفاتيح الحساسة إلى **Supabase Secrets**، وأصبح الاتصال يمر عبر وظيفة برمجية سحابية (Edge Function) تعمل كـ "وكيل سيادي" (Sovereign Proxy).

---

## 2. محرك الاتصال الموحد (`callBridge`)

تم تنفيذ دالة مركزية في ملف [ai_engine_core.js](file:///D:/New%20folder/my/ai_engine_core.js) تعمل كنقطة انطلاق وحيدة لكافة العمليات الخارجية.

### الكود البرمجي:
```javascript
async function callBridge(action, payload) {
    try {
        const res = await fetch(SUPABASE_BRIDGE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'apikey': SUPABASE_KEY
            },
            body: JSON.stringify({ action, ...payload })
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || `Bridge error: ${res.status}`);
        }

        return await res.json();
    } catch (e) {
        console.error("Bridge Call Failed:", e);
        throw e;
    }
}
```

---

## 3. هيكلية الطلبات (Request Structure)

يتم تصنيف العمليات عبر الجسر إلى ثلاث فئات رئيسية:

### أ. طلبات الذكاء الاصطناعي (`action: "chat"`)
يتم إرسال المزود والموديل، ويقوم الجسر بحقن المفتاح المناسب من الـ Secrets.
```json
{
  "action": "chat",
  "provider": "google",
  "model": "gemini-1.5-pro",
  "payload": { "contents": [...] }
}
```

### ب. عمليات الملفات (`action: "github"`)
يتم إرسال المسار والعملية، ويقوم الجسر باستخدام الـ `GITHUB_TOKEN` المخزن سحابياً للتنفيذ.
```json
{
  "action": "github",
  "endpoint": "contents/index.html",
  "method": "PUT",
  "body": { "message": "update", "content": "..." }
}
```

### ج. محركات البحث (`action: "search"`)
لاستخدام Google Search أو Tavily دون كشف المفاتيح.

---

## 4. المزايا التقنية المحققة

> [!IMPORTANT]
> **أمان بنسبة 100%:** لا تظهر مفاتيح الـ API أبداً في كود العميل (Frontend).

*   **تجاوز CORS:** يمكن للموقع الآن التحدث مع أي شركة ذكاء اصطناعي في العالم لأن الاتصال يتم "سيرفر إلى سيرفر".
*   **مركزية الإدارة:** لتغيير مفتاح API، تقوم بتحديثه في مكان واحد (Supabase Dashboard) دون الحاجة لتعديل كود الموقع.
*   **الاستقرار:** نظام استجابة موحد يعالج الأخطاء بشكل احترافي قبل وصولها لواجهة المستخدم.

---

## 5. دليل إعداد المفاتيح (Secrets Guide)

لضمان عمل المحرك، يجب التأكد من وجود المفاتيح التالية في **Supabase > Edge Functions > Secrets**:

| المفتاح | الوصف |
| :--- | :--- |
| `GEMINI_API_KEY` | مفتاح جوجل جيميناي الرئيسي |
| `GITHUB_TOKEN` | رمز الوصول الخاص بمستودع المشروع |
| `DEEPSEEK_API_KEY` | (اختياري) للنماذج الاستنتاجية |
| `TAVILY_API_KEY` | (اختياري) لمحرك البحث المطور |

---

> [!TIP]
> عند إضافة أي أداة (Tool) جديدة في المستقبل، يفضل دائماً برمجتها داخل الجسر (vsa-bridge) لضمان ثباتها وأمانها.
