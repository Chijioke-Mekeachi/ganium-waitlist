-- Run in Supabase SQL editor.
-- Minimal waitlist table + INSERT policy for public signups.

create extension if not exists "pgcrypto";

create table if not exists public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null unique,
  full_name text,
  role text,
  price_per_scan_cents integer,
  contacted_at timestamptz
);

create index if not exists waitlist_entries_created_at_idx on public.waitlist_entries (created_at desc);

alter table public.waitlist_entries enable row level security;

drop policy if exists "Public can insert waitlist entries" on public.waitlist_entries;
create policy "Public can insert waitlist entries"
on public.waitlist_entries
for insert
to anon, authenticated
with check (true);

-- Safe migration for existing tables:
alter table public.waitlist_entries
  add column if not exists price_per_scan_cents integer;
