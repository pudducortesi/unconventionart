// Small, locally generated frames follow the avatar's head bone.
export function attachGlasses(T, head, style, {y, z, eyes, radius, color}) {
  if (style !== 'round' && style !== 'square') return () => {};
  const group = new T.Group();
  group.name = 'avatar-glasses';
  group.position.set(0, y, z);
  const material = new T.MeshStandardMaterial({color, roughness:.4, metalness:.28});
  const geometries = new Set();
  const segment = (parent, x, sy, sz, length, thickness=.004) => {
    const geometry = new T.BoxGeometry(length, thickness, thickness);
    geometries.add(geometry);
    const mesh = new T.Mesh(geometry, material);
    mesh.position.set(x,sy,sz);
    parent.add(mesh);
    return mesh;
  };
  for (const sign of [-1, 1]) {
    if (style === 'round') {
      const geometry = new T.TorusGeometry(radius, .004, 6, 24);
      geometries.add(geometry);
      const rim = new T.Mesh(geometry, material);
      rim.position.x = sign * eyes;
      group.add(rim);
    } else {
      const half = radius * .9;
      segment(group, sign * eyes,half,0,half*2);
      segment(group, sign * eyes,-half,0,half*2);
      for (const side of [-1,1]) {
        const edge = segment(group,sign*eyes+side*half,0,0,half*2);
        edge.rotation.z = Math.PI/2;
      }
    }
    const temple = segment(group,sign*(eyes+radius+.038),0,-.043,.09);
    temple.rotation.y = sign*.9;
  }
  segment(group,0,0,0,Math.max(.008,2*(eyes-radius)));
  head.add(group);
  return () => {head.remove(group);for (const g of geometries)g.dispose();material.dispose();};
}
