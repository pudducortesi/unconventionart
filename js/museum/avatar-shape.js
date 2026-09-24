// Smooth bind-space shaping for the curated MPFB asset, in authored metres/Y-up.
// Every mesh and joint uses the same field, including clothing and facial parts.
const KEYS=['shoulders','waist','hips','faceWidth','jaw','nose','eyeSize','lipSize'];
const bell=(x,c,r)=>{const t=Math.abs((x-c)/r);return t>=1?0:(1-t*t)**2;};
export function createShapeField(a,landmarks){
  const delta=Object.fromEntries(KEYS.map(k=>[k,(a[k]??100)/100-1]));
  const {head,eyes,hips,waist,shoulders}=landmarks,eyeY=(eyes[0].y+eyes[1].y)/2,eyeZ=(eyes[0].z+eyes[1].z)/2;
  const active=KEYS.some(k=>Math.abs(delta[k])>1e-8);
  return {active,map(p,out){
    out.copy(p);if(!active)return out;
    const upper=bell(p.y,shoulders.y,.20),middle=bell(p.y,waist.y,.19),lower=bell(p.y,hips.y,.24);
    out.x+=p.x*(delta.shoulders*upper+delta.waist*middle+delta.hips*lower)*.65;
    out.z+=(p.z-waist.z)*(delta.waist*middle+delta.hips*lower)*.32;
    const face=bell(p.y,eyeY,.19);
    out.x+=(p.x-head.x)*delta.faceWidth*face;
    const jawWeight=bell(p.y,head.y+.045,.075)*bell(p.z,eyeZ-.025,.11);
    out.x+=(p.x-head.x)*delta.jaw*jawWeight*.65;
    const noseY=eyeY-.027,noseZ=eyeZ+.018;
    const noseWeight=bell(p.x,head.x,.036)*bell(p.y,noseY,.044)*bell(p.z,noseZ,.05);
    out.x+=(p.x-head.x)*delta.nose*noseWeight;
    out.z+=.028*delta.nose*noseWeight;
    const mouthY=eyeY-.072;
    const mouthWeight=bell(p.x,head.x,.060)*bell(p.y,mouthY,.025)*bell(p.z,eyeZ,.055);
    out.x+=(p.x-head.x)*delta.lipSize*mouthWeight*.75;
    out.y+=(p.y-mouthY)*delta.lipSize*mouthWeight;
    for(const eye of eyes){
      const weight=bell(p.x,eye.x,.029)*bell(p.y,eye.y,.027)*bell(p.z,eye.z,.045);
      out.x+=(p.x-eye.x)*delta.eyeSize*weight;
      out.y+=(p.y-eye.y)*delta.eyeSize*weight;
    }
    return out;
  }};
}

export function shapeAtelier(T,model,a){
  model.updateMatrixWorld(true);
  const point=name=>{const bone=model.getObjectByName(name);if(!bone)throw Error('Scheletro Atelier incompleto: '+name);return bone.getWorldPosition(new T.Vector3());};
  const field=createShapeField(a,{head:point('Head'),eyes:[point('LeftEye'),point('RightEye')],hips:point('Hips'),waist:point('Spine'),shoulders:point('LeftArm')});
  if(!field.active)return ()=>{};
  const geometries=[],bones=new Map(),skins=new Set();
  model.traverse(o=>{if(o.isBone)bones.set(o,o.getWorldPosition(new T.Vector3()));if(o.isSkinnedMesh)skins.add(o.skeleton);});
  const source=new T.Vector3(),world=new T.Vector3(),mapped=new T.Vector3(),endpoint=new T.Vector3(),baseMapped=new T.Vector3();
  model.traverse(mesh=>{
    if(!mesh.isMesh)return;
    const original=mesh.geometry,geometry=original.clone(),position=original.attributes.position,inverse=mesh.matrixWorld.clone().invert();
    mesh.geometry=geometry;geometries.push(geometry);
    for(let i=0;i<position.count;i++){
      source.fromBufferAttribute(position,i);world.copy(source).applyMatrix4(mesh.matrixWorld);field.map(world,mapped);baseMapped.copy(mapped).applyMatrix4(inverse);
      geometry.attributes.position.setXYZ(i,baseMapped.x,baseMapped.y,baseMapped.z);
      // Transform expression endpoints, then restore relative delta representation.
      for(let j=0;j<(original.morphAttributes.position?.length||0);j++){
        endpoint.fromBufferAttribute(original.morphAttributes.position[j],i);
        if(original.morphTargetsRelative)endpoint.add(source);
        endpoint.applyMatrix4(mesh.matrixWorld);field.map(endpoint,mapped);mapped.applyMatrix4(inverse);
        if(original.morphTargetsRelative)mapped.sub(baseMapped);
        geometry.morphAttributes.position[j].setXYZ(i,mapped.x,mapped.y,mapped.z);
      }
    }
    delete geometry.morphAttributes.normal;
    geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
  });
  // Parent-first reconstruction retains bone rotations and resets bind inverses.
  model.traverse(bone=>{if(!bones.has(bone))return;field.map(bones.get(bone),mapped);bone.parent.worldToLocal(mapped);bone.position.copy(mapped);bone.updateMatrixWorld(true);});
  model.updateMatrixWorld(true);
  // Skeleton.clone shares the inverse array: detach it before recalculation.
  for(const skeleton of skins){skeleton.boneInverses=[];skeleton.calculateInverses();}
  model.traverse(mesh=>{if(mesh.isSkinnedMesh)mesh.bind(mesh.skeleton,mesh.matrixWorld);});
  let disposed=false;return ()=>{if(disposed)return;disposed=true;for(const geometry of geometries)geometry.dispose();};
}
