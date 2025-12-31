// slotMachineUI.js - 슬롯 머신 UI/애니/렌더
// Features 모듈

import { SYMBOLS, generateSpinResult, calculateWin, DEFAULT_BET } from './slotMachineLogic.js';
import { SlotMachineAPI } from './slotMachineAPI.js';
import { clamp } from '../../core/constants.js';
import { getNickname } from '../../core/profile.js';

/**
 * 슬롯 머신 UI
 */
export class SlotMachineUI {
    /**
     * @param {object} opts
     * @param {string} opts.canvasId
     * @param {import('../../core/appState.js').App} opts.app
     */
    constructor(opts) {
        this._timers = [];
        this._ready = false;

        this.api = new SlotMachineAPI(opts.app);
        this.canvas = document.getElementById(opts.canvasId);
        if (!this.canvas) return;

        this._ready = true;

        this.ctx = this.canvas.getContext('2d');
        this.active = false;

        this.bet = DEFAULT_BET;
        this.state = 'IDLE'; // IDLE, DRAGGING, RELEASING, RELEASING_SPIN, SPINNING

        this.lever = { angle: 0, isDragging: false, dragStartY: 0 };

        this.reels = [
            { symbol: SYMBOLS[0], speed: 0, offset: 0 },
            { symbol: SYMBOLS[0], speed: 0, offset: 0 },
            { symbol: SYMBOLS[0], speed: 0, offset: 0 },
        ];

        this.finalResult = [];

        // DOM 요소
        this.creditEl = document.getElementById('creditDisplay');
        this.winEl = document.getElementById('winDisplay');
        this.msgEl = document.getElementById('msgArea');

        this._bindLeverEvents();
        this._bindBetButtons();

        this._unsub = this.api.subscribe(() => this.refreshCredit());
        this.refreshCredit();
        this.setWin(0);
    }

    /**
     * 활성화/비활성화
     * @param {boolean} v
     */
    setActive(v) {
        if (!this._ready) {
            this.active = !!v;
            this._cancelTimers();
            return;
        }
        this.active = !!v;
        if (this.active) {
            this._hardReset();
        } else {
            this._cancelTimers();
            this.lever.isDragging = false;
            this.state = 'IDLE';
            this.lever.angle = 0;
        }
    }

    _cancelTimers() {
        if (!Array.isArray(this._timers)) this._timers = [];
        this._timers.forEach(clearTimeout);
        this._timers.length = 0;
    }

    _hardReset() {
        this._cancelTimers();
        this.state = 'IDLE';
        this.lever.isDragging = false;
        this.lever.angle = 0;
        this.reels.forEach((reel) => {
            reel.speed = 0;
            reel.offset = 0;
        });
        this.finalResult = null;
        this.setWin(0);
        this.refreshCredit();
        this.setMessage('레버를 당겨주세요!');
    }

    /**
     * 크레딧 새로고침
     */
    refreshCredit() {
        if (!this.creditEl) return;
        this.creditEl.textContent = this.api.formatNum(this.api.getCredit());
    }

    /**
     * 메시지 설정
     * @param {string} txt
     */
    setMessage(txt) {
        if (this.msgEl) this.msgEl.textContent = txt;
    }

    /**
     * 승리금 표시
     * @param {number} amount
     * @param {string} color
     */
    setWin(amount, color = '#9cf59c') {
        if (!this.winEl) return;
        const v = Math.max(0, Math.floor(Number(amount) || 0));
        this.winEl.textContent = this.api.formatNum(v);
        this.winEl.style.color = color;
    }

    /**
     * 배팅 버튼 바인딩
     */
    _bindBetButtons() {
        const btns = document.querySelectorAll('#slot-modal .bet-btn');
        btns.forEach((btn) => {
            btn.addEventListener('click', () => {
                const bet = Number(btn.dataset.bet || '0');
                this._changeBet(bet, btn);
            });
        });
    }

    /**
     * 배팅 변경
     * @param {number} amount
     * @param {HTMLElement} btnEl
     */
    _changeBet(amount, btnEl) {
        if (this.state !== 'IDLE') return;
        this.bet = Math.max(0, Math.floor(Number(amount) || 0));

        document.querySelectorAll('#slot-modal .bet-btn').forEach((b) => b.classList.remove('active'));
        if (btnEl) btnEl.classList.add('active');

        this.setMessage(`배팅: ${this.api.formatNum(this.bet)} 칩`);
    }

