// Colours belong to architecture, not to the photographs or reference furniture.
// Exhibition walls are muted; stronger colour marks entrances and seating areas.
export const ROOM_FINISHES = [
  { wall: 0xdab9a6, accent: 0x9d4b3d, floor: 0xd8bfa5, ceiling: 0xe8d4c1, trim: 0x805447, finish: 'terrazzo', detail: 'Argilla, graniglia rosata e soffitto avorio caldo.' },
  { wall: 0xd7cfb0, accent: 0x8a824e, floor: 0xc7b58e, ceiling: 0xe3d9bb, trim: 0x77704b, finish: 'stone', detail: 'Calce paglia, pietra sabbia e doghe color lino.' },
  { wall: 0xbfc8d5, accent: 0x354d78, floor: 0x8597b1, ceiling: 0xd9dee6, trim: 0x3a4d69, finish: 'resin', detail: 'Pareti perla azzurra, resina ardesia e portali blu inchiostro.' },
  { wall: 0xa8c0bb, accent: 0x315c59, floor: 0x789f99, ceiling: 0xc6d8cf, trim: 0x345955, finish: 'resin', detail: 'Verde acqua, resina petrolio chiaro e isole acustiche celadon.' },
  { wall: 0xd9b7a7, accent: 0xa56b52, floor: 0xc49a80, ceiling: 0xe8d0be, trim: 0x865742, finish: 'terrazzo', detail: 'Intonaco cipria, graniglia terracotta e soffitto pesca.' },
  { wall: 0x9c828f, accent: 0x57364e, floor: 0x756678, ceiling: 0xb59cae, trim: 0x513a4e, finish: 'resin', detail: 'Malva polveroso, pavimento prugna e portali melanzana.' },
  { wall: 0xb8bea2, accent: 0x69744c, floor: 0xa7aa87, ceiling: 0xd5d5bc, trim: 0x65694b, finish: 'stone', detail: 'Calce salvia, pietra oliva e doghe color canapa.' },
  { wall: 0xb5c2c9, accent: 0x465c70, floor: 0x9faeb9, ceiling: 0xd1dce0, trim: 0x4a5d6d, finish: 'stone', detail: 'Azzurro polvere, pietra grigio blu e cornici color acciaio.' },
  { wall: 0xd7bdc0, accent: 0x966576, floor: 0xc5a6a9, ceiling: 0xe6d0ce, trim: 0x855e6c, finish: 'terrazzo', detail: 'Rosa antico, graniglia rosata e pannelli acustici blush.' },
  { wall: 0xb1ccca, accent: 0x386c70, floor: 0x91b8b5, ceiling: 0xd0e0d8, trim: 0x426d6b, finish: 'terrazzo', detail: 'Acquamarina, graniglia verde laguna e doghe verde nebbia.' },
];

export function addRoomWallFinishes(hall, box, paint, accent, skirting) {
  const { x, z } = hall.center;
  // Linings stay inside the existing wall thickness allowance, behind frames
  // mounted 30cm from structural wall centres. No path or doorway is narrowed.
  box(.018, 6.28, 25.64, hall.side * 26.823, 3.3, z, paint);
  for (const end of [-1, 1]) {
    box(21.64, 6.28, .018, x, 3.3, z + end * 12.823, paint);
    box(21.6, .12, .022, x, .09, z + end * 12.815, skirting);
    // Two colour fields on the inner wall flank the five-metre opening.
    box(.018, 6.28, 10.30, hall.side * 5.177, 3.3, z + end * 7.75, accent);
    box(.022, .12, 10.30, hall.side * 5.185, .09, z + end * 7.75, skirting);
  }
  box(.022, .12, 25.6, hall.side * 26.815, .09, z, skirting);
  box(.02, 1.55, 5.0, hall.side * 5.18, 5.45, z, accent);
}
