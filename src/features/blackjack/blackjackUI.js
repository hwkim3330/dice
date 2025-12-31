// blackjackUI.js - 블랙잭 UI 및 게임 흐름 제어
// Features 모듈

import { createDeck, shuffleDeck, calculateScore, determineWinner } from './blackjackLogic.js';
import { BlackjackAPI } from './blackjackAPI.js';

export class BlackjackUI {
    constructor(opts) {
        this.app = opts.app;
        this.api = new BlackjackAPI(this.app);

        // DOM 요소 IDs
        this.modalId = opts.modalId;
        this.backdropId = opts.backdropId;
        this.closeBtnId = opts.closeBtnId;

        // 내부 상태
        this.deck = [];
        this.playerHand = [];
        this.dealerHand = [];
        this.currentBet = 0;
        this.gameActive = false;
        this.dealerHidden = true;
        this.playerAcePref = 11; // 1 or 11

        // DOM 요소 캐시
        this.modal = null;
        this.backdrop = null;
        this.closeBtn = null;
        this.elDealerHand = null;
        this.elPlayerHand = null;
        this.elDealerScore = null;
        this.elPlayerScore = null;
        this.elMessage = null;
        this.elResultTitle = null;
        this.elResultDesc = null;
        this.elChips = null;
        this.elBet = null;
        this.elAceControls = null;
        this.btnAce1 = null;
        this.btnAce11 = null;
        this.panelBetting = null;
        this.panelPlay = null;
        this.panelRestart = null;
        this.btnDeal = null;
        this.btnDouble = null;

        this.isOpen = false;
        this._unsub = null;

        // 바인딩
        this._initElements();
        this._bindEvents();

        // 상태 구독
        this._unsub = this.app.subscribe(() => this._updateInfo());
    }

    _initElements() {
        this.modal = document.getElementById(this.modalId);
        this.backdrop = document.getElementById(this.backdropId);
        this.closeBtn = document.getElementById(this.closeBtnId);

        // 모달 내부 요소 (없으면 리턴)
        if (!this.modal) return;

        this.elDealerHand = this.modal.querySelector('#bj-dealer-hand');
        this.elPlayerHand = this.modal.querySelector('#bj-player-hand');
        this.elDealerScore = this.modal.querySelector('#bj-dealer-score');
        this.elPlayerScore = this.modal.querySelector('#bj-player-score');
        this.elMessage = this.modal.querySelector('#bj-message-box');
        this.elResultTitle = this.modal.querySelector('#bj-game-result');
        this.elResultDesc = this.modal.querySelector('#bj-game-desc');
        this.elChips = this.modal.querySelector('#bj-chips-display');
        this.elBet = this.modal.querySelector('#bj-bet-display');
        this.elAceControls = this.modal.querySelector('#bj-ace-controls');
        this.btnAce1 = this.modal.querySelector('#bj-ace-1');
        this.btnAce11 = this.modal.querySelector('#bj-ace-11');

        this.panelBetting = this.modal.querySelector('#bj-panel-betting');
        this.panelPlay = this.modal.querySelector('#bj-panel-play');
        this.panelRestart = this.modal.querySelector('#bj-panel-restart');

        this.btnDeal = this.modal.querySelector('#bj-btn-deal');
        this.btnDouble = this.modal.querySelector('#bj-btn-double');
    }

