"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [demoResetUrl, setDemoResetUrl] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setSent(true);
      if (data.resetUrl) setDemoResetUrl(data.resetUrl);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 w-full">
      <h1 className="text-2xl font-semibold">Reset your password</h1>
      {sent ? (
        <div className="mt-4">
          <p className="text-sm text-foreground/70">
            If an account exists for that email, a reset link has been sent.
          </p>
          {demoResetUrl && (
            <>
              <p className="mt-3 text-sm text-foreground/70">
                Demo mode: no email provider is configured, so here&apos;s your reset
                link directly.
              </p>
              <Link
                href={demoResetUrl}
                className="mt-3 inline-block rounded-md bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-500"
              >
                Reset password
              </Link>
            </>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-indigo-600 text-white py-2.5 font-medium hover:bg-indigo-500 disabled:opacity-50"
          >
            {submitting ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
      <p className="mt-6 text-sm text-foreground/70">
        <Link href="/login" className="underline">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
