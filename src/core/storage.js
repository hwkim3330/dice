// storage.js - localStorage 래퍼
// Core 모듈

const STORAGE_KEY = 'grand_casino_wallet_v1';

/**
 * 저장된 상태 로드
 * @returns {{ cash: number, chips: number } | null}
 */
export function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;

        return {
            cash: Math.max(0, Math.floor(Number(parsed.cash) || 0)),
            chips: Math.max(0, Math.floor(Number(parsed.chips) || 0)),
        };
    } catch {
        return null;
    }
}

/**
 * 상태 저장
 * @param {{ cash: number, chips: number }} state
 */
export function saveState(state) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        // 저장 실패해도 게임은 계속
    }
}

/**
 * 저장 데이터 초기화
 */
export function clearState() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        // ignore
    }
}
