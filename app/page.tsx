import Link from "next/link";
import Image from "next/image";
import { WaitlistForm } from "@/components/waitlist/WaitlistForm";

function toYouTubeEmbed(url: string) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "").trim();
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

export default function Page() {
  const demoUrl = "/demo.mp4";
  const yt = demoUrl ? toYouTubeEmbed(demoUrl) : null;
  const isMp4 = demoUrl ? demoUrl.toLowerCase().endsWith(".mp4") : false;

  return (
    <div className="min-h-screen">
      <header className="mx-auto max-w-6xl px-6 pt-8">
        <nav className="wl-surface-soft flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-xl border border-white/10 bg-white/5">
              <Image src="/logo.jpg" width={40} height={40} alt="Ganium" className="h-full w-full object-cover" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-[var(--wl-text)]">Ganium</div>
              <div className="text-xs wl-muted">Early access waitlist</div>
            </div>
          </div>
        </nav>
      </header>

      <main className="mx-auto grid max-w-6xl gap-10 px-6 pb-16 pt-10 lg:grid-cols-2 lg:items-start">
        <section className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-[var(--wl-text)]">
            <span className="h-2 w-2 rounded-full bg-[var(--wl-success)]" />
            Preview demo (beta)
          </div>

          <div className="wl-surface px-4 py-4">
            <div className="overflow-hidden rounded-[18px] border border-white/10 bg-white/5">
              {demoUrl ? (
                yt ? (
                  <iframe
                    title="Ganium demo"
                    src={yt}
                    className="aspect-video w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : isMp4 ? (
                  <video className="aspect-video w-full" controls playsInline preload="metadata">
                    <source src={demoUrl} type="video/mp4" />
                  </video>
                ) : (
                  <div className="aspect-video grid place-items-center px-6 text-sm wl-muted">
                    Unsupported video URL. Use a YouTube link or an `.mp4` URL.
                  </div>
                )
              ) : (
                <div className="aspect-video grid place-items-center px-6 text-sm wl-muted">
                  Video preview unavailable.
                </div>
              )}
            </div>
            <div className="mt-4">
              <div className="text-xl font-semibold text-[var(--wl-text)]">Join the waitlist</div>
              <div className="mt-1 text-sm wl-muted">
                Tell us your role and what you think is a fair price per scan. We’ll invite users in waves.
              </div>
            </div>
          </div>
        </section>

        <aside className="wl-surface px-6 py-6">
          <div className="mb-5">
            <div className="text-lg font-semibold text-[var(--wl-text)]">Join the waitlist</div>
            <div className="mt-1 text-sm wl-muted">We’ll use this to prioritize invites.</div>
          </div>
          <WaitlistForm />
          <div className="mt-5 text-xs wl-muted">No spam. Opt out anytime.</div>
        </aside>
      </main>
    </div>
  );
}
