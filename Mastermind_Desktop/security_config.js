/* Public/anon configuration only. Never store service-role credentials here. */
const SUPABASE_PUBLIC_KEY = 'sb_publishable_cxalSwUizaYa60BVEcV0eA_UBJ02cws';
const SUPABASE_PROJECT_URL = 'https://ozcffmadatsfyyldqmdl.supabase.co';
const SUPABASE_BRIDGE_URL = SUPABASE_PROJECT_URL + '/functions/v1/vsa-bridge';

window.__SUPABASE_PUBLIC_KEY__ = SUPABASE_PUBLIC_KEY;
window.__SUPABASE_AUTH_STATUS__ = { state: 'pending', anonymous: true, error: null };

/*
 * The hardened vsa-bridge requires a real Supabase user JWT.
 * The desktop app has no login screen, so bootstrap an anonymous Supabase user.
 * This uses only the public/publishable key; no service-role credential is stored here.
 * Anonymous sign-in must be enabled in Supabase Auth for this to succeed.
 */
(function(){
  const TOKEN_KEY = '__mastermind_supabase_access_token__';
  let authPromise = null;

  function decodeExp(token) {
    try {
      const part = String(token).split('.')[1];
      const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
      return Number(json.exp || 0);
    } catch (_) { return 0; }
  }

  function storedToken() {
    try {
      const token = localStorage.getItem(TOKEN_KEY) || '';
      if (token && decodeExp(token) > Math.floor(Date.now() / 1000) + 60) return token;
    } catch (_) {}
    return '';
  }

  async function ensureAnonymousSession() {
    const existing = storedToken();
    if (existing) {
      window.__SUPABASE_AUTH_STATUS__ = { state: 'ready', anonymous: true, error: null };
      return existing;
    }
    if (authPromise) return authPromise;

    authPromise = (async () => {
      try {
        const response = await fetch(SUPABASE_PROJECT_URL + '/auth/v1/signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_PUBLIC_KEY,
            'Authorization': 'Bearer ' + SUPABASE_PUBLIC_KEY
          },
          body: JSON.stringify({ data: {} })
        });
        const data = await response.json().catch(() => ({}));
        const token = String(data.access_token || '');
        if (!response.ok || !token) {
          const message = data?.msg || data?.message || data?.error_description || ('anonymous sign-in failed (' + response.status + ')');
          throw new Error(message);
        }
        try { localStorage.setItem(TOKEN_KEY, token); } catch (_) {}
        window.__SUPABASE_AUTH_STATUS__ = { state: 'ready', anonymous: true, error: null };
        return token;
      } catch (error) {
        window.__SUPABASE_AUTH_STATUS__ = { state: 'failed', anonymous: true, error: error?.message || String(error) };
        throw error;
      } finally {
        authPromise = null;
      }
    })();

    return authPromise;
  }

  window.__ensureSupabaseAnonymousSession__ = ensureAnonymousSession;

  /*
   * Keep the existing core.js API untouched: transparently replace the Bearer
   * token only for calls to vsa-bridge while preserving the public apikey header.
   */
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async function(input, init) {
    let url = '';
    try { url = typeof input === 'string' ? input : String(input?.url || ''); } catch (_) {}
    if (!url.startsWith(SUPABASE_BRIDGE_URL)) return nativeFetch(input, init);

    try {
      const token = await ensureAnonymousSession();
      const options = { ...(init || {}) };
      const headers = new Headers(options.headers || (typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined));
      headers.set('Content-Type', headers.get('Content-Type') || 'application/json');
      headers.set('apikey', SUPABASE_PUBLIC_KEY);
      headers.set('Authorization', 'Bearer ' + token);
      options.headers = headers;
      return nativeFetch(input, options);
    } catch (error) {
      return Promise.reject(error);
    }
  };
})();

/* Runtime binding is loaded separately so sandbox execution never falls back to the unrestricted command bridge. */
(function(){
  try {
    const script = document.createElement('script');
    script.src = 'runtime_sandbox_binding.js?v=' + Date.now();
    document.head.appendChild(script);
  } catch (_) {}
})();
