// constants.js - 상수/enum 정의
// Core 모듈

/** 씬 ID */
export const SCENES = {
    MAIN: 'main',
    CASINO: 'casino',
    LOBBY: 'lobby',
};

/** 액션 타입 */
export const ACTIONS = {
    MOVE_UP: 'MOVE_UP',
    MOVE_DOWN: 'MOVE_DOWN',
    MOVE_LEFT: 'MOVE_LEFT',
    MOVE_RIGHT: 'MOVE_RIGHT',
    INTERACT: 'INTERACT',
    CLOSE: 'CLOSE',
};

/** 키 → 액션 매핑 */
export const KEY_TO_ACTION = {
    ArrowUp: ACTIONS.MOVE_UP,
    ArrowDown: ACTIONS.MOVE_DOWN,
    ArrowLeft: ACTIONS.MOVE_LEFT,
    ArrowRight: ACTIONS.MOVE_RIGHT,
    KeyW: ACTIONS.MOVE_UP,
    KeyS: ACTIONS.MOVE_DOWN,
    KeyA: ACTIONS.MOVE_LEFT,
    KeyD: ACTIONS.MOVE_RIGHT,
    KeyF: ACTIONS.INTERACT,
    Escape: ACTIONS.CLOSE,
};

/** 게임 설정 상수 */
export const CONFIG = {
    PLAYER_SPEED: 6,
    PLAYER_RADIUS: 14,
    MAP_WIDTH: 2000,
    MAP_HEIGHT: 1400,
    INTERACTION_RADIUS_SLOT: 65,
    INTERACTION_RADIUS_EXCHANGE: 85,
    RATE_WON_PER_CHIP: 1000,
    INTERACTION_RANGE: 60,
};

/** 유틸 함수 */
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const clampInt = (n, min = 0, max = Number.MAX_SAFE_INTEGER) => {
    const x = Math.floor(Number(n) || 0);
    return Math.max(min, Math.min(max, x));
};
