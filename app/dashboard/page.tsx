import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTotalSpendUsd, FREE_TIER_CAP_USD } from "@/lib/usage";

export default async function DashboardPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const [renders, user, spendUsd] = await Promise.all([
    prisma.render.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { sketch: true },
    }),
    prisma.user.findUnique({ where: { id: userId } }),
    getTotalSpendUsd(userId),
  ]);

  const isPro = user?.plan === "pro";

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 w-full">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Your renders</h1>
          <p className="mt-1 text-sm text-foreground/70">
            {renders.length} render{renders.length === 1 ? "" : "s"} so far
          </p>
        </div>
        <Link
          href="/new"
          className="rounded-md bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-500"
        >
          + New sketch
        </Link>
      </div>

      {!isPro && (
        <div className="mt-6 rounded-lg border border-black/10 dark:border-white/10 p-4 text-sm">
          <div className="flex items-center justify-between">
            <span>
              Free tier usage: US${spendUsd.toFixed(2)} / US${FREE_TIER_CAP_USD.toFixed(2)}
            </span>
            <Link href="/pricing" className="text-indigo-500 hover:underline">
              Upgrade to Pro
            </Link>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full bg-indigo-500"
              style={{
                width: `${Math.min(100, (spendUsd / FREE_TIER_CAP_USD) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {renders.length === 0 ? (
        <div className="mt-12 text-center text-sm text-foreground/60">
          <p>No renders yet.</p>
          <Link href="/new" className="mt-2 inline-block text-indigo-500 hover:underline">
            Create your first render
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {renders.map((r) => (
            <Link
              key={r.id}
              href={`/render/${r.id}`}
              className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden hover:border-indigo-400 transition-colors"
            >
              <div className="h-36 bg-black/5 dark:bg-white/5 flex items-center justify-center">
                {r.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.thumbnailUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.sketch.imageDataUrl}
                    alt=""
                    className="h-full w-full object-cover opacity-70"
                  />
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-medium capitalize">
                  {r.sketch.roomType || "Room"}
                </p>
                <p className="text-xs text-foreground/50">
                  {new Date(r.createdAt).toLocaleDateString()} ·{" "}
                  <StatusLabel status={r.status} />
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusLabel({ status }: { status: string }) {
  const label =
    status === "complete"
      ? "Complete"
      : status === "failed"
        ? "Failed"
        : "Processing";
  return <span>{label}</span>;
}
