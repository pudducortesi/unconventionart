# Avatar upgrade — 23 September 2026

## Shipped in this change

A locally generated articulated avatar replaces the original primitive figure. The existing profile schema remains compatible (skin, hair, outfit, haircut, build). The model adds facial features, ears, eyebrows, eyelids, layered hair, shaped torso, cuffs and soles. Shoulder/elbow and hip/knee hierarchies keep hands and shoes attached during gait. The preview offers idle and walking modes; remote avatars animate from interpolated displacement. Geometry and materials are released when replaced.

This is an improved procedural fallback, not a downloaded VRM model or a CharacterStudio integration. It does not match the asset quality of a professionally authored Sims-like character.

## Upstream selection

Exact reviewed commits are in `research/avatar-sources.json`.

- https://github.com/pixiv/three-vrm — MIT runtime for VRM models; use a single shared Three.js instance. Pin and test against the project's Three.js 0.186.0 before adding it to the vendor build.
- https://github.com/M3-org/CharacterStudio — MIT character customization code; assets are separate. Its CharacterManager logic is the integration candidate; do not import its full React/wallet application into the gallery.
- https://github.com/makehumancommunity/mpfb2 — GPL Blender authoring tool; bundled assets CC0. Author and simplify original characters offline, then export GLB/VRM with a compatible rig and facial morph targets.
- https://github.com/met4citizen/TalkingHead — MIT facial/lip-sync runtime, later voice phase. Demo assets have independent terms; several are non-commercial.
- https://github.com/donmccurdy/glTF-Transform — already tracked in research/upstream; candidate for geometry, animation and texture compression. Preserve VRM extensions when processing VRM; do not assume generic glTF transforms retain them.

## Asset gate and current blocker

The TalkingHead MPFB example is 36,815,920 bytes, before optimization. Direct GitHub binary downloads and npm registry access timed out in this workspace, and the GitHub connector cannot return that binary. No unverified external avatar is loaded by visitors. No upstream runtime package was installed, and no demo asset was republished.

Next: acquire a commercially usable rigged asset, inspect its appearance and license, produce mobile LODs/texture atlases, integrate three-vrm, and connect curated wardrobe choices to persistent profile validation. Target budgets (not measured performance): 1–3 MB compressed per avatar, 10–20k triangles at near LOD and 2–5k at far LOD, 1K textures, few material batches. Verify with 16 visitors on real iPhone hardware before calling this production-ready.

## Validation

Run `npm run check`. Avatar tests exercise all supported combinations, finite geometry, joint attachment, animation, geometry budgets, idempotent disposal and peer replacement/removal. Browser GPU appearance and multi-device performance still require verification; numerical tests do not establish visual quality.
