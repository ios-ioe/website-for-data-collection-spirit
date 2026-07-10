import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginWithAccessCode } from "../lib/api.js";
import { useTeam } from "../context/TeamContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";

export default function Login() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { login } = useTeam();
  const { showToast } = useToast();
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    setBusy(true);
    try {
      const team = await loginWithAccessCode(code);
      login(team);
      showToast(`Welcome, ${team.team_name}`, { type: "success" });
      navigate("/submit", { replace: true });
    } catch (err) {
      setError(err.message || "Sign-in failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-eyebrow">Data collection · one day only</div>
        <h1 className="login-title">Sign in to collect</h1>
        <p className="login-sub">
          Enter the access code your organizer gave your team.
        </p>
        <form onSubmit={handleSubmit} className="login-form" noValidate>
          <label className="field-label" htmlFor="access-code">
            Access code
          </label>
          <input
            id="access-code"
            className="input login-input"
            placeholder="e.g. everest-7412"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            disabled={busy}
          />
          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Login"}
          </button>
        </form>
        {busy && (
          <div className="login-spinner">
            <LoadingSpinner label="Looking up your team…" inline />
          </div>
        )}
        {error && <div className="alert alert-error">{error}</div>}
      </div>
    </div>
  );
}
