# UnconventionArt — interior selection

The white gallery and 120 photographic positions remain the primary programme.
Each hall now contains a principal lounge plus a reading or screening group.
All furniture coordinates are in metres and belong to the collision plan.
Exhibition envelopes reserve 4m in front of the walls. Rugs are walkable.

## Verified references

- MVSEVM 109/2 Laccio: 136 × 48 × 34cm; black laminate top and tubular chrome steel.
  https://www.mvsevm.it/en/portfolio/coffee-side-tables-109/
  Used as the low table in secondary lounges and screening areas.
- Internoitaliano Temù: three turned elements, black finish, 35 × 35 × 68cm variant.
  https://internoitaliano.com/negozio/arredo/temu/
  Used beside the arrival consultation counter. Collision footprint enlarged to 50cm.
- Alivar Day Collection: sofa, sideboard and occasional-table categories provide
  the composition reference. Individual sofa product specifications were unavailable;
  the new white three-seat sofa is an original planning proxy, not a named Alivar model.
  https://www.alivar.com/sofas/

The existing coloured furniture remains based on the user's supplied photographs.
New tables and stools are simplified procedural interpretations, not manufacturer CAD.
White sideboards, woven rugs, dome pendants and the consultation counter are bespoke
planning elements. Luminous surfaces do not imply simulated individual light sources.

## Distribution

- Arrival: existing welcome lounge, reception, back counter, consultation desk and two Temù stools.
- Halls 2 and 8: four-seat reading tables with interactive catalogues.
- Halls 4 and 6: front seats and rear sofas oriented toward the screens.
- Other halls: main reference chairs plus a sofa, Laccio table and two ottomans.
- Every hall: catalogue sideboard, rug-defined zones and a pendant over the second group.

Validation: all 200 exhibition envelopes and routes stay clear; first-work sightline checked.
The cloud browser cannot render WebGL. Visual quality and mobile frame rate are unverified.

## Colour update

Architecture remains white. New sofas, rugs, ottomans and sideboards use coordinated terracotta, petrol blue, olive and ochre; pendant shades use mustard. Reference furniture retains its established colours. These are project finishes, not claims about manufacturer availability.

## Room identities

The current ten spatial profiles are defined in js/museum/room-profiles.js: Soglia, Atelier, Contrasto, Movimento, Corpo, Notturno, Materia, Archivio, Intimo, Orizzonte. Each controls its palette, rug geometry and pendant arrangement. Secondary seating is selected per room; facing chairs replace repeated ottomans in four rooms. Names and spatial descriptions appear in the floor plan. These are proposed spatial identities, not claims about photographic collections already installed. Architecture and shared gallery lighting remain white; Notturno refers to the upholstery palette, not a darkened room.


## Rendering realism update

Implemented the official Three.js RoomEnvironment add-on, vendored from the pinned
Three.js dependency with its license. Its PMREM studio environment provides softbox
reflections for PBR furniture; it does not mirror actual gallery objects.
Seeded procedural bump and roughness detail adds variation to upholstery, plaster
and the floor without changing photographic textures. A local directional shadow
map adds furniture shadows and updates on room changes, with 1024px on mobile and
2048px on desktop. Existing soft contact patches remain at reduced opacity.

Evaluated https://github.com/N8python/n8ao and
https://github.com/0beqz/realism-effects. Neither is installed: AO/SSGI and temporal
passes need separate GPU and mobile performance validation before integration.
This update is not ray tracing or game-engine-level global illumination.
Automated construction, shadow invalidation and build checks pass; actual WebGL
appearance and iPhone frame rate remain unverified in the cloud browser.


## Floors and ceilings

White finishes now distinguish the rooms: fine terrazzo (Soglia, Corpo, Intimo,
Orizzonte), honed stone (Atelier, Materia, Archivio), satin resin (Contrasto,
Movimento, Notturno). Slab modules are 3m with thin joints. Procedural texture
UVs use metre-based scale, mipmaps and supported anisotropic filtering.
Floor finishes remain walkable and sit above a lowered structural slab to
avoid coplanar depth flicker. No photographic assets are altered.

Ceilings use six deep rooflight coffers in Soglia/Contrasto/Archivio; a central
field of white acoustic fins in Atelier/Materia/Orizzonte; two suspended rafts
in Corpo/Movimento/Notturno/Intimo. Perimeter shadow gaps, slender luminous
reveals, panel thickness and hangers establish construction depth. Shared
instanced geometry limits draw calls. Luminous panels are visual surfaces,
not additional simulated light sources. Existing shared lighting is retained.

Construction, first-artwork visibility and finished-floor walking raycasts
pass on both device configurations. WebGL appearance remains unverified
because the available browser has no WebGL context.


## Écru finish revision

Walls use warm écru #F3EEE3. Floor finish tints are terrazzo #FBF7EF,
stone #F7F2E7 and resin #FAF5EB, multiplied by their existing surface textures.
These are material inputs, not guaranteed screen colours under scene lighting.
Ceilings, furniture colours and photographic textures retain their existing finishes.


## Exploration interface and guided visits

Compact graphite HUD, gold interaction accents, central contextual reticle and E
interaction key. Touch keeps left movement stick, right swipe-to-look region,
right interaction button and a separate bottom navigation bar, with safe-area
insets. Desktop mouse retains drag-to-look and click-to-walk; hovering over
interactive artwork changes the cursor. No pointer-lock dependency.

Two text-guided itineraries: all ten spatial identities, or only actual public
photographs. Navigation uses the existing collision-aware paths and respects
reduced motion. Visitors explicitly advance each stop, return, pause/resume or
exit. Manual movement, destination selection, dialogs and backgrounding pause
the guide; asynchronous artwork focus is invalidated when interrupted.
No voice narration or invented photographic catalogue. State transitions and
keyboard focus/repeat handling are covered by tests. End-to-end GPU rendering
and physical iPhone layout/performance remain unverified.
