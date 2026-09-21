// Reproducible adaptation of the pinned 1.1.2 ESM build; never mutate node_modules.
export function adaptRealismEffects(source) {
  if (!source.includes('WebGLMultipleRenderTargets,')) throw new Error('Unexpected realism-effects source: review compatibility patch');
  source = source.replace('WebGLMultipleRenderTargets,', '');
  source = source.replace(/\.texture(?=\[|\.(?:length|map|push|slice)\b)/g, '.textures');
  source = source.replace('Array.isArray(this.renderTarget.texture) ? this.renderTarget.textures[1] : this.renderTarget.texture',
    'this.renderTarget.textures[this.renderDepth ? 1 : 0]');
  source = source.replace('environment.magFilter = LinearMipMapLinearFilter;', 'environment.magFilter = LinearFilter;')
    .replace('equirectEnvMap.magFilter = LinearMipMapLinearFilter;', 'equirectEnvMap.magFilter = LinearFilter;');
  return source + '\n';
}
export const mrtAdapter = `
class WebGLMultipleRenderTargets extends WebGLRenderTarget {
  constructor(width, height, count, options) { super(width, height, { ...options, count }); }
}
`;
