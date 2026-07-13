-- ============================================================================
-- Seed teams. Run after schema.sql.
-- Edit the rows below to match your actual teams, then share each access_code
-- privately with that team. Access codes are what teams type on the login screen.
-- ============================================================================

insert into teams (team_id, team_name, access_code) values
  ('team_01', 'Team Everest',      'everest-7412'),
  ('team_02', 'Team Machapuchare', 'fishtail-3390'),
  ('team_03', 'Team Annapurna',    'anna-5561'),
  ('team_04', 'Team Langtang',     'langtang-8823'),
  ('team_05', 'Team Dhaulagiri',   'dhaula-1204'),
  ('team_dev', 'Dev Test Team',    'dev-dev')
on conflict (team_id) do update
  set team_name   = excluded.team_name,
      access_code = excluded.access_code;

-- Quick check
select team_id, team_name from teams order by team_id;
