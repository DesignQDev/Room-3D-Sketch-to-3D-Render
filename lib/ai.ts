import Anthropic from "@anthropic-ai/sdk";
import { RoomScene, RoomSceneSchema } from "@/lib/scene-schema";

export type InterpretSketchInput = {
  imageDataUrl: string;
  widthMeters?: number | null;
  heightMeters?: number | null; // "height" here means the room's second horizontal dimension (length)
  roomType?: string | null;
  notes?: string | null;
};

export type InterpretSketchResult = {
  scene: RoomScene;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  source: "claude" | "demo";
};

// Approximate Claude pricing (USD per token) used for server-side cost tracking.
// Update to match the active ANTHROPIC_MODEL's published rate card.
const PRICE_PER_INPUT_TOKEN = 3 / 1_000_000;
const PRICE_PER_OUTPUT_TOKEN = 15 / 1_000_000;

const SCENE_TOOL_NAME = "emit_room_scene";

const SCENE_TOOL = {
  name: SCENE_TOOL_NAME,
  description:
    "Emit a structured 3D scene description for the room shown in the hand-drawn sketch.",
  input_schema: {
    type: "object" as const,
    properties: {
      roomType: { type: "string" },
      widthMeters: { type: "number" },
      lengthMeters: { type: "number" },
      walls: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            x1: { type: "number" },
            z1: { type: "number" },
            x2: { type: "number" },
            z2: { type: "number" },
            height: { type: "number" },
            thickness: { type: "number" },
          },
          required: ["id", "x1", "z1", "x2", "z2", "height"],
        },
      },
      openings: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            wallId: { type: "string" },
            type: { type: "string", enum: ["door", "window"] },
            offset: { type: "number" },
            width: { type: "number" },
            sillHeight: { type: "number" },
          },
          required: ["id", "wallId", "type", "offset", "width"],
        },
      },
      fixtures: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            type: { type: "string" },
            x: { type: "number" },
            z: { type: "number" },
            rotationDeg: { type: "number" },
            width: { type: "number" },
            depth: { type: "number" },
            height: { type: "number" },
            color: { type: "string" },
            label: { type: "string" },
          },
          required: ["id", "type", "x", "z", "width", "depth", "height"],
        },
      },
      notes: { type: "string" },
    },
    required: ["roomType", "widthMeters", "lengthMeters", "walls"],
  },
};

export function isAiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function interpretSketch(
  input: InterpretSketchInput
): Promise<InterpretSketchResult> {
  if (!isAiConfigured()) {
    return interpretSketchDemo(input);
  }
  return interpretSketchWithClaude(input);
}

async function interpretSketchWithClaude(
  input: InterpretSketchInput
): Promise<InterpretSketchResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

  const match = input.imageDataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Sketch image must be a base64 data URL");
  }
  const [, mediaType, base64Data] = match;

  const dims = `${input.widthMeters ?? "unknown"}m x ${input.heightMeters ?? "unknown"}m`;

  const message = await client.messages.create({
    model,
    max_tokens: 2048,
    tools: [SCENE_TOOL],
    tool_choice: { type: "tool", name: SCENE_TOOL_NAME },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType as
                | "image/jpeg"
                | "image/png"
                | "image/gif"
                | "image/webp",
              data: base64Data,
            },
          },
          {
            type: "text",
            text: [
              "This is a hand-drawn architectural sketch of a room (walls, doors, windows, fixtures).",
              `Room type hint: ${input.roomType || "unspecified"}.`,
              `User-confirmed overall dimensions: ${dims}.`,
              input.notes ? `Additional notes from the user: ${input.notes}` : "",
              "Interpret the layout and call the emit_room_scene tool with a structured scene:",
              "- Walls as line segments in meters on an X/Z ground plane forming a closed (or mostly closed) polygon.",
              "- Doors and windows as openings attached to a wall id, with an offset along that wall.",
              "- Fixtures (bath, shower, toilet, vanity, sink, bed, sofa, table, counter, fridge, stove, wardrobe) placed at plausible positions against walls.",
              "- Use the confirmed dimensions to scale the room if given; otherwise estimate from the sketch's proportions.",
              "Respond only via the tool call.",
            ]
              .filter(Boolean)
              .join("\n"),
          },
        ],
      },
    ],
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) {
    throw new Error("Claude did not return a structured scene");
  }

  const scene = RoomSceneSchema.parse(toolUse.input);

  const inputTokens = message.usage?.input_tokens ?? 0;
  const outputTokens = message.usage?.output_tokens ?? 0;
  const costUsd =
    inputTokens * PRICE_PER_INPUT_TOKEN + outputTokens * PRICE_PER_OUTPUT_TOKEN;

  return { scene, inputTokens, outputTokens, costUsd, source: "claude" };
}

