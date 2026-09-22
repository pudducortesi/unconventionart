import { createPublicGallery } from './handler.js';
// Only this server-side function holds the privileged key. It serves published
// JPEG previews and programmed video clips only; it cannot request photo masters.
const publicKey = 'sb_publishable_oJk-3zfcDGrPGsfixdLSAQ_3LoRtEQy';
Deno.serve(createPublicGallery({url:Deno.env.get('SUPABASE_URL'),serviceKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),publicKey}));
