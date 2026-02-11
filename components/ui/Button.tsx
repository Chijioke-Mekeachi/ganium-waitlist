'use client';

import React from 'react';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
};

const variants: Record<NonNullable<Props['variant']>, string> = {
  primary: 'bg-[var(--wl-primary)] text-black hover:brightness-110 active:brightness-95',
  secondary: 'bg-white/5 text-[var(--wl-text)] border border-white/10 hover:bg-white/10',
  danger: 'bg-[var(--wl-danger)] text-black hover:brightness-110 active:brightness-95',
  ghost: 'bg-transparent text-[var(--wl-text)] hover:bg-white/5',
};

export function Button({ variant = 'primary', className = '', ...props }: Props) {
  return (
    <button
      {...props}
      className={[
        'inline-flex items-center justify-center px-4 py-2 font-medium transition disabled:opacity-60 disabled:cursor-not-allowed',
        'rounded-[var(--wl-radius-control)] focus-visible:wl-focus',
        variants[variant],
        className,
      ].join(' ')}
    />
  );
}

