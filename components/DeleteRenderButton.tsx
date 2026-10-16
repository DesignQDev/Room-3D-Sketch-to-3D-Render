"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Spinner from "@/components/Spinner";

export default function DeleteRenderButton({ renderId }: { renderId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/renders/${renderId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Couldn't delete this render.");
        setDeleting(false);
        return;
      }
      toast.success("Render deleted");
      // Stay in the deleting state until the refreshed list drops this card.
      router.refresh();
    } catch {
      toast.error("Couldn't reach the server. Please try again.");
      setDeleting(false);
    }
  }

  if (deleting) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-foreground/60">
        <Spinner className="h-3 w-3" /> Deleting…
      </span>
    );
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-2 text-xs">
        <span className="text-foreground/70">Delete this render?</span>
        <button
          onClick={handleDelete}
          className="rounded px-2 py-1 font-medium text-red-600 hover:bg-red-500/10"
        >
          Delete
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="rounded px-2 py-1 text-foreground/70 hover:bg-black/5 dark:hover:bg-white/10"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="rounded px-2 py-1 text-xs text-foreground/60 hover:bg-black/5 hover:text-red-600 dark:hover:bg-white/10"
      aria-label="Delete render"
    >
      Delete
    </button>
  );
}
