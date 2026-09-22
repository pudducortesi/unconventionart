// The promenade's fixtures share dimensions with the lighting bake and physics.
export const CORRIDOR_COFFERS = [
  { z: 5, width: 5.8, depth: 5.8, power: 20 },
  ...Array.from({ length: 5 }, (_, row) => [-6.8, 6.8].map(offset => ({
    z: -13 - row * 26 + offset, width: 5.8, depth: 8.5, power: 30,
  }))).flat(),
];

export const CORRIDOR_BENCHES = Array.from({ length: 4 }, (_, index) => ({
  x: 4.48,
  z: -(index + 1) * 26,
  width: .64, depth: 2.8, height: .46, kind: 'corridor-bench',
}));
