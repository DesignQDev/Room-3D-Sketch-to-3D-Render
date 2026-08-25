"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";

export default function SignupForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoVerifyUrl, setDemoVerifyUrl] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!consent) {
      setError("You must agree to the Privacy Policy and Terms of Use to continue.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, consent }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      if (data.verifyUrl) {
        setDemoVerifyUrl(data.verifyUrl);
        return;
      }

      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        toast.success("Account created — please log in.");
        router.push("/login");
        return;
      }

      toast.success("Account created!");
      router.push("/dashboard");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (demoVerifyUrl) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Verify your email</h1>
        <p className="mt-3 text-sm text-foreground/70">
          Demo mode: no email provider is configured, so here&apos;s your verification
          link directly. In production this would arrive in your inbox.
        </p>
        <Link
          href={demoVerifyUrl}
          className="mt-4 inline-block rounded-md bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-500"
        >
          Verify email
        </Link>
        <p className="mt-4">
          <button
            className="text-sm text-foreground/70 underline"
            onClick={async () => {
              await signIn("credentials", { email, password, redirect: false });
              router.push("/dashboard");
              router.refresh();
            }}
          >
            Skip for now and continue
          </button>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <p className="mt-2 text-sm text-foreground/70">
        Free to register. Upgrade to Pro any time.
      </p>

      {googleEnabled && (
        <>
          <button
            onClick={() => signIn("google", { callbackUrl: "/consent" })}
            className="mt-6 w-full rounded-md border border-black/10 dark:border-white/15 py-2.5 font-medium hover:bg-black/5 dark:hover:bg-white/10"
          >
            Continue with Google
          </button>
          <div className="my-5 flex items-center gap-3 text-xs text-foreground/50">
            <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
            or
            <div className="h-px flex-1 bg-black/10 dark:bg-white/10" />
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 mt-6">
        <Field label="Name" htmlFor="name">
          <input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Email" htmlFor="email">
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Password" htmlFor="password">
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
        </Field>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5"
            required
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

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !consent}
          className="w-full rounded-md bg-indigo-600 text-white py-2.5 font-medium hover:bg-indigo-500 disabled:opacity-50"
        >
          {submitting ? "Creating account…" : "Sign up"}
        </button>
      </form>

      <p className="mt-6 text-sm text-foreground/70">
        Already have an account?{" "}
        <Link href="/login" className="underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
