create table if not exists public.visitor_sessions (
  visit_id uuid primary key default gen_random_uuid(),
  ip_address inet not null,
  page_path text not null check (
    char_length(page_path) between 1 and 200
    and left(page_path, 1) = '/'
  ),
  started_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now()
);

create index if not exists visitor_sessions_started_at_idx
  on public.visitor_sessions (started_at);

create or replace function public.set_visitor_last_activity()
returns trigger
language plpgsql
as $$
begin
  new.last_activity_at = now();
  return new;
end;
$$;

drop trigger if exists visitor_sessions_set_last_activity on public.visitor_sessions;
create trigger visitor_sessions_set_last_activity
before update on public.visitor_sessions
for each row execute function public.set_visitor_last_activity();

alter table public.visitor_sessions enable row level security;
revoke all on public.visitor_sessions from anon, authenticated;
grant all on public.visitor_sessions to service_role;

create or replace view public.visitor_log
with (security_invoker = true)
as
select
  visit_id,
  ip_address::text as ip_address,
  page_path,
  to_char(started_at at time zone 'Asia/Kolkata', 'FMDay, DD FMMonth YYYY') as day_and_date,
  to_char(started_at at time zone 'Asia/Kolkata', 'HH12:MI AM') as entry_time,
  started_at as entry_at,
  case
    when last_activity_at <= now() - interval '5 minutes' then last_activity_at
    else null
  end as estimated_exit_at,
  case
    when last_activity_at <= now() - interval '5 minutes'
      then floor(extract(epoch from (last_activity_at - started_at)))::bigint
    else null
  end as estimated_duration_seconds,
  case
    when last_activity_at <= now() - interval '5 minutes' then 'inactive'
    else 'active'
  end as status,
  last_activity_at
from public.visitor_sessions;

revoke all on public.visitor_log from anon, authenticated;
grant select on public.visitor_log to service_role;
