import Spinner from "@/components/Spinner";

export default function PageLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-sm text-foreground/60"
      role="status"
      aria-live="polite"
    >
      <Spinner className="h-8 w-8 border-[3px] text-indigo-500" />
      <span>{label}</span>
    </div>
  );
}
