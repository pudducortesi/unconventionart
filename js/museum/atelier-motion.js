// Layered, frame-rate-independent gait and gesture animation on the curated rig.
export function createAtelierMotion(T,model,expressions){
  const names=['Hips','Spine1','Spine2','Head',...['Left','Right'].flatMap(side=>['Arm','ForeArm','Hand','UpLeg','Leg','Foot'].map(part=>side+part))];
  model.updateMatrixWorld(true);const bones={};
  for(const name of names){const bone=model.getObjectByName(name);if(!bone)continue;const inverse=bone.getWorldQuaternion(new T.Quaternion()).invert();bones[name]={bone,rest:bone.quaternion.clone(),position:bone.position.clone(),axes:[new T.Vector3(1,0,0),new T.Vector3(0,1,0),new T.Vector3(0,0,1)].map(axis=>axis.applyQuaternion(inverse))};}
  let stride=0,gesture=0,phase=0,disposed=false;
  const rotation=new T.Quaternion();
  function rotate(name,x=0,y=0,z=0){const b=bones[name];if(!b)return;b.bone.quaternion.copy(b.rest);for(const [i,angle]of [x,y,z].entries())if(angle)b.bone.quaternion.multiply(rotation.setFromAxisAngle(b.axes[i],angle));}
  const morph=(name,value)=>{for(const mesh of expressions){const index=mesh.morphTargetDictionary[name];if(index!==undefined)mesh.morphTargetInfluences[index]=value;}};
  return {
    update(dt,time,speed=0,waving=false){
      if(disposed)return false;
      const delta=Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0,target=Number.isFinite(speed)?T.MathUtils.clamp(speed,0,1):0,t=Number.isFinite(time)?time/1000:0;
      stride+=(target-stride)*(1-Math.exp(-delta*12));if(target===0&&stride<.001)stride=0;
      const waveTarget=waving?1:0;gesture=delta===0?waveTarget:gesture+(waveTarget-gesture)*(1-Math.exp(-delta*14));if(!waving&&gesture<.001)gesture=0;
      phase=(phase+delta*Math.PI*2*(.85+.4*stride))%(Math.PI*2);
      for(const [i,side]of ['Left','Right'].entries()){
        const p=phase+i*Math.PI,swing=Math.sin(p),hip=swing*.30*stride,knee=-(Math.max(0,Math.sin(p-.4))**2)*.57*stride;
        rotate(side+'UpLeg',hip);rotate(side+'Leg',knee);rotate(side+'Foot',(-hip-knee)*.6);
        rotate(side+'Arm',-swing*.19*stride);rotate(side+'ForeArm',.10*stride+Math.max(0,-swing)*.13*stride);rotate(side+'Hand',0,0,Math.sin(p+.3)*.025*stride);
      }
      rotate('Spine1',0,Math.sin(phase)*.018*stride,Math.sin(phase)*.015*stride);
      rotate('Spine2',0,-Math.sin(phase)*.022*stride,-Math.sin(phase)*.012*stride);
      rotate('Head',0,Math.sin(phase)*.015*stride-gesture*.07,gesture*.025);
      if(bones.Hips)bones.Hips.bone.position.copy(bones.Hips.position).y+=Math.abs(Math.sin(phase*2))*.004*stride;
      if(gesture){rotate('RightArm',.12*gesture,0,1.45*gesture);rotate('RightForeArm',.15*gesture,0,(1.0+.06*Math.sin(t*7))*gesture);rotate('RightHand',0,.12*Math.sin(t*8)*gesture,.22*Math.sin(t*8)*gesture);}
      const blink=t%4.7,closed=blink<.16?Math.max(0,1-Math.abs(blink-.08)/.08):0;
      morph('eyeBlinkLeft',closed);morph('eyeBlinkRight',closed);morph('mouthSmileLeft',gesture*.24);morph('mouthSmileRight',gesture*.24);
      return stride>0||gesture>0;
    },
    dispose(){disposed=true;},
  };
}
