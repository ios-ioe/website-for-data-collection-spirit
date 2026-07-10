import Badge from "./Badge.jsx";

export default function QuotaProgress({ label, count, required }) {
  const met = count >= required;
  const remaining = Math.max(0, required - count);
  const pct = required === 0 ? 100 : Math.min(100, Math.round((count / required) * 100));

  return (
    <div className={`quota-progress ${met ? "quota-progress-done" : ""}`}>
      <div className="quota-progress-head">
        <div className="quota-progress-title">
          <span className="quota-progress-label">{label}</span>
          {met && (
            <Badge variant="success">Completed</Badge>
          )}
        </div>
        <div className="quota-progress-stats">
          <span className="quota-progress-count">
            {count}<span className="meter-sep">/</span>{required}
          </span>
          <span className="quota-progress-pct">{pct}%</span>
        </div>
      </div>
      <div
        className="meter-track"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} progress`}
      >
        <div className="meter-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="quota-progress-foot">
        <span className="muted">
          {met ? "Quota met" : `${remaining} remaining`}
        </span>
      </div>
    </div>
  );
}
