'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { WaitlistSchema, type WaitlistInput } from '@/lib/waitlist/schema';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

async function submitWaitlist(values: WaitlistInput) {
  const res = await fetch('/api/waitlist', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(values),
  });
  if (res.ok) return;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    const j = (await res.json().catch(() => null)) as null | { error?: string };
    if (j?.error) throw new Error(j.error);
  }
  throw new Error('Failed to join waitlist.');
}

export function WaitlistForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const defaultValues = useMemo<WaitlistInput>(
    () => ({ fullName: '', email: '', role: '', pricePerScanUsd: '' }),
    [],
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<WaitlistInput>({
    resolver: zodResolver(WaitlistSchema),
    defaultValues,
  });

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit(async (values) => {
        setSubmitError(null);
        try {
          await submitWaitlist(values);
          router.push('/thanks');
        } catch (err) {
          setSubmitError(err instanceof Error ? err.message : 'Failed to join waitlist.');
        }
      })}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Full name"
          placeholder="Jane Doe"
          autoComplete="name"
          error={errors.fullName?.message}
          {...register('fullName')}
        />
        <Input
          label="Email"
          placeholder="jane@company.com"
          autoComplete="email"
          inputMode="email"
          error={errors.email?.message}
          {...register('email')}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Role" defaultValue="" error={errors.role?.message} {...register('role')}>
          <option value="" disabled>
            Select a role…
          </option>
          <option value="student">Student</option>
          <option value="business owner">Business owner</option>
          <option value="salary earner">Salary earner</option>
          <option value="cryto trader">Crypto trader</option>
          <option value="job seeker">Job seeker</option>
          <option value="founder">Founder</option>
          <option value="developer">Developer</option>
          <option value="Influencer">Influencer</option>
        </Select>
      </div>

      <div className="grid gap-2">
        <Input
          label="What should the app charge for 1 scan? (USD)"
          type="number"
          step="0.01"
          min="0"
          placeholder="e.g. 0.25"
          error={errors.pricePerScanUsd?.message}
          {...register('pricePerScanUsd')}
        />
        <div className="text-xs wl-muted">This helps us price fairly.</div>
      </div>

      {submitError ? (
        <div className="rounded-[var(--wl-radius-control)] border border-[rgb(251_113_133/0.45)] bg-[rgb(251_113_133/0.08)] px-4 py-3 text-sm text-[var(--wl-danger)]">
          {submitError}
        </div>
      ) : null}

      <Button className="w-full py-3" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Joining…' : 'Join waitlist'}
      </Button>
    </form>
  );
}
