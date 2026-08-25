import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { token } = await req.json().catch(() => ({ token: null }));
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const record = await prisma.verificationToken.findUnique({
    where: { token },
  });
  if (!record || record.expires < new Date()) {
    return NextResponse.json({ ok: true });
  }

  // deleteMany instead of delete: idempotent if this token was already
  // consumed by a concurrent/duplicate request (e.g. React Strict Mode's
  // double effect invocation in development).
  const { count } = await prisma.verificationToken.deleteMany({
    where: { token },
  });

  if (count > 0 && record.userId) {
    await prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}
