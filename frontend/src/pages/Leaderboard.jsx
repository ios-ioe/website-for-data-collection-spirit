import { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchAllSubmissions,
  fetchPublicTeams,
  submissionSelectColumns,
} from "../lib/submissions.js";
import { supabase } from "../lib/supabase.js";
import {
  CATEGORIES,
  QUOTAS,
  NON_BIASED_TARGET,
  completionPct,
  countByCategory,
} from "../config/quotas.js";
import LeaderboardTable from "../components/LeaderboardTable.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import EmptyState from "../components/EmptyState.jsx";

const REFRESH_MS = 15000;

export default function Leaderboard() {
  const [teams, setTeams] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);
  const refreshLock = useRef(false);

  async function refresh() {
    if (refreshLock.current) return;
    refreshLock.current = true;

    try {
      const [teamData, submissions] = await Promise.all([
        fetchPublicTeams(),
        fetchAllSubmissions(submissionSelectColumns(["team_id"])),
      ]);
      setTeams(teamData);
      setRows(submissions);
      setUpdatedAt(new Date());
      setError("");
    } catch (err) {
      setError(err.message || "Failed to refresh leaderboard.");
    } finally {
      setLoading(false);
      refreshLock.current = false;
    }
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, REFRESH_MS);
    const channel = supabase
      .channel("leaderboard-submissions")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "submissions" },
        () => refresh()
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const board = useMemo(() => {
    return teams
      .map((team) => {
        const teamRows = rows.filter((row) => row.team_id === team.team_id);
        const { counts, nonBiased } = countByCategory(teamRows);

        let earned = 0;
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
          ...team,
          pct: completionPct(teamRows),
          earned,
          submissions: teamRows.length,
          completedCategories,
        };
      })
      .sort((a, b) => b.pct - a.pct || b.earned - a.earned || b.submissions - a.submissions);
  }, [teams, rows]);

  return (
    <div className="board">
      <div className="submit-head">
        <div>
          <h1 className="page-title">Leaderboard</h1>
          <p className="page-sub">
            Completion toward quota · auto-refreshes every {REFRESH_MS / 1000}s
            {updatedAt && (
              <span className="muted"> · updated {updatedAt.toLocaleTimeString()}</span>
            )}
          </p>
        </div>
        {loading && <LoadingSpinner label="Updating…" inline />}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading && board.length === 0 ? (
        <div className="route-loading">
          <LoadingSpinner label="Loading leaderboard…" />
        </div>
      ) : board.length === 0 ? (
        <EmptyState
          title="No teams yet"
          message="Teams will appear here once they sign in and start submitting."
        />
      ) : (
        <LeaderboardTable rows={board} />
      )}
    </div>
  );
}
