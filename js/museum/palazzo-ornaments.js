import * as T from '../../vendor/three.module.js';

// Shared, static relief: no animated glass, transmission or extra light pool.
export function createPalazzoOrnaments({ room, own, gold, ivory, crystal, candle }) {
  const shape = new T.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(-.28, .18, -.35, .54, 0, 1);
  shape.bezierCurveTo(.35, .54, .28, .18, 0, 0);
  const geometries = {
    leaf: own(new T.ExtrudeGeometry(shape, { depth: .025, bevelEnabled: true,
      bevelSegments: 1, bevelSize: .012, bevelThickness: .014, curveSegments: 3 })),
    curl: own(new T.TorusGeometry(1, .085, 5, 18, Math.PI * 1.7)),
    bead: own(new T.SphereGeometry(1, 6, 4)),
    crystal: own(new T.OctahedronGeometry(1, 0)),
    ring: own(new T.TorusGeometry(1, .04, 5, 28)),
    stem: own(new T.CylinderGeometry(1, 1, 1, 8)),
    cup: own(new T.CylinderGeometry(.8, 1, 1, 10)),
  };
  const materials = { gold, ivory, crystal, candle };
  const batches = new Map(), transform = new T.Object3D();
  const add = (kind, surface, x, y, z, sx, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) => {
    const key = `${kind}/${surface}`;
    if (!batches.has(key)) batches.set(key, []);
    transform.position.set(x, y, z); transform.scale.set(sx, sy, sz);
    transform.rotation.set(rx, ry, rz); transform.updateMatrix();
    batches.get(key).push(transform.matrix.clone());
  };
  const wallLeaf = (side, x, y, z, scale = .35, angle = 0, surface = 'gold') =>
    add('leaf', surface, side*x, y, z, scale, scale*1.55, scale, 0, -side*Math.PI/2, angle);
  const wallCurl = (side, x, y, z, scale = .15, angle = 0) =>
    add('curl', 'gold', side*x, y, z, scale, scale, scale, 0, -side*Math.PI/2, angle);
  const chandelier = (x, z) => {
    // Opaque faceted drops avoid transparent overdraw on iPad.
    add('stem','gold',x,8.13,z,.027,2.65,.027);
    add('cup','gold',x,9.44,z,.18,.10,.18);
    add('bead','crystal',x,6.94,z,.13,.24,.13);
    add('cup','gold',x,6.58,z,.21,.12,.21);
    add('ring','gold',x,6.50,z,.69,.69,.69,Math.PI/2);
    add('ring','gold',x,7.05,z,.32,.32,.32,Math.PI/2);
    for (let i=0;i<8;i++) {
      const angle=i*Math.PI/4,cx=Math.cos(angle),cz=Math.sin(angle);
      const bx=x+cx*.69,bz=z+cz*.69;
      add('curl','gold',x+cx*.36,6.69,z+cz*.36,.36,.28,.36,0,-angle,Math.PI);
      add('cup','gold',bx,6.74,bz,.105,.065,.105);
      add('stem','ivory',bx,6.87,bz,.027,.21,.027);
      add('bead','candle',bx,7.01,bz,.034,.065,.034);
      for (let drop=0;drop<4;drop++) {
        const radius=.30+drop*.12;
        add('crystal','crystal',x+cx*radius,7.00-drop*.16,z+cz*radius,.042,.084,.042,0,angle);
      }
      add('crystal','crystal',bx,6.28,bz,.08,.20,.08,0,angle);
    }
    add('bead','gold',x,6.38,z,.085);
    add('crystal','crystal',x,6.13,z,.13,.30,.13);
  };
  const finish = () => {
    const meshes=[];
    for (const [key,matrices] of batches) {
      const [kind,surface]=key.split('/');
      const mesh=new T.InstancedMesh(geometries[kind],materials[surface],matrices.length);
      mesh.name=`palazzo-${kind}-${surface}`; mesh.userData.decorative=true;
      mesh.receiveShadow=true; mesh.castShadow=false;
      matrices.forEach((matrix,index)=>mesh.setMatrixAt(index,matrix));
      mesh.computeBoundingBox(); mesh.computeBoundingSphere();
      room.add(mesh); meshes.push(mesh);
    }
    return meshes;
  };
  return { add, wallLeaf, wallCurl, chandelier, finish };
}
