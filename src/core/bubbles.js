// bubbles.js - tiny helper for speech bubbles
// ChatSystem expects bubbleSay(player, text). Player already has say().

export function bubbleSay(player, text) {
  if (!player) return;
  const msg = String(text ?? '').trim();
  if (!msg) return;
  if (typeof player.say === 'function') player.say(msg);
}