// Deterministic, zero-cost scene generator used when ANTHROPIC_API_KEY is not
// configured, so the full product loop (upload -> render -> view -> email)
// can be exercised end to end without any external API keys.
function interpretSketchDemo(
  input: InterpretSketchInput
): InterpretSketchResult {
  const width = clamp(input.widthMeters ?? 4, 2, 10);
  const length = clamp(input.heightMeters ?? 3, 2, 10);
  const roomType = (input.roomType || "room").toLowerCase();

  const w = width;
  const l = length;

  const walls = [
    { id: "w1", x1: 0, z1: 0, x2: w, z2: 0, height: 2.4, thickness: 0.12 },
    { id: "w2", x1: w, z1: 0, x2: w, z2: l, height: 2.4, thickness: 0.12 },
    { id: "w3", x1: w, z1: l, x2: 0, z2: l, height: 2.4, thickness: 0.12 },
    { id: "w4", x1: 0, z1: l, x2: 0, z2: 0, height: 2.4, thickness: 0.12 },
  ];

  const openings = [
    {
      id: "door1",
      wallId: "w1",
      type: "door" as const,
      offset: Math.max(0.2, w * 0.15),
      width: 0.9,
      sillHeight: 0,
    },
    {
      id: "window1",
      wallId: "w3",
      type: "window" as const,
      offset: Math.max(0.3, w * 0.5 - 0.6),
      width: 1.2,
      sillHeight: 0.9,
    },
  ];

  const fixtures = demoFixturesForRoomType(roomType, w, l);

  const scene = RoomSceneSchema.parse({
    roomType,
    widthMeters: w,
    lengthMeters: l,
    walls,
    openings,
    fixtures,
    notes: input.notes || undefined,
  });

  return { scene, inputTokens: 0, outputTokens: 0, costUsd: 0, source: "demo" };
}

function demoFixturesForRoomType(roomType: string, w: number, l: number) {
  const margin = 0.4;
  if (roomType.includes("bath")) {
    return [
      {
        id: "f1",
        type: "bath" as const,
        x: margin + 0.8,
        z: margin + 0.35,
        rotationDeg: 0,
        width: 1.6,
        depth: 0.7,
        height: 0.55,
        color: "#f4f6f8",
        label: "Bath",
      },
      {
        id: "f2",
        type: "vanity" as const,
        x: w - margin - 0.3,
        z: l - margin - 0.6,
        rotationDeg: 90,
        width: 0.9,
        depth: 0.5,
        height: 0.85,
        color: "#cbb994",
        label: "Vanity",
      },
      {
        id: "f3",
        type: "toilet" as const,
        x: w - margin - 0.25,
        z: margin + 0.35,
        rotationDeg: 90,
        width: 0.4,
        depth: 0.6,
        height: 0.4,
        color: "#f4f6f8",
        label: "Toilet",
      },
    ];
  }
  if (roomType.includes("kitchen")) {
    return [
      {
        id: "f1",
        type: "counter" as const,
        x: w / 2,
        z: margin + 0.3,
        rotationDeg: 0,
        width: Math.min(w - 0.8, 3),
        depth: 0.6,
        height: 0.9,
        color: "#e3ddcf",
        label: "Counter",
      },
      {
        id: "f2",
        type: "fridge" as const,
        x: margin + 0.35,
        z: l - margin - 0.35,
        rotationDeg: 0,
        width: 0.7,
        depth: 0.7,
        height: 1.8,
        color: "#c7ccd1",
        label: "Fridge",
      },
      {
        id: "f3",
        type: "stove" as const,
        x: w - margin - 0.35,
        z: margin + 0.3,
        rotationDeg: 0,
        width: 0.6,
        depth: 0.6,
        height: 0.9,
        color: "#3a3a3a",
        label: "Stove",
      },
    ];
  }
  if (roomType.includes("bed")) {
    return [
      {
        id: "f1",
        type: "bed" as const,
        x: w / 2,
        z: l - margin - 0.9,
        rotationDeg: 0,
        width: 1.6,
        depth: 2,
        height: 0.5,
        color: "#cdd7e6",
        label: "Bed",
      },
      {
        id: "f2",
        type: "wardrobe" as const,
        x: margin + 0.3,
        z: margin + 0.6,
        rotationDeg: 90,
        width: 1.2,
        depth: 0.6,
        height: 2,
        color: "#a98b6b",
        label: "Wardrobe",
      },
    ];
  }
  // living / generic
  return [
    {
      id: "f1",
      type: "sofa" as const,
      x: w / 2,
      z: l - margin - 0.45,
      rotationDeg: 0,
      width: 2,
      depth: 0.9,
      height: 0.8,
      color: "#8fa6b2",
      label: "Sofa",
    },
    {
      id: "f2",
      type: "table" as const,
      x: w / 2,
      z: l / 2,
      rotationDeg: 0,
      width: 1.1,
      depth: 0.6,
      height: 0.45,
      color: "#8a6a4b",
      label: "Table",
    },
  ];
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
