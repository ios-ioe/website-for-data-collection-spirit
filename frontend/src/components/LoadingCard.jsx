import { Skeleton } from "./Skeleton.jsx";

export default function LoadingCard({ count = 4 }) {
  return (
    <div className="dash-summary">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="summary-card">
          <Skeleton className="skeleton-sm" />
          <Skeleton className="skeleton-md" />
        </div>
      ))}
    </div>
  );
}
