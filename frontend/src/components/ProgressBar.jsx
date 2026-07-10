export default function ProgressBar({ label, count, required }) {
  const met = count >= required;
  const pct = required === 0 ? 100 : Math.min(100, Math.round((count / required) * 100));
  return (
    <div className={`meter ${met ? "meter-done" : ""}`}>
      <div className="meter-head">
        <span className="meter-label">{label}</span>
        <span className="meter-count">
          {count}<span className="meter-sep">/</span>{required}
        </span>
      </div>
      <div className="meter-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="meter-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
