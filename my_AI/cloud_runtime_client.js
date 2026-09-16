/**
 * Mastermind Cloud Runtime Client 1.0
 * Browser-side client for the authenticated Supabase sandbox gateway.
 * The browser never receives the external runtime secret.
 */
(function(root){
  const SUPABASE_URL = String(root.__SUPABASE_URL__ || 'https://ozcffmadatsfyyldqmdl.supabase.co');
  const SUPABASE_KEY = typeof root.__SUPABASE_PUBLIC_KEY__ === 'string' ? root.__SUPABASE_PUBLIC_KEY__ : '';
  const GATEWAY_URL = `${SUPABASE_URL.replace(/\/$/,'')}/functions/v1/sandbox-runtime`;

  function clientHeaders(){
    return {
      'Content-Type':'application/json',
      'Authorization':`Bearer ${SUPABASE_KEY}`,
      'apikey':SUPABASE_KEY
    };
  }

  async function executeSandboxRemote(args={}){
    if(!SUPABASE_KEY) return {ok:false,status:'backend_unavailable',failure:'supabase_public_key_missing',runtimeRequired:true};
    if(args.allowCommand!==true) return {ok:false,status:'blocked',failure:'allowCommand_required',runtimeRequired:true};
    const payload={
      command:args.command,
      allowCommand:true,
      timeoutMs:args.timeoutMs,
      maxOutputBytes:args.maxOutputBytes,
      maxMemoryMb:args.maxMemoryMb,
      maxCpus:args.maxCpus,
      maxProcesses:args.maxProcesses,
      image:args.image,
      workspaceFiles:args.workspaceFiles||{}
    };
    try{
      const res=await fetch(GATEWAY_URL,{method:'POST',headers:clientHeaders(),body:JSON.stringify(payload)});
      const text=await res.text();
      let data;
      try{data=JSON.parse(text);}catch(_){data={ok:false,status:'invalid_gateway_response',raw:text.slice(0,2000),runtimeRequired:true};}
      if(!res.ok && !data.status) data.status='runtime_gateway_error';
      return data;
    }catch(error){
      return {ok:false,status:'runtime_gateway_unreachable',failure:error?.message||String(error),runtimeRequired:true};
    }
  }

  root.mastermindCloudRuntime={version:'1.0-runtime-client',executeSandboxRemote};
})(typeof globalThis!=='undefined'?globalThis:window);
