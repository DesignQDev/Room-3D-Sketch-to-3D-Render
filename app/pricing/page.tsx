import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isStripeConfigured } from "@/lib/billing";
import { FREE_TIER_CAP_USD } from "@/lib/usage";
import UpgradeButton from "@/components/UpgradeButton";

export default async function PricingPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
  const isPro = user?.plan === "pro";
  const stripeConfigured = isStripeConfigured();

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 w-full">
      <div className="text-center">
        <h1 className="text-3xl font-semibold">Simple pricing</h1>
        <p className="mt-2 text-foreground/70">
          Start free. Upgrade when you need more.
        </p>
        {!stripeConfigured && (
          <p className="mt-2 text-xs text-amber-600">
            Demo mode: Stripe isn&apos;t configured, so upgrading toggles your plan
            locally instead of charging a card.
          </p>
        )}
      </div>

      <div className="mt-10 grid sm:grid-cols-2 gap-6">
        <div className="rounded-xl border border-black/10 dark:border-white/10 p-6">
          <h2 className="font-semibold text-lg">Free</h2>
          <p className="mt-1 text-3xl font-bold">A$0</p>
          <ul className="mt-4 space-y-2 text-sm text-foreground/70">
            <li>Up to US${FREE_TIER_CAP_USD.toFixed(0)} of AI processing</li>
            <li>Full 3D viewer</li>
            <li>Email renders to customers</li>
            <li>Room3D watermark on exports</li>
          </ul>
        </div>

        <div className="rounded-xl border-2 border-indigo-500 p-6 relative">
          <span className="absolute -top-3 left-6 rounded-full bg-indigo-600 text-white text-xs px-2 py-0.5">
            Pro
          </span>
          <h2 className="font-semibold text-lg">Pro</h2>
          <p className="mt-1 text-3xl font-bold">
            A$20<span className="text-base font-normal text-foreground/60">/month</span>
          </p>
          <ul className="mt-4 space-y-2 text-sm text-foreground/70">
            <li>Unlimited renders</li>
            <li>Higher-resolution exports</li>
            <li>Priority processing</li>
            <li>No watermark</li>
          </ul>
          <div className="mt-6">
            <UpgradeButton
              isPro={isPro}
              isAuthenticated={Boolean(userId)}
              stripeConfigured={stripeConfigured}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
