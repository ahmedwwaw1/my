// ============================================================
//  🚀 VSA Universal Bridge V3.4 - Cloudflare Worker
//  التحديث: تحسين Google + إضافة Wikipedia + معالجة أخطاء ذكية
// ============================================================

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname;

        // CORS headers للسماح بالطلبات من المتصفح والـ IDE
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, User-Agent',
            'Access-Control-Expose-Headers': '*',
        };

        // معالجة طلبات OPTIONS (preflight)
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: corsHeaders });
        }

        // ============================================================
        //  1. مسار Gemini API
        // ============================================================
        if (path.startsWith('/gemini')) {
            const apiKey = env.GEMINI_API_KEY;
            if (!apiKey) return errorResponse('GEMINI_API_KEY not set', 500, corsHeaders);

            try {
                const body = await request.json();
                const model = body.model || 'gemini-3.7-flash';
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

                const geminiResponse = await fetch(geminiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                return createCORSResponse(geminiResponse, corsHeaders);
            } catch (e) {
                return errorResponse(e.message, 400, corsHeaders);
            }
        }

        // ============================================================
        //  2. مسار GitHub API
        // ============================================================
        if (path.startsWith('/github/')) {
            const token = env.GITHUB_TOKEN;
            if (!token) return errorResponse('GITHUB_TOKEN not set', 500, corsHeaders);

            const githubPath = path.replace('/github/', '');
            const repo = 'ahmedwwaw1/my';
            const githubUrl = `https://api.github.com/repos/${repo}/${githubPath}`;

            const githubResponse = await fetch(githubUrl, {
                method: request.method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'VSA-Bridge/3.4',
                    'Content-Type': 'application/json',
                },
                body: request.method !== 'GET' ? request.body : null,
            });

            return createCORSResponse(githubResponse, corsHeaders);
        }

        // ============================================================
        //  3. مسار البحث على الويب (Web Search Hybrid)
        // 3. مسار البحث الهجين المطور (V3.5 - Multi-Engine)
        if (path === '/search') {
            const query = url.searchParams.get('q');
            const engine = url.searchParams.get('engine') || 'auto';
            if (!query) return errorResponse('Missing query parameter "q"', 400, corsHeaders);

            let combinedResults = "";
            let sourcesFound = [];

            // --- A. محرك Google PSE ---
            if (engine === 'google' || engine === 'auto') {
                const googleKey = env.GOOGLE_SEARCH_KEY;
                const googleCx = env.GOOGLE_SEARCH_CX;
                if (googleKey && googleCx) {
                    try {
                        const googleUrl = `https://www.googleapis.com/customsearch/v1?key=${googleKey}&cx=${googleCx}&q=${encodeURIComponent(query)}&num=5`;
                        const res = await fetch(googleUrl);
                        if (res.ok) {
                            const data = await res.json();
                            if (data.items && data.items.length > 0) {
                                combinedResults += `🔍 **نتائج Google PSE:**\n`;
                                data.items.forEach((item, i) => {
                                    combinedResults += `${i+1}. **${item.title}**\n   📝 ${item.snippet}\n   🔗 ${item.link}\n\n`;
                                });
                                sourcesFound.push('Google');
                            }
                        }
                    } catch (e) {}
                }
            }

            // --- B. محرك Tavily AI (إذا توفر المفتاح) ---
            if (engine === 'tavily' || (engine === 'auto' && sourcesFound.length < 2)) {
                const tavilyKey = env.TAVILY_API_KEY;
                if (tavilyKey) {
                    try {
                        const res = await fetch('https://api.tavily.com/search', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                api_key: tavilyKey,
                                query: query,
                                search_depth: "smart",
                                max_results: 5
                            })
                        });
                        if (res.ok) {
                            const data = await res.json();
                            if (data.results && data.results.length > 0) {
                                combinedResults += `⚡ **نتائج Tavily AI (الذكية):**\n`;
                                data.results.forEach((item, i) => {
                                    combinedResults += `${i+1}. **${item.title}**\n   📝 ${item.content}\n   🔗 ${item.url}\n\n`;
                                });
                                sourcesFound.push('Tavily');
                            }
                        }
                    } catch (e) {}
                }
            }

            // --- C. محرك Hacker News (Algolia) ---
            if (engine === 'news' || engine === 'auto') {
                try {
                    const hnUrl = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=3`;
                    const res = await fetch(hnUrl);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.hits && data.hits.length > 0) {
                            combinedResults += `📰 **نقاشات Hacker News التقنية:**\n`;
                            data.hits.forEach((item, i) => {
                                combinedResults += `${i+1}. **${item.title}**\n   🔗 ${item.url || 'https://news.ycombinator.com/item?id=' + item.objectID}\n\n`;
                            });
                            sourcesFound.push('HackerNews');
                        }
                    }
                } catch (e) {}
            }

            // --- D. محرك ArXiv (للأبحاث العلمية) ---
            if (engine === 'arxiv' || (engine === 'auto' && combinedResults.length < 500)) {
                try {
                    const arxivUrl = `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=3`;
                    const res = await fetch(arxivUrl);
                    if (res.ok) {
                        const text = await res.text();
                        const titles = text.match(/<title>([\s\S]*?)<\/title>/g);
                        if (titles && titles.length > 1) {
                            combinedResults += `🔬 **أوراق بحثية من ArXiv:**\n`;
                            titles.slice(1, 4).forEach((t, i) => {
                                combinedResults += `${i+1}. ${t.replace(/<[^>]*>/g, '').trim()}\n`;
                            });
                            combinedResults += `\n`;
                            sourcesFound.push('ArXiv');
                        }
                    }
                } catch (e) {}
            }

            // --- E. محرك Wikipedia ---
            if (engine === 'wiki' || (engine === 'auto' && sourcesFound.length === 0)) {
                try {
                    const wikiUrl = `https://ar.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
                    const res = await fetch(wikiUrl);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.query.search && data.query.search.length > 0) {
                            combinedResults += `📚 **نتائج ويكيبيديا:**\n`;
                            data.query.search.slice(0, 3).forEach((item, i) => {
                                combinedResults += `${i+1}. **${item.title}**\n   📝 ${item.snippet.replace(/<[^>]*>/g, '')}\n   🔗 https://ar.wikipedia.org/wiki/${encodeURIComponent(item.title)}\n\n`;
                            });
                            sourcesFound.push('Wikipedia');
                        }
                    }
                } catch (e) {}
            }

            if (sourcesFound.length > 0) {
                return new Response(JSON.stringify({ success: true, sources: sourcesFound, results: combinedResults }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            } else {
                return errorResponse('لم يتم العثور على نتائج في أي محرك بحث.', 404, corsHeaders);
            }
        }            }
        }

        // ============================================================
        //  4. مسار Supabase API
        // ============================================================
        if (path.startsWith('/supabase/')) {
            const supabaseKey = env.SUPABASE_KEY;
            const supabaseUrl = env.SUPABASE_URL;
            if (!supabaseKey || !supabaseUrl) return errorResponse('Supabase credentials not set', 500, corsHeaders);

            const supabasePath = path.replace('/supabase/', '');
            const targetUrl = `${supabaseUrl}/rest/v1/${supabasePath}`;

            const supabaseResponse = await fetch(targetUrl, {
                method: request.method,
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json',
                },
                body: request.method !== 'GET' ? request.body : null,
            });

            return createCORSResponse(supabaseResponse, corsHeaders);
        }

        // المسار الافتراضي
        return new Response('🚀 VSA Universal Bridge V3.4 Active.', { status: 200, headers: corsHeaders });
    }
};

// دالة مساعدة لإنشاء استجابة مع CORS
function createCORSResponse(originalResponse, corsHeaders) {
    const response = new Response(originalResponse.body, originalResponse);
    Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
    });
    return response;
}

// دالة مساعدة لردود الأخطاء
function errorResponse(message, status, corsHeaders) {
    return new Response(JSON.stringify({ error: message }), {
        status: status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}
