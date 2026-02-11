-- Run in Supabase SQL editor.
-- Migration for an already-created `public.waitlist_entries` table (if you ran an older SQL).

alter table public.waitlist_entries
  add column if not exists price_per_scan_cents integer;

-- Optional: role constraint (allows NULL for older rows)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'waitlist_entries_role_check'
  ) then
    alter table public.waitlist_entries
      add constraint waitlist_entries_role_check
      check (
        role is null or role in (
          'student',
          'business owner',
          'salary earner',
          'cryto trader',
          'job seeker',
          'founder',
          'developer',
          'Influencer'
        )
      );
  end if;
end $$;
