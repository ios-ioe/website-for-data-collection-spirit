export default function LoadingSpinner({ label = "Loading…", inline = false }) {
  return (
    <div
      className={inline ? "spinner-wrap spinner-inline" : "spinner-wrap"}
      role="status"
      aria-live="polite"
    >
      <div className="spinner" aria-hidden="true" />
      <span className="spinner-label">{label}</span>
    </div>
  );
}
