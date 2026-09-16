const { executeDocker } = require('../my_AI/universal_skill_execution_adapter');
const { executeProcess } = require('../Mastermind_Desktop/universal_skill_execution_adapter');
(async()=>{
  const docker=await executeDocker('node --check my_AI/ai_engine_core.js',{workingDirectory:process.cwd(),timeoutMs:30000,maxOutputBytes:8000});
  if(docker.success!==true||!String(docker.isolationLevel).startsWith('container-isolated')) throw new Error('Docker adapter proof failed: '+JSON.stringify(docker));
  const local=await executeProcess('node --check Mastermind_Desktop/core.js',{cwd:process.cwd(),timeoutMs:30000,maxOutputBytes:8000});
  if(local.success!==true||!String(local.isolationLevel).startsWith('process-isolated')) throw new Error('Process adapter proof failed: '+JSON.stringify(local));
  console.log(JSON.stringify({docker:{success:docker.success,isolationLevel:docker.isolationLevel,isolationBackend:docker.isolationBackend,network:docker.network,readOnlyRoot:docker.readOnlyRoot,capDropAll:docker.capDropAll,noNewPrivileges:docker.noNewPrivileges},process:{success:local.success,isolationLevel:local.isolationLevel,isolationBackend:local.isolationBackend,network:local.network,shell:local.shell}}));
})();