    _bindEvents() {
        if (!this.modal) return;

        // 닫기
        const closeHandler = () => this.close();
        if (this.backdrop) this.backdrop.addEventListener('click', closeHandler);
        if (this.closeBtn) this.closeBtn.addEventListener('click', closeHandler);

        // 칩 베팅
        const chips = this.modal.querySelectorAll('.bj-chip');
        chips.forEach(btn => {
            btn.addEventListener('click', () => {
                const amt = Number(btn.dataset.amount);
                this._addBet(amt);
            });
        });

        // 베팅 컨트롤
        const btnReset = this.modal.querySelector('#bj-btn-reset');
        if (btnReset) btnReset.addEventListener('click', () => this._resetBet());
        if (this.btnDeal) this.btnDeal.addEventListener('click', () => this._startGame());

        // 플레이 컨트롤
        const btnHit = this.modal.querySelector('#bj-btn-hit');
        const btnStand = this.modal.querySelector('#bj-btn-stand');
        if (btnHit) btnHit.addEventListener('click', () => this._hit());
        if (btnStand) btnStand.addEventListener('click', () => this._stand());
        if (this.btnDouble) this.btnDouble.addEventListener('click', () => this._doubleDown());

        // Ace 컨트롤
        if (this.btnAce1) this.btnAce1.addEventListener('click', () => this._setAce(1));
        if (this.btnAce11) this.btnAce11.addEventListener('click', () => this._setAce(11));

        // 재시작
        const btnRestart = this.modal.querySelector('#bj-btn-restart');
        if (btnRestart) btnRestart.addEventListener('click', () => this._initGamePhase());
    }

    // --- Core Game Flow ---

    _initGamePhase() {
        this.playerHand = [];
        this.dealerHand = [];
        this.currentBet = 0;
        this.gameActive = false;
        this.playerAcePref = 11;

        // UI 리셋
        this.elDealerHand.innerHTML = '';
        this.elPlayerHand.innerHTML = '';
        this.elDealerScore.style.opacity = '0';
        this.elPlayerScore.style.opacity = '0';

        this.elMessage.classList.remove('show');
        this.elAceControls.classList.add('hidden');

        this.panelBetting.classList.remove('hidden');
        this.panelPlay.classList.add('hidden');
        this.panelRestart.classList.add('hidden');

        this._updateInfo();

        // 덱 보충
        if (this.deck.length < 30) {
            this.deck = shuffleDeck(createDeck());
        }
    }

    _addBet(amount) {
        if (this.api.bet(amount)) {
            this.currentBet += amount;
            this._updateInfo();
        }
    }

    _resetBet() {
        if (this.currentBet > 0) {
            this.api.refund(this.currentBet);
            this.currentBet = 0;
            this._updateInfo();
        }
    }

    _updateInfo() {
        if (this.elChips) this.elChips.textContent = this.app.fmtNum(this.api.getChips());
        if (this.elBet) this.elBet.textContent = this.app.fmtNum(this.currentBet);
        if (this.btnDeal) this.btnDeal.disabled = this.currentBet === 0;
    }

    async _startGame() {
        this.gameActive = true;
        this.dealerHidden = true;
        this.playerAcePref = 11;

        this.panelBetting.classList.add('hidden');
        this.panelPlay.classList.remove('hidden');

        if (this.btnDouble) {
            this.btnDouble.disabled = false;
            this.btnDouble.classList.remove('opacity-50');
        }

        // 딜링 시퀀스
        await this._dealCard(this.playerHand, this.elPlayerHand);
        await this._wait(200);
        await this._dealCard(this.dealerHand, this.elDealerHand);
        await this._wait(200);
        await this._dealCard(this.playerHand, this.elPlayerHand);
        await this._wait(200);
        this._dealHiddenCard();

        this._checkAceControls();
        this._updateScores();

        // 내추럴 블랙잭 체크
        const pScore = calculateScore(this.playerHand, true, this.playerAcePref);
        if (pScore === 21) {
            await this._wait(500);
            this._handleBlackjack();
        }
    }

    async _hit() {
        if (!this.gameActive) return;

        // 더블 불가 처리
        if (this.btnDouble) {
            this.btnDouble.disabled = true;
            this.btnDouble.classList.add('opacity-50');
        }

        await this._dealCard(this.playerHand, this.elPlayerHand);
        this._checkAceControls();
        this._updateScores();

        const pScore = calculateScore(this.playerHand, true, this.playerAcePref);
        if (pScore > 21) {
            this._endGame('dealer', '버스트! 21점을 넘었습니다');
        }
    }

