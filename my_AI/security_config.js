/* Public/anon configuration only. Never store service-role credentials here. */
window.__SUPABASE_PUBLIC_KEY__ = window.__SUPABASE_PUBLIC_KEY__ || 'sb_publishable_cxalSwUizaYa60BVEcV0eA_UBJ02cws';
window.__SUPABASE_URL__ = window.__SUPABASE_URL__ || 'https://ozcffmadatsfyyldqmdl.supabase.co';

(function(){
  // bridge_auth must execute before ai_engine_core.js. The core sends the
  // bridge request immediately, so asynchronous script injection creates a
  // race where the public key is sent as Authorization instead of a user JWT.
  try {
    document.write('<script src="my_AI/bridge_auth.js?v=2026.5-google-auth"><\/script>');
  } catch (_) {}

  function load(src){
    try{
      const script=document.createElement('script');
      script.src=src + '?v=' + Date.now();
      document.head.appendChild(script);
    }catch(_){ }
  }
  load('cloud_runtime_client.js');
  load('runtime_sandbox_binding.js');
})();
