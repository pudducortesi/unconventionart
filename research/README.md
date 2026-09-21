# Asset optimization research

Five upstream repositories are included as pinned Git submodules. These are actual source checkouts, not npm packages injected into the site. The Git links and `upstream-lock.json` record the exact revisions; `.gitmodules` records their official origins. Upstream licenses remain inside each checkout.

Retrieve the source checkouts after cloning this repository:

```sh
node tools/fetch-research.mjs
```

No upstream install or build script runs automatically. Dependencies needed to compile the tools themselves (libvips, libjxl, toolchains, etc.) are not included merely by downloading these five repositories. They are evaluated separately before adoption. Revisions are research snapshots, not a claim that every upstream HEAD has passed production qualification.

## Initial assessment for this gallery

| Source | Intended use | Decision / integration constraint |
|---|---|---|
| `upstream/sharp` | Generate appropriately sized WebP/AVIF photo derivatives during asset preparation | First integration candidate; original HD files remain untouched. Compare encoding time, decoding time, color and size before choosing per-image output. |
| `upstream/ssimulacra2` | Measure distortion against the original at matching dimensions | Quality-check companion to Sharp; needs compilation and dependencies. A score supplements, not replaces, visual inspection of bodypainting, shadows and fine texture. |
| `upstream/basis_universal` | Encode KTX2 texture assets for GPU compression | Candidate for architectural/material textures. Current CanvasTexture generation needs an explicit conversion/export step and a compatible loader; downloading the codec alone changes nothing. |
| `upstream/meshoptimizer` | Compress/reorder mesh data; gltfpack asset optimization | Candidate when preparing imported furniture GLBs. Current procedural/instanced furniture does not automatically benefit from compressing GLB downloads. Preserve interaction IDs, artwork positions and collision geometry. |
| `upstream/glTF-Transform` | Inspect, deduplicate, prune and process GLB models | Asset-pipeline coordinator for future imported furniture and AR models. Avoid aggressive simplification on visible silhouettes; test each target loader/extension combination. |

## Evaluation order

1. Record original byte size and displayed dimensions; generate photo derivatives without replacing masters.
2. Compare quality and transfer size, with visual review at the intended display size. Keep the HD original available on demand.
3. Measure decoding time and GPU memory separately from download size; smaller AVIF files do not imply smaller decoded textures or higher FPS.
4. Trial KTX2 on a material set and mesh optimization on an actual detailed furniture asset.
5. Integrate only validated outputs/loaders, keeping research sources outside the browser bundle.

The production build copies an explicit list of gallery assets to `dist`; it does not copy this directory. `.vercelignore` excludes research from deployment uploads. GitHub may still fetch submodules during a platform checkout: this is repository/build traffic, not visitor traffic. No performance gain is claimed until an integration is benchmarked on the gallery.
