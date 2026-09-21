import * as T from '../../vendor/three.module.js';
import { HALLS, BUILDING } from './layout.js';

export function pendantPositions(hall) {
  if (hall.profile.light === 'linear') return [[-1.1, 3.16, 4.8], [1.1, 3.16, 4.8]];
  if (hall.profile.light === 'cluster') return [[-.8, 3.5, 4.6], [.3, 3.1, 5.2], [1, 3.8, 4.4]];
  if (hall.profile.light === 'pair') return [[-1.1, 3.4, 4.8], [1.1, 3.4, 4.8]];
  return [[0, 3, 4.8]];
}

// Shared geometries and instanced fittings keep the 100 track heads affordable.
export function createLightingFixtures({ room, own, box }) {
  const pbr = options => own(new T.MeshStandardMaterial(options));
  const white = pbr({ color: 0xf4f1e9, roughness: .46, metalness: .18 });
  const metal = pbr({ color: 0xb4b5b3, metalness: .88, roughness: .28 });
  const cable = pbr({ color: 0x33322e, roughness: .85 });
  const reflector = pbr({ color: 0xe9e4d9, metalness: .55, roughness: .3, side: T.BackSide });
  const diffuser = pbr({ color: 0xf3e8d2, roughness: .65, emissive: 0xffe7bd, emissiveIntensity: .65 });
  const cavity = pbr({ color: 0x3b3935, roughness: .8 });
  const cylinder = own(new T.CylinderGeometry(1, 1, 1, 32));
  const ring = own(new T.TorusGeometry(1, .035, 10, 64));
  // Rolled lower edge and neck are part of the spun-metal shell, not a hemisphere.
  const profile = [[.035,.38],[.065,.375],[.12,.35],[.2,.30],[.30,.215],[.39,.12],[.445,.045],[.46,.012],[.46,0],[.451,-.012],[.438,-.014]];
  const shade = own(new T.LatheGeometry(profile.map(([r,y]) => new T.Vector2(r,y)), 64));
  const inner = own(new T.LatheGeometry([[.035,.357],[.09,.34],[.19,.28],[.29,.195],[.38,.105],[.427,.025]].map(([r,y]) => new T.Vector2(r,y)), 64));
  const batches = new Map();
  const transform = new T.Object3D();
  function part(geometry, material, x, y, z, sx=1, sy=1, sz=1, rotationX=0) {
    const key = geometry.uuid + material.uuid;
    if (!batches.has(key)) batches.set(key, { geometry, material, matrices: [] });
    transform.position.set(x,y,z); transform.scale.set(sx,sy,sz); transform.rotation.set(rotationX,0,0); transform.updateMatrix();
    batches.get(key).matrices.push(transform.matrix.clone());
  }
  const rod = (r,height,x,y,z,material=metal) => part(cylinder,material,x,y,z,r,height,r);
  for (const hall of HALLS) {
    const {x,z} = hall.center;
    const enamel = pbr({color:hall.profile.color, roughness:.3, metalness:.22});
    // Service canopy: mounting plate, two roof fixings, individual cord grippers.
    box(3.5,.085,1.3,x,5.94,z+4.8,white);
    for (const dx of [-.55,.55]) {
      rod(.045,.035,x+dx,BUILDING.height-.115,z+4.8,white);
      rod(.015,.49,x+dx,6.225,z+4.8,metal);
    }
    if (hall.profile.light === 'linear') {
      box(3.4,.09,.16,x,3.22,z+4.8,enamel);
      box(3.3,.022,.105,x,3.168,z+4.8,diffuser);
      for (const dx of [-1.3,1.3]) {
        rod(.028,.045,x+dx,5.88,z+4.8,metal);
        rod(.0035,2.59,x+dx,4.57,z+4.8,cable);
        rod(.018,.055,x+dx,3.29,z+4.8,metal);
      }
    } else for (const [dx,y,dz] of pendantPositions(hall)) {
      const top = y+.42;
      rod(.034,.045,x+dx,5.88,z+dz,metal);
      rod(.0035,5.855-top,x+dx,(5.855+top)/2,z+dz,cable);
      rod(.027,.06,x+dx,y+.405,z+dz,metal);
      part(shade,enamel,x+dx,y,z+dz);
      part(inner,reflector,x+dx,y,z+dz);
      // Opal disk recessed inside the rim; the exterior retains its coloured enamel.
      rod(.397,.018,x+dx,y+.046,z+dz,diffuser);
      part(ring,metal,x+dx,y+.001,z+dz,.446,.446,.446,Math.PI/2);
    }
    // Track heads have adapters, tilting cylindrical housings and recessed optics.
    for (const dz of [-9.7,9.7]) {
      box(17.5,.075,.095,x,5.65,z+dz,white);
      box(17.4,.015,.03,x,5.603,z+dz,cavity);
      for (const dx of [-7,0,7]) rod(.009,.82,x+dx,6.10,z+dz,metal);
      for (const dx of [-7,-3.5,0,3.5,7]) {
        box(.16,.08,.12,x+dx,5.56,z+dz,white);
        rod(.035,.13,x+dx,5.47,z+dz,metal);
        const angle = -Math.sign(dz)*.5;
        part(cylinder,white,x+dx,5.27,z+dz,.105,.29,.105,angle);
        // The optical assembly follows the tilted cylinder's lower axis.
        const sy = Math.cos(angle), sz = Math.sin(angle);
        part(cylinder,cavity,x+dx,5.27-sy*.148,z+dz-sz*.148,.091,.012,.091,angle);
        part(cylinder,diffuser,x+dx,5.27-sy*.157,z+dz-sz*.157,.065,.006,.065,angle);
      }
    }
  }
  const targets=[];
  for (const {geometry,material,matrices} of batches.values()) {
    const mesh = new T.InstancedMesh(geometry,material,matrices.length);
    matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));
    mesh.name='constructed-light-fixtures'; mesh.receiveShadow=true;
    mesh.computeBoundingSphere(); room.add(mesh); targets.push(mesh);
  }
  return targets;
}
