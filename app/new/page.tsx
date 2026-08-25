"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import SketchUploader from "@/components/SketchUploader";

const ROOM_TYPES = ["Bathroom", "Kitchen", "Bedroom", "Living room", "Other"];

const PROGRESS_MESSAGES = [
  "Reading the sketch…",
  "Finding walls, doors and windows…",
  "Estimating room dimensions…",
  "Placing fixtures…",
  "Building the 3D scene…",
];

export default function NewSketchPage() {
  const router = useRouter();
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [roomType, setRoomType] = useState(ROOM_TYPES[0]);
  const [width, setWidth] = useState("");
  const [length, setLength] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [progressMsg, setProgressMsg] = useState(PROGRESS_MESSAGES[0]);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!submitting) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    let msgIndex = 0;
    let secs = 0;
    timerRef.current = setInterval(() => {
      secs += 1;
      setElapsed(secs);
      if (secs % 4 === 0) {
        msgIndex = (msgIndex + 1) % PROGRESS_MESSAGES.length;
        setProgressMsg(PROGRESS_MESSAGES[msgIndex]);
      }
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [submitting]);

  async function handleGenerate() {
    if (!processedImage) {
      toast.error("Add a sketch photo first.");
      return;
    }
    setSubmitting(true);
    setElapsed(0);
    try {
      const res = await fetch("/api/renders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageDataUrl: processedImage,
          widthMeters: width ? Number(width) : null,
          heightMeters: length ? Number(length) : null,
          roomType,
          notes: notes || null,
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
      toast.success("Render generated!");
      router.push(`/render/${data.render.id}`);
    } catch {
      toast.error("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 w-full">
      <h1 className="text-2xl font-semibold">New sketch</h1>
      <p className="mt-1 text-sm text-foreground/70">
        Upload a photo of a hand-drawn room layout, confirm the details, and we&apos;ll
        generate a 3D render.
      </p>

      <div className="mt-6">
        <SketchUploader onProcessedChange={setProcessedImage} />
      </div>

      <div className="mt-8 grid sm:grid-cols-2 gap-4">
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="width" className="block text-sm font-medium mb-1">
              Width (m)
            </label>
            <input
              id="width"
              type="number"
              min={1}
              max={20}
              step={0.1}
              placeholder="e.g. 3.2"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="length" className="block text-sm font-medium mb-1">
              Length (m)
            </label>
            <input
              id="length"
              type="number"
              min={1}
              max={20}
              step={0.1}
              placeholder="e.g. 2.4"
              value={length}
              onChange={(e) => setLength(e.target.value)}
              className="input"
            />
          </div>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="notes" className="block text-sm font-medium mb-1">
            Notes for the AI (optional)
          </label>
          <textarea
            id="notes"
            rows={3}
            placeholder="e.g. the window is on the far wall, ceiling is 2.7m"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input"
          />
        </div>
      </div>
      <p className="mt-2 text-xs text-foreground/50">
        Handwriting recognition on dimensions isn&apos;t perfect — confirming the width
        and length above helps the AI scale the room accurately.
      </p>

      <button
        onClick={handleGenerate}
        disabled={submitting || !processedImage}
        className="mt-6 w-full sm:w-auto rounded-md bg-indigo-600 text-white px-6 py-2.5 font-medium hover:bg-indigo-500 disabled:opacity-50"
      >
        {submitting ? "Generating…" : "Generate 3D render"}
      </button>

      {submitting && (
        <div className="mt-4 flex items-center gap-3 text-sm text-foreground/70">
          <span className="h-4 w-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <span>
            {progressMsg} ({elapsed}s — this can take up to a minute)
          </span>
        </div>
      )}
    </div>
  );
}
