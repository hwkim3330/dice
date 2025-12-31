// profileStore.js - compatibility wrapper
// Some modules import this legacy path. We delegate to core/profile.js.

export { getNickname, setNickname, getProfile, saveProfile } from '../../core/profile.js';
