'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type WaitlistEntry = {
  id: string;
  created_at: string;
  email: string;
  full_name: string | null;
  role: string | null;
  price_per_scan_cents: number | null;
  contacted_at: string | null;
};

function formatUsdFromCents(cents: number | null) {
  if (cents === null || cents === undefined) return '—';
  return `$${(cents / 100).toFixed(2)}`;
}

function formatNumber(n: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);
}

function median(sorted: number[]) {
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

function downloadCsv(filename: string, rows: Record<string, string | number | null | undefined>[]) {
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="wl-surface px-5 py-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[var(--wl-text)]">{title}</div>
          {subtitle ? <div className="mt-1 text-xs wl-muted">{subtitle}</div> : null}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Bars({
  items,
  valueLabel,
}: {
  items: { label: string; value: number; hint?: string }[];
  valueLabel?: (v: number) => string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="grid gap-3">
      {items.map((i) => (
        <div key={i.label} className="grid grid-cols-[140px_1fr_70px] items-center gap-3">
          <div className="text-xs wl-muted truncate" title={i.hint || i.label}>
            {i.label}
          </div>
          <div className="h-2 rounded-full bg-white/5 border border-white/10 overflow-hidden">
            <div
              className="h-full bg-[var(--wl-primary)]"
              style={{ width: `${Math.round((i.value / max) * 100)}%` }}
            />
          </div>
          <div className="text-xs text-right text-[var(--wl-text)] tabular-nums">{valueLabel ? valueLabel(i.value) : i.value}</div>
        </div>
      ))}
    </div>
  );
}

function Sparkline({ points }: { points: { label: string; value: number }[] }) {
  const w = 600;
  const h = 160;
  const pad = 16;
  const max = Math.max(1, ...points.map((p) => p.value));

  const xs = points.map((_, idx) => pad + (idx * (w - pad * 2)) / Math.max(1, points.length - 1));
  const ys = points.map((p) => h - pad - (p.value / max) * (h - pad * 2));
  const d = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(' ');

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto block">
        <path d={d} fill="none" stroke="rgba(96,165,250,0.9)" strokeWidth="3" />
        <path
          d={`${d} L ${w - pad} ${h - pad} L ${pad} ${h - pad} Z`}
          fill="rgba(96,165,250,0.12)"
          stroke="none"
        />
        {xs.map((x, i) => (
          <circle key={points[i].label} cx={x} cy={ys[i]} r="4" fill="rgba(96,165,250,0.95)" />
        ))}
      </svg>
      <div className="mt-2 flex items-center justify-between text-[11px] wl-muted">
        <div>{points[0]?.label ?? ''}</div>
        <div>{points.at(-1)?.label ?? ''}</div>
      </div>
    </div>
  );
}

async function readError(res: Response) {
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    const j = (await res.json().catch(() => null)) as null | { error?: string };
    if (j?.error) return j.error;
  }
  return 'Request failed.';
}

async function login(input: { username: string; password: string }) {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as { token: string };
}

