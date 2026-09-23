import { MEZZANINE_HEIGHT } from './mezzanine-layout.js';

// Explicit membership keeps future uploads independent and withdrawn works absent.
export const PORTRAIT_SET_IDS = ["4e25f69c-19e3-4041-afd2-a34da91c13d9","0a286d10-48b1-4c2e-8de9-0cc4489f2054","d44ad890-dd51-4903-9404-590644916231","8292f830-2455-4c9e-b101-d4a0f800558d","6f2eb878-eaac-4d81-804e-dc86be2e5593","e65736ef-8447-4d95-bd83-2fd1252775b1","a0a126f8-6576-4ccd-ab54-e1dddc1bfe1c","04ada2d8-1fa0-40ab-ae0e-1b14b5a7b63a","6a473aa0-45c8-413e-922c-ec8db5bf7095","09b5c2c0-85fb-48db-8b7f-319aa5351cc7","aea6654d-6895-4dd6-bea1-1995f87bda2e","03bca78a-218f-4653-9f24-14bfac3c3e5a","9944c16b-3d04-4c2a-a2a7-00a2fce459c0","ead4687b-e631-4f0b-9814-3b0075c49529","b43012fb-9855-476c-9f6a-b65e93859c2d","6f405537-b80b-4cfe-b4d2-9ce7c5dad536","2b21ada1-3cb8-4f0b-b8c9-c34d69683457","c6fdefcf-c18b-4b0f-802c-b18298ea2b63","e1f312ee-1a3d-4d88-a7ec-fc2f4825a24f","22869e22-ede8-49c7-adda-6fae5551938f","88fa67a6-7bdf-4d26-950a-e198e1695e08","9d65a65e-0c38-41b2-b9b4-d2e8ffdaeabb","253c984b-223b-43d8-baa2-28c54164b3c5","67c73371-54e8-479f-a8b6-4aaf79cd6232","1b70d026-ddd4-4d87-bbe5-a8ce42d7298c","5f1f3b48-0c19-4a9f-9d85-c838335f59b5","d2e7bb9d-8290-49df-8738-171ff8fad2f2","9eb8e85b-682a-4ebd-a2d5-dca6c40f3de4","57a55e03-1c14-4917-8eec-23e9850130cf","015ef760-ec17-4eed-8ba7-94a4a519d17e","b9229b45-90de-4556-87a7-6c971e1a04eb","aa223ea1-7bc5-4c1e-a700-bfbb36425448","283b1dc4-23dc-44be-826f-21b5afcba492","8376b242-23e3-443c-871a-d3779038fa9f","412a5896-1f5b-477c-94f0-c2ac5f4ada33","759b2309-ddf6-45f3-9e41-7392eebc58a0","2e2b3f1c-cf90-43b3-bf0a-7928382d0c9d","975f9dc2-8b3a-4bf2-83df-db63728c8701","71447a5b-fc1a-49b1-afe7-1773ba36872d","3e615997-9dc2-4954-b987-62ae982ce598","526d5d5e-7753-4f8d-8e97-da2cd945cfc5","579070eb-87fa-4086-83a9-224c084326e5","60778bf0-3be8-40dc-bbe7-1e274e3e6d11","48c817d6-eb76-4082-b63f-78af8ae1e5fc","e72ed9f5-56b0-4972-b81a-4c5f6f5a01ad","9faeb1c2-7405-4cbd-935d-c364a564547e","e054732b-9247-424d-a2b8-353765cc94b2","0d3d4866-be87-4fdd-b337-dedc6f4854de","95add20d-8f14-46bb-aeec-c8ce6e4471b5","939f91a3-f6c3-4348-a609-a68359665972","e9d92a10-3cd9-4618-83f6-162f3cffcda5","2814ad6c-33a6-410a-95ac-887156654284","bc26225b-e7a2-486c-934e-5df3ed6befc1","a992ab51-4f04-4a40-9567-26770f97a61d","16d1bf46-a3d2-4e81-89a2-e20cb0dd16df","462f7684-fed8-4a23-9b08-e975fe2a67eb","37a3d286-83c7-47f2-8169-bde6057e9e10","a1538980-a081-4eb7-bd0d-df5f8888b018","83bd7c86-5d92-4cc5-ad43-0e2b713d5123","132d7fae-0a83-468e-a9f0-c2879d655070","143a7703-32a4-435c-b3ab-ada20c054feb","660260cb-751b-4e54-b33d-c9ed3275747a","f8ae1869-09a2-49a4-bb05-654ff99b9b6e","45fcc8f5-1023-4672-bb8a-1c765cff90cd","5f4392fd-0b66-4225-8f49-1fa797cf7d3e","f882aff3-a71c-489c-b213-36f6fc848fb7","e7cbc5b8-d281-4d91-aa55-49c17eb3d50a","adfef3fa-5021-45e2-88ea-8c0ec30fbb55","1dead580-6586-4673-8781-78400a4ef2b5","96920554-cd35-43ca-89aa-8388bed917e6","c617b595-7cfd-4f64-ac9e-64a6d15067da","2db2d9c4-cdb3-43ce-806f-98df1cc37c11","f846213e-3f50-45d2-a17d-143595e5b6aa","1a69a845-6347-4e6e-8c7d-8752512ef32e","eca092b3-8e83-4ebd-83bf-6e13a96dc51b","94f3fad4-b0be-46a6-8794-3db5d7ae2fb0","1ed321ff-79ee-4767-8832-a8cbb7a0b74c","5473c950-1368-43ce-8ee4-b4cab810c6fd"];
export function portraitSetSlot(id) {
  const index = PORTRAIT_SET_IDS.indexOf(id);
  if (index < 0) return null;
  const floorY = index < 39 ? 0 : MEZZANINE_HEIGHT;
  const position = index % 39;
  // Six compositions per floor, each with two rows of three photographs.
  const groups = [
    { x: -26.7, z: -21, rotation: Math.PI / 2 },
    { x: -26.7, z: -13, rotation: Math.PI / 2 },
    { x: -26.7, z: -5, rotation: Math.PI / 2 },
    { x: -22, z: -25.7, rotation: 0 },
    { x: -12, z: -25.7, rotation: 0 },
    { x: -22, z: -0.3, rotation: Math.PI },
  ];
  const hero = position >= 36;
  const group = hero ? { x: -15 + (position - 36) * 3.5, z: -0.3, rotation: Math.PI } : groups[Math.floor(position / 6)];
  const offset = hero ? 0 : (position % 3 - 1) * 2.05;
  const x = group.x + Math.cos(group.rotation) * offset;
  const z = group.z - Math.sin(group.rotation) * offset;
  const y = floorY + (hero ? 2.75 : Math.floor((position % 6) / 3) ? 3.85 : 1.65);
  // The upper viewing points stay on the narrow U-shaped deck.
  const viewDistance = floorY ? 1.55 : 4.2;
  const viewpoint = { x: x + Math.sin(group.rotation) * viewDistance,
    z: z + Math.cos(group.rotation) * viewDistance, floorY };
  // Avoid the stair opening on the rear landing.
  if (floorY && group.rotation === 0 && viewpoint.x > -22.6 && viewpoint.x < -20.4) viewpoint.x = -23;
  return { id: `portrait-${index}`, hallIndex: 0, x, y, z, floorY,
    rotation: group.rotation, viewpoint, composition: hero ? null : Math.floor(position / 6),
    format: hero ? { width: 2.3, height: 3.5 } : { width: 1.45, height: 1.85 } };
}
