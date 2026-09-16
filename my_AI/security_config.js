/* Public/anon configuration only. Never store service-role credentials here. */
window.__SUPABASE_PUBLIC_KEY__ = window.__SUPABASE_PUBLIC_KEY__ || 'sb_publishable_cxalSwUizaYa60BVEcV0eA_UBJ02cws';
window.__SUPABASE_URL__ = window.__SUPABASE_URL__ || 'https://ozcffmadatsfyyldqmdl.supabase.co';

(function(){
  function load(src){
    try{
      const script=document.createElement('script');
      script.src=src + '?v=' + Date.now();
      document.head.appendChild(script);
    }catch(_){ }
  }
  load('bridge_auth.js');
  load('cloud_runtime_client.js');
  load('runtime_sandbox_binding.js');
})();
