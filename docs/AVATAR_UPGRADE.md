# Avatar upgrade — 23 September 2026

## Implemented

The profile now offers **Essenziale** (procedural avatar) and **Atelier · figura femminile** (authored, skinned MPFB model). Existing profiles remain on Essenziale until changed. Both appear in the preview and invitation rooms. The selector persists through the private social RPC; only the two curated model identifiers are accepted, never user-provided URLs.

Atelier includes a textured human body and outfit, hair color, skin tint, outfit tint, three body widths and four hairstyle settings. Long uses the authored ponytail; other styles use small fitted procedural hair pieces. These are not separate clothing assets or body-shape morphs. The preview provides walking/idle modes, rotation and a face close-up. The A-pose is relaxed before recording animation baselines. Walk cycles and blinks are generated locally.

Both models now support optional round or rectangular eyeglass frames, with black, tortoiseshell or gold finishes. The geometry is generated locally and attached to the head, so it follows head movement in the preview and meetings. Older saved profiles default to no glasses; the private RPC accepts only the enumerated styles and colours. The migration is `infra/avatar-accessories.sql`.

## Asset acquisition and optimization

The earlier binary-download blocker was resolved using a read-only GitHub Actions asset preparation job and the GitHub artifact download connector. The workflow is committed at `.github/workflows/avatar-assets.yml`. No private data or repository write credential is sent to the asset pipeline.

Source: `met4citizen/TalkingHead`, commit `eed58d198076a7e1e825f804802921c4d3804d46`, `avatars/mpfb.glb`. Upstream declares this specific model CC0; other demonstration avatars are excluded. Attribution: `avatars/LICENSE.txt`.

- Original: 36,815,920 bytes.
- Optimized: 1,779,588 bytes, 22,223 triangles, seven skinned meshes.
- Geometry simplified with glTF Transform 4.2.1 and meshoptimizer 0.25.0; essential blink/smile/jaw morphs retained; eyelashes omitted; textures reduced to 1024px WebP.
- Exact asset hash and structure: `avatars/atelier-v1.report.json`.
- Asset tooling dependency lock: `research/avatar-tooling-lock.json`.

## Runtime

`@pixiv/three-vrm` 3.5.5 (MIT) is vendored in `js/avatar-runtime/three-vrm.js` from the official npm package and bundled with GLTFLoader and SkeletonUtils against the existing shared Three.js 0.186.0 engine. No second Three engine or external CDN is loaded. The VRM loader plugin is registered; the included model is **GLB**, not VRM. General user VRM import and VRM expression/animation UI are not implemented.

Atelier loads only when selected or encountered in a room. One cached template shares geometry/textures between participants; each participant gets their own skeleton and tinted materials. The procedural avatar remains visible while loading and on failure; the preview explicitly reports fallback. Requests have a 15-second timeout. Replaced/disposed instances release owned resources without disposing shared texture/geometry data. Preview animation is separate from gallery rendering, capped at about 30 fps and stops when closed/hidden; reduced-motion preference is respected.

When a participant stops walking, interpolation snaps to the final position and the gait settles fully before releasing the gallery render loop. Resting participants do not keep the full gallery rendering continuously; their idle expressions update when the scene next renders.

## Remaining work

CharacterStudio is evaluated and pinned in `research/avatar-sources.json`, but its editor is not integrated. A full Sims-like wardrobe, additional authored bodies, facial sliders, user VRM import, voice/lip sync, distance LODs, and real iPhone/16-user performance measurements remain future work. Do not describe this release as a complete metaverse avatar creator.

## Validation

`npm run check` completed successfully: build validation and 148 tests. Tests verify the exact model hash, size and triangle budget, skeleton presence, independent instances, finite animation transforms, gait settling, eyewear attachment/disposal, profile persistence, invalid value rejection and compatibility with old profiles. Build checks confirm the deployed asset matches the reviewed bytes, licenses are included, and the avatar runtime stays outside initial loading. The `avatar_glasses_and_frames` migration is installed in the dedicated Supabase project; its deployed allowlist and function permissions were verified.

Node model tests omit image decoding and therefore do not validate GPU materials or on-device frame rates. The cloud browser does not support WebGL; final visual rendering and iPhone performance remain to be checked on a real device.
