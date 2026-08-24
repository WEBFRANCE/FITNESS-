'use client';

/**
 * Bilan musculaire 3D — heatmap du volume d'entraînement par groupe
 * musculaire. Corps procédural (primitives Three.js), volontairement : pas
 * besoin d'un modèle .glb anatomique externe pour avoir quelque chose de
 * réellement fonctionnel dès maintenant. Un modèle 3D sur-mesure (commandé à
 * un artiste 3D) remplacerait avantageusement ces primitives pour le rendu
 * final "Hermès/Cartier", mais la logique de heatmap ci-dessous resterait
 * identique — seul le mesh change.
 *
 * npm install three @react-three/fiber @react-three/drei
 */

import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

export interface MuscleVolume {
  /** Doit correspondre aux clés de MUSCLE_GEOMETRY (taxonomie anglaise, cf. curated-core.ts). */
  muscle: string;
  volume: number; // volume relatif sur la période (brut, non normalisé)
}

interface MuscleGeo {
  position: [number, number, number];
  radius: number;
  length?: number;
  shape: 'capsule' | 'sphere';
}

const MUSCLE_GEOMETRY: Record<string, MuscleGeo> = {
  chest: { position: [0, 1.15, 0.28], radius: 0.22, length: 0.42, shape: 'capsule' },
  shoulders: { position: [0, 1.35, 0], radius: 0.16, shape: 'sphere' }, // rendu centré ; dupliqué gauche/droite ci-dessous
  biceps: { position: [0, 1.0, 0.1], radius: 0.1, length: 0.28, shape: 'capsule' },
  triceps: { position: [0, 1.0, -0.08], radius: 0.09, length: 0.28, shape: 'capsule' },
  abdominals: { position: [0, 0.78, 0.3], radius: 0.24, length: 0.32, shape: 'capsule' },
  lats: { position: [0, 1.05, -0.22], radius: 0.2, length: 0.4, shape: 'capsule' },
  quadriceps: { position: [0, 0.15, 0.12], radius: 0.16, length: 0.55, shape: 'capsule' },
  hamstrings: { position: [0, 0.15, -0.12], radius: 0.14, length: 0.55, shape: 'capsule' },
  glutes: { position: [0, 0.45, -0.18], radius: 0.2, length: 0.2, shape: 'capsule' },
  calves: { position: [0, -0.55, 0.02], radius: 0.11, length: 0.32, shape: 'capsule' },
};

// Groupes rendus en paire gauche/droite plutôt qu'au centre.
const PAIRED_MUSCLES = new Set(['shoulders', 'biceps', 'triceps', 'quadriceps', 'hamstrings', 'calves']);

function heatColor(volume: number): string {
  const clamped = Math.max(0, Math.min(1, volume));
  const r = Math.round(120 + clamped * 135);
  const g = Math.round(120 - clamped * 60);
  const b = Math.round(120 - clamped * 90);
  return `rgb(${r}, ${g}, ${b})`;
}

function MuscleMesh({ geo, offsetX, volume }: { geo: MuscleGeo; offsetX: number; volume: number }) {
  const position: [number, number, number] = [geo.position[0] + offsetX, geo.position[1], geo.position[2]];
  const color = heatColor(volume);

  return (
    <mesh position={position}>
      {geo.shape === 'capsule' ? (
        <capsuleGeometry args={[geo.radius, geo.length ?? 0.2, 4, 8]} />
      ) : (
        <sphereGeometry args={[geo.radius, 16, 16]} />
      )}
      <meshStandardMaterial color={color} roughness={0.35} metalness={0.1} />
    </mesh>
  );
}

export default function HeatmapModel3D({ volumes }: { volumes: MuscleVolume[] }) {
  const volumeMap = useMemo(() => {
    const max = Math.max(1, ...volumes.map((v) => v.volume));
    return Object.fromEntries(volumes.map((v) => [v.muscle, v.volume / max]));
  }, [volumes]);

  // Aplati en instances individuelles (gauche/droite dupliqués) : évite de
  // devoir poser une key sur un fragment raccourci <> — impossible en JSX.
  const meshInstances = useMemo(
    () =>
      Object.entries(MUSCLE_GEOMETRY).flatMap(([id, geo]) => {
        const volume = volumeMap[id] ?? 0;
        return PAIRED_MUSCLES.has(id)
          ? [
              { key: `${id}-l`, geo, offsetX: -0.22, volume },
              { key: `${id}-r`, geo, offsetX: 0.22, volume },
            ]
          : [{ key: id, geo, offsetX: 0, volume }];
      }),
    [volumeMap]
  );

  return (
    <div className="glass h-96 w-full overflow-hidden rounded-glass" data-clarity="balanced">
      <Canvas camera={{ position: [0, 0.8, 3.2], fov: 40 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 3, 2]} intensity={1.1} />

        {/* Tête neutre, simple repère visuel */}
        <mesh position={[0, 1.7, 0]}>
          <sphereGeometry args={[0.16, 16, 16]} />
          <meshStandardMaterial color="#3a3a3d" />
        </mesh>

        {meshInstances.map(({ key, geo, offsetX, volume }) => (
          <MuscleMesh key={key} geo={geo} offsetX={offsetX} volume={volume} />
        ))}

        <OrbitControls enablePan={false} minDistance={2} maxDistance={5} />
      </Canvas>
    </div>
  );
}
