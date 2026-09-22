// The promenade's fixtures share dimensions with the lighting bake and physics.
export const CORRIDOR_BENCHES = Array.from({ length: 4 }, (_, index) => ({
  x: 4.48,
  z: -(index + 1) * 26,
  width: .64, depth: 2.8, height: .46, kind: 'corridor-bench',
}));
