"use client";

import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

const noopSubscribe = () => () => {};

export default function ShareButtons({
  shareToken,
  roomType,
}: {
  shareToken: string;
  roomType: string | null;
}) {
  const room = (roomType || "room").toLowerCase();
  const [message, setMessage] = useState(
    `Here's the render of your new ${room}:`
  );
  const [busy, setBusy] = useState(false);

  const canNativeShare = useSyncExternalStore(
    noopSubscribe,
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    () => false
  );

  const shareUrl = () => `${window.location.origin}/s/${shareToken}`;
  const fullText = () => `${message}\n${shareUrl()}`;

  async function handleNativeShare() {
    setBusy(true);
    try {
      // On phones, share the image file itself so it lands in the chat as a
      // picture; fall back to sharing the link where files aren't supported.
      try {
        const res = await fetch(`/api/image/${shareToken}`);
        const blob = await res.blob();
        const file = new File([blob], `${room}-render.jpg`, {
          type: blob.type || "image/jpeg",
        });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], text: fullText() });
          return;
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
      await navigator.share({ text: message, url: shareUrl() });
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        toast.error("Couldn't open the share sheet.");
      }
    } finally {
      setBusy(false);
    }
  }

  function handleWhatsApp() {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(fullText())}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function handleSms() {
    window.location.href = `sms:?&body=${encodeURIComponent(fullText())}`;
  }

  function handleEmail() {
    window.location.href = `mailto:?subject=${encodeURIComponent(
      `Your ${room} render`
    )}&body=${encodeURIComponent(fullText())}`;
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl());
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy — long-press the link to copy it instead.");
    }
  }

  const btn =
    "rounded-md border border-black/10 dark:border-white/15 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50";

  return (
    <section className="mt-6 rounded-xl border border-black/10 dark:border-white/10 p-4">
      <h2 className="font-medium">Share with your customer</h2>
      <label htmlFor="shareMessage" className="mt-3 block text-sm font-medium">
        Message
      </label>
      <textarea
        id="shareMessage"
        rows={2}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="input mt-1"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {canNativeShare && (
          <button
            onClick={handleNativeShare}
            disabled={busy}
            className="rounded-md bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-500 disabled:opacity-50"
          >
            {busy ? "Preparing…" : "Share…"}
          </button>
        )}
        <button onClick={handleWhatsApp} className={btn}>
          WhatsApp
        </button>
        <button onClick={handleSms} className={btn}>
          SMS
        </button>
        <button onClick={handleEmail} className={btn}>
          Email app
        </button>
        <button onClick={handleCopy} className={btn}>
          Copy link
        </button>
        <a href={`/api/image/${shareToken}?download=1`} className={btn}>
          Download
        </a>
      </div>
      <p className="mt-2 text-xs text-foreground/50">
        Anyone with the link can view this render. The link shows a preview image in
        WhatsApp, iMessage and most chat apps.
      </p>
    </section>
  );
}
