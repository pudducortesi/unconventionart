import * as T from 'three';
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { HBAOEffect } from 'realism-effects';

// Bridge the library's HBAO+Poisson denoiser into the existing Three composer.
// Own the depth texture explicitly: no reliance on old composer.depthTexture APIs.
export class GalleryHBAOPass extends Pass {
  constructor(scene, camera, mobile) {
    super(); this.scene=scene; this.camera=camera; this.frames=0;
    this.beauty = new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType});
    this.beauty.depthTexture = new T.DepthTexture(1,1,T.UnsignedIntType);
    this.effect = new HBAOEffect({depthTexture:this.beauty.depthTexture, passes:[]},camera,scene,
      {resolutionScale: 1, spp: mobile ? 16 : 24, distance:.22, power:.7,
        iterations:1, samples:16, radius:6, useNormalPass:false});
    this.material = new T.ShaderMaterial({
      depthWrite:false, depthTest:false, toneMapped:false,
      uniforms:{tDiffuse:{value:this.beauty.texture}, aoTexture:{value:null}, depthTexture:{value:this.beauty.depthTexture}, power:{value:.7}},
      vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:'varying vec2 vUv; uniform sampler2D tDiffuse, aoTexture, depthTexture; uniform float power; void main(){vec4 base=texture2D(tDiffuse,vUv);float depth=texture2D(depthTexture,vUv).r;float ao=depth>.9999?1.0:pow(clamp(texture2D(aoTexture,vUv).a,0.0,1.0),power);gl_FragColor=vec4(base.rgb*mix(1.0,ao,0.22),base.a);}',
    });
    this.quad = new FullScreenQuad(this.material);
  }
  setSize(w,h) { this.beauty.setSize(w,h); this.effect.setSize(w,h); }
  needsFrame() { return this.frames < 120 && (!this.effect.aoPass.fullscreenMaterial.uniforms.blueNoiseTexture.value || !this.effect.poissionDenoisePass.fullscreenMaterial.uniforms.blueNoiseTexture.value); }
  render(renderer, output) {
    this.frames++;
    renderer.setRenderTarget(this.beauty); renderer.render(this.scene,this.camera);
    this.effect.update(renderer);
    this.material.uniforms.aoTexture.value=this.effect.uniforms.get('inputTexture').value;
    renderer.setRenderTarget(this.renderToScreen ? null : output); this.quad.render(renderer);
  }
  dispose() {
    const ao=this.effect.aoPass, blur=this.effect.poissionDenoisePass;
    for (const pass of [ao,blur]) pass.fullscreenMaterial.uniforms.blueNoiseTexture.value?.dispose();
    ao.renderTarget.dispose(); blur.renderTargetA.dispose(); blur.renderTargetB.dispose();
    ao.dispose(); blur.dispose(); this.effect.dispose();
    this.beauty.depthTexture.dispose(); this.beauty.dispose(); this.material.dispose(); this.quad.dispose();
  }
}
