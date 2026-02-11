import { NextResponse } from 'next/server';
import { requireAdminBearer } from '@/lib/admin/auth';
import { getSupabaseServiceRole } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const TABLE = process.env.WAITLIST_TABLE ?? 'waitlist_entries';

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    requireAdminBearer(req.headers.get('authorization'));
    const { id } = await ctx.params;
    const body = (await req.json()) as { contacted?: boolean };
    if (typeof body.contacted !== 'boolean') return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

    const supabase = getSupabaseServiceRole();
    const contactedAt = body.contacted ? new Date().toISOString() : null;
    const { data, error } = await supabase
      .from(TABLE)
      .update({ contacted_at: contactedAt })
      .eq('id', id)
      .select('id, created_at, email, full_name, role, price_per_scan_cents, contacted_at')
      .single();

    if (error) return NextResponse.json({ error: error.message || 'Failed to update' }, { status: 400 });
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unauthorized';
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}
