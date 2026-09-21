import * as T from '../../vendor/three.module.js';
import { HALLS, BUILDING } from './layout.js';
import { ROOM_FINISHES } from './room-finishes.js';

// White wall panels frame the continuous mahogany promenade. Everything is
// batched with the building; no extra real-time lights or animation loops.
export function furnishCorridor({ own, box, glow }) {
  const paint = (color, roughness = .8, metalness = 0) =>
    own(new T.MeshStandardMaterial({color, roughness, metalness}));
  const limestone = paint(0xffffff);
  const inset = paint(0xf0f0f0);
  const bronze = paint(0x88704d,.4,.45);
  const floorMetal = paint(0x88704d,.45,.35);
  const canopy = paint(0xbbb6a3);
  floorMetal.userData.walkable = true;
  // Stone ribbon and hairline brass inlays leave the full corridor accessible.
  for (const side of [-1,1]) {
    box(.025,.002,139.5,side*2.94,-.001,-60,floorMetal);
    box(.11,.10,139,side*4.4,BUILDING.height-.43,-60,bronze);
  }
  for (let row=0;row<5;row++) {
    const z=-13-row*26;
    // Five overhead gateways define the route and echo paired room entrances.
    box(9.55,.24,.42,0,5.93,z,canopy);
    box(8.8,.018,.05,0,5.799,z,glow);
    for (const dz of [-3,3]) box(5.8,.002,.025,0,.0002,z+dz,floorMetal);
  }
  for (const hall of HALLS) {
    const {z}=hall.center, side=hall.side;
    const colour=paint(ROOM_FINISHES[hall.index].accent);
    // Colour returns face the promenade, identifying the room before entry.
    for (const end of [-1,1]) {
      box(.022,4.65,.20,side*4.815,2.34,z+end*2.66,colour);
      box(.02,4.3,.035,side*4.797,2.4,z+end*2.80,bronze);
      box(.018,4.55,8.25,side*4.826,2.48,z+end*7.65,limestone);
      box(.023,.18,10.2,side*4.818,.11,z+end*7.75,inset);
      // Narrow vertical reveals lend the limestone panels a human-scale rhythm.
      for (let n=0;n<4;n++) box(.022,4.25,.018,side*4.812,2.49,z+end*(4.6+n*1.7),inset);
    }
    box(.022,.25,5.52,side*4.815,4.76,z,colour);
  }
}
