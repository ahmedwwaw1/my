const fs=require('fs');
const path=require('path');
const root=process.cwd();
const sandboxSource=(p)=>fs.readFileSync(path.join(root,p),'utf8');
function patchCore(file, sandboxFile){
  let s=fs.readFileSync(path.join(root,file),'utf8');
  const src=sandboxSource(sandboxFile);
  if(!s.includes('UNIVERSAL_SKILL_EXECUTION_SANDBOX_VERSION')){
    s += `\n\n/* --- Integrated Universal Skill Execution Sandbox --- */\n${src}\n`;
  }
  s=s.replace(/CORE:\s*\[("skill_benchmark_runner",?)/, 'CORE: ["skill_execution_sandbox", $1');
  if(!s.includes('name===\"skill_execution_sandbox\"')&&!s.includes('name === "skill_execution_sandbox"')){
    s=s.replace(/\s*else if \(name === "skill_benchmark_runner"\)/,
`\n                else if (name === "skill_execution_sandbox") toolResult = await sandboxManager(args?.action || "prepare", args || {}, { execute: async (command,meta) => {\n                    if (typeof callLocalBridge !== 'function') throw new Error('local execution bridge unavailable');\n                    return await callLocalBridge('cmd', { command, timeoutMs: meta?.timeoutMs, cwd: meta?.workingDirectory });\n                } });\n                else if (name === "skill_benchmark_runner")`);
  }
  s=s.replace(/return await callLocalBridge\('cmd',\s*\{command,timeoutMs:meta\?\.timeoutMs\}\);/, `const boxed=await sandboxManager('run',{command,allowCommand:true,timeoutMs:meta?.timeoutMs,network:'disabled',filesystem:'isolated-workspace',process:'adapter-isolated'},{execute:async (cmd,smeta)=>{\n                        if (typeof callLocalBridge !== 'function') throw new Error('local execution bridge unavailable');\n                        return await callLocalBridge('cmd',{command:cmd,timeoutMs:smeta?.timeoutMs,cwd:smeta?.workingDirectory});\n                    }});\n                    if(boxed?.evidence) return {success:boxed.ok,exitCode:boxed.evidence.exitCode,stdout:boxed.evidence.output,sandbox:boxed};\n                    return boxed;`);
  s=s.replace(/return await callLocalBridge\('cmd',\{command,timeoutMs:meta\?\.timeoutMs\}\);/, `const boxed=await sandboxManager('run',{command,allowCommand:true,timeoutMs:meta?.timeoutMs,network:'disabled',filesystem:'isolated-workspace',process:'adapter-isolated'},{execute:async (cmd,smeta)=>{\n                            if (typeof callLocalBridge !== 'function') throw new Error('local execution bridge unavailable');\n                            return await callLocalBridge('cmd',{command:cmd,timeoutMs:smeta?.timeoutMs,cwd:smeta?.workingDirectory});\n                        }});\n                        return boxed?.evidence ? {success:boxed.ok,exitCode:boxed.evidence.exitCode,stdout:boxed.evidence.output,sandbox:boxed} : boxed;`);
  const constitutionNeed='"universal_skill_execution_sandbox"';
  if(!s.includes(constitutionNeed)) s=s.replace(/("universal_skill_benchmark_evolution":\s*"[^"]*",)/, `$1\n  ${constitutionNeed}: "Benchmark execution passes through an execution sandbox contract with explicit authorization, bounded time/output, network disabled by default, isolated-workspace intent, redacted evidence, and adapter-enforced isolation. Never claim OS-level isolation unless the runtime adapter proves it." ,`);
  const toolDecl=`\n/* --- Integrated Universal Skill Execution Sandbox Tool --- */\nconst UNIVERSAL_SKILL_EXECUTION_SANDBOX_TOOL_DECLARATION={name:'skill_execution_sandbox',description:'Prepare or execute an explicitly authorized benchmark command through the universal sandbox contract and return evidence with safety boundaries.',parameters:{type:'OBJECT',properties:{action:{type:'STRING',enum:['prepare','create','execute','run','validate','destroy']},command:{type:'STRING'},allowCommand:{type:'BOOLEAN'},timeoutMs:{type:'NUMBER'},workingDirectory:{type:'STRING'},network:{type:'STRING'},filesystem:{type:'STRING'}},required:['action']}};\n(function(){if(typeof AI_TOOLS!=='undefined'&&AI_TOOLS[0]?.function_declarations&&!AI_TOOLS[0].function_declarations.some(x=>x.name==='skill_execution_sandbox'))AI_TOOLS[0].function_declarations.push(UNIVERSAL_SKILL_EXECUTION_SANDBOX_TOOL_DECLARATION);})();\n`;
  if(!s.includes('UNIVERSAL_SKILL_EXECUTION_SANDBOX_TOOL_DECLARATION')) s += toolDecl;
  fs.writeFileSync(path.join(root,file),s);
}
patchCore('my_AI/ai_engine_core.js','my_AI/universal_skill_execution_sandbox_engine.js');
patchCore('Mastermind_Desktop/core.js','Mastermind_Desktop/universal_skill_execution_sandbox_engine.js');
for(const f of ['my_AI/ai_engine_core.js','Mastermind_Desktop/core.js','my_AI/universal_skill_execution_sandbox_engine.js','Mastermind_Desktop/universal_skill_execution_sandbox_engine.js']){
  const data=fs.readFileSync(path.join(root,f),'utf8');
  if(!data.includes('UNIVERSAL_SKILL_EXECUTION_SANDBOX_VERSION')) throw new Error('sandbox integration missing: '+f);
}
console.log('sandbox integration verified');
