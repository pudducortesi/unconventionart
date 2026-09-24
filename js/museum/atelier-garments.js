// Original garment geometry for the curated Atelier rig. No external asset URLs.
export function createAtelierGarment(T,root,model,a){
  if(a.garment==='tshirt')return ()=>{};
  const ownedGeometry=[],ownedMaterial=[];
  const bone=name=>{const b=model.getObjectByName(name);if(!b)throw Error('Missing garment joint '+name);return b;};
  const at=name=>bone(name).getWorldPosition(new T.Vector3());
  const hips=at('Hips'),spine=at('Spine'),chest=at('Spine2'),neck=at('Neck');
  const cloth=new T.MeshStandardMaterial({color:a.outfit,roughness:.92,side:T.DoubleSide});
  const trim=new T.MeshStandardMaterial({color:new T.Color(a.outfit).multiplyScalar(.62),roughness:.78,side:T.DoubleSide});
  const metal=new T.MeshStandardMaterial({color:'#a99573',metalness:.65,roughness:.35});ownedMaterial.push(cloth,trim,metal);
  const collection=new T.Group();collection.name='atelier-garment-'+a.garment;root.add(collection);
  const joints=['Hips','Spine','Spine1','Spine2','LeftArm','LeftForeArm','RightArm','RightForeArm'];
  const rig=new T.Skeleton(joints.map(bone));
  function skin(name,vertices,indices,weights,material){
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices.flat(),3));geometry.setIndex(indices);
    geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(weights.flatMap(w=>[joints.indexOf(w[0]),joints.indexOf(w[1]||w[0]),0,0]),4));
    geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights.flatMap(w=>[w[2]??1,1-(w[2]??1),0,0]),4));geometry.computeVertexNormals();ownedGeometry.push(geometry);
    const mesh=new T.SkinnedMesh(geometry,material);mesh.name=name;mesh.frustumCulled=false;collection.add(mesh);mesh.bind(rig,new T.Matrix4());return mesh;
  }
  function ribbon(name,rings,material,segments=32){
    const vertices=[],indices=[],weights=[];
    for(const ring of rings)for(let i=0;i<=segments;i++){const angle=i/segments*Math.PI*2;vertices.push([ring.x+Math.cos(angle)*ring.rx,ring.y,ring.z+Math.sin(angle)*ring.rz]);weights.push([ring.bone||'Hips']);}
    for(let r=0;r<rings.length-1;r++)for(let i=0;i<segments;i++){const k=r*(segments+1)+i;indices.push(k,k+1,k+segments+1,k+1,k+segments+2,k+segments+1);}
    return skin(name,vertices,indices,weights,material);
  }
  function patch(name,vertices,joint,material){return skin(name,vertices,[0,1,2,0,2,3],vertices.map(()=>[joint]),material);}
  const baseOutfit=model.getObjectByName('Humanfemale_casualsuit01');
  const frontAt=y=>{let z=Infinity;const p=new T.Vector3(),positions=baseOutfit.geometry.attributes.position;for(let i=0;i<positions.count;i++){p.fromBufferAttribute(positions,i).applyMatrix4(baseOutfit.matrixWorld);if(Math.abs(p.x-hips.x)<.06&&Math.abs(p.y-y)<.05)z=Math.min(z,p.z);}return Number.isFinite(z)?z-.008:chest.z-.15;};
  const width=1+(a.hips/100-1)*.65,waist=1+(a.waist/100-1)*.65;
  if(a.garment==='dress'){
    ribbon('atelier-dress-skirt',[
      {x:hips.x,y:hips.y+.07,z:hips.z,rx:.172*waist,rz:.127},
      {x:hips.x,y:hips.y-.05,z:hips.z,rx:.213*width,rz:.155},
      {x:hips.x,y:hips.y-.23,z:hips.z,rx:.27*width,rz:.213},
      {x:hips.x,y:hips.y-.43,z:hips.z,rx:.325*width,rz:.265},
    ],cloth,40);
    ribbon('atelier-dress-hem',[
      {x:hips.x,y:hips.y-.410,z:hips.z,rx:.321*width,rz:.262},
      {x:hips.x,y:hips.y-.431,z:hips.z,rx:.327*width,rz:.267},
    ],trim,40);
    ribbon('atelier-dress-belt',[
      {x:hips.x,y:hips.y+.06,z:hips.z,rx:.176*waist,rz:.131},
      {x:hips.x,y:hips.y+.083,z:hips.z,rx:.176*waist,rz:.131},
    ],trim);
  }
  if(a.garment==='shirt'||a.garment==='jacket'){
    // Front faces -Z after the curated model is normalized.
    const y=neck.y-.022,z=neck.z-.076;
    for(const side of [-1,1])patch('atelier-collar-'+side,[[side*.038,y,z],[side*.087,y-.032,z-.012],[side*.062,y-.11,z-.053],[side*.020,y-.055,z-.048]],'Spine2',a.garment==='shirt'?cloth:trim);
    for(let i=0;i<5;i++){
      const y=chest.y-.025-i*.061,z=frontAt(y);
      const geometry=new T.SphereGeometry(.006,8,6),button=new T.Mesh(geometry,metal);button.position.set(hips.x,y,z);button.name='atelier-button-'+i;collection.add(button);root.updateMatrixWorld(true);bone(i<2?'Spine2':'Spine1').attach(button);ownedGeometry.push(geometry);
    }
  }
  if(a.garment==='jacket'){
    // Keep the original shirt beneath a fitted open shell using its exact weights.
    const source=model.getObjectByName('Humanfemale_casualsuit01'),input=source.geometry,positions=input.attributes.position,index=input.index;
    const inverse=source.matrixWorld.clone().invert(),output=[],triangles=[];
    const interpolate=(a,b,t)=>{
      const weights=new Map();for(const [id,w]of a.weights)weights.set(id,(weights.get(id)||0)+w*(1-t));for(const [id,w]of b.weights)weights.set(id,(weights.get(id)||0)+w*t);
      const selected=[...weights].sort((a,b)=>b[1]-a[1]).slice(0,4),sum=selected.reduce((s,p)=>s+p[1],0);
      return {world:a.world.clone().lerp(b.world,t),normal:a.normal.clone().lerp(b.normal,t).normalize(),uv:a.uv.clone().lerp(b.uv,t),weights:selected.map(([id,w])=>[id,w/sum])};
    };
    const clip=(polygon,distance)=>{const result=[];for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],da=distance(a),db=distance(b);if(da>=0)result.push(a);if((da>=0)!==(db>=0))result.push(interpolate(a,b,da/(da-db)));}return result;};
    const append=polygon=>{if(polygon.length<3)return;const start=output.length;output.push(...polygon);for(let i=1;i<polygon.length-1;i++)triangles.push(start,start+i,start+i+1);};
    const vertex=id=>{const world=new T.Vector3().fromBufferAttribute(positions,id).applyMatrix4(source.matrixWorld);world.addScaledVector(new T.Vector3(world.x-hips.x,0,world.z-spine.z).normalize(),.012);const weights=[];for(let k=0;k<4;k++)weights.push([input.attributes.skinIndex.getComponent(id,k),input.attributes.skinWeight.getComponent(id,k)]);return {world,weights,normal:new T.Vector3().fromBufferAttribute(input.attributes.normal,id),uv:input.attributes.uv?new T.Vector2().fromBufferAttribute(input.attributes.uv,id):new T.Vector2()};};
    for(let i=0;i<index.count;i+=3){
      const polygon=clip([vertex(index.getX(i)),vertex(index.getX(i+1)),vertex(index.getX(i+2))],v=>v.world.y-(hips.y-.02));
      // Clip front panels geometrically, rather than dropping whole crossing faces.
      append(clip(polygon,v=>v.world.z-(spine.z-.035)));
      const front=clip(polygon,v=>spine.z-.035-v.world.z);
      append(clip(front,v=>hips.x-.032-v.world.x));append(clip(front,v=>v.world.x-hips.x-.032));
    }
    const geometry=new T.BufferGeometry();geometry.setIndex(triangles);
    geometry.setAttribute('position',new T.Float32BufferAttribute(output.flatMap(v=>v.world.clone().applyMatrix4(inverse).toArray()),3));
    geometry.setAttribute('normal',new T.Float32BufferAttribute(output.flatMap(v=>v.normal.toArray()),3));geometry.setAttribute('uv',new T.Float32BufferAttribute(output.flatMap(v=>v.uv.toArray()),2));
    geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(output.flatMap(v=>Array.from({length:4},(_,i)=>v.weights[i]?.[0]||0)),4));
    geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(output.flatMap(v=>Array.from({length:4},(_,i)=>v.weights[i]?.[1]||0)),4));ownedGeometry.push(geometry);
    const shell=new T.SkinnedMesh(geometry,cloth);shell.name='atelier-jacket-shell';source.parent.add(shell);shell.position.copy(source.position);shell.quaternion.copy(source.quaternion);shell.scale.copy(source.scale);shell.bind(source.skeleton,source.bindMatrix);shell.frustumCulled=false;
    for(const side of ['Left','Right']){
      const shoulder=at(side+'Arm'),elbow=at(side+'ForeArm'),wrist=at(side+'Hand'),vertices=[],weights=[],indices=[],segments=20;
      const rings=[{p:shoulder.clone().lerp(elbow,.08),radius:.071,w:[side+'Arm']},{p:elbow.clone().lerp(shoulder,.06),radius:.062,w:[side+'Arm',side+'ForeArm',.6]},{p:elbow.clone().lerp(wrist,.12),radius:.058,w:[side+'ForeArm']},{p:wrist.clone().lerp(elbow,.08),radius:.041,w:[side+'ForeArm']}];
      const direction=wrist.clone().sub(shoulder).normalize(),u=new T.Vector3(0,0,1),v=new T.Vector3().crossVectors(direction,u).normalize();
      for(const ring of rings)for(let i=0;i<=segments;i++){const angle=i/segments*Math.PI*2,p=ring.p.clone().addScaledVector(u,Math.cos(angle)*ring.radius).addScaledVector(v,Math.sin(angle)*ring.radius);vertices.push(p.toArray());weights.push(ring.w);}
      for(let r=0;r<rings.length-1;r++)for(let i=0;i<segments;i++){const k=r*(segments+1)+i;indices.push(k,k+1,k+segments+1,k+1,k+segments+2,k+segments+1);}skin('atelier-jacket-sleeve-'+side,vertices,indices,weights,cloth);
    }
  }
  let disposed=false;return ()=>{if(disposed)return;disposed=true;for(const geometry of ownedGeometry)geometry.dispose();for(const material of ownedMaterial)material.dispose();};
}
