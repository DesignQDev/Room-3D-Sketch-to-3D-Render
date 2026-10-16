"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import ShareButtons from "@/components/ShareButtons";

export default function RenderView({
  renderId,
  shareToken,
  roomType,
  description,
  isDemo,
  prompt,
  model,
}: {
  renderId: string;
  shareToken: string;
  roomType: string | null;
  description: string | null;
  isDemo: boolean;
  prompt: string | null;
  model: string | null;
}) {
  const [tab, setTab] = useState<"render" | "sketch">("render");
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [toEmail, setToEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSendEmail(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch(`/api/renders/${renderId}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toEmail, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Couldn't send the email.");
        return;
      }
      if (data.status === "demo") {
        toast.success("Demo mode: email logged (no provider configured), not actually delivered.");
      } else {
        toast.success("Email sent!");
      }
      setShowEmailForm(false);
      setToEmail("");
      setMessage("");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 w-full">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold capitalize">{roomType || "Room"} render</h1>
          {description && (
            <p className="text-xs text-foreground/50 max-w-xl">&ldquo;{description}&rdquo;</p>
          )}
          {isDemo && (
            <p className="text-xs text-amber-600">
              Demo mode: image generation isn&apos;t configured, so this shows your sketch.
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <TabButton active={tab === "render"} onClick={() => setTab("render")}>
            Render
          </TabButton>
          <TabButton active={tab === "sketch"} onClick={() => setTab("sketch")}>
            Original sketch
          </TabButton>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-black/10 dark:border-white/10 overflow-hidden bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={tab === "render" ? `/api/image/${shareToken}` : `/api/renders/${renderId}/sketch`}
          alt={tab === "render" ? "Generated render" : "Original sketch"}
          className="w-full max-h-[75vh] object-contain"
        />
      </div>

      <ShareButtons shareToken={shareToken} roomType={roomType} />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={() => setShowEmailForm((s) => !s)}
          className="rounded-md border border-black/10 dark:border-white/15 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"
        >
          Email it from Room3D
        </button>
        <Link href="/new" className="text-sm text-indigo-500 hover:underline">
          + Create another render
        </Link>
      </div>

      {showEmailForm && (
        <form
          onSubmit={handleSendEmail}
          className="mt-4 rounded-xl border border-black/10 dark:border-white/10 p-4 max-w-md space-y-3"
        >
          <div>
            <label htmlFor="toEmail" className="block text-sm font-medium mb-1">
              Customer email
            </label>
            <input
              id="toEmail"
              type="email"
              required
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="message" className="block text-sm font-medium mb-1">
              Message (optional)
            </label>
            <textarea
              id="message"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="input"
            />
          </div>
          <p className="text-xs text-foreground/50">
            The render and a link to the full-size image are included automatically.
          </p>
          <button
            type="submit"
            disabled={sending}
            className="rounded-md bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-500 disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </form>
      )}

      {prompt && (
        <details className="mt-6 text-xs text-foreground/60">
          <summary className="cursor-pointer select-none">
            Technical details{model ? ` (${model})` : ""}
          </summary>
          <pre className="mt-2 max-h-80 overflow-auto rounded-md bg-black/5 dark:bg-white/5 p-3 whitespace-pre-wrap">
            {prompt}
          </pre>
        </details>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium ${
        active
          ? "bg-indigo-600 text-white"
          : "border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}
