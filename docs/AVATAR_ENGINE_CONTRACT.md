# Avatar data and future Unreal renderer

The saved avatar is engine-independent JSON, validated by `ua_social.normalize_avatar`. Three.js currently renders it; moving to Unreal must preserve the profile, identity and room authorization contracts.

## Version 1 portable file

`format: unconventionart-avatar`, `version: 1`, `avatar: { ... }`. No tokens, user IDs, remote model URLs or executable content are exported. The enumerations and bounded integer dimensions are defined in `js/museum/social-model.js`; the server rejects malformed values. Older profiles acquire defaults on loading. Dimensions are percentages relative to each authored base, not centimetres or universal morph-target weights. The current height parameter uniformly scales vertical dimensions; it does not change the gallery camera or collision capsule.

| Data | Web interpretation | Unreal integration requirement |
| --- | --- | --- |
| `model` | classic / studio procedural rig; atelier GLB | Map stable IDs to reviewed Skeletal Mesh assets |
| `height`, `shoulders`, `waist`, `hips` | Bounded percent proportions on Studio; height on Atelier | Calibrated morphs or rig adjustments per base, validated with clothing and animation |
| `faceWidth`, `jaw`, `nose`, `eyeSize`, `lipSize` | Procedural facial dimensions | Artist-authored morph targets with calibrated ranges |
| `garment`, `style`, `beard`, `glasses` | Curated parts by semantic ID | Asset registry with skeleton, sockets, LODs, rights and supported body bases |
| colour fields | sRGB hex palette values | Convert to linear colour for material parameters |
| room pose | metres, Y up, forward -Z; radians about Y | Explicit unit, axis and handedness conversion; test known poses |
| walk / wave | Local procedural animation | Retargeted clips and animation state machine |

A portable profile is not a ready Unreal character. Meshes, materials, skeletons, facial targets, clothing fit and locomotion must be authored or retargeted for Unreal. Do not claim visual equivalence or automatic conversion.

## Delivery architecture to validate on the GPU server

- Keep authenticated profile, invitations, rooms and moderation in the existing backend.
- Treat any streamed client as untrusted; authorize its room and profile server-side.
- Deploy the Unreal renderer behind a session allocator; agree a streaming/input protocol only after choosing and testing the engine version and server image.
- Measure GPU sessions per host, mobile network latency, bitrate, reconnect and idle teardown before deciding capacity or operating cost.
- Preserve the lightweight web experience as the access/fallback surface, sharing versioned avatar data.

No Unreal runtime, Pixel Streaming service, GPU server or MetaHuman assets are deployed by this change. The decision to use a GPU server at steady state is recorded; provisioning and version-specific implementation remain separate work.
