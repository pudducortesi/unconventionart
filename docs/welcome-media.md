# Welcome hall

The masterplan describes 4 floors × 10 rooms. Ground-floor rooms reflect the
published catalogue. Floors 1–3 are planned, not navigable; the existing Officina
mezzanine is part of its ground-floor room, not one of the future museum floors.

The introduction screen uses `data/welcome-video.json` (bundled at build time).
Set `url` to the authorised display-video URL, and optionally `poster` to its
cover image, then deploy. No introduction video has been supplied yet; `null`
keeps the designed welcome poster and a truthful availability message.
Use a browser-compatible MP4 (H.264), web-optimised with metadata at the beginning;
its host must allow cross-origin media and byte-range requests. Use a display
copy, never a private master URL.

One video element buffers from catalogue load and is shared by the 3D LED wall
and the controllable dialog. It stays muted on the wall, keeps its buffer when
away, and only replaces the poster after readiness or three seconds of buffer.
A network/media error restores the welcome poster. Browsers may limit preload
on cellular, low-power and data-saving modes; seamless arrival is not guaranteed.

Images are warmed towards the requested destination, or eight metres ahead
when walking freely, with at most two speculative requests. Existing compressed
image caching deduplicates these with texture loading. The guided itinerary
visits the map and LED wall before entering Officina, allowing useful loading
time without an artificial waiting screen.
