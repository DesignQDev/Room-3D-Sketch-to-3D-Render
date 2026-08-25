import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendRenderEmail } from "@/lib/email";

const Schema = z.object({
  toEmail: z.string().email(),
  message: z.string().max(2000).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const render = await prisma.render.findFirst({ where: { id, userId } });
  if (!render) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const viewUrl = `${process.env.APP_URL || "http://localhost:3000"}/render/${render.id}`;

  const result = await sendRenderEmail({
    userId,
    renderId: render.id,
    toEmail: parsed.data.toEmail,
    message: parsed.data.message,
    viewUrl,
    thumbnailUrl: render.thumbnailUrl,
  });

  return NextResponse.json({ ok: true, status: result.status });
}
