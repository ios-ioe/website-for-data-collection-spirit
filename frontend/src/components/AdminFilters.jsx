export default function AdminFilters({
  search,
  onSearchChange,
  teamFilter,
  onTeamFilterChange,
  statusFilter,
  onStatusFilterChange,
  teams,
  shownCount,
  totalCount,
}) {
  return (
    <div className="filters">
      <input
        className="input filter-search"
        placeholder="Search text or team…"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        aria-label="Search submissions"
      />
      <select
        className="input"
        value={teamFilter}
        onChange={(event) => onTeamFilterChange(event.target.value)}
        aria-label="Filter by team"
      >
        <option value="">All teams</option>
        {teams.map((teamId) => (
          <option key={teamId} value={teamId}>
            {teamId}
          </option>
        ))}
      </select>
      <select
        className="input"
        value={statusFilter}
        onChange={(event) => onStatusFilterChange(event.target.value)}
        aria-label="Filter by status"
      >
        <option value="all">All rows</option>
        <option value="duplicate">Duplicates only</option>
        <option value="pii">PII only</option>
        <option value="reviewed">Reviewed</option>
        <option value="unreviewed">Not reviewed</option>
      </select>
      <span className="muted">
        {shownCount} shown · {totalCount} total
      </span>
    </div>
  );
}
