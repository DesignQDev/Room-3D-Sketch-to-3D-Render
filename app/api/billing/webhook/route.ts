import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe, isStripeConfigured } from "@/lib/billing";

export async function POST(req: NextRequest) {
  if (!isStripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Stripe is not configured on this deployment" },
      { status: 501 }
    );
  }

  const stripe = getStripe();
  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature || "",
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.customer && s.subscription) {
        await prisma.user.updateMany({
          where: { stripeCustomerId: String(s.customer) },
          data: {
            plan: "pro",
            stripeSubId: String(s.subscription),
            planCanceledAt: null,
          },
        });
      }
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const isActive = sub.status === "active" || sub.status === "trialing";
      await prisma.user.updateMany({
        where: { stripeCustomerId: String(sub.customer) },
        data: {
          plan: isActive ? "pro" : "free",
          planRenewsAt: sub.items.data[0]?.current_period_end
            ? new Date(sub.items.data[0].current_period_end * 1000)
            : null,
          planCanceledAt: sub.cancel_at
            ? new Date(sub.cancel_at * 1000)
            : null,
        },
      });
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await prisma.user.updateMany({
        where: { stripeCustomerId: String(sub.customer) },
        data: { plan: "free", stripeSubId: null, planCanceledAt: new Date() },
      });
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
