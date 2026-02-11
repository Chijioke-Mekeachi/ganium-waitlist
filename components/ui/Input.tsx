'use client';

import React from 'react';

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export function Input({ label, error, className = '', ...props }: Props) {
  return (
    <label className="block">
      {label ? <div className="mb-2 text-sm font-medium text-[var(--wl-text)]">{label}</div> : null}
      <input
        {...props}
        className={[
          'w-full border px-4 py-3 outline-none transition',
          'rounded-[var(--wl-radius-control)] bg-white/5 text-[var(--wl-text)] placeholder:text-[var(--wl-muted)]',
          error
            ? 'border-[rgb(251_113_133/0.55)] focus-visible:shadow-[0_0_0_4px_rgba(251,113,133,0.18)]'
            : 'border-white/10 focus-visible:wl-focus',
          className,
        ].join(' ')}
      />
      {error ? <div className="mt-2 text-sm text-[var(--wl-danger)]">{error}</div> : null}
    </label>
  );
}

