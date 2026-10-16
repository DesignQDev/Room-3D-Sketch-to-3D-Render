import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// The owner's original sketch photo, for the "Original sketch" tab.
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
    select: { sketch: { select: { imageDataUrl: true } } },
  });
  const match = render?.sketch.imageDataUrl.match(
    /^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/
  );
  if (!match) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new Response(new Uint8Array(Buffer.from(match[2], "base64")), {
    headers: {
      "Content-Type": match[1],
      "Cache-Control": "private, max-age=3600",
    },
  });
}
