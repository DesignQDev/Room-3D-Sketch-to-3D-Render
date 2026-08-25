import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { interpretSketch } from "@/lib/ai";
import { canGenerateRender, recordUsage } from "@/lib/usage";

export const maxDuration = 60;

const CreateRenderSchema = z.object({
  imageDataUrl: z.string().startsWith("data:image/"),
  widthMeters: z.number().min(1).max(20).nullable().optional(),
  heightMeters: z.number().min(1).max(20).nullable().optional(),
  roomType: z.string().max(50).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const renders = await prisma.render.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { sketch: true },
  });

  return NextResponse.json({ renders });
}

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

  const { imageDataUrl, widthMeters, heightMeters, roomType, notes } =
    parsed.data;

  const sketch = await prisma.sketch.create({
    data: {
      userId,
      imageDataUrl,
      widthMeters: widthMeters ?? null,
      heightMeters: heightMeters ?? null,
      roomType: roomType ?? null,
      notes: notes ?? null,
    },
  });

  const render = await prisma.render.create({
    data: {
      userId,
      sketchId: sketch.id,
      status: "processing",
    },
  });

  try {
    const result = await interpretSketch({
      imageDataUrl,
      widthMeters,
      heightMeters,
      roomType,
      notes,
    });

    await recordUsage({
      userId,
      renderId: render.id,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      costUsd: result.costUsd,
    });

    const updated = await prisma.render.update({
      where: { id: render.id },
      data: {
        status: "complete",
        sceneJson: JSON.stringify(result.scene),
        source: result.source,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({ render: updated, scene: result.scene });
  } catch (err) {
    await prisma.render.update({
      where: { id: render.id },
      data: {
        status: "failed",
        errorMessage: err instanceof Error ? err.message : "Unknown error",
      },
    });
    return NextResponse.json(
      { error: "Failed to generate the 3D render. Please try again." },
      { status: 500 }
    );
  }
}
