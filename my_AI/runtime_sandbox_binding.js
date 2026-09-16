/*
 * Mastermind Cloud Runtime Sandbox Binding 1.0
 * Replaces the Cloud Function-Call sandbox execution adapter with the
 * authenticated Supabase -> external Docker runtime path.
 */
(function(root){
  function bind(){
    const original = root.sandboxManager;
    if(typeof original !== 'function') return setTimeout(bind,50);
    if(root.__MASTERmindCloudSandboxBinding?.bound) return;

    const remote = root.mastermindCloudRuntime;
    if(!remote || typeof remote.executeSandboxRemote !== 'function') {
      return setTimeout(bind,100);
    }

    const bound = async function(action,args={}){
      const a = String(action || 'prepare').toLowerCase();
      if(a !== 'execute' && a !== 'run') return original(a,args,{});
      if(!args || args.allowCommand !== true) {
        return {ok:false,status:'blocked',failure:'sandbox execution requires explicit allowCommand=true',runtimeRequired:true};
      }
      const result = await remote.executeSandboxRemote(args);
      if(result && result.runtimeVerification) {
        result.sourceExecution = 'cloud-external-runtime';
      }
      return result;
    };

    root.sandboxManager = bound;
    root.universalSkillExecutionSandboxManager = bound;
    root.__MASTERmindCloudSandboxBinding = {
      bound:true,
      version:'1.0-cloud-runtime-binding',
      gateway:'supabase/functions/v1/sandbox-runtime',
      execution:'external-docker-runtime',
      localBridgeFallback:false
    };
  }
  bind();
})(typeof globalThis !== 'undefined' ? globalThis : window);
