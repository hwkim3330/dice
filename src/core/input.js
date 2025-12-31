// input.js - 입력 관리 (키/터치/버튼 → action 통일)
// Core 모듈

import { ACTIONS, KEY_TO_ACTION } from './constants.js';

/**
 * 입력 관리자
 * - 키보드, 터치(조이스틱), 모바일 버튼 입력을 통일된 액션으로 변환
 */
export class InputManager {
    constructor() {
        /** @type {Set<string>} 현재 활성 액션들 */
        this.activeActions = new Set();

        /** @type {{ x: number, y: number } | null} 조이스틱 벡터 (-1 ~ 1) */
        this.joystick = null;

        /** @type {((action: string) => void) | null} 일회성 액션 콜백 */
        this.onAction = null;

        // 바인딩된 핸들러 (해제용)
        this._handleKeyDown = this._handleKeyDown.bind(this);
        this._handleKeyUp = this._handleKeyUp.bind(this);

        this._isMobile = !!(window.matchMedia && (
            window.matchMedia('(max-width: 768px)').matches ||
            window.matchMedia('(pointer: coarse)').matches
        ));
        this._bound = false;
    }

    /**
     * 입력 리스너 바인딩
     */
    bind() {
        if (this._bound) return;
        this._bound = true;

        window.addEventListener('keydown', this._handleKeyDown);
        window.addEventListener('keyup', this._handleKeyUp);
    }

    /**
     * 입력 리스너 해제
     */
    unbind() {
        if (!this._bound) return;
        this._bound = false;

        window.removeEventListener('keydown', this._handleKeyDown);
        window.removeEventListener('keyup', this._handleKeyUp);

        this.activeActions.clear();
        this.joystick = null;
    }

    /**
     * 키 다운 핸들러
     * @param {KeyboardEvent} e
     */
    _handleKeyDown(e) {
        // 입력 필드 포커스 시 게임 조작 무시
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        const action = KEY_TO_ACTION[e.code];
        if (!action) return;

        // 일회성 액션 (INTERACT, CLOSE)
        if (action === ACTIONS.INTERACT || action === ACTIONS.CLOSE) {
            if (this.onAction) {
                this.onAction(action);
            }
            if (action === ACTIONS.INTERACT) {
                e.preventDefault();
            }
            return;
        }

        // 지속 액션 (이동)
        this.activeActions.add(action);
    }

    /**
     * 키 업 핸들러
     * @param {KeyboardEvent} e
     */
    _handleKeyUp(e) {
        const action = KEY_TO_ACTION[e.code];
        if (action) {
            this.activeActions.delete(action);
        }
    }

    /**
     * 조이스틱 설정 (터치 입력에서 호출)
     * @param {{ x: number, y: number } | null} vec
     */
    setJoystick(vec) {
        this.joystick = vec;
    }

    /**
     * 현재 활성 이동 액션들 반환
     * @returns {string[]}
     */
    getActiveActions() {
        return [...this.activeActions];
    }

    /**
     * 조이스틱 벡터 반환
     * @returns {{ x: number, y: number } | null}
     */
    getJoystickVector() {
        return this.joystick;
    }

    /**
     * 이동 방향 벡터 계산 (키보드 + 조이스틱 통합)
     * @returns {{ dx: number, dy: number }}
     */
    getMoveDirection() {
        let dx = 0, dy = 0;

        // 키보드 입력
        if (this.activeActions.has(ACTIONS.MOVE_UP)) dy -= 1;
        if (this.activeActions.has(ACTIONS.MOVE_DOWN)) dy += 1;
        if (this.activeActions.has(ACTIONS.MOVE_LEFT)) dx -= 1;
        if (this.activeActions.has(ACTIONS.MOVE_RIGHT)) dx += 1;

        // 조이스틱 입력 (우선)
        if (this.joystick && (this.joystick.x !== 0 || this.joystick.y !== 0)) {
            dx = this.joystick.x;
            dy = this.joystick.y;
        }

        return { dx, dy };
    }

    /**
     * 모든 입력 상태 초기화
     */
    clear() {
        this.activeActions.clear();
        this.joystick = null;
    }

    /**
     * 모바일 여부
     * @returns {boolean}
     */
    get isMobile() {
        return this._isMobile;
    }
}
