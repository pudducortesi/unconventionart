import { ROOM_FINISHES } from './room-finishes.js';
// Spatial identities, independent of the photographs eventually curated here.
export const ROOM_PROFILES = [
  { name: 'Soglia', mood: 'Ritratti in sequenza su due livelli. Un allestimento raccolto, dedicato al bianco e nero.', color: 0x383936, rug: 0x77736b, weave: 0xa9a398, shape: 'oval', light: 'cluster', seat: 'discs' },
  { name: 'Atelier', mood: 'Un tavolo condiviso per leggere e confrontare immagini.', color: 0xb58a3c, rug: 0xb9a67b, weave: 0xe4d4ab, shape: 'rectangle', light: 'linear', seat: 'sofa' },
  { name: 'Contrasto', mood: 'Geometrie nette, colori primari, composizioni frontali.', color: 0x244784, rug: 0x303740, weave: 0xa9b3c6, shape: 'rectangle', light: 'pair', seat: 'daybed' },
  { name: 'Movimento', mood: 'Uno spazio collettivo rivolto alle immagini in movimento.', color: 0x234e60, rug: 0x395762, weave: 0x698795, shape: 'rectangle', light: 'linear', seat: 'sofa' },
  { name: 'Corpo', mood: 'Curve, pelle e toni caldi. Una sosta più fisica e raccolta.', color: 0xa96f46, rug: 0xc29676, weave: 0xe8c9a8, shape: 'oval', light: 'cluster', seat: 'ribbed' },
  { name: 'Notturno', mood: 'Bordeaux e nero, una visione più intima dello schermo.', color: 0x632d44, rug: 0x543844, weave: 0x957485, shape: 'oval', light: 'single', seat: 'sofa' },
  { name: 'Materia', mood: 'Superfici tessute e sedute distese, tra oliva e terra.', color: 0x626a45, rug: 0x8c906c, weave: 0xc1c49e, shape: 'rectangle', light: 'pair', seat: 'daybed' },
  { name: 'Archivio', mood: 'Ordine, consultazione e dialogo intorno alla fotografia.', color: 0x374c69, rug: 0x7e8d9a, weave: 0xbbc8d3, shape: 'rectangle', light: 'linear', seat: 'sofa' },
  { name: 'Intimo', mood: 'Sedute singole e forme morbide. Guardare con calma.', color: 0x986b73, rug: 0xb19196, weave: 0xdfc2c6, shape: 'oval', light: 'single', seat: 'bibendum' },
  { name: 'Orizzonte', mood: 'Un salotto aperto, blu profondo, prima del ritorno.', color: 0x25525d, rug: 0x60868b, weave: 0xa7c5c7, shape: 'oval', light: 'pair', seat: 'sofa' },
].map((profile, index) => ({ ...profile, mood: `${profile.mood} ${ROOM_FINISHES[index].detail}` }));
