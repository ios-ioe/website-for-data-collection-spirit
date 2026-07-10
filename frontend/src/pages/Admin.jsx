import { useCallback, useEffect, useMemo, useState } from "react";
import { runQaBatch } from "../lib/api.js";
import {
  adminSelectColumns,
  downloadJson,
  fetchAllSubmissions,
  updateJudgeReviewed,
} from "../lib/submissions.js";
import { useToast } from "../context/ToastContext.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import { SkeletonTable } from "../components/Skeleton.jsx";
import EmptyState from "../components/EmptyState.jsx";
import AdminFilters from "../components/AdminFilters.jsx";
import SubmissionTable from "../components/SubmissionTable.jsx";
import QaBatchReport from "../components/QaBatchReport.jsx";

const ADMIN_PASS = import.meta.env.VITE_ADMIN_PASSWORD || "";
const DISPLAY_LIMIT = 400;

export default function Admin() {
  const { showToast } = useToast();

  const [authed, setAuthed] = useState(false);
  const [pass, setPass] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [teamFilter, setTeamFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [report, setReport] = useState(null);
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchConfirm, setBatchConfirm] = useState(false);
  const [reviewBusyId, setReviewBusyId] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllSubmissions(adminSelectColumns());
      setRows(data);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load submissions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed) load();
  }, [authed, load]);

  const teams = useMemo(
    () => [...new Set(rows.map((row) => row.team_id).filter(Boolean))].sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (teamFilter && row.team_id !== teamFilter) return false;
      if (statusFilter === "duplicate" && !row.flag_duplicate) return false;
      if (statusFilter === "pii" && !row.flag_pii) return false;
      if (statusFilter === "reviewed" && !row.judge_reviewed) return false;
      if (statusFilter === "unreviewed" && row.judge_reviewed) return false;
      if (query) {
        const haystack = `${row.text || ""} ${row.team_id || ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [rows, teamFilter, statusFilter, search]);

  const visibleRows = useMemo(
    () => filtered.slice(0, DISPLAY_LIMIT),
    [filtered]
  );

  async function markReviewed(id, value = true) {
    setReviewBusyId(id);
    try {
      await updateJudgeReviewed(id, value);
      setRows((current) =>
        current.map((row) => (row.id === id ? { ...row, judge_reviewed: value } : row))
      );
    } catch (err) {
      showToast(err.message || "Failed to update review status", { type: "error" });
    } finally {
      setReviewBusyId(null);
    }
  }

  async function onRunBatch() {
    setBatchBusy(true);
    setError("");
    try {
      const result = await runQaBatch();
      setReport(result);
      await load();
      showToast("QA batch completed", { type: "success" });
    } catch (err) {
      const message = err.message || "QA batch failed.";
      setError(message);
      showToast(message, { type: "error" });
    } finally {
      setBatchBusy(false);
      setBatchConfirm(false);
    }
  }

  function exportJson() {
    try {
      const count = downloadJson(rows);
      showToast(`Exported ${count} rows`, { type: "success" });
    } catch (err) {
      showToast(err.message || "Export failed", { type: "error" });
    }
  }

  if (!authed) {
    return (
      <div className="login-wrap">
        <div className="login-card">
          <div className="login-eyebrow">Organizer only</div>
          <h1 className="login-title">Admin</h1>
          <form
            className="login-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (pass === ADMIN_PASS && ADMIN_PASS) {
                setAuthed(true);
                setError("");
              } else {
                setError("Wrong password.");
              }
            }}
          >
            <label className="field-label" htmlFor="admin-pass">
              Admin password
            </label>
            <input
              id="admin-pass"
              className="input login-input"
              type="password"
              placeholder="admin password"
              value={pass}
              onChange={(event) => setPass(event.target.value)}
              autoFocus
            />
            <button className="btn btn-primary btn-block" type="submit">
              Unlock
            </button>
          </form>
          {error && <div className="alert alert-error">{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="admin">
      <div className="submit-head">
        <div>
          <h1 className="page-title">Admin</h1>
          <p className="page-sub">{rows.length} submissions total</p>
        </div>
        <div className="admin-actions">
          <button type="button" className="btn btn-ghost" onClick={load} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={exportJson}
            disabled={!rows.length || loading}
          >
            Export JSON
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setBatchConfirm(true)}
            disabled={batchBusy}
          >
            {batchBusy ? "Running QA…" : "Run QA batch"}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <QaBatchReport
        report={report}
        onMarkReviewed={markReviewed}
        reviewingId={reviewBusyId}
      />

      <AdminFilters
        search={search}
        onSearchChange={setSearch}
        teamFilter={teamFilter}
        onTeamFilterChange={setTeamFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        teams={teams}
        shownCount={filtered.length}
        totalCount={rows.length}
      />

      {loading ? (
        <SkeletonTable rows={6} cols={9} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No matching submissions" message="Try adjusting your filters." />
      ) : (
        <>
          <SubmissionTable
            rows={visibleRows}
            onReviewChange={markReviewed}
            busyId={reviewBusyId}
          />
          {filtered.length > DISPLAY_LIMIT && (
            <div className="muted table-note">
              Showing first {DISPLAY_LIMIT} of {filtered.length}. Narrow with the filters above.
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={batchConfirm}
        title="Run QA batch?"
        message="This scans all submissions for duplicates and PII, and updates flag columns. It may take a minute on large datasets."
        confirmLabel="Run batch"
        cancelLabel="Cancel"
        variant="primary"
        busy={batchBusy}
        onCancel={() => setBatchConfirm(false)}
        onConfirm={onRunBatch}
      />
    </div>
  );
}
