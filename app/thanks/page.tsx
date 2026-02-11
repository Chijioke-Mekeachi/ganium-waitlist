import Link from "next/link";

export default function ThanksPage() {
  return (
    <div className="min-h-screen grid place-items-center px-6">
      <div className="wl-surface w-full max-w-lg px-6 py-6 text-center">
        <div className="text-2xl font-semibold text-[var(--wl-text)]">You’re on the list.</div>
        <p className="mt-2 text-sm wl-muted">We’ll reach out as soon as your invite is ready.</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="rounded-[var(--wl-radius-control)] border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-[var(--wl-text)] hover:bg-white/10"
          >
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}

