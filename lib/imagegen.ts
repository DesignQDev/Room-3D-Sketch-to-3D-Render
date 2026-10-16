import sharp from "sharp";

export type ViewStyle = "isometric" | "perspective";

export type GenerateRenderInput = {
  sketchDataUrl: string;
  roomType?: string | null;
  description?: string | null;
  viewStyle?: ViewStyle | null;
};

export type GenerateRenderResult = {
  imageBase64: string;
  mime: string;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  model: string;
  prompt: string;
  source: "openrouter" | "demo";
};

const DEFAULT_MODEL = "openai/gpt-image-2";
// Used for the free-tier spend cap only when OpenRouter doesn't report a cost.
const FALLBACK_COST_USD = 0.2;
const REQUEST_TIMEOUT_MS = 280_000;

export function isImageGenConfigured() {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

export function buildPrompt(input: {
  roomType?: string | null;
  description?: string | null;
  viewStyle?: ViewStyle | null;
}) {
  const room = (input.roomType || "room").toLowerCase();
  const view =
    input.viewStyle === "perspective"
      ? "an eye-level, wide-angle perspective from the doorway, showing as much of the room as possible"
      : "an isometric cutaway view from above at a three-quarter angle, with the two nearest walls removed (like a dollhouse) so the whole interior is visible";
  const style =
    input.description?.trim() ||
    "modern, clean and bright, with tasteful neutral materials";

  return [
    `Create a photorealistic 3D interior design render of a ${room}, based on the attached architectural sketch / floor plan.`,
    "",
    "Layout fidelity is the most important requirement. Follow the sketch exactly: the same room shape and proportions, and the same positions, sizes and orientation of every fixture and fitting (for example bath, shower, toilet, vanity, kitchen units, beds, wardrobes), and the same door and window positions. Respect any dimensions or labels written on the sketch. Do not add, remove or relocate major items. Do not draw the sketch's text, dimension lines or labels in the render.",
    "",
    `Camera: ${view}.`,
    "",
    `Look and feel requested by the client: ${style}`,
    "",
    "Quality: photorealistic, soft global illumination and soft shadows, realistic materials and textures (tile, timber, stone, glass, ceramic, metal), subtle reflections, tasteful styling props such as towels and plants. Clean, light, neutral background. No people, no text, no watermarks.",
  ].join("\n");
}

export async function generateRender(
  input: GenerateRenderInput
): Promise<GenerateRenderResult> {
  const prompt = buildPrompt(input);

  if (!isImageGenConfigured()) {
    return demoRender(input.sketchDataUrl, prompt);
  }

  const model = process.env.OPENROUTER_IMAGE_MODEL || DEFAULT_MODEL;
  const baseUrl = (
    process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1"
  ).replace(/\/$/, "");

  const required = {
    model,
    prompt,
    n: 1,
    input_references: [
      { type: "image_url", image_url: { url: input.sketchDataUrl } },
    ],
  };
  const optional = {
    quality: process.env.OPENROUTER_IMAGE_QUALITY || "medium",
    aspect_ratio: input.viewStyle === "perspective" ? "4:3" : "3:2",
    output_format: "jpeg",
    output_compression: 85,
  };

  let res = await postImages(baseUrl, { ...required, ...optional });
  // Providers differ in which optional parameters they accept; if the request
  // was rejected as invalid, retry once with only the essentials.
  if (res.status === 400) {
    res = await postImages(baseUrl, required);
  }

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`OpenRouter image API ${res.status}: ${text.slice(0, 500)}`);
  }

  let json: OpenRouterImageResponse;
  try {
    json = JSON.parse(text) as OpenRouterImageResponse;
  } catch {
    throw new Error(`OpenRouter returned non-JSON: ${text.slice(0, 200)}`);
  }

  const item = json.data?.[0];
  let imageBase64 = item?.b64_json;
  let mime = item?.media_type || "image/jpeg";

  // Some providers return a hosted URL instead of inline base64.
  if (!imageBase64 && item?.url) {
    const imgRes = await fetch(item.url);
    if (!imgRes.ok) throw new Error(`Couldn't download image (${imgRes.status})`);
    mime = imgRes.headers.get("content-type") || mime;
    imageBase64 = Buffer.from(await imgRes.arrayBuffer()).toString("base64");
  }
  if (!imageBase64) {
    throw new Error(
      `OpenRouter response had no image: ${text.slice(0, 300)}`
    );
  }

  return {
    imageBase64,
    mime,
    costUsd:
      typeof json.usage?.cost === "number" ? json.usage.cost : FALLBACK_COST_USD,
    inputTokens: json.usage?.prompt_tokens ?? 0,
    outputTokens: json.usage?.completion_tokens ?? 0,
    model,
    prompt,
    source: "openrouter",
  };
}

type OpenRouterImageResponse = {
  data?: { b64_json?: string; url?: string; media_type?: string }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    cost?: number;
  };
};

function postImages(baseUrl: string, body: Record<string, unknown>) {
  return fetch(`${baseUrl}/images`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
      "X-Title": "Room3D",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

// Zero-cost stand-in used when OPENROUTER_API_KEY isn't set, so the whole
// upload -> render -> share flow can be exercised without spending credits.
// It just hands the sketch back as the "render".
function demoRender(sketchDataUrl: string, prompt: string): GenerateRenderResult {
  const match = sketchDataUrl.match(/^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/);
  if (!match) throw new Error("Sketch image must be a base64 data URL");
  return {
    imageBase64: match[2],
    mime: match[1],
    costUsd: 0,
    inputTokens: 0,
    outputTokens: 0,
    model: "demo",
    prompt,
    source: "demo",
  };
}

// Small JPEG data URL for the dashboard grid.
export async function makeThumbnailDataUrl(imageBase64: string) {
  const buf = await sharp(Buffer.from(imageBase64, "base64"))
    .resize({ width: 480, withoutEnlargement: true })
    .jpeg({ quality: 70 })
    .toBuffer();
  return `data:image/jpeg;base64,${buf.toString("base64")}`;
}

// Link-preview-sized JPEG. WhatsApp and most chat apps skip preview images
// over ~300KB, so keep this well under that.
export async function makePreviewJpeg(imageBase64: string) {
  return sharp(Buffer.from(imageBase64, "base64"))
    .resize({ width: 1200, withoutEnlargement: true })
    .jpeg({ quality: 72, mozjpeg: true })
    .toBuffer();
}
