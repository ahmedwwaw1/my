/* VSA Bridge browser authentication bootstrap.
 * Uses Supabase Anonymous Auth so the hardened bridge can require a real user JWT
 * without exposing any service credentials in the browser.
 */
(function(){
  const root = typeof globalThis !== 'undefined' ? globalThis : window;
  const url = root.__SUPABASE_URL__ || 'https://ozcffmadatsfyyldqmdl.supabase.co';
  const publicKey = root.__SUPABASE_PUBLIC_KEY__ || '';
  const bridgePath = '/functions/v1/vsa-bridge';
  const tokenKey = 'vsa_bridge_access_token';
  const refreshKey = 'vsa_bridge_refresh_token';
  let accessToken = '';
  let refreshToken = '';
  let authPromise = null;

  function save(session){
    accessToken = typeof session?.access_token === 'string' ? session.access_token : '';
    refreshToken = typeof session?.refresh_token === 'string' ? session.refresh_token : '';
    try {
      if (accessToken) localStorage.setItem(tokenKey, accessToken); else localStorage.removeItem(tokenKey);
      if (refreshToken) localStorage.setItem(refreshKey, refreshToken); else localStorage.removeItem(refreshKey);
    } catch (_) {}
    root.__VSA_BRIDGE_ACCESS_TOKEN__ = accessToken;
  }

  function load(){
    try {
      accessToken = localStorage.getItem(tokenKey) || '';
      refreshToken = localStorage.getItem(refreshKey) || '';
    } catch (_) {}
    root.__VSA_BRIDGE_ACCESS_TOKEN__ = accessToken;
  }

  async function refresh(){
    if (!refreshToken || !publicKey) return false;
    const r = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':publicKey},
      body:JSON.stringify({refresh_token:refreshToken})
    });
    if (!r.ok) return false;
    const d = await r.json();
    if (!d?.access_token) return false;
    save(d);
    return true;
  }

  async function anonymousSignIn(){
    if (!publicKey) throw new Error('Supabase publishable key is not configured.');
    const r = await fetch(`${url}/auth/v1/signup`, {
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':publicKey},
      body:'{}'
    });
    const d = await r.json().catch(()=>({}));
    if (!r.ok || !d?.access_token) {
      throw new Error(d?.msg || d?.message || 'Anonymous Supabase sign-in is not enabled.');
    }
    save(d);
    return true;
  }

  async function ensure(){
    if (accessToken) return accessToken;
    if (authPromise) return authPromise;
    authPromise = (async()=>{
      try {
        load();
        if (accessToken) return accessToken;
        if (refreshToken && await refresh()) return accessToken;
        await anonymousSignIn();
        return accessToken;
      } catch (e) {
        root.__VSA_BRIDGE_AUTH_ERROR__ = e?.message || String(e);
        return '';
      } finally {
        authPromise = null;
      }
    })();
    return authPromise;
  }

  const originalFetch = root.fetch.bind(root);
  root.fetch = async function(input, init){
    let requestUrl = '';
    try { requestUrl = typeof input === 'string' ? input : (input?.url || ''); } catch (_) {}
    if (!requestUrl || !requestUrl.includes(bridgePath)) return originalFetch(input, init);

    const token = await ensure();
    const next = new Request(input, init || {});
    const headers = new Headers(next.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (publicKey) headers.set('apikey', publicKey);
    return originalFetch(new Request(next, {headers}));
  };

  root.__VSA_BRIDGE_AUTH__ = { ensure, getAccessToken:()=>accessToken };
  load();
  ensure();
})();
