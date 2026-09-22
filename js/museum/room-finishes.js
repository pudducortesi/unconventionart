// Muted exhibition fields and distinct architectural relief for each room.
export const ROOM_FINISHES = [
  { name: 'Officina', wall: 0xa7a69f, accent: 0x777973, ceiling: 0x858680, trim: 0x343832, floor: 0x93918a, finish: 'concrete', treatment: 'gallery', detail: 'Cemento, travi e soppalco in acciaio annerito. Una ex officina dedicata alle sequenze fotografiche in bianco e nero.' },
  { name: 'Atelier', wall: 0xe1dac8, accent: 0xb5a17b, ceiling: 0xe9e0c9, trim: 0x806b4e, floor: 0xa0774d, finish: 'mosaic', treatment: 'battens', detail: 'Pareti lino, listelli verticali color rovere e un fregio da atelier.' },
  { name: 'Contrasto', wall: 0xa9b5c5, accent: 0x344961, ceiling: 0xd9dee6, trim: 0x26364d, floor: 0xa0774d, finish: 'mosaic', treatment: 'grid', detail: 'Blu ardesia, cornici scure e una griglia geometrica in rilievo.' },
  { name: 'Movimento', wall: 0xc1d0c6, accent: 0x5c8078, ceiling: 0xd8e4da, trim: 0x426a64, floor: 0xa0774d, finish: 'mosaic', treatment: 'rhythm', detail: 'Verde salvia e sequenze di lamelle alternate, come un ritmo in movimento.' },
  { name: 'Corpo', wall: 0xe1c7b5, accent: 0xb58268, ceiling: 0xefdbca, trim: 0xa06e55, floor: 0xa0774d, finish: 'mosaic', treatment: 'steps', detail: 'Intonaco cipria e cornici a gradoni nei toni della terra.' },
  { name: 'Notturno', wall: 0x8d7884, accent: 0x533346, ceiling: 0xb9a5b4, trim: 0xc3a482, floor: 0xa0774d, finish: 'mosaic', treatment: 'panels', detail: 'Malva profondo, campiture bordeaux e sottili bordature color ottone.' },
  { name: 'Materia', wall: 0xc9c9ad, accent: 0x90936c, ceiling: 0xdfdeca, trim: 0x727551, floor: 0xa0774d, finish: 'mosaic', treatment: 'blocks', detail: 'Pareti calce e oliva, con un fregio di blocchi sfalsati in rilievo.' },
  { name: 'Archivio', wall: 0xc3cbd2, accent: 0x718397, ceiling: 0xe0e6e9, trim: 0x4c6077, floor: 0xa0774d, finish: 'mosaic', treatment: 'registers', detail: 'Grigio carta e blu polvere, scanditi da registri e montanti regolari.' },
  { name: 'Intimo', wall: 0xe0cbce, accent: 0xb38f98, ceiling: 0xefdee0, trim: 0x9b737e, floor: 0xa0774d, finish: 'mosaic', treatment: 'frames', detail: 'Rosa polvere e boiserie a doppia cornice, per una sala raccolta.' },
  { name: 'Orizzonte', wall: 0xc1d6d6, accent: 0x628d94, ceiling: 0xdce9e8, trim: 0x426b77, floor: 0xa0774d, finish: 'mosaic', treatment: 'horizon', detail: 'Pareti acqua e petrolio, attraversate da lunghe fasce orizzontali.' },
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
  // Relief is contained within the wall allowance. Art, stairs and walkways
  // stay clear; the upper register is visible from both exhibition levels.
  const theme = ROOM_FINISHES[hall.index].treatment;
  const decorate = (length, panel) => {
    if (theme === 'gallery') {
      // Quiet exhibition fields on both levels; reveals stay clear of prints.
      panel(0, 0.035, length, 0.018, skirting);
      panel(0, 6.38, length, 0.025, skirting);
      panel(0, height - 0.18, length, 0.025, skirting);
      return;
    }
    panel(0, .24, length, .22, accent);
    panel(0, 6.65, length, .16, skirting);
    const line = (y, thickness = .055) => panel(0, y, length, thickness, skirting);
    const uprights = (step, width, bottom = 7.05, top = 11.7) => {
      for (let u = -length / 2 + .65; u < length / 2 - .4; u += step)
        panel(u, (bottom + top) / 2, width, top - bottom, skirting);
    };
    const frame = (u, y, w, h, thickness = .06) => {
      for (const side of [-1, 1]) {
        panel(u + side * w / 2, y, thickness, h, skirting);
        panel(u, y + side * h / 2, w, thickness, skirting);
      }
    };
    switch (theme) {
      case 'portals':
        for (let u = -length / 2 + 2; u < length / 2 - 1; u += 4) {
          panel(u, 9.35, 2.9, 4.8, accent);
          frame(u, 9.35, 2.55, 4.4, .12);
        }
        break;
      case 'battens': uprights(.48, .075); line(7); line(11.8); break;
      case 'grid': uprights(3, .10); for (const y of [7.1, 9.4, 11.7]) line(y, .1); break;
      case 'rhythm':
        for (let u = -length / 2 + .7, i = 0; u < length / 2 - .5; u += .85, i++)
          panel(u, 9.4, .12, i % 3 === 0 ? 4.6 : i % 3 === 1 ? 3.4 : 2.2, skirting);
        break;
      case 'steps': for (let i = 0; i < 5; i++) panel(0, 10.6 + i * .22, length - i * .65, .12, i % 2 ? accent : skirting); break;
      case 'panels':
        for (let u = -length / 2 + 2; u < length / 2 - 1; u += 4) {
          panel(u, 9.4, 3.35, 4.65, accent); frame(u, 9.4, 3.35, 4.65, .045);
        }
        break;
      case 'blocks':
        for (let row = 0; row < 4; row++) for (let u = -length / 2 + 1.4 + (row % 2) * .75; u < length / 2 - 1.2; u += 2.8)
          panel(u, 7.5 + row * 1.15, 2.55, .95, row % 2 ? accent : skirting);
        break;
      case 'registers': uprights(2.1, .045); for (const y of [7.1, 8.15, 9.2, 10.25, 11.3]) line(y, .035); break;
      case 'frames':
        for (let u = -length / 2 + 2; u < length / 2 - 1; u += 4) {
          frame(u, 9.4, 3.25, 4.6); frame(u, 9.4, 2.95, 4.3, .035);
        }
        break;
      case 'horizon':
        for (const [y, h] of [[7.2, .12], [8.3, .3], [9.7, .65], [11.2, .12]]) panel(0, y, length, h, accent);
        break;
    }
  };
  decorate(25.4, (u, y, w, h, material) =>
    box(material === accent ? .02 : .055, h, w,
      hall.side * (material === accent ? 26.807 : 26.78), y, z + u, material));
  for (const end of [-1, 1]) decorate(21.4, (u, y, w, h, material) =>
    box(w, h, material === accent ? .02 : .055,
      x + u, y, z + end * (material === accent ? 12.807 : 12.78), material));
}
