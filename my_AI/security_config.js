/* Public/anon configuration only. Never store service-role credentials here. */
window.__SUPABASE_PUBLIC_KEY__ = window.__SUPABASE_PUBLIC_KEY__ || '';
window.__SUPABASE_URL__ = window.__SUPABASE_URL__ || 'https://ozcffmadatsfyyldqmdl.supabase.co';

(function(){
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
