import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import RenderView from "@/components/RenderView";
import { RoomSceneSchema } from "@/lib/scene-schema";

export default async function RenderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const render = await prisma.render.findFirst({
    where: { id, userId },
    include: { sketch: true },
  });
  if (!render) notFound();

  if (render.status === "processing" || render.status === "pending") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-sm text-foreground/70">
          This render is still processing. Refresh in a moment.
        </p>
      </div>
    );
  }

  if (render.status === "failed" || !render.sceneJson) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Render failed</h1>
        <p className="mt-2 text-sm text-foreground/70">
          {render.errorMessage || "Something went wrong generating this render."}
        </p>
      </div>
    );
  }

  const scene = RoomSceneSchema.parse(JSON.parse(render.sceneJson));

  return (
    <RenderView
      renderId={render.id}
      scene={scene}
      sketchImage={render.sketch.imageDataUrl}
      thumbnailUrl={render.thumbnailUrl}
      source={render.source}
    />
  );
}
