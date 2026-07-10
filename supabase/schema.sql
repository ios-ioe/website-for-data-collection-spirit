-- ============================================================================
-- Nepali Bias Data Collection — Supabase schema
-- Run this whole file once in the Supabase SQL editor (Project → SQL → New query).
-- Safe to re-run: drops and recreates policies, functions, and views.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists teams (
  team_id     text primary key,
  team_name   text not null,
  access_code text not null unique,
  created_at  timestamptz not null default now()
);

create table if not exists submissions (
  id              uuid primary key default gen_random_uuid(),
  team_id         text not null references teams(team_id) on delete restrict,
  text            text not null check (char_length(trim(text)) > 0),
  gender          int  not null default 0 check (gender in (0, 1)),
  religional      int  not null default 0 check (religional in (0, 1)),
  caste           int  not null default 0 check (caste in (0, 1)),
  religion        int  not null default 0 check (religion in (0, 1)),
  appearence      int  not null default 0 check (appearence in (0, 1)),
  socialstatus    int  not null default 0 check (socialstatus in (0, 1)),
  amiguity        int  not null default 0 check (amiguity in (0, 1)),
  political       int  not null default 0 check (political in (0, 1)),
  "Age"           int  not null default 0 check ("Age" in (0, 1)),
  "Disablity"     int  not null default 0 check ("Disablity" in (0, 1)),
  source_platform text,
  source_date     text,
  submitted_at    timestamptz not null default now(),
  flag_duplicate  boolean not null default false,
  flag_pii        boolean not null default false,
  judge_reviewed  boolean not null default false
);

-- ---------------------------------------------------------------------------
-- Indexes (performance for live queries, leaderboard, admin filters)
-- ---------------------------------------------------------------------------
create index if not exists submissions_team_idx
  on submissions(team_id);

create index if not exists submissions_time_idx
  on submissions(submitted_at desc);

create index if not exists submissions_team_time_idx
  on submissions(team_id, submitted_at desc);

create index if not exists submissions_flag_duplicate_idx
  on submissions(flag_duplicate)
  where flag_duplicate = true;

create index if not exists submissions_flag_pii_idx
  on submissions(flag_pii)
  where flag_pii = true;

create index if not exists submissions_judge_reviewed_idx
  on submissions(judge_reviewed)
  where judge_reviewed = false;

create index if not exists submissions_gender_idx
  on submissions(team_id, gender) where gender = 1;

create index if not exists submissions_caste_idx
  on submissions(team_id, caste) where caste = 1;

create index if not exists submissions_religional_idx
  on submissions(team_id, religional) where religional = 1;

create index if not exists submissions_religion_idx
  on submissions(team_id, religion) where religion = 1;

create index if not exists submissions_appearence_idx
  on submissions(team_id, appearence) where appearence = 1;

create index if not exists submissions_socialstatus_idx
  on submissions(team_id, socialstatus) where socialstatus = 1;

create index if not exists submissions_amiguity_idx
  on submissions(team_id, amiguity) where amiguity = 1;

create index if not exists submissions_political_idx
  on submissions(team_id, political) where political = 1;

create index if not exists submissions_age_idx
  on submissions(team_id, "Age") where "Age" = 1;

create index if not exists submissions_disablity_idx
  on submissions(team_id, "Disablity") where "Disablity" = 1;

create index if not exists teams_access_code_idx
  on teams(access_code);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table submissions enable row level security;
alter table teams       enable row level security;

-- submissions: anon may INSERT any row.
drop policy if exists "anon insert submissions" on submissions;
create policy "anon insert submissions"
  on submissions for insert to anon
  with check (true);

-- submissions: anon may SELECT all rows (leaderboard + dashboard).
drop policy if exists "anon select submissions" on submissions;
create policy "anon select submissions"
  on submissions for select to anon
  using (true);

-- submissions: anon may UPDATE (admin marks judge_reviewed, QA flags).
drop policy if exists "anon update submissions" on submissions;
create policy "anon update submissions"
  on submissions for update to anon
  using (true) with check (true);

-- teams: no direct anon read — access_code stays server-side only.

-- ---------------------------------------------------------------------------
-- Public teams view (team_id + team_name only)
-- ---------------------------------------------------------------------------
drop view if exists teams_public;
create view teams_public as
  select team_id, team_name from teams;

grant select on teams_public to anon;

-- ---------------------------------------------------------------------------
-- Login RPC — verify access code without exposing access_code column
-- ---------------------------------------------------------------------------
create or replace function verify_access_code(code text)
returns table (team_id text, team_name text)
language sql
security definer
set search_path = public
as $$
  select t.team_id, t.team_name
  from teams t
  where t.access_code = code
  limit 1;
$$;

grant execute on function verify_access_code(text) to anon;

-- ---------------------------------------------------------------------------
-- Helper: team submission count (optional, for dashboards)
-- ---------------------------------------------------------------------------
create or replace function team_submission_count(p_team_id text)
returns bigint
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::bigint from submissions where team_id = p_team_id;
$$;

grant execute on function team_submission_count(text) to anon;

-- ---------------------------------------------------------------------------
-- Realtime — subscribe to new inserts on dashboards
-- ---------------------------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table submissions;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;
