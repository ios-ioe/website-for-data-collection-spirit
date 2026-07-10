import { Navigate } from "react-router-dom";
import { useTeam } from "../context/TeamContext.jsx";
import LoadingSpinner from "./LoadingSpinner.jsx";

export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useTeam();

  if (loading) {
    return (
      <div className="route-loading">
        <LoadingSpinner label="Restoring session…" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export function GuestRoute({ children }) {
  const { isAuthenticated, loading } = useTeam();

  if (loading) {
    return (
      <div className="route-loading">
        <LoadingSpinner label="Restoring session…" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/submit" replace />;
  }

  return children;
}

export function RootRedirect() {
  const { isAuthenticated, loading } = useTeam();

  if (loading) {
    return (
      <div className="route-loading">
        <LoadingSpinner label="Restoring session…" />
      </div>
    );
  }

  return <Navigate to={isAuthenticated ? "/submit" : "/login"} replace />;
}
