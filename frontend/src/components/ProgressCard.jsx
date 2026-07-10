export default function ProgressCard({ label, value, hint, accent = false }) {
  return (
    <div className={`summary-card ${accent ? "summary-card-accent" : ""}`}>
      <span className="summary-label">{label}</span>
      <span className="summary-value">{value}</span>
      {hint && <span className="summary-hint">{hint}</span>}
    </div>
  );
}
