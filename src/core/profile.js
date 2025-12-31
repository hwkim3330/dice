// profile.js - Local user profile storage
// Core module

const PROFILE_KEY = 'grand_casino_profile_v1';
const DEFAULT_PROFILE = {
    userId: 'local',
    nickname: '게스트',
};

let cachedProfile = null;

function normalizeProfile(raw) {
    if (!raw || typeof raw !== 'object') return { ...DEFAULT_PROFILE };
    const userId = typeof raw.userId === 'string' && raw.userId.trim() ? raw.userId.trim() : DEFAULT_PROFILE.userId;
    let nickname = typeof raw.nickname === 'string' ? raw.nickname.trim() : DEFAULT_PROFILE.nickname;
    if (!nickname) nickname = DEFAULT_PROFILE.nickname;
    return { userId, nickname };
}

export function loadProfile() {
    if (cachedProfile) return cachedProfile;
    try {
        const raw = localStorage.getItem(PROFILE_KEY);
        cachedProfile = raw ? normalizeProfile(JSON.parse(raw)) : { ...DEFAULT_PROFILE };
    } catch {
        cachedProfile = { ...DEFAULT_PROFILE };
    }
    return cachedProfile;
}

export function getProfile() {
    return loadProfile();
}

export function saveProfile(profile) {
    const next = normalizeProfile(profile);
    cachedProfile = next;
    try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    } catch {
        /* ignore */
    }
    return next;
}

export function getNickname() {
    return loadProfile().nickname;
}

export function setNickname(nickname) {
    const current = loadProfile();
    return saveProfile({ ...current, nickname });
}
