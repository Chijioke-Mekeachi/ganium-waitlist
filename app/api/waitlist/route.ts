import { NextResponse } from 'next/server';
import { WaitlistSchema } from '@/lib/waitlist/schema';
import { getSupabaseForInsert } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const TABLE = process.env.WAITLIST_TABLE ?? 'waitlist_entries';

function toUsdCents(input: string) {
  const n = Number(input);
  if (!Number.isFinite(n) || n < 0 || n > 1000) throw new Error('Invalid price');
  return Math.round(n * 100);
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const values = WaitlistSchema.parse(json);
    const supabase = getSupabaseForInsert();

    const { error } = await supabase.from(TABLE).insert({
      email: values.email,
      full_name: values.fullName,
      role: values.role,
      price_per_scan_cents: toUsdCents(values.pricePerScanUsd),
      contacted_at: null,
    });

    if (error) {
      if (String(error.code) === '23505') {
        return NextResponse.json({ error: 'This email is already on the waitlist.' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message || 'Failed to save signup.' }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Bad request';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
