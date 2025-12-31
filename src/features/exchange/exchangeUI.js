// exchangeUI.js - 환전소 UI
// Features 모듈

/**
 * 환전소 UI
 */
export class ExchangeUI {
    /**
     * @param {object} opts
     * @param {import('../../core/appState.js').App} opts.app
     * @param {string} opts.modalId
     * @param {string} opts.backdropId
     * @param {string} opts.closeBtnId
     * @param {string} opts.cashElId
     * @param {string} opts.chipsElId
     * @param {string} opts.msgElId
     */
    constructor(opts) {
        this.app = opts.app;

        this.modal = document.getElementById(opts.modalId);
        this.backdrop = document.getElementById(opts.backdropId);
        this.closeBtn = document.getElementById(opts.closeBtnId);

        this.cashEl = document.getElementById(opts.cashElId);
        this.chipsEl = document.getElementById(opts.chipsElId);
        this.msgEl = document.getElementById(opts.msgElId);
        this.chipValueEl = document.getElementById('exchangeChipValue');

        this.isOpen = false;
        this._unsub = null;

        this._bind();
        this._unsub = this.app.subscribe(() => this._render());
        this._render();
    }

    /**
     * 이벤트 바인딩
     */
    _bind() {
        // 버튼 바인딩 (exchange-modal 내부만)
        const btns = document.querySelectorAll('#exchange-modal .xchg-btn');
        btns.forEach((btn) => {
            btn.addEventListener('click', () => {
                const dir = String(btn.dataset.dir || '');
                const amount = Number(btn.dataset.amount || '0');
                this._exchange(dir, amount);
            });
        });
    }

    /**
     * 환전 처리
     * @param {'C2H' | 'H2C'} dir
     * @param {number} chips
     */
    _exchange(dir, chips) {
        if (!this.isOpen) return;

        let ok = false;
        if (dir === 'C2H') ok = this.app.exchangeCashToChips(chips);
        if (dir === 'H2C') ok = this.app.exchangeChipsToCash(chips);

        if (!this.msgEl) return;

        if (ok) {
            if (dir === 'C2H') {
                const cost = chips * this.app.RATE_WON_PER_CHIP;
                this.msgEl.textContent = `-${this.app.fmtWon(cost)} / +${this.app.fmtNum(chips)}칩`;
            } else {
                const gain = chips * this.app.RATE_WON_PER_CHIP;
                this.msgEl.textContent = `-${this.app.fmtNum(chips)}칩 / +${this.app.fmtWon(gain)}`;
            }
        } else {
            this.msgEl.textContent = '잔액/칩부족';
        }
    }

    /**
     * UI 렌더링
     */
    _render() {
        const { cash, chips } = this.app.getState();
        if (this.cashEl) this.cashEl.textContent = this.app.fmtWon(cash);
        if (this.chipsEl) this.chipsEl.textContent = this.app.fmtNum(chips);
        if (this.chipValueEl) {
            const chipValueWon = chips * this.app.RATE_WON_PER_CHIP;
            this.chipValueEl.textContent = this.app.fmtWon(chipValueWon);
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
        if (this.msgEl) this.msgEl.textContent = '환전할 금액(칩)을 선택하세요!';
        this._render();
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

    /**
     * 닫기 핸들러 바인딩
     * @param {() => void} handler
     */
    bindClose(handler) {
        if (this.backdrop) this.backdrop.addEventListener('click', handler);
        if (this.closeBtn) this.closeBtn.addEventListener('click', handler);
    }

    /**
     * 정리
     */
    destroy() {
        if (this._unsub) {
            this._unsub();
            this._unsub = null;
        }
    }
}
