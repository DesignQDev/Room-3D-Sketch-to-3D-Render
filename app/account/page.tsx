import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTotalSpendUsd, FREE_TIER_CAP_USD } from "@/lib/usage";
import { isStripeConfigured } from "@/lib/billing";
import ManageBillingButton from "@/components/ManageBillingButton";

export default async function AccountPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const [user, spendUsd] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    getTotalSpendUsd(userId),
  ]);
  if (!user) redirect("/login");

  const isPro = user.plan === "pro";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 w-full">
      <h1 className="text-2xl font-semibold">Account</h1>

      <section className="mt-6 rounded-xl border border-black/10 dark:border-white/10 p-5">
        <h2 className="font-medium">Profile</h2>
        <dl className="mt-3 text-sm space-y-2">
          <div className="flex justify-between">
            <dt className="text-foreground/60">Name</dt>
            <dd>{user.name || "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-foreground/60">Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-foreground/60">Email verified</dt>
            <dd>{user.emailVerified ? "Yes" : "No"}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-6 rounded-xl border border-black/10 dark:border-white/10 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Plan</h2>
          <span
            className={`text-xs rounded-full px-2 py-0.5 ${
              isPro
                ? "bg-indigo-600 text-white"
                : "bg-black/10 dark:bg-white/10"
            }`}
          >
            {isPro ? "Pro" : "Free"}
          </span>
        </div>

        {isPro ? (
          <>
            <p className="mt-3 text-sm text-foreground/70">
              Unlimited renders, priority processing, no watermark.
              {user.planRenewsAt &&
                ` Renews ${user.planRenewsAt.toLocaleDateString()}.`}
            </p>
            <div className="mt-4">
              <ManageBillingButton stripeConfigured={isStripeConfigured()} />
            </div>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm text-foreground/70">
              US${spendUsd.toFixed(2)} of US${FREE_TIER_CAP_USD.toFixed(2)} free-tier AI
              processing used.
            </p>
            <div className="mt-2 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full bg-indigo-500"
                style={{
                  width: `${Math.min(100, (spendUsd / FREE_TIER_CAP_USD) * 100)}%`,
                }}
              />
            </div>
            <a
              href="/pricing"
              className="mt-4 inline-block rounded-md bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-500"
            >
              Upgrade to Pro
            </a>
          </>
        )}
      </section>
    </div>
  );
}
