/* VSA Bridge cloud authentication bootstrap.
 * Cloud: Google OAuth -> Supabase user JWT.
 * Desktop (file://): intentionally does not install auth or modify fetch.
 */
(function(){
  const root = typeof globalThis !== 'undefined' ? globalThis : window;
  const isWeb = typeof location !== 'undefined' && (location.protocol === 'http:' || location.protocol === 'https:');
  if (!isWeb) return;

  const url = root.__SUPABASE_URL__ || 'https://ozcffmadatsfyyldqmdl.supabase.co';
  const publicKey = root.__SUPABASE_PUBLIC_KEY__ || 'sb_publishable_cxalSwUizaYa60BVEcV0eA_UBJ02cws';
  const bridgePath = '/functions/v1/vsa-bridge';
  const tokenKey = 'vsa_cloud_access_token';
  const refreshKey = 'vsa_cloud_refresh_token';
  let accessToken = '';
  let refreshToken = '';
  let authPromise = null;

  function save(session){
    accessToken = typeof session?.access_token === 'string' ? session.access_token : '';
    refreshToken = typeof session?.refresh_token === 'string' ? session.refresh_token : refreshToken;
    try {
      if (accessToken) localStorage.setItem(tokenKey, accessToken); else localStorage.removeItem(tokenKey);
      if (refreshToken) localStorage.setItem(refreshKey, refreshToken); else localStorage.removeItem(refreshKey);
    } catch (_) {}
    root.__VSA_BRIDGE_ACCESS_TOKEN__ = accessToken;
  }

  function clearSession(){
    accessToken = '';
    refreshToken = '';
    try { localStorage.removeItem(tokenKey); localStorage.removeItem(refreshKey); } catch (_) {}
    root.__VSA_BRIDGE_ACCESS_TOKEN__ = '';
  }

  function load(){
    try {
      accessToken = localStorage.getItem(tokenKey) || '';
      refreshToken = localStorage.getItem(refreshKey) || '';
    } catch (_) {}
    root.__VSA_BRIDGE_ACCESS_TOKEN__ = accessToken;
  }

  function decodeJwt(token){
    try {
      const part = String(token).split('.')[1];
      if (!part) return null;
      const normalized = part.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
      return JSON.parse(atob(padded));
    } catch (_) { return null; }
  }

  function tokenUsable(token){
    const claims = decodeJwt(token);
    return Boolean(token && claims?.exp && Number(claims.exp) > Math.floor(Date.now() / 1000) + 30);
  }

  async function refresh(){
    if (!refreshToken || !publicKey) return false;
    try {
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
    } catch (_) { return false; }
  }

  function consumeOAuthCallback(){
    try {
      const hash = String(location.hash || '');
      if (!hash.startsWith('#')) return false;
      const params = new URLSearchParams(hash.slice(1));
      const token = params.get('access_token');
      const refresh = params.get('refresh_token');
      if (!token) return false;
      save({access_token:token, refresh_token:refresh || ''});
      history.replaceState({}, document.title, location.pathname + location.search);
      return true;
    } catch (_) { return false; }
  }

  async function validateUser(){
    if (!accessToken) return null;
    try {
      const r = await fetch(`${url}/auth/v1/user`, {
        headers:{'apikey':publicKey,'Authorization':`Bearer ${accessToken}`}
      });
      if (!r.ok) return null;
      return await r.json();
    } catch (_) { return null; }
  }

  async function getCurrentUser(){
    load();
    consumeOAuthCallback();
    if (!tokenUsable(accessToken)) {
      if (!(await refresh())) {
        clearSession();
        return null;
      }
    }
    return await validateUser();
  }

  function redirectToGoogle(){
    const redirectTo = `${location.origin}${location.pathname}`;
    const authorize = `${url}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;
    location.assign(authorize);
  }

  function setAuthState(state, user, error){
    root.__SUPABASE_AUTH_STATUS__ = {
      state,
      authenticated: Boolean(user?.id),
      anonymous: false,
      userId: user?.id || null,
      email: user?.email || null,
      error: error || null
    };
    updateLoginUi(state, user, error);
  }

  function showLoginUi(){
    if (!document.body || document.getElementById('vsaCloudAuthGate')) return;
    const gate = document.createElement('div');
    gate.id = 'vsaCloudAuthGate';
    gate.innerHTML = `
      <div class="vsa-auth-card">
        <div class="vsa-auth-icon">🧠</div>
        <h2>العقل المدبر السحابي</h2>
        <p>تسجيل الدخول مطلوب لاستخدام النسخة السحابية من Agent.</p>
        <button id="vsaGoogleLoginBtn" type="button">🔐 المتابعة باستخدام Google</button>
        <div id="vsaAuthError" class="vsa-auth-error"></div>
      </div>`;
    document.body.appendChild(gate);
    gate.addEventListener('click', (event) => { if (event.target === gate) gate.style.display = 'none'; });
    document.getElementById('vsaGoogleLoginBtn')?.addEventListener('click', redirectToGoogle);
  }

  function updateLoginUi(state, user, error){
    const gate = document.getElementById('vsaCloudAuthGate');
    const errorEl = document.getElementById('vsaAuthError');
    const button = document.getElementById('vsaGoogleLoginBtn');
    if (!gate) return;
    if (state === 'ready' && user?.id) {
      gate.style.display = 'none';
      root.__VSA_CLOUD_USER__ = user;
      return;
    }
    gate.style.display = 'flex';
    if (button) button.disabled = false;
    if (errorEl) errorEl.textContent = error || (state === 'pending' ? 'جارٍ التحقق من جلسة الدخول...' : 'يرجى تسجيل الدخول بحساب Google.');
  }

  async function ensure(){
    if (authPromise) return authPromise;
    authPromise = (async()=>{
      try {
        const user = await getCurrentUser();
        if (!user?.id) {
          showLoginUi();
          setAuthState('signed_out', null, null);
          return '';
        }
        root.__VSA_CLOUD_USER__ = user;
        setAuthState('ready', user, null);
        return accessToken;
      } catch (e) {
        const message = e?.message || String(e);
        showLoginUi();
        setAuthState('failed', null, message);
        return '';
      } finally { authPromise = null; }
    })();
    return authPromise;
  }

  function injectStyles(){
    if (document.getElementById('vsaCloudAuthStyles')) return;
    const style = document.createElement('style');
    style.id = 'vsaCloudAuthStyles';
    style.textContent = `
      #vsaCloudAuthGate{position:fixed;inset:0;z-index:100001;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.72);backdrop-filter:blur(8px);direction:rtl;font-family:Arial,sans-serif}
      .vsa-auth-card{width:min(420px,calc(100vw - 32px));padding:30px;border:1px solid #2d3748;border-radius:18px;background:#15171b;color:#fff;text-align:center;box-shadow:0 20px 70px rgba(0,0,0,.55)}
      .vsa-auth-icon{font-size:48px;margin-bottom:8px}.vsa-auth-card h2{margin:0 0 10px}.vsa-auth-card p{color:#aeb4bf;line-height:1.7;margin:0 0 22px}
      #vsaGoogleLoginBtn{border:0;border-radius:10px;padding:13px 20px;background:#fff;color:#111;font-weight:700;cursor:pointer;width:100%;font-size:15px}
      #vsaGoogleLoginBtn:hover{background:#e9eef5}#vsaGoogleLoginBtn:disabled{opacity:.6;cursor:wait}.vsa-auth-error{min-height:20px;color:#ff8a80;font-size:12px;margin-top:14px}
    `;
    document.head.appendChild(style);
  }

  const nativeFetch = root.fetch.bind(root);
  root.fetch = async function(input, init){
    let requestUrl = '';
    try { requestUrl = typeof input === 'string' ? input : (input?.url || ''); } catch (_) {}
    if (!requestUrl || !requestUrl.includes(bridgePath)) return nativeFetch(input, init);

    const token = await ensure();
    if (!token) throw new Error('Cloud Agent login required.');
    const next = new Request(input, init || {});
    const headers = new Headers(next.headers);
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('apikey', publicKey);
    return nativeFetch(new Request(next, {headers}));
  };

  root.__VSA_BRIDGE_AUTH__ = { ensure, getAccessToken:()=>accessToken, getUser:()=>root.__VSA_CLOUD_USER__ || null, signInWithGoogle:redirectToGoogle, signOut:()=>{clearSession();location.reload();} };

  function boot(){
    injectStyles();
    showLoginUi();
    ensure();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
