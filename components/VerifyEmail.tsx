"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function VerifyEmail() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch("/api/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Verification failed");
        setState("ok");
      })
      .catch((err) => {
        setState("error");
        setError(err.message);
      });
  }, [token]);

  if (!token) {
    return <p className="text-sm text-red-600">Missing verification token.</p>;
  }
  if (state === "loading") {
    return <p className="text-sm text-foreground/70">Verifying…</p>;
  }
  if (state === "error") {
    return <p className="text-sm text-red-600">{error}</p>;
  }
  return (
    <div>
      <p className="text-sm text-foreground/70">Your email is verified.</p>
      <Link
        href="/dashboard"
        className="mt-4 inline-block rounded-md bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-500"
      >
        Go to dashboard
      </Link>
    </div>
  );
}
