import { supabase } from "./supabase.js";
import { CATEGORIES } from "../config/quotas.js";

export const EXPORT_JSON_KEYS = [
  "team_id",
  "text",
  "gender",
  "religional",
  "caste",
  "religion",
  "appearence",
  "socialstatus",
  "amiguity",
  "political",
  "Age",
  "Disablity",
  "source_platform",
  "source_date",
  "submitted_at",
  "flag_duplicate",
  "flag_pii",
  "judge_reviewed",
];

const ADMIN_EXTRA_COLS = [
  "id",
  "team_id",
  "text",
  "source_platform",
  "source_date",
  "submitted_at",
  "flag_duplicate",
  "flag_pii",
  "judge_reviewed",
];

function quoteColumn(key) {
  return /[A-Z]/.test(key) ? `"${key}"` : key;
}

export function submissionSelectColumns(extra = []) {
  const categoryCols = CATEGORIES.map((category) => quoteColumn(category.key));
  return [...extra, ...categoryCols].join(",");
}

export function adminSelectColumns() {
  return submissionSelectColumns(ADMIN_EXTRA_COLS);
}

export function exportSelectColumns() {
  return EXPORT_JSON_KEYS.map(quoteColumn).join(",");
}

export async function fetchTeamSubmissions(teamId) {
  const { data, error } = await supabase
    .from("submissions")
    .select(submissionSelectColumns(["id"]))
    .eq("team_id", teamId);
  if (error) throw error;
  return data || [];
}

export async function fetchAllSubmissions(columns) {
  const all = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const from = page * pageSize;
    const { data, error } = await supabase
      .from("submissions")
      .select(columns)
      .order("submitted_at", { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data?.length) break;
    all.push(...data);
    if (data.length < pageSize) break;
    page += 1;
  }

  return all;
}

export async function fetchPublicTeams() {
  const { data, error } = await supabase
    .from("teams_public")
    .select("team_id, team_name");
  if (error) throw error;
  return data || [];
}

export async function countTeamSubmissions(teamId) {
  const { count, error } = await supabase
    .from("submissions")
    .select("*", { count: "exact", head: true })
    .eq("team_id", teamId);
  if (error) throw error;
  return count ?? 0;
}

export async function updateJudgeReviewed(id, reviewed) {
  const { error } = await supabase
    .from("submissions")
    .update({ judge_reviewed: reviewed })
    .eq("id", id);
  if (error) throw error;
}

export function buildExportRows(rows) {
  return rows.map((row) => {
    const output = {};
    for (const key of EXPORT_JSON_KEYS) {
      output[key] = row[key] ?? null;
    }
    return output;
  });
}

export function downloadJson(rows, filenamePrefix = "bias_submissions") {
  const payload = buildExportRows(rows);
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  return payload.length;
}
