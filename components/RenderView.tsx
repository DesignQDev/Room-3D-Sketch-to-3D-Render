"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import type { RoomScene } from "@/lib/scene-schema";
import type { RoomViewerHandle } from "@/components/RoomViewer3D";

const RoomViewer3D = dynamic(() => import("@/components/RoomViewer3D"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-sm text-foreground/50">
      Loading 3D viewer…
    </div>
  ),
});

export default function RenderView({
  renderId,
  scene,
  sketchImage,
  thumbnailUrl,
  source,
}: {
  renderId: string;
  scene: RoomScene;
  sketchImage: string;
  thumbnailUrl: string | null;
  source: string;
}) {
  const viewerHandleRef = useRef<RoomViewerHandle | null>(null);
  const [tab, setTab] = useState<"3d" | "sketch">("3d");
  const [savedThumb, setSavedThumb] = useState<string | null>(thumbnailUrl);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [toEmail, setToEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleViewerReady = useCallback((handle: RoomViewerHandle) => {
    viewerHandleRef.current = handle;
  }, []);

  async function handleCaptureAndSave() {
    const dataUrl = viewerHandleRef.current?.captureScreenshot();
    if (!dataUrl) {
      toast.error("Couldn't capture the 3D view.");
      return null;
    }
    setSavedThumb(dataUrl);
    await fetch(`/api/renders/${renderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ thumbnailUrl: dataUrl }),
    });
    return dataUrl;
  }

  async function handleExportImage() {
    const dataUrl = savedThumb || (await handleCaptureAndSave());
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `room3d-render-${renderId}.png`;
    a.click();
  }

  async function handleSendEmail(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      if (!savedThumb) {
        await handleCaptureAndSave();
      }
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
    <div className="mx-auto max-w-5xl px-4 py-8 w-full">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold capitalize">{scene.roomType} render</h1>
          <p className="text-xs text-foreground/50">
            {scene.widthMeters.toFixed(1)}m x {scene.lengthMeters.toFixed(1)}m
            {source === "demo" && " · demo mode scene"}
          </p>
        </div>
        <div className="flex gap-2">
          <TabButton active={tab === "3d"} onClick={() => setTab("3d")}>
            3D view
          </TabButton>
          <TabButton active={tab === "sketch"} onClick={() => setTab("sketch")}>
            Original sketch
          </TabButton>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-black/10 dark:border-white/10 h-[420px] sm:h-[520px] overflow-hidden bg-[#eef1f5]">
        {tab === "3d" ? (
          <RoomViewer3D scene={scene} className="h-full w-full" onReady={handleViewerReady} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sketchImage}
            alt="Original sketch"
            className="h-full w-full object-contain bg-white"
          />
        )}
      </div>

      {tab === "3d" && (
        <p className="mt-2 text-xs text-foreground/50">Drag to rotate, scroll to zoom.</p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={handleExportImage}
          className="rounded-md border border-black/10 dark:border-white/15 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"
        >
          Export image
        </button>
        <button
          onClick={() => setShowEmailForm((s) => !s)}
          className="rounded-md bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-500"
        >
          Send to customer
        </button>
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
            The 3D view and a link will be attached automatically.
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
