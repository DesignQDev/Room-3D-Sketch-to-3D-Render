import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendTransactionalEmail } from "@/lib/email";

const SignupSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(200),
  consent: z.literal(true, {
    error: "You must agree to the Privacy Policy and Terms of Use",
  }),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = SignupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }
  const { name, email, password, consent } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with that email already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      consentAt: consent ? new Date() : null,
    },
  });

  const token = randomBytes(32).toString("hex");
  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      userId: user.id,
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24),
    },
  });

  const verifyUrl = `${process.env.APP_URL || "http://localhost:3000"}/verify?token=${token}`;

  const emailResult = await sendTransactionalEmail({
    to: email,
    subject: "Verify your email",
    html: `<p>Welcome! Please verify your email by clicking the link below.</p><p><a href="${verifyUrl}">Verify email</a></p>`,
  });

  return NextResponse.json({
    ok: true,
    // In demo mode (no RESEND_API_KEY) there's no real inbox to check, so we
    // hand the verify link straight back to the client to display.
    verifyUrl: emailResult.status === "demo" ? verifyUrl : undefined,
  });
}
