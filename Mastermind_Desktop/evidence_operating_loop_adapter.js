/**
 * Evidence + Agent Hardening Operating Loop Adapter
 * Version 2.0-bound-hardened
 */
const UNIVERSAL_EVIDENCE_ADAPTER_VERSION = '2.0-bound-hardened';
(function bindEvidenceAndHardening(globalScope) {
    const original = globalScope.runUniversalAgentOperatingLoop;
    if (typeof original !== 'function') {
        console.error('Evidence Adapter: Universal Agent Operating Loop is not available.');
        return;
    }
    if (original.__evidenceWrapped === true) return;
    const badWrite=result=>!result||(typeof result==='object'&&result.error)||(typeof result==='string'&&/^(❌|error|failed)\b/i.test(result.trim()));
    const normalize=path=>String(path||'').replace(/\\/g,'/').replace(/^my\//i,'');
    if(typeof globalScope.normalizePathForCloud!=='function')globalScope.normalizePathForCloud=normalize;
    const readFile=async path=>{const p=normalize(path),r=await globalScope.callLocalBridge('read',{path:p});if(r&&typeof r==='object'&&r.error)throw new Error(r.error);if(typeof r!=='string')throw new Error('Read backend did not return file content.');return r;};
    const writeFile=async(path,content,label)=>{const p=normalize(path),r=await globalScope.callLocalBridge('write',{path:p,content});if(badWrite(r))throw new Error(`${label||'write'} failed: ${typeof r==='string'?r:JSON.stringify(r)}`);return r;};
    const search=async query=>{const q=String(query||'').trim();if(!q)return{error:'fast_file_search requires a non-empty query.'};if(typeof globalScope.searchCode==='function')return await Promise.resolve(globalScope.searchCode(q));return await globalScope.callLocalBridge('cmd',{command:`es.exe -d "${q.replace(/"/g,'\\"')}"`});};
    async function hardenedOperatingLoop(options={}){
        const environment=options.environment||'Windows Desktop',root=normalize(options.root||''),objective=options.objective||'',constraints=options.constraints||{};
        const discover=typeof globalScope.performArchitectureDiscovery==='function'?()=>Promise.resolve(globalScope.performArchitectureDiscovery(root)):null;
        if(!discover)return{available:false,status:'discovery-unavailable',version:UNIVERSAL_EVIDENCE_ADAPTER_VERSION};
        const initialScan=await discover();
        const plan=globalScope.runUniversalArchitectLoop(initialScan,{environment,objective,constraints});
        const allowed=new Set(['read_file','write_file','replace_file_content','multi_replace_file_content','analyze_file','list_files','fast_file_search']);
        const history=[{role:'user',parts:[{text:'Implementation mission. Objective: '+objective+'\nArchitecture plan:\n'+JSON.stringify(plan).slice(-24000)+'\nRules: inspect first; preserve contracts; never overwrite a file with replacement-only content.'}]}];
        const executions=[];let changed=false;
        for(let turn=0;turn<5;turn++){
            const response=await globalScope.callAiBrain(history),candidate=response?.candidates?.[0];if(!candidate?.content?.parts?.length)break;history.push(candidate.content);const calls=candidate.content.parts.filter(p=>p.functionCall&&allowed.has(p.functionCall.name));if(!calls.length)break;
            for(const part of calls.slice(0,8)){
                const {name,args={}}=part.functionCall,path=normalize(args.path||'');let result;
                if(name==='fast_file_search')result=await search(args.query||'');
                else if(name==='read_file'||name==='analyze_file')result=await readFile(path);
                else if(name==='list_files')result=await globalScope.callLocalBridge('list',{path:path||'.'});
                else if(name==='write_file'){result=await writeFile(path,args.content||'','Universal Agent Operating Loop implementation');changed=true;}
                else if(name==='replace_file_content'){const current=await readFile(path);if(!current.includes(args.targetContent||''))throw new Error(`replace_file_content target not found: ${path}`);result=await writeFile(path,current.replace(args.targetContent||'',args.replacementContent||''),'Universal Agent Operating Loop surgical replacement');changed=true;}
                else{const current=await readFile(path);let updated=current,matched=0;for(const r of(args.replacements||[])){if(updated.includes(r.targetContent)){updated=updated.replace(r.targetContent,r.replacementContent);matched++;}}if(!matched)throw new Error(`multi_replace_file_content: none of the targets matched: ${path}`);result=await writeFile(path,updated,'Universal Agent Operating Loop batch');changed=true;}
                executions.push({turn,name,path,result:typeof result==='string'?result:JSON.stringify(result)});history.push({role:'function',parts:[{functionResponse:{name,response:{content:typeof result==='string'?result:JSON.stringify(result)}}}]});
            }
        }
        let verification=null;if(changed&&options.verify!==false&&typeof globalScope.runClosedRuntimeRepairLoop==='function')verification=await globalScope.runClosedRuntimeRepairLoop({environment,root,snapshot:initialScan,baseline:initialScan,runBuild:options.runBuild!==false,runTests:options.runTests!==false,runRuntime:options.runRuntime!==false,startCommand:options.startCommand||'',healthUrl:options.healthUrl||'',apiPath:options.apiPath||'',maxRetries:options.maxRetries??1,runtimeChecks:options.runtimeChecks??3,maxRepairAttempts:options.maxRepairAttempts??2,execute:async command=>globalScope.callLocalBridge('cmd',{command}),discover,repair:options.repair});
        const post=await discover(),before={components:initialScan?.architecture?.components||initialScan?.components||[]},after={components:post?.architecture?.components||post?.components||[]},diff=typeof globalScope.ua2ArchitectureDiff==='function'?globalScope.ua2ArchitectureDiff(before,after):null;
        return{available:true,version:UNIVERSAL_EVIDENCE_ADAPTER_VERSION,status:verification?.status||(changed?'implemented':'unchanged'),objective,plan,implementation:{changed,executions},verification,architectureDiff:diff,finalDiscoverySummary:post?.summary||null,closedLoop:Boolean(changed&&verification)};
    }
    Object.defineProperty(hardenedOperatingLoop,'__evidenceWrapped',{value:false,enumerable:false});
    globalScope.runUniversalAgentOperatingLoop=hardenedOperatingLoop;
    if(typeof globalScope.callBridge==='function'){
        const bridgeUrl=globalScope.SUPABASE_BRIDGE_URL||'https://ozcffmadatsfyyldqmdl.supabase.co/functions/v1/vsa-bridge';
        globalScope.callBridge=async function secureBridge(action,payload){const publicKey=typeof globalScope.__SUPABASE_PUBLIC_KEY__==='string'?globalScope.__SUPABASE_PUBLIC_KEY__:'';const headers={'Content-Type':'application/json'};if(publicKey){headers.Authorization=`Bearer ${publicKey}`;headers.apikey=publicKey;}try{const response=await fetch(bridgeUrl,{method:'POST',headers,body:JSON.stringify({action,...payload})});const data=await response.json();return response.ok?data:{error:data?.error||data?.message||`Bridge error: ${response.status}`};}catch(error){return{error:error?.message||String(error)}}};
    }
    const legacy=globalScope.runUniversalAgentOperatingLoop;
    async function evidenceWrappedOperatingLoop(options={}){
        const environment=options.environment||'Windows Desktop',root=normalize(options.root||''),missionOptions={...options,environment,root,verify:options.verify!==false},mission=createUniversalEvidenceMission(missionOptions);
        const discover=async()=>typeof globalScope.performArchitectureDiscovery==='function'?await Promise.resolve(globalScope.performArchitectureDiscovery(root)):null;
        let baseline=null,result;try{baseline=await discover();result=await legacy(missionOptions);}catch(error){result={status:'failed',error:String(error?.message||error),implementation:{changed:false,executions:[]}};}
        let post=null;try{post=await discover();}catch(error){post={error:String(error?.message||error)}}
        const finalized=finalizeUniversalEvidenceMission(mission,missionOptions,result,baseline,post,typeof globalScope.architectNormalizeSnapshot==='function'?globalScope.architectNormalizeSnapshot:null);
        return{...result,available:true,version:UNIVERSAL_EVIDENCE_ADAPTER_VERSION,status:finalized.acceptance.verdict,success:finalized.state==='completed',mission:finalized,acceptance:finalized.acceptance,evidence:finalized.evidence,checkpoint:finalized.checkpoint,successReason:finalized.acceptance.confidence.reasons.join(' '),failureReason:finalized.state==='failed'?finalized.acceptance.confidence.reasons.join(' '):null};
    }
    Object.defineProperty(evidenceWrappedOperatingLoop,'__evidenceWrapped',{value:true,enumerable:false});
    globalScope.runUniversalAgentOperatingLoop=evidenceWrappedOperatingLoop;globalScope.UNIVERSAL_EVIDENCE_ADAPTER_VERSION=UNIVERSAL_EVIDENCE_ADAPTER_VERSION;
})(window);