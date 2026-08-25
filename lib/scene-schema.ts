import { z } from "zod";

// Structured scene description produced by the AI interpretation step (or the
// demo generator) and consumed by the Three.js viewer. Units are meters, on
// an X/Z ground plane, Y is up.

export const WallSchema = z.object({
  id: z.string(),
  x1: z.number(),
  z1: z.number(),
  x2: z.number(),
  z2: z.number(),
  height: z.number().min(1.8).max(4),
  thickness: z.number().min(0.05).max(0.5).default(0.12),
});

export const OpeningSchema = z.object({
  id: z.string(),
  wallId: z.string(),
  type: z.enum(["door", "window"]),
  offset: z.number().min(0), // distance in meters from the wall's start point
  width: z.number().min(0.3).max(3),
  sillHeight: z.number().min(0).max(2.5).default(0), // 0 for doors, ~0.9 for windows
});

export const FixtureSchema = z.object({
  id: z.string(),
  type: z.enum([
    "bath",
    "shower",
    "toilet",
    "vanity",
    "sink",
    "bed",
    "sofa",
    "table",
    "counter",
    "fridge",
    "stove",
    "wardrobe",
    "generic_box",
  ]),
  x: z.number(),
  z: z.number(),
  rotationDeg: z.number().default(0),
  width: z.number().min(0.1).max(4),
  depth: z.number().min(0.1).max(4),
  height: z.number().min(0.1).max(2.2),
  color: z.string().default("#d8d2c4"),
  label: z.string().optional(),
});

export const RoomSceneSchema = z.object({
  roomType: z.string().default("room"),
  widthMeters: z.number().min(1).max(20),
  lengthMeters: z.number().min(1).max(20),
  walls: z.array(WallSchema).min(3),
  openings: z.array(OpeningSchema).default([]),
  fixtures: z.array(FixtureSchema).default([]),
  notes: z.string().optional(),
});

export type Wall = z.infer<typeof WallSchema>;
export type Opening = z.infer<typeof OpeningSchema>;
export type Fixture = z.infer<typeof FixtureSchema>;
export type RoomScene = z.infer<typeof RoomSceneSchema>;
