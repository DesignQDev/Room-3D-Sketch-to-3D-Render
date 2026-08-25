import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isStripeConfigured } from "@/lib/billing";

// Local stand-in for Stripe Checkout when no Stripe keys are configured, so
// the upgrade/downgrade/cancel flows described in the brief can still be
// exercised end to end in a demo environment.
export async function POST() {
  if (isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe is configured; use real checkout/portal instead" },
      { status: 400 }
    );
  }

  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const nextPlan = user.plan === "pro" ? "free" : "pro";

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      plan: nextPlan,
      planRenewsAt:
        nextPlan === "pro"
          ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
          : null,
      planCanceledAt: nextPlan === "free" ? new Date() : null,
    },
  });

  return NextResponse.json({ plan: updated.plan });
}
