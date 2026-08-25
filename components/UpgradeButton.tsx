"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function UpgradeButton({
  isPro,
  isAuthenticated,
  stripeConfigured,
}: {
  isPro: boolean;
  isAuthenticated: boolean;
  stripeConfigured: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!isAuthenticated) {
    return (
      <button
        onClick={() => router.push("/signup")}
        className="w-full rounded-md bg-indigo-600 text-white py-2.5 font-medium hover:bg-indigo-500"
      >
        Sign up to upgrade
      </button>
    );
  }

  async function handleClick() {
    setLoading(true);
    try {
      if (stripeConfigured) {
        const res = await fetch("/api/billing/checkout", { method: "POST" });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Couldn't start checkout.");
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
      toast.success(
        data.plan === "pro"
          ? "Demo mode: upgraded to Pro."
          : "Demo mode: downgraded to Free."
      );
      router.push("/account");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading || isPro}
      className="w-full rounded-md bg-indigo-600 text-white py-2.5 font-medium hover:bg-indigo-500 disabled:opacity-50"
    >
      {isPro ? "Current plan" : loading ? "Redirecting…" : "Upgrade to Pro"}
    </button>
  );
}
