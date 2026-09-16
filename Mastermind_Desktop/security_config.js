/* Desktop-only public configuration. No login or Supabase Auth is used here. */
const SUPABASE_PUBLIC_KEY = 'sb_publishable_cxalSwUizaYa60BVEcV0eA_UBJ02cws';
const SUPABASE_PROJECT_URL = 'https://ozcffmadatsfyyldqmdl.supabase.co';
const SUPABASE_BRIDGE_URL = SUPABASE_PROJECT_URL + '/functions/v1/desktop-bridge';

window.__SUPABASE_PUBLIC_KEY__ = SUPABASE_PUBLIC_KEY;
window.__SUPABASE_PROJECT_URL__ = SUPABASE_PROJECT_URL;
window.__SUPABASE_BRIDGE_URL__ = SUPABASE_BRIDGE_URL;
window.__SUPABASE_AUTH_STATUS__ = { state: 'disabled', anonymous: false, desktop: true, error: null };

/* Desktop is intentionally independent from cloud authentication. */
(function(){
  try {
    const script = document.createElement('script');
    script.src = 'runtime_sandbox_binding.js?v=' + Date.now();
    document.head.appendChild(script);
  } catch (_) {}
})();
