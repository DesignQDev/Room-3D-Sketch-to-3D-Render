"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function ConsentForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleContinue() {
    setSubmitting(true);
    try {
      await fetch("/api/consent", { method: "POST" });
      // Full navigation (not router.push) so the proxy re-checks consent
      // against a freshly-decoded session on the next request.
      window.location.assign(callbackUrl);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <label className="mt-6 flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          I agree to the{" "}
          <Link href="/privacy" className="underline" target="_blank">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/terms" className="underline" target="_blank">
            Terms of Use
          </Link>
          .
        </span>
      </label>

      <button
        onClick={handleContinue}
        disabled={!checked || submitting}
        className="mt-6 w-full rounded-md bg-indigo-600 text-white py-2.5 font-medium hover:bg-indigo-500 disabled:opacity-50"
      >
        {submitting ? "Continuing…" : "Continue"}
      </button>
    </>
  );
}
