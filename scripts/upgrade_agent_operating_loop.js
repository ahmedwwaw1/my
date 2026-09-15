const fs=require('fs');
const files=['my_AI/ai_engine_core.js','Mastermind_Desktop/core.js'];
const helper=String.raw`
/** Universal Agent Operating Loop 1.0 */
const UNIVERSAL_AGENT_OPERATING_LOOP_VERSION='1.0-operating-loop';
async function runUniversalAgentOperatingLoop(options={}){
 const root=options.root||'.'; const environment=options.environment||'Unknown';
 const objective=options.objective||''; const constraints=options.constraints||{};
 const discover=typeof performCloudArchitectureDiscovery==='function'?(()=>performCloudArchitectureDiscovery(root)):(typeof performArchitectureDiscovery==='function'?(()=>performArchitectureDiscovery(root)):null);
 if(!discover)return{available:false,status:'discovery-unavailable',version:UNIVERSAL_AGENT_OPERATING_LOOP_VERSION};
 const initialScan=await discover();
 const plan=runUniversalArchitectLoop(initialScan,{environment,objective,constraints});
 const allowed=new Set(['read_file','write_file','replace_file_content','multi_replace_file_content','analyze_file','list_files','fast_file_search']);
 const history=[{role:'user',parts:[{text:'Implementation mission. Objective: '+objective+'\nArchitecture plan:\n'+JSON.stringify(plan).slice(-24000)+'\nRules: inspect before writing; implement only the objective; preserve contracts; use the smallest safe cross-file change; do not call architecture_loop or runtime_verify; do not redesign unrelated code.'}]}];
 const executions=[]; let changed=false;
 for(let turn=0;turn<5;turn++){
  const response=await callAiBrain(history); const candidate=response?.candidates?.[0]; if(!candidate?.content?.parts?.length)break;
  history.push(candidate.content); const calls=candidate.content.parts.filter(p=>p.functionCall&&allowed.has(p.functionCall.name)); if(!calls.length)break;
  for(const part of calls.slice(0,8)){
   const {name,args={}}=part.functionCall; const path=normalizePathForCloud(args.path||''); let result;
   if(name==='read_file'||name==='analyze_file')result=typeof getGithubFileContent==='function'?await getGithubFileContent(path):await callLocalBridge('read',{path});
   else if(name==='list_files')result=typeof listGithubFiles==='function'?await listGithubFiles(path||''):await callLocalBridge('list',{path:path||'.'});
   else if(name==='write_file'){result=typeof writeFile==='function'?await writeFile(path,args.content||'','Universal Agent Operating Loop implementation'):await callLocalBridge('write',{path,content:args.content||''});changed=true;}
   else if(name==='replace_file_content'){result=typeof replaceFileContent==='function'?await replaceFileContent(path,args.targetContent||'',args.replacementContent||''):await callLocalBridge('write',{path,content:args.replacementContent||''});changed=true;}
   else {let current=typeof getGithubFileContent==='function'?await getGithubFileContent(path):await callLocalBridge('read',{path});if(current&&typeof current==='object'&&current.content)current=current.content;let updated=String(current||'');for(const r of (args.replacements||[]))if(updated.includes(r.targetContent))updated=updated.replace(r.targetContent,r.replacementContent);result=typeof writeFile==='function'?await writeFile(path,updated,'Universal Agent Operating Loop batch'):await callLocalBridge('write',{path,content:updated});changed=true;}
   executions.push({turn,name,path,result:typeof result==='string'?result:JSON.stringify(result)}); history.push({role:'function',parts:[{functionResponse:{name,response:{content:typeof result==='string'?result:JSON.stringify(result)}}}]});
  }
 }
 let verification=null;
 if(changed&&options.verify!==false&&typeof runClosedRuntimeRepairLoop==='function'){
  verification=await runClosedRuntimeRepairLoop({environment,root,snapshot:initialScan,baseline:initialScan,runBuild:options.runBuild!==false,runTests:options.runTests!==false,runRuntime:options.runRuntime!==false,startCommand:options.startCommand||'',healthUrl:options.healthUrl||'',apiPath:options.apiPath||'',maxRetries:options.maxRetries??1,runtimeChecks:options.runtimeChecks??3,maxRepairAttempts:options.maxRepairAttempts??2,execute:async command=>typeof callLocalBridge==='function'?callLocalBridge('cmd',{command}):null,discover,repair:async({failure})=>{
    const h=[{role:'user',parts:[{text:'Repair only the first evidenced root cause. Objective: '+objective+'\nEvidence:\n'+JSON.stringify(failure).slice(-16000)+'\nInspect implicated files and apply the smallest safe fix.'}]}]; let applied=false; const results=[];
    for(let t=0;t<3;t++){const r=await callAiBrain(h);const c=r?.candidates?.[0];if(!c?.content?.parts?.length)break;h.push(c.content);const calls=c.content.parts.filter(p=>p.functionCall&&['read_file','write_file','replace_file_content','multi_replace_file_content','analyze_file'].includes(p.functionCall.name));if(!calls.length)break;for(const part of calls.slice(0,6)){const {name,args={}}=part.functionCall;const path=normalizePathForCloud(args.path||'');let out;if(name==='read_file'||name==='analyze_file')out=typeof getGithubFileContent==='function'?await getGithubFileContent(path):await callLocalBridge('read',{path});else if(name==='write_file'){out=typeof writeFile==='function'?await writeFile(path,args.content||'','Closed runtime repair'):await callLocalBridge('write',{path,content:args.content||''});applied=true;}else if(name==='replace_file_content'){out=typeof replaceFileContent==='function'?await replaceFileContent(path,args.targetContent||'',args.replacementContent||''):await callLocalBridge('write',{path,content:args.replacementContent||''});applied=true;}else{let cur=typeof getGithubFileContent==='function'?await getGithubFileContent(path):await callLocalBridge('read',{path});if(cur&&typeof cur==='object'&&cur.content)cur=cur.content;let upd=String(cur||'');for(const x of (args.replacements||[]))if(upd.includes(x.targetContent))upd=upd.replace(x.targetContent,x.replacementContent);out=typeof writeFile==='function'?await writeFile(path,upd,'Closed runtime repair batch'):await callLocalBridge('write',{path,content:upd});applied=true;}results.push({name,path,result:typeof out==='string'?out:JSON.stringify(out)});}if(applied)break;}
    return{applied,results};
  }});
 }
 const finalScan=await discover(); const before={components:initialScan?.architecture?.components||initialScan?.components||[]}; const after={components:finalScan?.architecture?.components||finalScan?.components||[]}; const diff=typeof ua2ArchitectureDiff==='function'?ua2ArchitectureDiff(before,after):null;
 return{available:true,version:UNIVERSAL_AGENT_OPERATING_LOOP_VERSION,status:verification?.status||'implemented',objective,plan,implementation:{changed,executions},verification,architectureDiff:diff,finalDiscoverySummary:finalScan?.summary||null,closedLoop:Boolean(changed&&verification)};
}
`;
for(const file of files){
 let s=fs.readFileSync(file,'utf8');
 if(!s.includes('UNIVERSAL_AGENT_OPERATING_LOOP_VERSION')){
  const anchor=s.includes('async function callAiBrain(history)')?'async function callAiBrain(history)':(s.includes('async function callAiBrain')?'async function callAiBrain':null);
  if(!anchor)throw new Error(file+': callAiBrain anchor not found');
  s=s.replace(anchor,helper+'\n'+anchor);
 }
 const re=/else if \(name === [\"']architecture_loop[\"']\) \{[\s\S]*?\n\s*\}\s*else if \(name === [\"']runtime_verify[\"']\)/;
 const replacement=file.includes('Mastermind_Desktop')?`else if (name === "architecture_loop") {\n try { toolResult=await runUniversalAgentOperatingLoop({environment:"Windows Desktop",root:safePath||"",objective:args?.objective||"",constraints:args?.constraints||{},verify:true,maxRepairAttempts:2}); } catch(e){ toolResult={error:"Universal agent operating loop failed.",details:e?.message||String(e)}; }\n }\n else if (name === "runtime_verify")`:`else if (name === "architecture_loop") {\n try { toolResult=await runUniversalAgentOperatingLoop({environment:"GitHub Cloud",root:safePath||"",objective:args?.objective||"",constraints:args?.constraints||{},verify:true,maxRepairAttempts:2}); } catch(e){ toolResult={error:"Universal agent operating loop failed.",details:e?.message||String(e)}; }\n }\n else if (name === "runtime_verify")`;
 if(!re.test(s))throw new Error(file+': architecture_loop branch not found');
 s=s.replace(re,replacement); fs.writeFileSync(file,s);
 const definitions=(s.match(/const UNIVERSAL_AGENT_OPERATING_LOOP_VERSION\s*=/g)||[]).length; if(definitions!==1)throw new Error(file+': loop version definition count '+definitions);
}
console.log('Agent Operating Loop upgrade applied to both cores.');
