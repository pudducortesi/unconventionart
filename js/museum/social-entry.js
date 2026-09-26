import { inviteCode } from './social-model.js';

export const PUBLIC_GALLERY = 'https://unconventionart.vercel.app/';
export const invitationURL = code => {
  const invite = inviteCode(code);
  if (!invite) throw Error('Invito non valido.');
  return `${PUBLIC_GALLERY}#visit=${invite}`;
};

// Consume credentials once, before loading the scene. Never store a callback URL.
export function readSocialEntry(location, history, storage) {
  const url = new URL(location.href), hash = new URLSearchParams(url.hash.slice(1));
  const invite = inviteCode(hash.get('visit')) || inviteCode(url.searchParams.get('visit'));
  if (invite) try { storage?.setItem('ua-pending-invite', invite); } catch {}
  let pending = invite;
  if (!pending) try { pending = inviteCode(storage?.getItem('ua-pending-invite')); } catch {}
  const callback = hash.has('access_token') || hash.has('error') || hash.has('error_description');
  const auth = callback ? {
    accessToken: hash.get('access_token'), refreshToken: hash.get('refresh_token'),
    expiresIn: Number(hash.get('expires_in')), type: hash.get('type'),
    error: hash.has('error') || hash.has('error_description'),
  } : null;
  if (callback) {
    url.hash = '';
    history.replaceState(null, '', url.pathname + url.search);
  }
  return { invite: pending, auth, requested: !!(invite || callback || url.searchParams.has('account')) };
}

export function clearPendingInvite(storage) {
  try { storage?.removeItem('ua-pending-invite'); } catch {}
}
