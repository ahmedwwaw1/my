import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EXECUTOR_URL = String(Deno.env.get("RUNTIME_EXECUTOR_URL") || "").replace(/\/$/, "");
const EXECUTOR_SECRET = String(Deno.env.get("RUNTIME_EXECUTOR_SECRET") || "");

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function hex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacSha256(secret: string, body: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
}

function isAllowedCommand(command: string) {
  return /^(node\s+--check\s+[^\s]+|npm\s+(?:test|run\s+(?:test|lint|build|typecheck))|python(?:3)?\s+-m\s+pytest(?:\s+[^\s]+)*|pytest(?:\s+[^\s]+)*)$/i.test(String(command || "").trim());
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response({ ok: false, error: "method_not_allowed" }, 405);
  if (!EXECUTOR_URL || !EXECUTOR_SECRET) {
    return response({ ok: false, status: "backend_unavailable", failure: "external_runtime_not_configured", runtimeRequired: true }, 503);
  }

  try {
    const incoming = await req.json();
    if (incoming?.allowCommand !== true) return response({ ok: false, status: "blocked", failure: "allowCommand_required", runtimeRequired: true }, 403);
    const command = String(incoming.command || "").trim();
    if (!isAllowedCommand(command)) return response({ ok: false, status: "blocked", failure: "command_not_allowlisted", runtimeRequired: true }, 403);

    const payload = JSON.stringify({
      command,
      allowCommand: true,
      timeoutMs: incoming.timeoutMs,
      maxOutputBytes: incoming.maxOutputBytes,
      maxMemoryMb: incoming.maxMemoryMb,
      maxCpus: incoming.maxCpus,
      maxProcesses: incoming.maxProcesses,
      image: incoming.image,
      workspaceFiles: incoming.workspaceFiles || {},
    });
    const signature = await hmacSha256(EXECUTOR_SECRET, payload);
    const res = await fetch(`${EXECUTOR_URL}/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Runtime-Token": EXECUTOR_SECRET,
        "X-Runtime-Signature": signature,
      },
      body: payload,
    });
    const text = await res.text();
    let data: unknown;
    try { data = JSON.parse(text); } catch { data = { ok: false, status: "invalid_executor_response", raw: text.slice(0, 2000) }; }
    if (!res.ok) return response(data, res.status >= 500 ? 502 : res.status);
    return response(data, 200);
  } catch (error) {
    return response({ ok: false, status: "runtime_gateway_error", failure: error instanceof Error ? error.message : String(error), runtimeRequired: true }, 502);
  }
});
