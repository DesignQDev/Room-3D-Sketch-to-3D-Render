import { NextRequest, NextResponse, after } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canGenerateRender } from "@/lib/usage";
import { runRenderJob } from "@/lib/render-job";

// Image generation can take a minute or more. The work runs in after(), which
// keeps the function alive up to this limit after the response has been sent.
export const maxDuration = 300;

const CreateRenderSchema = z.object({
  imageDataUrl: z.string().startsWith("data:image/"),
  roomType: z.string().max(50).nullable().optional(),
  description: z.string().max(1500).nullable().optional(),
  viewStyle: z.enum(["isometric", "perspective"]).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateRenderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const cap = await canGenerateRender(userId);
  if (!cap.allowed) {
    return NextResponse.json(
      {
        error: `You've reached the free-tier limit (US$${cap.capUsd.toFixed(2)} of AI processing). Upgrade to Pro to keep generating renders.`,
        code: "FREE_CAP_REACHED",
        spendUsd: cap.spendUsd,
        capUsd: cap.capUsd,
      },
      { status: 402 }
    );
  }

  const { imageDataUrl, roomType, description, viewStyle } = parsed.data;

  const render = await prisma.render.create({
    data: {
      user: { connect: { id: userId } },
      status: "processing",
      sketch: {
        create: {
          user: { connect: { id: userId } },
          imageDataUrl,
          roomType: roomType ?? null,
          description: description?.trim() || null,
          viewStyle: viewStyle ?? "isometric",
        },
      },
    },
  });

  after(() => runRenderJob(render.id));

  return NextResponse.json({ id: render.id });
}
