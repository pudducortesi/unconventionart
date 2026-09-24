// Curated Atelier outfit: two contiguous material groups, not one draw per face.
export function splitAtelierOutfit(T,mesh,waistY,colour){
  const geometry=mesh.geometry.clone(),position=geometry.attributes.position,source=geometry.index,top=[],bottom=[],p=new T.Vector3();
  for(let i=0;i<(source?.count??position.count);i+=3){
    const ids=[0,1,2].map(k=>source?source.getX(i+k):i+k);let y=0;
    for(const id of ids)y+=p.fromBufferAttribute(position,id).applyMatrix4(mesh.matrixWorld).y;
    (y/3<waistY?bottom:top).push(...ids);
  }
  const upper=mesh.material,lower=upper.clone();lower.color.set(colour);lower.name='atelier-trousers';
  geometry.setIndex([...top,...bottom]);geometry.clearGroups();geometry.addGroup(0,top.length,0);geometry.addGroup(top.length,bottom.length,1);
  mesh.geometry=geometry;mesh.material=[upper,lower];
  return {geometry,material:lower};
}

export function attachAtelierShoes(T,root,model,colour){
  const geometries=[],materials=[],sole=new T.MeshStandardMaterial({color:'#b7b1a8',roughness:.8}),upper=new T.MeshStandardMaterial({color:colour,roughness:.65});materials.push(sole,upper);
  for(const side of ['Left','Right']){
    const foot=model.getObjectByName(side+'Foot');if(!foot)continue;
    const group=new T.Group();group.name='atelier-shoe-'+side;group.position.copy(foot.getWorldPosition(new T.Vector3()));root.worldToLocal(group.position);group.position.y-=.026;group.position.z-=.07;
    const shell=new T.Mesh(new T.SphereGeometry(1,24,12),upper);shell.scale.set(.065,.047,.145);group.add(shell);geometries.push(shell.geometry);
    const base=new T.Mesh(new T.SphereGeometry(1,24,12),sole);base.position.y=-.03;base.scale.set(.067,.013,.147);group.add(base);geometries.push(base.geometry);
    root.add(group);root.updateMatrixWorld(true);foot.attach(group);
  }
  let disposed=false;return ()=>{if(disposed)return;disposed=true;for(const g of geometries)g.dispose();for(const m of materials)m.dispose();};
}
