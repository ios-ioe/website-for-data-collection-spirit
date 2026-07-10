import { supabase } from "./supabase.js";

const DEFAULT_TIMEOUT_MS = 30000;
const HF_BASE = (import.meta.env.VITE_HF_SPACE_URL || "").replace(/\/$/, "");

async function postToBackend(path, body, timeoutMs = DEFAULT_TIMEOUT_MS) {
  if (!HF_BASE) {
    throw new Error(
      "VITE_HF_SPACE_URL is not configured. Set it in .env or Vercel env vars."
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${HF_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
      signal: controller.signal,
    });

    if (!res.ok) {
      let detail = "";
      try {
        const payload = await res.json();
        detail = payload.detail || JSON.stringify(payload);
      } catch {
        detail = await res.text().catch(() => "");
      }
      throw new Error(`${path} failed (${res.status}): ${detail}`);
    }

    return res.json();
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(`${path} timed out after ${timeoutMs / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function checkHealth() {
  if (!HF_BASE) return { ok: false, reason: "missing_url" };
  try {
    const res = await fetch(`${HF_BASE}/health`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { ok: false, reason: `status_${res.status}` };
    return { ok: true, data: await res.json() };
  } catch {
    return { ok: false, reason: "unreachable" };
  }
}

export function checkSubmission(team_id, text) {
  return postToBackend("/check-submission", { team_id, text });
}

export async function loginWithAccessCode(accessCode) {
  const code = accessCode.trim();
  if (!code) {
    throw new Error("Enter your team access code.");
  }

  const { data, error } = await supabase
    .from("teams")
    .select("team_id, team_name")
    .eq("access_code", code)
    .maybeSingle();

  if (error) {
    const { data: rpcData, error: rpcError } = await supabase.rpc("verify_access_code", {
      code,
    });
    if (rpcError) throw rpcError;

    const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
    if (!row) {
      throw new Error("That access code doesn't match a team. Check with the organizer.");
    }
    return { team_id: row.team_id, team_name: row.team_name };
  }

  if (!data) {
    throw new Error("That access code doesn't match a team. Check with the organizer.");
  }

  return { team_id: data.team_id, team_name: data.team_name };
}

export async function insertSubmission(submission) {
  const { data, error } = await supabase
    .from("submissions")
    .insert(submission)
    .select("id")
    .single();

  if (error) throw error;
  return data;
}

export function runQaBatch() {
  return postToBackend("/qa-batch", {}, 120000);
}
