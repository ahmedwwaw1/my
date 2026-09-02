# Implementation Plan - Fix Connection and Timeout Issues

The user is experiencing connection failures and "Request idle timeout limit (150s) reached" errors after refactoring their AI logic into separate files. This plan addresses issues in both the client-side JavaScript and the Supabase Edge Function (bridge).

## User Review Required

> [!IMPORTANT]
> The current Edge Function logic iterates through a long list of futuristic/placeholder model IDs (e.g., `gemini-3.7-flash`). Since these models do not yet exist, every request results in multiple 404 errors and retries, which contributes to the 150s timeout. I will update these to currently available stable models.

## Proposed Changes

### [Component] Supabase Edge Function (Bridge Logic)

#### [MODIFY] [supabase_bridge_logic.js](file:///D:/New folder/my/supabase_bridge_logic.js)
- Add a default response at the end of the `serve` handler to prevent timeouts for unknown actions.
- Add an explicit handler for the `health_check` action.
- Update `MODEL_ROUTES` with valid Gemini model IDs (e.g., `gemini-1.5-flash`, `gemini-2.0-flash-exp`).
- Improve error handling to ensure a response is always sent back to the client.

---

### [Component] Client-side AI Logic

#### [MODIFY] [ai_engine_core.js](file:///D:/New folder/my/ai_engine_core.js)
- Fix `repairSystem` to avoid overwriting the `action` parameter when calling the bridge.
- Improve error handling in `callBridge` to handle non-JSON responses gracefully (preventing crash on timeout messages).
- Update tool execution logic to use correct actions supported by the bridge.

#### [MODIFY] [ai_app_logic.js](file:///D:/New folder/my/ai_app_logic.js)
- Ensure the heartbeat logic doesn't falsely report "ONLINE" if the bridge hasn't actually been reached recently. (Optional but recommended).

## Verification Plan

### Manual Verification
1. Test the "Ask AI" functionality to ensure responses are received without the 150s timeout.
2. Check the "Bridge: OK | ONLINE" status to ensure it reflects actual connectivity.
3. Verify that tool use (e.g., reading/writing files) still works through the bridge.
4. Intentionally trigger a failure (e.g., wrong model ID) to verify that the error handling shows a clear message instead of hanging.
