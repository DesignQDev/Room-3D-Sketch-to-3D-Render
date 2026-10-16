"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const MESSAGES = [
  "Reading your sketch…",
  "Placing the walls, door and window…",
  "Positioning the fixtures…",
  "Choosing materials and finishes…",
  "Setting up the lighting…",
  "Rendering — nearly there…",
];

export default function RenderProgress({ renderId }: { renderId: string }) {
  const router = useRouter();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const tick = setInterval(() => setElapsed((s) => s + 1), 1000);
    let stopped = false;

    async function poll() {
      try {
        const res = await fetch(`/api/renders/${renderId}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (!stopped && data.status !== "processing" && data.status !== "pending") {
            stopped = true;
            router.refresh();
          }
        }
      } catch {
        // transient network error — keep polling
      }
    }
    const pollTimer = setInterval(poll, 3000);

    return () => {
      stopped = true;
      clearInterval(tick);
      clearInterval(pollTimer);
    };
  }, [renderId, router]);

  const message = MESSAGES[Math.min(MESSAGES.length - 1, Math.floor(elapsed / 12))];

  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center w-full" role="status" aria-live="polite">
      <span className="inline-block h-10 w-10 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
      <h1 className="mt-6 text-xl font-semibold">Creating your render</h1>
      <p className="mt-2 text-sm text-foreground/70">{message}</p>
      <p className="mt-1 text-xs text-foreground/50">
        {elapsed}s — this usually takes 30–90 seconds. You can leave this page and find
        it in your dashboard when it&apos;s ready.
      </p>
    </div>
  );
}
