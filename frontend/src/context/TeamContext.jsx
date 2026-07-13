import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { setTeamToken } from "../lib/api.js";

const TeamContext = createContext(null);
const STORAGE_KEY = "bias_tool_team";

function readStoredTeam() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.team_id && parsed?.team_name) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function TeamProvider({ children }) {
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTeam(readStoredTeam());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (loading) return;
    try {
      if (team) localStorage.setItem(STORAGE_KEY, JSON.stringify(team));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore storage errors */
    }
  }, [team, loading]);

  const login = (nextTeam) => {
    setTeam({
      team_id: nextTeam.team_id,
      team_name: nextTeam.team_name,
    });
  };

  const logout = () => {
    setTeam(null);
    setTeamToken(null);
  };

  const value = useMemo(
    () => ({
      team,
      team_id: team?.team_id ?? null,
      team_name: team?.team_name ?? null,
      isAuthenticated: Boolean(team),
      loading,
      login,
      logout,
    }),
    [team, loading]
  );

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}

export function useTeam() {
  const ctx = useContext(TeamContext);
  if (!ctx) throw new Error("useTeam must be used inside TeamProvider");
  return ctx;
}