    async _stand() {
        if (!this.gameActive) return;
        this.gameActive = false;
        this.panelPlay.classList.add('hidden');
        this.elAceControls.classList.add('hidden');

        // 히든 오픈
        this.dealerHidden = false;
        const hiddenCard = this.dealerHand[1];
        const hiddenEl = this.elDealerHand.querySelector('#bj-dealer-hidden');
        if (hiddenEl) {
            hiddenEl.outerHTML = this._createCardEl(hiddenCard).outerHTML;
        }
        this._updateScores();
        await this._wait(800);

        // 딜러 플레이 (Soft 17 룰: 17 미만이면 히트)
        while (calculateScore(this.dealerHand, false, 11) < 17) {
            await this._dealCard(this.dealerHand, this.elDealerHand);
            this._updateScores();
            await this._wait(800);
        }

        this._determineResult();
    }

    async _doubleDown() {
        if (!this.gameActive) return;

        // 추가 베팅
        if (!this.api.bet(this.currentBet)) {
            alert("칩이 부족합니다!");
            return;
        }
        this.currentBet *= 2;
        this._updateInfo();

        await this._dealCard(this.playerHand, this.elPlayerHand);
        this._checkAceControls();
        this._updateScores();

        const pScore = calculateScore(this.playerHand, true, this.playerAcePref);
        if (pScore > 21) {
            this._endGame('dealer', '버스트! (더블 다운 실패)');
        } else {
            this._stand();
        }
    }

    // --- Logic Helpers ---

    _handleBlackjack() {
        this.dealerHidden = false;
        const hiddenCard = this.dealerHand[1];
        const hiddenEl = this.elDealerHand.querySelector('#bj-dealer-hidden');
        if (hiddenEl) hiddenEl.outerHTML = this._createCardEl(hiddenCard).outerHTML;
        this._updateScores();

        const dScore = calculateScore(this.dealerHand, false, 11);

        if (dScore === 21) {
            this._endGame('push', '무승부 (Both Blackjack)');
        } else {
            // 3:2 payout
            const winAmt = Math.floor(this.currentBet * 1.5);
            this.currentBet += winAmt; // 원금 + 승리금
            this._endGame('player', '블랙잭 승리! (3:2)', true);
        }
    }

    _determineResult() {
        const pScore = calculateScore(this.playerHand, true, this.playerAcePref);
        const dScore = calculateScore(this.dealerHand, false, 11); // Dealer auto

        const winner = determineWinner(pScore, dScore);

        if (winner === 'player') {
            if (dScore > 21) this._endGame('player', '딜러 버스트! 승리!');
            else this._endGame('player', '승리!');
        } else if (winner === 'dealer') {
            this._endGame('dealer', '패배');
        } else {
            this._endGame('push', '무승부 (Push)');
        }
    }

    _endGame(winner, msg, isBj = false) {
        this.gameActive = false;

        if (winner === 'player') {
            this.elResultTitle.textContent = "YOU WIN!";
            this.elResultTitle.className = "msg-title win";

            // 베팅액 * 2 지급 (이미 currentBet은 doubleDown등으로 조정됨)
            // Blackjack의 경우 위에서 이미 currentBet에 승리금을 더해둠(1.5배)
            // 일반 승리시 2배 지급
            if (!isBj) {
                this.api.payout(this.currentBet * 2);
            } else {
                // BJ는 이미 currentBet에 보상 포함됨
                this.api.payout(this.currentBet);
            }

        } else if (winner === 'dealer') {
            this.elResultTitle.textContent = "YOU LOSE";
            this.elResultTitle.className = "msg-title lose";
            // 칩 지급 없음
        } else {
            this.elResultTitle.textContent = "PUSH";
            this.elResultTitle.className = "msg-title push";
            this.api.refund(this.currentBet);
        }

        this.elResultDesc.textContent = msg;
        this._updateInfo();

        this.elMessage.classList.add('show');
        this.panelPlay.classList.add('hidden');
        this.panelRestart.classList.remove('hidden');
    }

