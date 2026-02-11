import { NextResponse } from 'next/server';
import { requireAdminBearer } from '@/lib/admin/auth';
import { getSupabaseServiceRole } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const TABLE = process.env.WAITLIST_TABLE ?? 'waitlist_entries';

export async function GET(req: Request) {
  try {
    requireAdminBearer(req.headers.get('authorization'));
    const supabase = getSupabaseServiceRole();
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, created_at, email, full_name, role, price_per_scan_cents, contacted_at')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) return NextResponse.json({ error: error.message || 'Failed to load waitlist' }, { status: 400 });
    return NextResponse.json(data ?? []);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unauthorized';
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}
