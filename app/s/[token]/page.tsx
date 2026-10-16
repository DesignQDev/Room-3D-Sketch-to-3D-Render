import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAppUrl } from "@/lib/app-url";

// Public page a customer lands on from a shared link (WhatsApp, SMS, email).
// No login required — the unguessable token in the URL is the access control.

async function getRender(token: string) {
  const render = await prisma.render.findUnique({
    where: { shareToken: token },
    select: {
      status: true,
      imageData: true,
      sketch: { select: { roomType: true } },
    },
  });
  if (!render || render.status !== "complete" || !render.imageData) return null;
  return { roomType: render.sketch.roomType };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const render = await getRender(token);
  if (!render) return { title: "Render not found" };

  const title = `${render.roomType || "Room"} render`;
  const description = "A 3D render of your room, made with Room3D.";
  const image = `${getAppUrl()}/api/image/${token}?variant=preview`;
  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: image }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function SharedRenderPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const render = await getRender(token);
  if (!render) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 w-full">
      <h1 className="text-xl font-semibold capitalize">
        {render.roomType || "Room"} render
      </h1>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/image/${token}`}
        alt={`${render.roomType || "Room"} render`}
        className="mt-4 w-full rounded-xl border border-black/10 dark:border-white/10"
      />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <a
          href={`/api/image/${token}?download=1`}
          className="rounded-md bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-500"
        >
          Download image
        </a>
        <p className="text-xs text-foreground/50">
          Made with{" "}
          <Link href="/" className="underline">
            Room3D
          </Link>{" "}
          — turn a sketch into a render.
        </p>
      </div>
    </div>
  );
}