    /**
     * 레버 이벤트 바인딩
     */
    _bindLeverEvents() {
        // 마우스
        this.canvas.addEventListener('mousedown', (e) => {
            if (!this.active) return;
            const rect = this.canvas.getBoundingClientRect();
            this._startDrag(e.clientX - rect.left, e.clientY - rect.top);
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.lever.isDragging) return;
            const rect = this.canvas.getBoundingClientRect();
            this._drag(e.clientY - rect.top);
        });

        window.addEventListener('mouseup', () => this._endDrag());

        // 터치
        this.canvas.addEventListener('touchstart', (e) => {
            if (!this.active) return;
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const t = e.touches[0];
            this._startDrag(t.clientX - rect.left, t.clientY - rect.top);
        }, { passive: false });

        window.addEventListener('touchmove', (e) => {
            if (!this.lever.isDragging) return;
            const rect = this.canvas.getBoundingClientRect();
            const t = e.touches[0];
            this._drag(t.clientY - rect.top);
        }, { passive: false });

        window.addEventListener('touchend', () => this._endDrag());
    }

    /**
     * 드래그 시작
     */
    _startDrag(x, y) {
        if (this.state !== 'IDLE') return;
        // 우측 레버 영역
        if (x > 310 && y < 180) {
            this.lever.isDragging = true;
            this.lever.dragStartY = y;
            this.state = 'DRAGGING';
        }
    }

    /**
     * 드래그 중
     */
    _drag(y) {
        const delta = (y - this.lever.dragStartY) * 0.01;
        this.lever.angle = clamp(delta, 0, 1);
    }

    /**
     * 드래그 종료
     */
    _endDrag() {
        if (!this.lever.isDragging) return;
        this.lever.isDragging = false;

        if (this.lever.angle > 0.6) {
            this._pullLeverAction();
        } else {
            this.state = 'RELEASING';
        }
    }

    /**
     * 레버 당기기 액션
     */
    _pullLeverAction() {
        if (!this.active) return;

        // 배팅 차감
        if (!this.api.placeBet(this.bet)) {
            this.setMessage('칩 부족! 환전소에서 환전하세요!');
            this.state = 'RELEASING';
            this.refreshCredit();
            return;
        }

        this.refreshCredit();
        this.state = 'RELEASING_SPIN';
        this.setMessage('행운을 빕니다!');
        this.setWin(0);

        this._startSpin();
    }

    /**
     * 스핀 시작
     */
    _startSpin() {
        this.reels.forEach((reel, i) => {
            reel.speed = 30 + (i * 10);
        });

        this.finalResult = generateSpinResult(3);

        this._timers.push(setTimeout(() => this._stopReel(0), 1000));
        this._timers.push(setTimeout(() => this._stopReel(1), 1800));
        this._timers.push(setTimeout(() => this._stopReel(2), 2600));
    }

    /**
     * 릴 정지
     */
    _stopReel(index) {
        this.reels[index].speed = 0;
        this.reels[index].symbol = this.finalResult[index];

        if (index === 2) {
            this._checkWin();
            this._timers.push(setTimeout(() => { this.state = 'IDLE'; }, 500));
        }
    }

    /**
     * 승리 확인
     */
    _checkWin() {
        const { winChips, message, color } = calculateWin(this.finalResult, this.bet);

        if (winChips > 0) {
            this.api.payout(winChips);
            this.setWin(winChips, color);
        } else {
            this.setWin(0);
        }

        this.setMessage(message);
        this.refreshCredit();

        if (message.includes('잭팟')) {
            const oc = window.__ONLINE__;
            const multi = this.bet > 0 ? Math.floor(winChips / this.bet) : 0;
            oc?.sendSys?.(`${getNickname()}님이 슬롯머신 잭팟 x${multi}배 당첨!`);
        }
    }

    /**
     * 물리 업데이트
     */
    updatePhysics() {
        if (this.state === 'RELEASING' || this.state === 'RELEASING_SPIN' || this.state === 'IDLE') {
            if (this.lever.angle > 0) {
                this.lever.angle -= 0.1;
                if (this.lever.angle < 0) this.lever.angle = 0;
            }
        }

        this.reels.forEach((reel) => {
            if (reel.speed > 0) {
                reel.offset += reel.speed;
                if (Math.random() > 0.5) {
                    reel.symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
                }
            } else {
                reel.offset = 0;
            }
        });
    }

    /**
     * 그리기
     */
    draw() {
        if (!this.active) return;

        const c = this.ctx;
        c.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const mx = 10, my = 15, mw = 300, mh = 200;

        // 1. 바디
        const bodyGrad = c.createLinearGradient(mx, my, mx, my + mh);
        bodyGrad.addColorStop(0, '#b91c1c');
        bodyGrad.addColorStop(1, '#450a0a');
        this._roundRect(mx, my, mw, mh, 15, bodyGrad, '#fbbf24');

        // 2. 로고
        this._roundRect(mx + 15, my + 10, mw - 30, 35, 8, '#222', '#eab308');
        c.fillStyle = '#ffd700';
        c.font = 'bold 18px "Rye", serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText('GOLDEN DICE', mx + mw / 2, my + 28);

        // 3. 릴
        const sx = mx + 20, sy = my + 55, sw = mw - 40, sh = 100;
        this._roundRect(sx, sy, sw, sh, 5, '#000', '#555');

        const reelW = sw / 3;
        c.save();
        c.beginPath();
        c.rect(sx, sy, sw, sh);
        c.clip();

        for (let i = 0; i < 3; i++) {
            const rx = sx + i * reelW;

            const rGrad = c.createLinearGradient(rx, sy, rx + reelW, sy);
            rGrad.addColorStop(0, '#ccc');
            rGrad.addColorStop(0.5, '#fff');
            rGrad.addColorStop(1, '#ccc');
            c.fillStyle = rGrad;
            c.fillRect(rx + 1, sy, reelW - 2, sh);

            if (i > 0) {
                c.fillStyle = '#000';
                c.fillRect(rx, sy, 1, sh);
            }

            const symbol = this.reels[i].symbol;
            c.font = '36px serif';
            c.textAlign = 'center';
            c.textBaseline = 'middle';
            c.fillStyle = '#000';

            let dy = 0;
            if (this.reels[i].speed > 0) dy = (Math.random() * 6 - 3);

            c.fillText(symbol.char, rx + reelW / 2, sy + sh / 2 + dy);
        }
        c.restore();

        // 페이라인
        c.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(sx, sy + sh / 2);
        c.lineTo(sx + sw, sy + sh / 2);
        c.stroke();

        // 4. 레버
        this._drawLever(mx + mw, my + 70);

        // 5. 배당표
        c.fillStyle = '#fbbf24';
        c.font = '9px sans-serif';
        c.textAlign = 'center';
        c.fillText('🎲x50 💎x30 🔔x15 🍇x10 🍒x2', mx + mw / 2, my + mh - 12);
    }

    /**
     * 레버 그리기
     */
    _drawLever(bx, by) {
        const c = this.ctx;
        const angle = this.lever.angle;
        const len = 60;

        c.save();
        c.translate(bx, by);

        // 축
        c.fillStyle = '#444';
        c.beginPath();
        c.arc(0, 0, 10, 0, Math.PI * 2);
        c.fill();
        c.stroke();

        // 막대 회전
        const rad = (Math.PI / 2 * angle) - (Math.PI / 6);
        c.rotate(rad);

        const grad = c.createLinearGradient(0, -3, len, 3);
        grad.addColorStop(0, '#ddd');
        grad.addColorStop(1, '#555');
        c.fillStyle = grad;
        c.fillRect(0, -3, len, 6);

        // 손잡이
        c.translate(len, 0);
        c.fillStyle = '#d00';
        c.shadowColor = 'black';
        c.shadowBlur = 3;
        c.beginPath();
        c.arc(0, 0, 12, 0, Math.PI * 2);
        c.fill();

        c.restore();
    }

    /**
     * 둥근 사각형
     */
    _roundRect(x, y, w, h, r, fill, stroke) {
        const c = this.ctx;
        let rr = r;
        if (w < 2 * rr) rr = w / 2;
        if (h < 2 * rr) rr = h / 2;

        c.beginPath();
        c.moveTo(x + rr, y);
        c.arcTo(x + w, y, x + w, y + h, rr);
        c.arcTo(x + w, y + h, x, y + h, rr);
        c.arcTo(x, y + h, x, y, rr);
        c.arcTo(x, y, x + w, y, rr);
        c.closePath();

        if (fill) {
            c.fillStyle = fill;
            c.fill();
        }
        if (stroke) {
            c.strokeStyle = stroke;
            c.lineWidth = 2;
            c.stroke();
        }
    }

    /**
     * 정리 (구독 해제)
     */
    destroy() {
        if (this._unsub) {
            this._unsub();
            this._unsub = null;
        }
    }
}


