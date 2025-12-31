// ui.js - UI 컨트롤 (HUD/프롬프트/모달 공통)
// Core 모듈

/**
 * UI 관리자
 */
export class UIManager {
    constructor() {
        // DOM 요소 캐시
        this.elMoney = document.getElementById('money-display');
        this.elLocation = document.getElementById('location-text');
        this.elPrompt = document.getElementById('interaction-prompt');
        this.mobileActionBtn = document.getElementById('mobile-action');
        this.joystickZone = document.getElementById('joystick-zone');
        this.joystickKnob = document.getElementById('joystick-knob');
    }

    /**
     * 위치 텍스트 업데이트
     * @param {string} text
     * @param {string} color
     */
    setLocation(text, color = '#ffffff') {
        if (this.elLocation) {
            this.elLocation.textContent = text;
            this.elLocation.style.color = color;
        }
    }

    /**
     * 상호작용 프롬프트 표시
     * @param {string} text
     */
    showPrompt(text) {
        if (this.elPrompt) {
            const safeText = this._sanitizePromptText(text);
            this.elPrompt.textContent = safeText;
            this.elPrompt.style.display = 'block';
        }
    }

    /**
     * 상호작용 프롬프트 숨김
     */
    hidePrompt() {
        if (this.elPrompt) {
            this.elPrompt.style.display = 'none';
        }
    }

    _sanitizePromptText(text) {
        let value = typeof text === 'string' ? text : '';
        value = value.replace(/[\u0000-\u001f\u007f]/g, '').trim();
        if (!value || value.includes('\ufffd')) {
            return 'F 상호작용';
        }
        return value;
    }

    /**
     * 모바일 액션 버튼 클릭 핸들러 설정
     * @param {() => void} handler
     */
    setMobileActionHandler(handler) {
        if (this.mobileActionBtn) {
            this.mobileActionBtn.onclick = handler;
        }
    }

    /**
     * 조이스틱 위치 업데이트
     * @param {number} mx
     * @param {number} my
     */
    updateJoystickKnob(mx, my) {
        if (this.joystickKnob) {
            this.joystickKnob.style.transform = `translate(calc(-50% + ${mx}px), calc(-50% + ${my}px))`;
        }
    }

    /**
     * 조이스틱 위치 리셋
     */
    resetJoystickKnob() {
        if (this.joystickKnob) {
            this.joystickKnob.style.transform = 'translate(-50%, -50%)';
        }
    }

    /**
     * 조이스틱 영역 표시/숨김
     * @param {boolean} show
     * @param {number} [x]
     * @param {number} [y]
     */
    showJoystickZone(show, x, y) {
        if (!this.joystickZone) return;

        if (show) {
            this.joystickZone.style.display = 'block';
            if (x !== undefined && y !== undefined) {
                this.joystickZone.style.left = (x - 60) + 'px';
                this.joystickZone.style.top = (y - 60) + 'px';
            }
        } else {
            this.joystickZone.style.display = 'none';
        }
    }
}

/**
 * 모달 컨트롤러
 */
export class ModalController {
    /**
     * @param {string} modalId
     * @param {string} backdropId
     * @param {string} closeBtnId
     */
    constructor(modalId, backdropId, closeBtnId) {
        this.modal = document.getElementById(modalId);
        this.backdrop = document.getElementById(backdropId);
        this.closeBtn = document.getElementById(closeBtnId);
        this.isOpen = false;

        /** @type {(() => void) | null} */
        this.onClose = null;
    }

    /**
     * 닫기 이벤트 바인딩
     * @param {() => void} closeHandler
     */
    bindClose(closeHandler) {
        this.onClose = closeHandler;
        if (this.backdrop) {
            this.backdrop.addEventListener('click', closeHandler);
        }
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', closeHandler);
        }
    }

    /**
     * 모달 열기
     */
    open() {
        if (this.isOpen) return;
        this.isOpen = true;

        if (this.modal) {
            this.modal.classList.remove('hidden');
            this.modal.setAttribute('aria-hidden', 'false');
        }
    }

    /**
     * 모달 닫기
     */
    close() {
        if (!this.isOpen) return;
        this.isOpen = false;

        // aria-hidden 경고 방지: 포커스 해제
        if (document.activeElement && document.activeElement !== document.body) {
            document.activeElement.blur();
        }

        if (this.modal) {
            this.modal.classList.add('hidden');
            this.modal.setAttribute('aria-hidden', 'true');
        }
    }
}
