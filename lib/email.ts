import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

// Generic transactional email (verification, password reset). Returns
// "demo" when no RESEND_API_KEY is set so callers can surface the link
// directly in the UI instead of relying on an inbox.
export async function sendTransactionalEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ status: "sent" | "demo" }> {
  if (!isEmailConfigured()) {
    return { status: "demo" };
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.EMAIL_FROM || "renders@example.com";
  await resend.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
  return { status: "sent" };
}

export async function sendRenderEmail(params: {
  userId: string;
  renderId: string;
  toEmail: string;
  message?: string;
  viewUrl: string;
  thumbnailUrl?: string | null;
}) {
  const { userId, renderId, toEmail, message, viewUrl, thumbnailUrl } = params;

  if (!isEmailConfigured()) {
    await prisma.emailLog.create({
      data: {
        userId,
        renderId,
        toEmail,
        message,
        status: "demo",
      },
    });
    return { status: "demo" as const };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.EMAIL_FROM || "renders@example.com";

  try {
    await resend.emails.send({
      from,
      to: toEmail,
      subject: "Your 3D room render is ready",
      html: renderEmailHtml({ message, viewUrl, thumbnailUrl }),
    });
    await prisma.emailLog.create({
      data: { userId, renderId, toEmail, message, status: "sent" },
    });
    return { status: "sent" as const };
  } catch (err) {
    await prisma.emailLog.create({
      data: {
        userId,
        renderId,
        toEmail,
        message,
        status: "failed",
      },
    });
    throw err;
  }
}

function renderEmailHtml(params: {
  message?: string;
  viewUrl: string;
  thumbnailUrl?: string | null;
}) {
  const { message, viewUrl, thumbnailUrl } = params;
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Your 3D room render is ready</h2>
      ${message ? `<p>${escapeHtml(message)}</p>` : ""}
      ${thumbnailUrl ? `<img src="${thumbnailUrl}" alt="Room render" style="width:100%;border-radius:8px;margin:16px 0;" />` : ""}
      <p><a href="${viewUrl}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;border-radius:6px;text-decoration:none;">View interactive 3D room</a></p>
    </div>
  `;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
