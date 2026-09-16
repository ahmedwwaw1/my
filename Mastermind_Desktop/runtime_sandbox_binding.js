/*
 * Runtime Sandbox Binding 1.0
 * Connects the Core's sandbox manager to the empirical Desktop adapter.
 * If the adapter is unavailable, execution is rejected rather than falling back
 * to the unrestricted local command bridge.
 */
(function(){
  const root = typeof globalThis !== 'undefined' ? globalThis : window;
  let bound = false;

  function loadAdapter(){
    try {
      if (typeof require === 'function') return require('./universal_skill_execution_adapter.js');
    } catch (_) {}
    try {
      if (root.window && typeof root.window.require === 'function') return root.window.require('./universal_skill_execution_adapter.js');
    } catch (_) {}
    return null;
  }

  function bind(){
    const original = root.sandboxManager;
    if (typeof original !== 'function') { setTimeout(bind, 50); return; }
    if (root.__MASTERmindSandboxBinding?.bound) return;

    const adapter = loadAdapter();
    if (!adapter || typeof adapter.executeProcess !== 'function') {
      root.__MASTERmindSandboxBinding = { bound: false, available: false, status: 'adapter-unavailable' };
      root.sandboxManager = async function(action, args = {}) {
        const a = String(action || 'prepare').toLowerCase();
        if (a === 'prepare' || a === 'create' || a === 'validate' || a === 'destroy') return original(a, args, {});
        return { ok:false, status:'unavailable', failure:'verified runtime sandbox adapter unavailable; unrestricted bridge execution is disabled', runtimeRequired:true };
      };
      root.universalSkillExecutionSandboxManager = root.sandboxManager;
      return;
    }

    const execute = async (command, meta = {}) => {
      return adapter.executeProcess(command, { ...meta, runtimeVerification: true });
    };

    const boundManager = async function(action, args = {}) {
      const a = String(action || 'prepare').toLowerCase();
      if (a === 'prepare' || a === 'create' || a === 'validate' || a === 'destroy') return original(a, args, {});
      if (a !== 'execute' && a !== 'run') return original(a, args, { execute });
      if (!args || args.allowCommand !== true) return { ok:false, status:'blocked', failure:'sandbox execution requires explicit allowCommand=true' };
      return original(a, args, { execute });
    };

    root.sandboxManager = boundManager;
    root.universalSkillExecutionSandboxManager = boundManager;
    root.__MASTERmindSandboxBinding = { bound:true, available:true, adapter:'Mastermind_Desktop/universal_skill_execution_adapter.js', version:'1.0-runtime-binding' };
    bound = true;
  }

  bind();
})();
