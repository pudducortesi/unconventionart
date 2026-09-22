import { createPublicGallery } from './handler.js';
// Only this server-side function holds the privileged key. It serves published
// JPEG previews only; it cannot be used to request arbitrary buckets or masters.
const publicKey = 'sb_publishable_oJk-3zfcDGrPGsfixdLSAQ_3LoRtEQy';
Deno.serve(createPublicGallery({url:Deno.env.get('SUPABASE_URL'),serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),publicKey}));
