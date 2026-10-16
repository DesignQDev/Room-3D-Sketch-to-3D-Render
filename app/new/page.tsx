"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import SketchUploader from "@/components/SketchUploader";

const ROOM_TYPES = ["Bathroom", "Kitchen", "Laundry", "Bedroom", "Living room", "Other"];

const STYLE_IDEAS = [
  "Modern minimalist",
  "Scandinavian",
  "Industrial",
  "Coastal",
  "Luxury hotel",
  "Warm timber & stone",
  "Classic white subway tile",
];

const VIEWS = [
  { value: "isometric", label: "Cutaway from above", hint: "Whole room visible, like a dollhouse" },
  { value: "perspective", label: "Standing in the room", hint: "Eye-level wide-angle view" },
] as const;

export default function NewSketchPage() {
  const router = useRouter();
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [roomType, setRoomType] = useState(ROOM_TYPES[0]);
  const [description, setDescription] = useState("");
  const [viewStyle, setViewStyle] = useState<(typeof VIEWS)[number]["value"]>("isometric");
  const [submitting, setSubmitting] = useState(false);

  function addIdea(idea: string) {
    setDescription((d) => (d.trim() ? `${d.trim()}, ${idea.toLowerCase()}` : idea));
  }

  async function handleGenerate() {
    if (!processedImage) {
      toast.error("Add a photo of your sketch first.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/renders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageDataUrl: processedImage,
          roomType,
          description: description.trim() || null,
          viewStyle,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "FREE_CAP_REACHED") {
          toast.error(data.error);
          router.push("/pricing?capped=1");
          return;
        }
        toast.error(data.error || "Something went wrong");
        return;
      }
      // Generation continues in the background; the render page shows progress.
      router.push(`/render/${data.id}`);
    } catch {
      toast.error("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 w-full">
      <h1 className="text-2xl font-semibold">New render</h1>
      <p className="mt-1 text-sm text-foreground/70">
        Add a photo of your sketch, tell us the look you&apos;re after, and we&apos;ll create
        a realistic render of the room.
      </p>

      <h2 className="mt-8 font-medium">1. Your sketch</h2>
      <div className="mt-3">
        <SketchUploader onProcessedChange={setProcessedImage} />
      </div>

      <h2 className="mt-8 font-medium">2. Look and feel</h2>
      <div className="mt-3 grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="roomType" className="block text-sm font-medium mb-1">
            Room type
          </label>
          <select
            id="roomType"
            value={roomType}
            onChange={(e) => setRoomType(e.target.value)}
            className="input"
          >
            {ROOM_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="viewStyle" className="block text-sm font-medium mb-1">
            View
          </label>
          <select
            id="viewStyle"
            value={viewStyle}
            onChange={(e) => setViewStyle(e.target.value as typeof viewStyle)}
            className="input"
          >
            {VIEWS.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label} — {v.hint}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="description" className="block text-sm font-medium mb-1">
            Describe the style, colours and materials
          </label>
          <textarea
            id="description"
            rows={4}
            maxLength={1500}
            placeholder="e.g. Warm Scandinavian bathroom with white large-format floor tiles, oak vanity, matte black tapware and a frameless glass shower"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input"
          />
          <div className="mt-2 flex flex-wrap gap-2" aria-label="Style ideas">
            {STYLE_IDEAS.map((idea) => (
              <button
                key={idea}
                type="button"
                onClick={() => addIdea(idea)}
                className="rounded-full border border-black/10 dark:border-white/15 px-3 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/10"
              >
                + {idea}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={submitting || !processedImage}
        className="mt-8 w-full sm:w-auto rounded-md bg-indigo-600 text-white px-6 py-2.5 font-medium hover:bg-indigo-500 disabled:opacity-50"
      >
        {submitting ? "Starting…" : "Create render"}
      </button>
      <p className="mt-2 text-xs text-foreground/50">
        Rendering takes about a minute. Dimensions and labels written on your sketch are
        used to size the room and fixtures.
      </p>
    </div>
  );
}
