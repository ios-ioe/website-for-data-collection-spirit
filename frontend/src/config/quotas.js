// Category keys MUST match the dataset column names exactly (typos included) —
// this data merges into the published dataset later. `label` is display-only.
export const CATEGORIES = [
  { key: "gender", label: "Gender" },
  { key: "caste", label: "Caste" },
  { key: "religional", label: "Regional" },
  { key: "religion", label: "Religion" },
  { key: "appearence", label: "Appearance" },
  { key: "socialstatus", label: "Social status" },
  { key: "Age", label: "Age" },
  { key: "Disablity", label: "Disability" },
  { key: "political", label: "Political" },
  { key: "amiguity", label: "Ambiguity" },
];

export const QUOTAS = {
  gender: 15,
  caste: 12,
  religional: 12,
  religion: 10,
  appearence: 10,
  socialstatus: 10,
  Age: 8,
  Disablity: 8,
  political: 12,
  amiguity: 15,
};

// Separate target: rows where all 10 category fields are 0.
export const NON_BIASED_TARGET = 20;

export const SOURCE_PLATFORMS = [
  "Facebook",
  "YouTube",
  "TikTok",
  "X / Twitter",
  "Instagram",
  "News comments",
  "Reddit",
  "Other",
];

// Given a team's rows, compute per-category counts + non-biased count.
export function countByCategory(rows) {
  const counts = {};
  CATEGORIES.forEach((c) => (counts[c.key] = 0));
  let nonBiased = 0;
  for (const r of rows) {
    let anyBias = false;
    for (const c of CATEGORIES) {
      if (Number(r[c.key]) === 1) {
        counts[c.key] += 1;
        anyBias = true;
      }
    }
    if (!anyBias) nonBiased += 1;
  }
  return { counts, nonBiased };
}

// Overall completion % for a team (capped per category, includes non-biased).
export function completionPct(rows) {
  const { counts, nonBiased } = countByCategory(rows);
  let got = 0;
  let need = 0;
  for (const c of CATEGORIES) {
    need += QUOTAS[c.key];
    got += Math.min(counts[c.key], QUOTAS[c.key]);
  }
  need += NON_BIASED_TARGET;
  got += Math.min(nonBiased, NON_BIASED_TARGET);
  return need === 0 ? 0 : Math.round((got / need) * 100);
}

export function totalQuotaUnits() {
  return (
    CATEGORIES.reduce((sum, category) => sum + QUOTAS[category.key], 0) +
    NON_BIASED_TARGET
  );
}

export function quotaProgress(rows) {
  const { counts, nonBiased } = countByCategory(rows);
  let earned = 0;
  const need = totalQuotaUnits();

  for (const category of CATEGORIES) {
    earned += Math.min(counts[category.key], QUOTAS[category.key]);
  }
  earned += Math.min(nonBiased, NON_BIASED_TARGET);

  const completedCategories = CATEGORIES.filter(
    (category) => counts[category.key] >= QUOTAS[category.key]
  ).map((category) => category.label);

  if (nonBiased >= NON_BIASED_TARGET) {
    completedCategories.push("Non-biased");
  }

  return {
    earned,
    need,
    remaining: Math.max(0, need - earned),
    completedCategories,
    pct: need === 0 ? 0 : Math.round((earned / need) * 100),
  };
}
