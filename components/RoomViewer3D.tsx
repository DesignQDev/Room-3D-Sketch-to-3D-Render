"use client";

import { useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import type { RoomScene, Wall, Opening, Fixture } from "@/lib/scene-schema";

export type RoomViewerHandle = {
  captureScreenshot: () => string | null;
};

type Props = {
  scene: RoomScene;
  className?: string;
  onReady?: (handle: RoomViewerHandle) => void;
};

export default function RoomViewer3D({ scene, className, onReady }: Props) {
  const glRef = useRef<HTMLCanvasElement | null>(null);

  const center = useMemo(
    () => [scene.widthMeters / 2, 0, scene.lengthMeters / 2] as const,
    [scene.widthMeters, scene.lengthMeters]
  );

  const camDist = Math.max(scene.widthMeters, scene.lengthMeters);

  return (
    <div className={className}>
      <Canvas
        shadows
        gl={{ preserveDrawingBuffer: true }}
        onCreated={({ gl }) => {
          glRef.current = gl.domElement;
          onReady?.({
            captureScreenshot: () => {
              try {
                return glRef.current?.toDataURL("image/png") ?? null;
              } catch {
                return null;
              }
            },
          });
        }}
        camera={{
          position: [
            center[0] + camDist * 0.9,
            camDist * 0.9,
            center[2] + camDist * 1.1,
          ],
          fov: 45,
        }}
      >
        <color attach="background" args={["#eef1f5"]} />
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[center[0] + 5, 8, center[2] + 5]}
          intensity={1.1}
          castShadow
        />
        <Environment preset="apartment" />

        <Floor scene={scene} />
        {scene.walls.map((wall) => (
          <WallMesh
            key={wall.id}
            wall={wall}
            openings={scene.openings.filter((o) => o.wallId === wall.id)}
          />
        ))}
        {scene.fixtures.map((f) => (
          <FixtureMesh key={f.id} fixture={f} />
        ))}

        <OrbitControls
          target={center}
          maxPolarAngle={Math.PI / 2 - 0.02}
          minDistance={1}
          maxDistance={camDist * 4}
        />
      </Canvas>
    </div>
  );
}

function Floor({ scene }: { scene: RoomScene }) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[scene.widthMeters / 2, 0, scene.lengthMeters / 2]}
      receiveShadow
    >
      <planeGeometry args={[scene.widthMeters + 1, scene.lengthMeters + 1]} />
      <meshStandardMaterial color="#d9d2c3" />
    </mesh>
  );
}

type Segment = {
  startOffset: number;
  endOffset: number;
  yBottom: number;
  yTop: number;
  glass?: boolean;
};

function computeWallSegments(wall: Wall, openings: Opening[]): Segment[] {
  const length = Math.hypot(wall.x2 - wall.x1, wall.z2 - wall.z1);
  const sorted = [...openings].sort((a, b) => a.offset - b.offset);

  const segments: Segment[] = [];
  let cursor = 0;

  for (const o of sorted) {
    const start = Math.max(0, Math.min(length, o.offset));
    const end = Math.max(0, Math.min(length, o.offset + o.width));
    if (start > cursor) {
      segments.push({ startOffset: cursor, endOffset: start, yBottom: 0, yTop: wall.height });
    }
    if (o.type === "door") {
      // full-height gap, nothing rendered
    } else {
      const sill = o.sillHeight || 0.9;
      const winHeight = Math.min(1.2, wall.height - sill - 0.2);
      if (sill > 0) {
        segments.push({ startOffset: start, endOffset: end, yBottom: 0, yTop: sill });
      }
      segments.push({
        startOffset: start,
        endOffset: end,
        yBottom: sill,
        yTop: sill + winHeight,
        glass: true,
      });
      if (sill + winHeight < wall.height) {
        segments.push({
          startOffset: start,
          endOffset: end,
          yBottom: sill + winHeight,
          yTop: wall.height,
        });
      }
    }
    cursor = Math.max(cursor, end);
  }
  if (cursor < length) {
    segments.push({ startOffset: cursor, endOffset: length, yBottom: 0, yTop: wall.height });
  }

  return segments.filter((s) => s.endOffset - s.startOffset > 0.01);
}

function WallMesh({ wall, openings }: { wall: Wall; openings: Opening[] }) {
  const length = Math.hypot(wall.x2 - wall.x1, wall.z2 - wall.z1);
  const angle = Math.atan2(wall.z2 - wall.z1, wall.x2 - wall.x1);
  const dirX = (wall.x2 - wall.x1) / length;
  const dirZ = (wall.z2 - wall.z1) / length;

  const segments = useMemo(() => computeWallSegments(wall, openings), [wall, openings]);

  return (
    <group>
      {segments.map((seg, i) => {
        const segLen = seg.endOffset - seg.startOffset;
        const mid = (seg.startOffset + seg.endOffset) / 2;
        const x = wall.x1 + dirX * mid;
        const z = wall.z1 + dirZ * mid;
        const segH = seg.yTop - seg.yBottom;
        const y = seg.yBottom + segH / 2;
        return (
          <mesh
            key={i}
            position={[x, y, z]}
            rotation={[0, -angle, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[segLen, segH, wall.thickness]} />
            <meshStandardMaterial
              color={seg.glass ? "#9fd0e6" : "#f4f1ea"}
              transparent={seg.glass}
              opacity={seg.glass ? 0.45 : 1}
            />
          </mesh>
        );
      })}
    </group>
  );
}

const FIXTURE_COLORS: Record<string, string> = {
  bath: "#f4f6f8",
  shower: "#dde7ea",
  toilet: "#f4f6f8",
  vanity: "#cbb994",
  sink: "#e7e9ec",
  bed: "#cdd7e6",
  sofa: "#8fa6b2",
  table: "#8a6a4b",
  counter: "#e3ddcf",
  fridge: "#c7ccd1",
  stove: "#3a3a3a",
  wardrobe: "#a98b6b",
  generic_box: "#b7b2a6",
};

function FixtureMesh({ fixture }: { fixture: Fixture }) {
  const color = fixture.color || FIXTURE_COLORS[fixture.type] || "#b7b2a6";
  return (
    <mesh
      position={[fixture.x, fixture.height / 2, fixture.z]}
      rotation={[0, (-fixture.rotationDeg * Math.PI) / 180, 0]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[fixture.width, fixture.height, fixture.depth]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}
