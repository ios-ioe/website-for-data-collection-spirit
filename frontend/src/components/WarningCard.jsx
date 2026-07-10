import Badge from "./Badge.jsx";

export default function WarningCard({ title, children }) {
  return (
    <div className="warning-card">
      <strong className="warning-card-title">{title}</strong>
      {children}
    </div>
  );
}

export function DuplicateWarningContent({ duplicate }) {
  if (!duplicate?.flagged) return null;

  return (
    <WarningCard title="Possible duplicate">
      <div className="warning-card-body">
        <Badge variant="warn">
          {Math.round((duplicate.similarity || 0) * 100)}% similar
        </Badge>
        {duplicate.closest_match_snippet && (
          <div className="review-snippet nepali">
            “{duplicate.closest_match_snippet}”
          </div>
        )}
      </div>
    </WarningCard>
  );
}

export function PiiWarningContent({ pii }) {
  if (!pii?.flagged) return null;

  return (
    <WarningCard title="Possible personal information">
      <div className="warning-card-body">
        <span className="muted">
          Matched: {(pii.matched_terms || []).join(", ") || "—"}
        </span>
      </div>
    </WarningCard>
  );
}