    // --- UI Helpers ---

    _dealCard(hand, container) {
        return new Promise(resolve => {
            const card = this.deck.pop();
            hand.push(card);
            container.appendChild(this._createCardEl(card));
            // 애니메이션 시간 대기 필요없음 (CSS가 처리), 호출자가 wait()
            resolve();
        });
    }

    _dealHiddenCard() {
        const card = this.deck.pop();
        this.dealerHand.push(card);

        const el = document.createElement('div');
        el.className = 'bj-card back deal-anim';
        el.id = 'bj-dealer-hidden';
        this.elDealerHand.appendChild(el);
    }

    _createCardEl(card) {
        const el = document.createElement('div');
        const color = ['♥', '♦'].includes(card.suit) ? 'red' : 'black';
        el.className = `bj-card ${color} deal-anim`;
        el.innerHTML = `
      <div class="corner-tl">${card.value}<br>${card.suit}</div>
      <div class="center-suit">${card.suit}</div>
      <div class="corner-br">${card.value}<br>${card.suit}</div>
    `;
        return el;
    }

    _updateScores() {
        const pScore = calculateScore(this.playerHand, true, this.playerAcePref);
        this.elPlayerScore.textContent = pScore;
        this.elPlayerScore.style.opacity = '1';

        // 애니메이션
        this.elPlayerScore.classList.add('scale-125');
        setTimeout(() => this.elPlayerScore.classList.remove('scale-125'), 200);

        // 딜러 점수
        let dScore;
        if (!this.dealerHidden) {
            dScore = calculateScore(this.dealerHand, false, 11);
        } else {
            // 보이는 카드만
            const visibleVal = this.dealerHand[0].value;
            if (['J', 'Q', 'K'].includes(visibleVal)) dScore = 10;
            else if (visibleVal === 'A') dScore = 11;
            else dScore = parseInt(visibleVal);
        }
        this.elDealerScore.textContent = dScore;
        this.elDealerScore.style.opacity = '1';
    }

    _checkAceControls() {
        const hasAce = this.playerHand.some(c => c.value === 'A');
        if (hasAce && this.gameActive) {
            this.elAceControls.classList.remove('hidden');
            if (this.playerAcePref === 1) {
                this.btnAce1.classList.add('active');
                this.btnAce11.classList.remove('active');
            } else {
                this.btnAce1.classList.remove('active');
                this.btnAce11.classList.add('active');
            }
        } else {
            this.elAceControls.classList.add('hidden');
        }
    }

    _setAce(val) {
        if (!this.gameActive) return;
        this.playerAcePref = val;
        this._checkAceControls();
        this._updateScores();
    }

    _wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // --- Modal Control ---

    open() {
        if (this.isOpen) return;
        this.isOpen = true;

        if (this.modal) {
            this.modal.classList.remove('hidden');
            this.modal.setAttribute('aria-hidden', 'false');
        }

        // 덱 초기화
        this.deck = shuffleDeck(createDeck());
        this._initGamePhase();
    }

    close() {
        if (!this.isOpen) return;
        this.isOpen = false;

        // 게임 중 나가는 경우 베팅금 환불? 보통은 몰수지만 여기선 환불 처리 하자
        if (this.gameActive && this.currentBet > 0) {
            // 진행중 강제 종료
            this.api.refund(this.currentBet);
        } else if (!this.gameActive && this.currentBet > 0) {
            // 베팅만 하고 시작 안한 경우
            this.api.refund(this.currentBet);
        }

        if (document.activeElement && document.activeElement !== document.body) {
            document.activeElement.blur();
        }

        if (this.modal) {
            this.modal.classList.add('hidden');
            this.modal.setAttribute('aria-hidden', 'true');
        }
    }

    bindClose(handler) {
        // 이미 내부 binding에서 처리했으나 외부에서 주입할 경우
        if (this.backdrop) this.backdrop.addEventListener('click', handler);
        if (this.closeBtn) this.closeBtn.addEventListener('click', handler);
    }
}
