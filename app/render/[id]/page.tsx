import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import RenderView from "@/components/RenderView";
import RenderProgress from "@/components/RenderProgress";

export default async function RenderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  // Select fields explicitly so the large image blob is never loaded here —
  // imageMime is only set once imageData is, so it tells us the image exists.
  const render = await prisma.render.findFirst({
    where: { id, userId },
    select: {
      id: true,
      status: true,
      shareToken: true,
      source: true,
      model: true,
      prompt: true,
      imageMime: true,
      errorMessage: true,
      sketch: { select: { roomType: true, description: true } },
    },
  });
  if (!render) notFound();

  if (render.status === "processing" || render.status === "pending") {
    return <RenderProgress renderId={render.id} />;
  }

  if (render.status === "failed") {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center w-full">
        <h1 className="text-xl font-semibold">We couldn&apos;t create this render</h1>
        <p className="mt-2 text-sm text-foreground/70">
          Something went wrong while generating it — please try again.
        </p>
        <Link
          href="/new"
          className="mt-6 inline-block rounded-md bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-500"
        >
          Try again
        </Link>
        {render.errorMessage && (
          <details className="mt-6 text-left text-xs text-foreground/60">
            <summary className="cursor-pointer select-none">Technical details</summary>
            <pre className="mt-2 max-h-60 overflow-auto rounded-md bg-black/5 dark:bg-white/5 p-3 whitespace-pre-wrap break-all">
              {render.errorMessage}
            </pre>
          </details>
        )}
      </div>
    );
  }

  if (!render.imageMime) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center w-full">
        <h1 className="text-xl font-semibold">This render is no longer available</h1>
        <p className="mt-2 text-sm text-foreground/70">
          It was created with our earlier 3D viewer, which has been replaced by
          photorealistic renders.
        </p>
        <Link
          href="/new"
          className="mt-6 inline-block rounded-md bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-500"
        >
          Create a new render
        </Link>
      </div>
    );
  }

  return (
    <RenderView
      renderId={render.id}
      shareToken={render.shareToken}
      roomType={render.sketch.roomType}
      description={render.sketch.description}
      isDemo={render.source === "demo"}
      prompt={render.prompt}
      model={render.model}
    />
  );
}
