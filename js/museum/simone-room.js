// Simone Plozzer artist room — single-level 75-work exhibition envelope.
// Visual direction derived from the artist's supplied originals: paper white, ink black,
// graphite grey and restrained cobalt/cyan accents. Originals are never transformed here.
export const SIMONE_ROOM = {
  id: 'simone-plozzer',
  artist: 'Simone Plozzer',
  artistEmail: 'simone.plozzer@gmail.com',
  level: 0,
  capacity: 75,
  dimensions: { width: 66, depth: 30, height: 6.6 },
  palette: {
    paper: '#f3f0e9',
    ink: '#111214',
    graphite: '#4d5054',
    cobalt: '#075aa8',
    cyan: '#45c9d8'
  },
  furnitureLanguage: 'ALIVAR Museum-inspired modular partitions; abstracted, not copied',
  rules: {
    mezzanine: false,
    preserveOriginals: true,
    artistCanEditMuseum: false,
    artistCanEditOtherArtists: false,
    artistCanManageOwnWorks: true
  }
};

const wallSlots = (side, count, z0, step) =>
  Array.from({length:count},(_,i)=>({
    id:`SP-${side}-${String(i+1).padStart(2,'0')}`,
    zone:side,
    x: side === 'west' ? -32.7 : 32.7,
    z:z0+i*step,
    rotation: side === 'west' ? Math.PI/2 : -Math.PI/2
  }));

// 30 perimeter works + 45 on five freestanding divider sequences.
// Dividers deliberately vary in length/offset to read like ink strokes rather than cubicles.
const perimeter=[...wallSlots('west',15,-13,1.86),...wallSlots('east',15,-13,1.86)];
const dividerZ=[-10.5,-5.2,0,5.2,10.5];
const dividerSlots=dividerZ.flatMap((z,row)=>Array.from({length:9},(_,i)=>({
  id:`SP-D${row+1}-${String(i+1).padStart(2,'0')}`,
  zone:`divider-${row+1}`,
  x:-24+i*6,
  z:z+(i%2?0.22:-0.18),
  rotation: row%2 ? Math.PI : 0
})));
export const SIMONE_SLOTS=[...perimeter,...dividerSlots];

export const SIMONE_DIVIDERS=dividerZ.map((z,i)=>({
  id:`simone-divider-${i+1}`,
  x:i%2 ? 3.2 : -3.2,
  z,
  width:i===2?53:47,
  depth:.18,
  height:4.4+(i%2)*.35,
  rotation:(i%2?-.018:.022),
  material:i===2?'graphite':'ink'
}));

export const SIMONE_LIGHTING={
  ambient:0.34,
  artworkTemperature:4100,
  accentColors:['#075aa8','#45c9d8'],
  accentLimit:0.12,
  note:'White artwork light first; cyan/cobalt only as sparse spatial cuts.'
};
