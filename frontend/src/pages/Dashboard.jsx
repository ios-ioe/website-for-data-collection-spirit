import { useEffect, useMemo, useState } from "react";
import { fetchMySubmissions } from "../lib/api.js";
import { useTeam } from "../context/TeamContext.jsx";
import {
  CATEGORIES,
  QUOTAS,
  NON_BIASED_TARGET,
  countByCategory,
  quotaProgress,
} from "../config/quotas.js";
import ProgressCard from "../components/ProgressCard.jsx";
import QuotaProgress from "../components/QuotaProgress.jsx";
import LoadingCard from "../components/LoadingCard.jsx";
import { SkeletonMeters } from "../components/Skeleton.jsx";
import Badge from "../components/Badge.jsx";
import EmptyState from "../components/EmptyState.jsx";

const REFRESH_MS = 15000;

export default function Dashboard() {
  const { team_name } = useTeam();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const data = await fetchMySubmissions();
        if (active) {
          setRows(data);
          setError("");
        }
      } catch (err) {
        if (active) setError(err.message || "Failed to load progress.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const { counts, nonBiased } = useMemo(() => countByCategory(rows), [rows]);
  const progress = useMemo(() => quotaProgress(rows), [rows]);
  const completedQuotaCount = progress.completedCategories.length;

  return (
    <div className="dash">
      <div className="submit-head">
        <div>
          <h1 className="page-title">{team_name}</h1>
          <p className="page-sub">Live progress toward each category quota.</p>
        </div>
        <div className="stat-pill stat-pill-lg">
          <span className="stat-num">{progress.pct}%</span>
          <span className="stat-cap">complete</span>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <LoadingCard count={5} />
      ) : (
        <div className="dash-summary">
          <ProgressCard label="Total submissions" value={rows.length} />
          <ProgressCard
            label="Completed quotas"
            value={completedQuotaCount}
            hint={`of ${CATEGORIES.length + 1} categories`}
          />
          <ProgressCard label="Remaining quotas" value={progress.remaining} />
          <ProgressCard
            label="Non-biased progress"
            value={`${nonBiased} / ${NON_BIASED_TARGET}`}
          />
          <ProgressCard
            label="Overall completion"
            value={`${progress.pct}%`}
            hint={`${progress.earned} / ${progress.need} units`}
            accent
          />
        </div>
      )}

      {progress.completedCategories.length > 0 && (
        <section className="panel completed-panel">
          <h2 className="section-title">Completed categories</h2>
          <div className="badge-row">
            {progress.completedCategories.map((label) => (
              <Badge key={label} variant="success">
                {label}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <SkeletonMeters count={11} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No submissions yet"
          message="Head to Submit and save your first labeled sentence."
        />
      ) : (
        <section className="panel quota-panel">
          <h2 className="section-title">Category progress</h2>
          <div className="quota-grid">
            {CATEGORIES.map((category) => (
              <QuotaProgress
                key={category.key}
                label={category.label}
                count={counts[category.key]}
                required={QUOTAS[category.key]}
              />
            ))}
            <QuotaProgress
              label="Non-biased"
              count={nonBiased}
              required={NON_BIASED_TARGET}
            />
          </div>
        </section>
      )}
    </div>
  );
}
