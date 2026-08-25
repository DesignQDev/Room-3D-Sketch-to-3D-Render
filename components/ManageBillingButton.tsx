"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function ManageBillingButton({
  stripeConfigured,
}: {
  stripeConfigured: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      if (stripeConfigured) {
        const res = await fetch("/api/billing/portal", { method: "POST" });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Couldn't open billing portal.");
          return;
        }
        window.location.href = data.url;
        return;
      }
      const res = await fetch("/api/billing/demo-toggle", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Something went wrong.");
        return;
      }
      toast.success("Demo mode: downgraded to Free.");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="rounded-md border border-black/10 dark:border-white/15 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50"
    >
      {loading ? "Loading…" : "Manage subscription"}
    </button>
  );
}
