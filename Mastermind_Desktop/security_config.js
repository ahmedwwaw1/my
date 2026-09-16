/* Public/anon configuration only. Never store service-role credentials here. */
window.__SUPABASE_PUBLIC_KEY__ = window.__SUPABASE_PUBLIC_KEY__ || '';

/* Runtime binding is loaded separately so sandbox execution never falls back to the unrestricted command bridge. */
(function(){
  try {
    const script = document.createElement('script');
    script.src = 'runtime_sandbox_binding.js?v=' + Date.now();
    document.head.appendChild(script);
  } catch (_) {}
})();
