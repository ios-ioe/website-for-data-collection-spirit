import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useTeam } from "../context/TeamContext.jsx";

export default function Nav() {
  const { team_name, isAuthenticated, logout } = useTeam();
  const navigate = useNavigate();
  const location = useLocation();

  function linkClass({ isActive }) {
    return isActive ? "nav-link active" : "nav-link";
  }

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="nav">
      <div className="nav-brand">
        <span className="nav-dot" aria-hidden="true" />
        <span className="nav-title">Bias Data Station</span>
      </div>

      <nav className="nav-links" aria-label="Main">
        {isAuthenticated && (
          <>
            <NavLink to="/dashboard" className={linkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/submit" className={linkClass}>
              Submit
            </NavLink>
          </>
        )}
        <NavLink to="/leaderboard" className={linkClass}>
          Leaderboard
        </NavLink>
        <NavLink
          to="/admin"
          className={({ isActive }) =>
            isActive ? "nav-link active nav-link-admin" : "nav-link nav-link-admin"
          }
        >
          Admin
        </NavLink>
      </nav>

      <div className="nav-right">
        {isAuthenticated ? (
          <>
            <span className="nav-team">{team_name}</span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleLogout}
            >
              Sign out
            </button>
          </>
        ) : location.pathname !== "/login" ? (
          <NavLink to="/login" className="btn btn-ghost btn-sm">
            Sign in
          </NavLink>
        ) : null}
      </div>
    </header>
  );
}
