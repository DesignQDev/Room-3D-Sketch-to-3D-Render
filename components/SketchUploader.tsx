"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  onProcessedChange: (dataUrl: string | null) => void;
};

export default function SketchUploader({ onProcessedChange }: Props) {
  const [rawImage, setRawImage] = useState<HTMLImageElement | null>(null);
  const [rotation, setRotation] = useState(0); // 0 | 90 | 180 | 270
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [inset, setInset] = useState({ top: 0, right: 0, bottom: 0, left: 0 });
  const [dragActive, setDragActive] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        setRawImage(img);
        setRotation(0);
        setBrightness(100);
        setContrast(100);
        setInset({ top: 0, right: 0, bottom: 0, left: 0 });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }, []);

  // Support paste-from-clipboard.
  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const item = Array.from(e.clipboardData?.items || []).find((i) =>
        i.type.startsWith("image/")
      );
      const file = item?.getAsFile();
      if (file) loadFile(file);
    }
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [loadFile]);

  // Re-render the processed canvas whenever an adjustment changes.
  useEffect(() => {
    if (!rawImage) {
      onProcessedChange(null);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    const iw = rawImage.width;
    const ih = rawImage.height;
    const rotated90 = rotation === 90 || rotation === 270;
    const rotatedW = rotated90 ? ih : iw;
    const rotatedH = rotated90 ? iw : ih;

    const cropX = (inset.left / 100) * rotatedW;
    const cropY = (inset.top / 100) * rotatedH;
    const cropW = rotatedW * (1 - inset.left / 100 - inset.right / 100);
    const cropH = rotatedH * (1 - inset.top / 100 - inset.bottom / 100);

    const MAX_DIM = 1600;
    const scale = Math.min(1, MAX_DIM / Math.max(cropW, cropH));
    canvas.width = Math.max(1, Math.round(cropW * scale));
    canvas.height = Math.max(1, Math.round(cropH * scale));

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;

    // Draw the rotated full image onto an offscreen buffer, then crop from it.
    const off = document.createElement("canvas");
    off.width = rotatedW;
    off.height = rotatedH;
    const offCtx = off.getContext("2d")!;
    offCtx.translate(rotatedW / 2, rotatedH / 2);
    offCtx.rotate((rotation * Math.PI) / 180);
    offCtx.drawImage(rawImage, -iw / 2, -ih / 2);

    ctx.drawImage(
      off,
      cropX,
      cropY,
      cropW,
      cropH,
      0,
      0,
      canvas.width,
      canvas.height
    );
    ctx.restore();

    onProcessedChange(canvas.toDataURL("image/jpeg", 0.9));
  }, [rawImage, rotation, brightness, contrast, inset, onProcessedChange]);

  if (!rawImage) {
    return (
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          const file = e.dataTransfer.files?.[0];
          if (file) loadFile(file);
        }}
        className={`rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          dragActive
            ? "border-indigo-500 bg-indigo-500/5"
            : "border-black/15 dark:border-white/15"
        }`}
      >
        <p className="text-sm text-foreground/70">
          Drag & drop a sketch photo, paste from clipboard, or
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-md bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-500"
          >
            Choose file
          </button>
          <button
            type="button"
            onClick={() => {
              const input = fileInputRef.current;
              if (input) {
                input.setAttribute("capture", "environment");
                input.click();
              }
            }}
            className="rounded-md border border-black/10 dark:border-white/15 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"
          >
            Take photo
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/heic,image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) loadFile(file);
            e.target.value = "";
          }}
        />
        <p className="mt-3 text-xs text-foreground/50">JPEG, PNG or HEIC</p>
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-xl border border-black/10 dark:border-white/10 p-4 flex flex-col items-center">
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-[420px] rounded-md border border-black/10 dark:border-white/10"
        />
      </div>

      <div className="mt-4 grid sm:grid-cols-2 gap-4">
        <div>
          <span className="block text-sm font-medium mb-1">Rotate</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRotation((r) => (r + 270) % 360)}
              className="rounded-md border border-black/10 dark:border-white/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/10"
            >
              ⟲ Left
            </button>
            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="rounded-md border border-black/10 dark:border-white/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/10"
            >
              ⟳ Right
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Brightness ({brightness}%)
          </label>
          <input
            type="range"
            min={50}
            max={150}
            value={brightness}
            onChange={(e) => setBrightness(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Contrast ({contrast}%)
          </label>
          <input
            type="range"
            min={50}
            max={150}
            value={contrast}
            onChange={(e) => setContrast(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <span className="block text-sm font-medium mb-1">Crop (straighten edges)</span>
          <div className="grid grid-cols-2 gap-2 text-xs text-foreground/70">
            <CropSlider label="Top" value={inset.top} onChange={(v) => setInset((s) => ({ ...s, top: v }))} />
            <CropSlider label="Bottom" value={inset.bottom} onChange={(v) => setInset((s) => ({ ...s, bottom: v }))} />
            <CropSlider label="Left" value={inset.left} onChange={(v) => setInset((s) => ({ ...s, left: v }))} />
            <CropSlider label="Right" value={inset.right} onChange={(v) => setInset((s) => ({ ...s, right: v }))} />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setRawImage(null)}
        className="mt-4 text-sm text-foreground/70 underline"
      >
        Use a different photo
      </button>
    </div>
  );
}

function CropSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="w-12">{label}</span>
      <input
        type="range"
        min={0}
        max={40}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1"
      />
    </label>
  );
}
