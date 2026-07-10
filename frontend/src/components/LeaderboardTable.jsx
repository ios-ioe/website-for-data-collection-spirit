import Badge from "./Badge.jsx";
import EmptyState from "./EmptyState.jsx";

function rankClass(rank) {
  if (rank === 1) return "lb-rank lb-rank-gold";
  if (rank === 2) return "lb-rank lb-rank-silver";
  if (rank === 3) return "lb-rank lb-rank-bronze";
  return "lb-rank";
}

export default function LeaderboardTable({ rows }) {
  if (!rows.length) {
    return (
      <EmptyState
        title="No teams yet"
        message="Teams will appear here once they sign in and start submitting."
      />
    );
  }

  return (
    <div className="table-wrap lb-table-wrap">
      <table className="table lb-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Team</th>
            <th>Submissions</th>
            <th>Completion</th>
            <th>Completed quotas</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((team, index) => {
            const rank = index + 1;
            const topThree = rank <= 3;

            return (
              <tr key={team.team_id} className={topThree ? `lb-row-top lb-row-top-${rank}` : ""}>
                <td>
                  <span className={rankClass(rank)}>{rank}</span>
                </td>
                <td className="lb-team-cell">
                  <span className="lb-team-name">{team.team_name}</span>
                  <span className="mono-sm muted">{team.team_id}</span>
                </td>
                <td className="mono-sm">{team.submissions}</td>
                <td>
                  <div className="lb-progress-cell">
                    <div className="lb-progress-head">
                      <span className="lb-pct">{team.pct}%</span>
                    </div>
                    <div className="board-track">
                      <div className="board-fill" style={{ width: `${team.pct}%` }} />
                    </div>
                  </div>
                </td>
                <td>
                  {team.completedCategories.length > 0 ? (
                    <div className="badge-row badge-row-compact">
                      {team.completedCategories.map((label) => (
                        <Badge key={label} variant="success">
                          {label}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
