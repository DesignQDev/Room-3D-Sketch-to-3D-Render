import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STALE_AFTER_MS } from "@/lib/render-job";

// Lightweight status check, polled by the render page while a render is
// being generated. Deliberately doesn't return any image data.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const render = await prisma.render.findFirst({
    where: { id, userId },
    select: { status: true, errorMessage: true, createdAt: true },
  });
  if (!render) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isStale =
    (render.status === "processing" || render.status === "pending") &&
    Date.now() - render.createdAt.getTime() > STALE_AFTER_MS;
  if (isStale) {
    const errorMessage =
      "Generation timed out before it finished. Please try again.";
    await prisma.render.updateMany({
      where: { id, userId, status: { in: ["processing", "pending"] } },
      data: { status: "failed", errorMessage },
    });
    return NextResponse.json({ status: "failed", errorMessage });
  }

  return NextResponse.json({
    status: render.status,
    errorMessage: render.errorMessage,
  });
}
