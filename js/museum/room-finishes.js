// Colours belong to architecture, not to the photographs or reference furniture.
// Exhibition walls are muted; stronger colour marks entrances and seating areas.
export const ROOM_FINISHES = [
  { wall: 0xffffff, accent: 0xffffff, floor: 0xa0774d, ceiling: 0xe8d4c1, trim: 0xffffff, finish: 'mosaic', detail: 'Pareti bianche e parquet a mosaico color miele, con arredi nei colori originali.' },
  { wall: 0xffffff, accent: 0xffffff, floor: 0xa0774d, ceiling: 0xe3d9bb, trim: 0xffffff, finish: 'mosaic', detail: 'Pareti bianche e parquet a mosaico color miele, con arredi nei colori originali.' },
  { wall: 0xffffff, accent: 0xffffff, floor: 0xa0774d, ceiling: 0xd9dee6, trim: 0xffffff, finish: 'mosaic', detail: 'Pareti bianche e parquet a mosaico color miele, con arredi nei colori originali.' },
  { wall: 0xffffff, accent: 0xffffff, floor: 0xa0774d, ceiling: 0xc6d8cf, trim: 0xffffff, finish: 'mosaic', detail: 'Pareti bianche e parquet a mosaico color miele, con arredi nei colori originali.' },
  { wall: 0xffffff, accent: 0xffffff, floor: 0xa0774d, ceiling: 0xe8d0be, trim: 0xffffff, finish: 'mosaic', detail: 'Pareti bianche e parquet a mosaico color miele, con arredi nei colori originali.' },
  { wall: 0xffffff, accent: 0xffffff, floor: 0xa0774d, ceiling: 0xb59cae, trim: 0xffffff, finish: 'mosaic', detail: 'Pareti bianche e parquet a mosaico color miele, con arredi nei colori originali.' },
  { wall: 0xffffff, accent: 0xffffff, floor: 0xa0774d, ceiling: 0xd5d5bc, trim: 0xffffff, finish: 'mosaic', detail: 'Pareti bianche e parquet a mosaico color miele, con arredi nei colori originali.' },
  { wall: 0xffffff, accent: 0xffffff, floor: 0xa0774d, ceiling: 0xd1dce0, trim: 0xffffff, finish: 'mosaic', detail: 'Pareti bianche e parquet a mosaico color miele, con arredi nei colori originali.' },
  { wall: 0xffffff, accent: 0xffffff, floor: 0xa0774d, ceiling: 0xe6d0ce, trim: 0xffffff, finish: 'mosaic', detail: 'Pareti bianche e parquet a mosaico color miele, con arredi nei colori originali.' },
  { wall: 0xffffff, accent: 0xffffff, floor: 0xa0774d, ceiling: 0xd0e0d8, trim: 0xffffff, finish: 'mosaic', detail: 'Pareti bianche e parquet a mosaico color miele, con arredi nei colori originali.' },
];

export function addRoomWallFinishes(hall, box, paint, accent, skirting, height) {
  const { x, z } = hall.center;
  // Linings stay inside the existing wall thickness allowance, behind frames
  // mounted 30cm from structural wall centres. No path or doorway is narrowed.
  box(.018, height - .32, 25.64, hall.side * 26.823, height / 2, z, paint);
  for (const end of [-1, 1]) {
    box(21.64, height - .32, .018, x, height / 2, z + end * 12.823, paint);
    box(21.6, .12, .022, x, .09, z + end * 12.815, skirting);
    // Two colour fields on the inner wall flank the five-metre opening.
    box(.018, height - .32, 10.30, hall.side * 5.177, height / 2, z + end * 7.75, accent);
    box(.022, .12, 10.30, hall.side * 5.185, .09, z + end * 7.75, skirting);
  }
  box(.022, .12, 25.6, hall.side * 26.815, .09, z, skirting);
  box(.02, height - 4.7, 5.0, hall.side * 5.18, (height + 4.7) / 2, z, accent);
}
