import Badge from "./Badge.jsx";

function shortId(id) {
  return id ? id.slice(0, 8) : "";
}

function QuotaTable({ report }) {
  const teamIds = Object.keys(report).sort();
  const categories = teamIds.length ? Object.keys(report[teamIds[0]]) : [];

  return (
    <div className="table-wrap">
      <table className="table quota-table">
        <thead>
          <tr>
            <th>Team</th>
            {categories.map((category) => (
              <th key={category} className="mono-sm">
                {category}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {teamIds.map((teamId) => (
            <tr key={teamId}>
              <td className="mono-sm">{teamId}</td>
              {categories.map((category) => {
                const cell = report[teamId][category];
                return (
                  <td key={category} className={cell.met ? "cell-met" : "cell-miss"}>
                    {cell.count}/{cell.required}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function QaBatchReport({ report, onMarkReviewed, reviewingId }) {
  if (!report) return null;

  const duplicateCount = report.flagged_duplicates?.length ?? 0;
  const piiCount = report.flagged_pii?.length ?? 0;

  return (
    <section className="panel report">
      <h2 className="report-title">QA batch report</h2>
      <div className="report-stats">
        <div className="report-stat">
          <span className="stat-num">{report.total_rows ?? 0}</span>
          <span className="stat-cap">rows scanned</span>
        </div>
        <div className="report-stat">
          <span className="stat-num">{duplicateCount}</span>
          <span className="stat-cap">duplicates flagged</span>
        </div>
        <div className="report-stat">
          <span className="stat-num">{piiCount}</span>
          <span className="stat-cap">PII flagged</span>
        </div>
      </div>

      {duplicateCount > 0 && (
        <div className="report-section">
          <h3 className="report-sub">Flagged duplicates</h3>
          <div className="report-list">
            {report.flagged_duplicates.map((item) => (
              <div key={item.id} className="report-item">
                <code className="mono-sm">{shortId(item.id)}</code>
                <Badge variant="dup">
                  ≈ {Math.round((item.similarity || 0) * 100)}% similar
                </Badge>
                <span className="muted">of {shortId(item.duplicate_of)}</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={reviewingId === item.id}
                  onClick={() => onMarkReviewed(item.id, true)}
                >
                  Mark reviewed
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {piiCount > 0 && (
        <div className="report-section">
          <h3 className="report-sub">Flagged PII</h3>
          <div className="report-list">
            {report.flagged_pii.map((item) => (
              <div key={item.id} className="report-item">
                <code className="mono-sm">{shortId(item.id)}</code>
                <span className="muted">
                  {(item.matched_terms || []).join(", ") || "—"}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={reviewingId === item.id}
                  onClick={() => onMarkReviewed(item.id, true)}
                >
                  Mark reviewed
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {report.quota_report && (
        <div className="report-section">
          <h3 className="report-sub">Quota report</h3>
          <QuotaTable report={report.quota_report} />
        </div>
      )}
    </section>
  );
}
