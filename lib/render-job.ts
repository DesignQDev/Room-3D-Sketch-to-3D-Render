import { prisma } from "@/lib/prisma";
import {
  generateRender,
  makeThumbnailDataUrl,
  type ViewStyle,
} from "@/lib/imagegen";
import { recordUsage } from "@/lib/usage";

// Renders stuck in "processing" longer than this are treated as failed (the
// serverless function that was generating them was killed or timed out).
export const STALE_AFTER_MS = 6 * 60 * 1000;

export async function runRenderJob(renderId: string) {
  const render = await prisma.render.findUnique({
    where: { id: renderId },
    include: { sketch: true },
  });
  if (!render) return;

  try {
    const result = await generateRender({
      sketchDataUrl: render.sketch.imageDataUrl,
      roomType: render.sketch.roomType,
      description: render.sketch.description,
      viewStyle: render.sketch.viewStyle as ViewStyle | null,
    });

    // Best-effort: a missing thumbnail shouldn't fail an otherwise good render.
    const thumbnailUrl = await makeThumbnailDataUrl(result.imageBase64).catch(
      () => null
    );

    await recordUsage({
      userId: render.userId,
      renderId,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      costUsd: result.costUsd,
    });

    await prisma.render.update({
      where: { id: renderId },
      data: {
        status: "complete",
        imageData: result.imageBase64,
        imageMime: result.mime,
        thumbnailUrl,
        prompt: result.prompt,
        model: result.model,
        source: result.source,
        errorMessage: null,
        completedAt: new Date(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[render ${renderId}] generation failed:`, message);
    await prisma.render.update({
      where: { id: renderId },
      data: { status: "failed", errorMessage: message.slice(0, 1000) },
    });
  }
}