async function fetchWaitlist(token: string) {
  const res = await fetch('/api/admin/waitlist', { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as WaitlistEntry[];
}

async function setContacted(token: string, id: string, contacted: boolean) {
  const res = await fetch(`/api/admin/waitlist/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ contacted }),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as WaitlistEntry;
}

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [query, setQuery] = useState('');
  const [showFilteredAnalytics, setShowFilteredAnalytics] = useState(true);

  useEffect(() => {
    const t = window.localStorage.getItem('waitlist_admin_token');
    if (t) setToken(t);
  }, []);

  async function refresh(nextToken: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWaitlist(nextToken);
      setEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load waitlist.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    void refresh(token);
  }, [token]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) =>
      `${e.full_name ?? ''} ${e.email ?? ''} ${e.role ?? ''}`.toLowerCase().includes(q),
    );
  }, [entries, query]);

  const analyticsBase = showFilteredAnalytics ? filtered : entries;

  const analytics = useMemo(() => {
    const total = analyticsBase.length;
    const contacted = analyticsBase.filter((e) => Boolean(e.contacted_at)).length;
    const notContacted = Math.max(0, total - contacted);

    const roleCounts = new Map<string, number>();
    const roleContacted = new Map<string, { contacted: number; total: number }>();
    for (const e of analyticsBase) {
      const r = e.role?.trim() || 'Unknown';
      roleCounts.set(r, (roleCounts.get(r) ?? 0) + 1);
      const rc = roleContacted.get(r) ?? { contacted: 0, total: 0 };
      rc.total += 1;
      if (e.contacted_at) rc.contacted += 1;
      roleContacted.set(r, rc);
    }
    const roleItems = Array.from(roleCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value }));

    const contactRateByRole = Array.from(roleContacted.entries())
      .map(([label, v]) => ({
        label,
        value: v.total ? Math.round((v.contacted / v.total) * 100) : 0,
        hint: `${v.contacted}/${v.total} contacted`,
      }))
      .sort((a, b) => b.value - a.value);

    const prices = analyticsBase
      .map((e) => (typeof e.price_per_scan_cents === 'number' ? e.price_per_scan_cents / 100 : null))
      .filter((v): v is number => v !== null && Number.isFinite(v))
      .sort((a, b) => a - b);

    const avg = prices.length ? prices.reduce((s, x) => s + x, 0) / prices.length : null;
    const med = median(prices);
    const min = prices.length ? prices[0] : null;
    const max = prices.length ? prices.at(-1)! : null;

    // Price distribution bins (USD)
    const bins = [
      { label: '$0–$0.09', from: 0, to: 0.09, count: 0 },
      { label: '$0.10–$0.24', from: 0.1, to: 0.24, count: 0 },
      { label: '$0.25–$0.49', from: 0.25, to: 0.49, count: 0 },
      { label: '$0.50–$0.99', from: 0.5, to: 0.99, count: 0 },
      { label: '$1.00–$1.99', from: 1, to: 1.99, count: 0 },
      { label: '$2.00+', from: 2, to: Infinity, count: 0 },
    ];
    for (const p of prices) {
      const b = bins.find((x) => p >= x.from && p <= x.to) ?? bins[bins.length - 1];
      b.count += 1;
    }

    // Avg price by role
    const byRole = new Map<string, { sum: number; n: number }>();
    for (const e of analyticsBase) {
      const r = e.role?.trim() || 'Unknown';
      const p = typeof e.price_per_scan_cents === 'number' ? e.price_per_scan_cents / 100 : null;
      if (p === null || !Number.isFinite(p)) continue;
      const cur = byRole.get(r) ?? { sum: 0, n: 0 };
      cur.sum += p;
      cur.n += 1;
      byRole.set(r, cur);
    }
    const avgByRole = Array.from(byRole.entries())
      .map(([label, v]) => ({ label, value: v.n ? v.sum / v.n : 0, hint: `${v.n} priced responses` }))
      .sort((a, b) => b.value - a.value);

    // Signups over last 14 days
    const now = new Date();
    const days: { label: string; key: string; value: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' });
      days.push({ label, key, value: 0 });
    }
    const dayIndex = new Map(days.map((d, idx) => [d.key, idx]));
    for (const e of analyticsBase) {
      const key = e.created_at?.slice(0, 10);
      const idx = key ? dayIndex.get(key) : undefined;
      if (idx !== undefined) days[idx].value += 1;
    }

    const domainCounts = new Map<string, number>();
    for (const e of analyticsBase) {
      const at = e.email.lastIndexOf('@');
      if (at === -1) continue;
      const domain = e.email.slice(at + 1).trim().toLowerCase();
      if (!domain) continue;
      domainCounts.set(domain, (domainCounts.get(domain) ?? 0) + 1);
    }
    const topDomains = Array.from(domainCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, value]) => ({ label, value }));

    return {
      total,
      contacted,
      notContacted,
      roleItems,
      contactRateByRole,
      prices,
      priceSummary: { avg, med, min, max, pricedCount: prices.length },
      priceBins: bins.map((b) => ({ label: b.label, value: b.count })),
      avgByRole,
      signupsLast14d: days.map((d) => ({ label: d.label, value: d.value })),
      topDomains,
    };
  }, [analyticsBase]);

  if (!token) {
    return (
      <div className="min-h-screen grid place-items-center px-6">
        <div className="wl-surface w-full max-w-md px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                <Image src="/logo.jpg" width={40} height={40} alt="Ganium" className="h-full w-full object-cover" />
              </div>
              <div>
                <div className="text-xl font-semibold text-[var(--wl-text)]">Admin login</div>
                <div className="mt-1 text-sm wl-muted">Dark-mode dashboard.</div>
              </div>
            </div>
            <Link className="text-sm wl-muted hover:text-[var(--wl-text)]" href="/">
              Home
            </Link>
          </div>

          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setLoading(true);
              setError(null);
              (async () => {
                try {
                  const { token: t } = await login({ username, password });
                  window.localStorage.setItem('waitlist_admin_token', t);
                  setToken(t);
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Login failed.');
                } finally {
                  setLoading(false);
                }
              })();
            }}
          >
            <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
            <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            {error ? (
              <div className="rounded-[var(--wl-radius-control)] border border-[rgb(251_113_133/0.45)] bg-[rgb(251_113_133/0.08)] px-4 py-3 text-sm text-[var(--wl-danger)]">
                {error}
              </div>
            ) : null}
            <Button className="w-full py-3" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="wl-surface px-6 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                <Image src="/logo.jpg" width={40} height={40} alt="Ganium" className="h-full w-full object-cover" />
              </div>
              <div>
                <div className="text-xl font-semibold text-[var(--wl-text)]">Waitlist admin</div>
                <div className="mt-1 text-sm wl-muted">{loading ? 'Loading…' : `${entries.length} total signups`}</div>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                className="sm:w-[320px]"
                placeholder="Search by name, email, role…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Button
                variant="secondary"
                onClick={() => {
                  if (!token) return;
                  void refresh(token);
                }}
              >
                Refresh
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  downloadCsv(
                    `ganium-waitlist-${new Date().toISOString().slice(0, 10)}.csv`,
                    filtered.map((e) => ({
                      created_at: e.created_at,
                      full_name: e.full_name ?? '',
                      email: e.email,
                      role: e.role ?? '',
                      price_per_scan_usd:
                        typeof e.price_per_scan_cents === 'number' ? (e.price_per_scan_cents / 100).toFixed(2) : '',
                      contacted: e.contacted_at ? 'yes' : 'no',
                    })),
                  );
                }}
              >
                Export CSV
              </Button>
              <label className="inline-flex items-center gap-2 text-xs wl-muted select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--wl-primary)]"
                  checked={showFilteredAnalytics}
                  onChange={(e) => setShowFilteredAnalytics(e.target.checked)}
                />
                Analytics uses search filter
              </label>
              <Button
                variant="secondary"
                onClick={() => {
                  window.localStorage.removeItem('waitlist_admin_token');
                  setToken(null);
                  setEntries([]);
                }}
              >
                Sign out
              </Button>
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-[var(--wl-radius-control)] border border-[rgb(251_113_133/0.45)] bg-[rgb(251_113_133/0.08)] px-4 py-3 text-sm text-[var(--wl-danger)]">
              {error}
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <ChartCard title="Overview" subtitle="Core funnel metrics">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-wide wl-muted">Signups</div>
                  <div className="mt-1 text-2xl font-semibold text-[var(--wl-text)] tabular-nums">{analytics.total}</div>
                </div>
                <div className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-wide wl-muted">Contacted</div>
                  <div className="mt-1 text-2xl font-semibold text-[var(--wl-text)] tabular-nums">{analytics.contacted}</div>
                  <div className="mt-1 text-xs wl-muted">
                    {analytics.total ? `${Math.round((analytics.contacted / analytics.total) * 100)}%` : '—'}
                  </div>
                </div>
                <div className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-wide wl-muted">Not contacted</div>
                  <div className="mt-1 text-2xl font-semibold text-[var(--wl-text)] tabular-nums">
                    {analytics.notContacted}
                  </div>
                </div>
              </div>
            </ChartCard>

            <ChartCard
              title="Price insights"
              subtitle={`Based on ${analytics.priceSummary.pricedCount}/${analytics.total} responses`}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-wide wl-muted">Average</div>
                  <div className="mt-1 text-xl font-semibold text-[var(--wl-text)] tabular-nums">
                    {analytics.priceSummary.avg === null ? '—' : `$${formatNumber(analytics.priceSummary.avg)}`}
                  </div>
                </div>
                <div className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-wide wl-muted">Median</div>
                  <div className="mt-1 text-xl font-semibold text-[var(--wl-text)] tabular-nums">
                    {analytics.priceSummary.med === null ? '—' : `$${formatNumber(analytics.priceSummary.med)}`}
                  </div>
                </div>
                <div className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-wide wl-muted">Min</div>
                  <div className="mt-1 text-xl font-semibold text-[var(--wl-text)] tabular-nums">
                    {analytics.priceSummary.min === null ? '—' : `$${formatNumber(analytics.priceSummary.min)}`}
                  </div>
                </div>
                <div className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-wide wl-muted">Max</div>
                  <div className="mt-1 text-xl font-semibold text-[var(--wl-text)] tabular-nums">
                    {analytics.priceSummary.max === null ? '—' : `$${formatNumber(analytics.priceSummary.max)}`}
                  </div>
                </div>
              </div>
            </ChartCard>

            <ChartCard title="Signups trend" subtitle="Last 14 days">
              <Sparkline points={analytics.signupsLast14d} />
            </ChartCard>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <ChartCard title="Role distribution" subtitle="Count by role">
              <Bars items={analytics.roleItems} />
            </ChartCard>

            <ChartCard title="Price distribution" subtitle="Count by suggested price bucket">
              <Bars items={analytics.priceBins} />
            </ChartCard>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <ChartCard title="Average suggested price by role" subtitle="USD, only rows with price">
              {analytics.avgByRole.length ? (
                <Bars items={analytics.avgByRole} valueLabel={(v) => `$${formatNumber(v)}`} />
              ) : (
                <div className="text-sm wl-muted">No pricing data yet.</div>
              )}
            </ChartCard>

            <ChartCard title="Contact rate by role" subtitle="Contacted %">
              {analytics.contactRateByRole.length ? (
                <Bars items={analytics.contactRateByRole} valueLabel={(v) => `${v}%`} />
              ) : (
                <div className="text-sm wl-muted">No data yet.</div>
              )}
            </ChartCard>
          </div>

          <div className="mt-4">
            <ChartCard title="Top email domains" subtitle="Count by domain (top 8)">
              {analytics.topDomains.length ? <Bars items={analytics.topDomains} /> : <div className="text-sm wl-muted">No data yet.</div>}
            </ChartCard>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-3 pr-4 font-semibold text-[var(--wl-text)]">Full name</th>
                  <th className="py-3 pr-4 font-semibold text-[var(--wl-text)]">Email</th>
                  <th className="py-3 pr-4 font-semibold text-[var(--wl-text)]">Role</th>
                  <th className="py-3 pr-4 font-semibold text-[var(--wl-text)]">Price/scan</th>
                  <th className="py-3 pr-4 font-semibold text-[var(--wl-text)]">Created</th>
                  <th className="py-3 pr-0 font-semibold text-[var(--wl-text)]">Contacted</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="border-b border-white/5">
                    <td className="py-3 pr-4 text-[var(--wl-text)]">{e.full_name || '—'}</td>
                    <td className="py-3 pr-4 text-[var(--wl-text)]">{e.email}</td>
                    <td className="py-3 pr-4 wl-muted">{e.role || '—'}</td>
                    <td className="py-3 pr-4 wl-muted">{formatUsdFromCents(e.price_per_scan_cents)}</td>
                    <td className="py-3 pr-4 wl-muted">{new Date(e.created_at).toLocaleString()}</td>
                    <td className="py-3 pr-0">
                      <Button
                        variant={e.contacted_at ? 'secondary' : 'primary'}
                        className="px-3 py-2 text-xs"
                        onClick={async () => {
                          if (!token) return;
                          setError(null);
                          try {
                            const next = await setContacted(token, e.id, !e.contacted_at);
                            setEntries((prev) => prev.map((x) => (x.id === e.id ? next : x)));
                          } catch (err) {
                            setError(err instanceof Error ? err.message : 'Failed to update entry.');
                          }
                        }}
                      >
                        {e.contacted_at ? 'Contacted' : 'Mark contacted'}
                      </Button>
                    </td>
                  </tr>
                ))}

                {!loading && filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center wl-muted">
                      No entries found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
