import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { makePreviewJpeg } from "@/lib/imagegen";

// Serves a finished render by its unguessable share token. This is public on
// purpose: it's what the share link, WhatsApp/SMS previews and emails load.
//   ?variant=preview  -> ~1200px JPEG small enough for chat-app link previews
//   ?download=1       -> forces a file download
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const render = await prisma.render.findUnique({
    where: { shareToken: token },
    select: { id: true, status: true, imageData: true, imageMime: true },
  });
  if (!render || render.status !== "complete" || !render.imageData) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  let body: Buffer;
  let mime = render.imageMime || "image/jpeg";

  if (searchParams.get("variant") === "preview") {
    try {
      body = await makePreviewJpeg(render.imageData);
      mime = "image/jpeg";
    } catch {
      body = Buffer.from(render.imageData, "base64");
    }
  } else {
    body = Buffer.from(render.imageData, "base64");
  }

  const ext = mime.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
  const headers: Record<string, string> = {
    "Content-Type": mime,
    "Cache-Control": "public, max-age=86400",
  };
  if (searchParams.get("download")) {
    headers["Content-Disposition"] = `attachment; filename="room3d-render-${render.id}.${ext}"`;
  }

  return new Response(new Uint8Array(body), { headers });
}
