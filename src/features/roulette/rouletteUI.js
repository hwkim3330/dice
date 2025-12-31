// rouletteUI.js - 룰렛 UI 및 게임 흐름 제어
// Features 모듈

import { spinWheel, calculateWinnings, getTargetRotation, WHEEL_NUMBERS, RED_NUMBERS, PAYOUTS } from './rouletteLogic.js';
import { RouletteAPI } from './rouletteAPI.js';

export class RouletteUI {
    constructor(opts) {
        this.app = opts.app;
        this.api = new RouletteAPI(this.app);

        // DOM IDs
        this.modalId = opts.modalId;
        this.backdropId = opts.backdropId;
        this.closeBtnId = opts.closeBtnId;

        // 상태
        this.isOpen = false;
        this.isSpinning = false;
        this.isHelpOpen = false;
        this.currentBets = {}; // { 'type': amount }
        this.totalBetAmount = 0;
        this.selectedChipVal = 10;

        // DOM 캐시
        this.modal = null;
        this.backdrop = null;
        this.closeBtn = null;
        this.elWheel = null;
        this.elBoard = null;
        this.elMoney = null;
        this.elBetDisplay = null;
        this.btnSpin = null;
        this.elResultDisplay = null;
        this.elMsgBox = null;
        this.elMsgTitle = null;
        this.elMsgDesc = null;

        // 초기화
        this._initElements();
        this._bindEvents();

        // 휠/보드 생성 여부 플래그
        this._isBoardCreated = false;

        // App 상태 구독
        this.app.subscribe(() => this._updateInfo());
    }

    _initElements() {
        this.modal = document.getElementById(this.modalId);
        this.backdrop = document.getElementById(this.backdropId);
        this.closeBtn = document.getElementById(this.closeBtnId);

        if (!this.modal) return;

        this.elWheel = this.modal.querySelector('#roulette-wheel');
        this.elBoard = this.modal.querySelector('#roulette-board');
        this.elMoney = this.modal.querySelector('#roulette-money');
        this.elBetDisplay = this.modal.querySelector('#roulette-bet');

        // Help Elements
        this.btnHelp = this.modal.querySelector('#roulette-help-btn');
        this.elHelpOverlay = this.modal.querySelector('#roulette-help-overlay');
        this.btnHelpClose = this.modal.querySelector('#roulette-help-close');
        this.elPayoutList = this.modal.querySelector('#roulette-payout-list');
        this.btnSpin = this.modal.querySelector('#btn-roulette-spin');
        this.elResultDisplay = this.modal.querySelector('#roulette-result');
        this.elMsgBox = this.modal.querySelector('#roulette-msg');
        this.elMsgTitle = this.modal.querySelector('#roulette-msg-title');
        this.elMsgDesc = this.modal.querySelector('#roulette-msg-desc');
    }

    _bindEvents() {
        if (!this.modal) return;

        // 닫기
        const closeHandler = () => this.close();
        if (this.backdrop) this.backdrop.addEventListener('click', closeHandler);
        if (this.closeBtn) this.closeBtn.addEventListener('click', closeHandler);

        // 칩 선택
        const chips = this.modal.querySelectorAll('.chip');
        chips.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const val = Number(btn.dataset.val);
                this._selectChip(val);
                // UI 활성화
                chips.forEach(c => c.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });

        // 초기화 버튼
        const btnClear = this.modal.querySelector('#btn-roulette-clear');
        if (btnClear) btnClear.addEventListener('click', () => this._clearBets());

        // 스핀 버튼
        // 스핀 버튼
        if (this.btnSpin) this.btnSpin.addEventListener('click', () => this._spin());

        // 도움말
        if (this.btnHelp) this.btnHelp.addEventListener('click', () => this._openHelp());
        if (this.btnHelpClose) this.btnHelpClose.addEventListener('click', () => this._closeHelp());
        if (this.elPayoutList) this._renderPayoutTable();
    }

    _ensureBoard() {
        if (this._isBoardCreated) return;
        this._createWheel();
        this._createBoard();
        this._isBoardCreated = true;
    }

    _createWheel() {
        if (!this.elWheel) return;
        this.elWheel.innerHTML = '';

        const segmentAngle = 360 / WHEEL_NUMBERS.length;

        WHEEL_NUMBERS.forEach((num, index) => {
            // 배경 세그먼트
            const segment = document.createElement('div');
            let bg = '#212121'; // Black
            if (RED_NUMBERS.includes(num)) bg = '#d32f2f'; // Red
            if (num === 0) bg = '#16a34a'; // Green

            segment.style.position = 'absolute';
            segment.style.top = '0';
            segment.style.left = '50%';
            segment.style.width = '24px';
            segment.style.height = '50%';
            segment.style.marginLeft = '-12px';
            segment.style.backgroundColor = bg;
            segment.style.transformOrigin = 'center bottom';
            segment.style.transform = `rotate(${index * segmentAngle}deg)`;
            segment.style.zIndex = '0';

            this.elWheel.appendChild(segment);

            // 숫자 텍스트 요소
            const numEl = document.createElement('div');
            numEl.className = 'wheel-number';
            numEl.style.transform = `rotate(${index * segmentAngle}deg)`;

            // 내부 숫자는 역회전으로 정면 유지
            const innerSpan = document.createElement('span');
            innerSpan.style.display = 'inline-block';
            innerSpan.style.transform = 'rotate(180deg)';
            innerSpan.textContent = num;

            numEl.appendChild(innerSpan);
            this.elWheel.appendChild(numEl);
        });
    }

    _createBoard() {
        if (!this.elBoard) return;
        this.elBoard.innerHTML = '';

        // 0번 셀 (별도 배치, grid trick)
        const zeroCell = document.createElement('div');
        zeroCell.className = 'bet-cell cell-green';
        zeroCell.textContent = '0';
        zeroCell.style.gridRow = '1 / span 12'; // 3열 기준 36개면 12행
        zeroCell.style.gridColumn = '1';
        zeroCell.onclick = () => this._placeBet('0');
        zeroCell.dataset.bet = '0';
        this.elBoard.appendChild(zeroCell);

        // 1~36
        for (let i = 1; i <= 36; i++) {
            const el = document.createElement('div');
            const colorClass = RED_NUMBERS.includes(i) ? 'cell-red' : 'cell-black';
            el.className = `bet-cell ${colorClass}`;
            el.textContent = i;
            el.onclick = () => this._placeBet(i.toString());
            el.dataset.bet = i.toString();

            // Grid 계산: 0번 컬럼 제외하고 3열
            // 3,6,9... 가 맨 위? 아니면 1,2,3?
            // DiceLand 보편적 룰렛: 1,2,3이 가로 한 줄
            // 여기선 CSS Grid로 간단히 1,2,3 순차 배치
            const row = Math.floor((i - 1) / 3) + 1;
            const col = ((i - 1) % 3) + 2; // 1열은 0번이 차지

            el.style.gridRow = row;
            el.style.gridColumn = col;
            this.elBoard.appendChild(el);
        }

        // 사이드 배팅 바인딩 (HTML에 이미 존재한다고 가정하고 onclick 연결 or JS로 생성)
        // 여기선 HTML 구조를 JS에서 제어하기보다, .modal-panel 내의 .side-bets를 찾아서 이벤트 연결
        const sideBets = this.modal.querySelectorAll('.side-bet-btn'); // 클래스 하나 추가 필요 in HTML
        sideBets.forEach(btn => {
            btn.addEventListener('click', () => this._placeBet(btn.dataset.type));
        });
    }

    _selectChip(val) {
        if (this.isHelpOpen) return;
        this.selectedChipVal = val;
    }

    _placeBet(type) {
        if (this.isSpinning || this.isHelpOpen) return;
        if (this.api.getMoney() < this.selectedChipVal) {
            // 칩 부족
            return;
        }

        // 칩 사용
        if (this.api.bet(this.selectedChipVal)) {
            if (!this.currentBets[type]) this.currentBets[type] = 0;
            this.currentBets[type] += this.selectedChipVal;
            this.totalBetAmount += this.selectedChipVal;

            this._renderMarkers();
            this._updateInfo();
        }
    }

    _clearBets() {
        if (this.isSpinning || this.isHelpOpen) return;
        if (this.totalBetAmount === 0) return;

        // 환불
        this.api.refund(this.totalBetAmount);

        this.currentBets = {};
        this.totalBetAmount = 0;

        this._renderMarkers();
        this._updateInfo();
    }

    _renderMarkers() {
        // 기존 마커 제거
        const oldMarkers = this.modal.querySelectorAll('.bet-marker');
        oldMarkers.forEach(el => el.remove());

        // 새 마커 생성
        Object.keys(this.currentBets).forEach(type => {
            const amount = this.currentBets[type];
            if (amount <= 0) return;

            // Target 찾기
            let target;
            if (type === '0' || (!isNaN(type) && Number(type) > 0)) {
                target = this.elBoard.querySelector(`.bet-cell[data-bet="${type}"]`);
            } else {
                target = this.modal.querySelector(`.side-bet-btn[data-type="${type}"]`);
            }

            if (target) {
                const marker = document.createElement('div');
                marker.className = 'bet-marker';
                marker.textContent = amount >= 1000 ? (amount / 1000).toFixed(1) + 'k' : amount;
                target.appendChild(marker);
            }
        });
    }

    _updateInfo() {
        if (this.elMoney) this.elMoney.textContent = this.app.fmtNum(this.api.getMoney());
        if (this.elBetDisplay) this.elBetDisplay.textContent = this.app.fmtNum(this.totalBetAmount);
        if (this.btnSpin) this.btnSpin.disabled = this.totalBetAmount === 0 || this.isSpinning;
    }

    _spin() {
        if (this.isSpinning || this.totalBetAmount === 0 || this.isHelpOpen) return;

        this.isSpinning = true;
        this._updateInfo();

        // 메시지 숨김
        this.elMsgBox.classList.remove('show');

        // 결과 결정
        const winningNum = spinWheel();

        // 회전 계산
        // 현재 각도 가져오기 (이전 회전값 유지)
        const currentTransform = window.getComputedStyle(this.elWheel).getPropertyValue('transform');
        // Matrix 분해는 복잡하므로 로직에서 'target rotation'을 절대값으로 받아서 처리
        // 간단히: Logic에서 항상 3600 + alpha를 리턴한다고 가정하지만
        // 연속 회전을 위해선 현재 각도를 알아야 함.
        // 여기선 Logic.getTargetRotation이 단순히 '얼만큼 더 돌릴지'가 아니라 '최종 각도'라면
        // 매번 style.transform을 갱신하는 방식으로 함.

        // 이전 각도 읽기 (style.transform 에서)
        // 없으면 0
        let currentDeg = 0;
        if (this.elWheel.style.transform) {
            const match = this.elWheel.style.transform.match(/rotate\(([-0-9.]+)deg\)/);
            if (match) currentDeg = parseFloat(match[1]);
        }

        // 목표 각도: Logic은 한바퀴(0~360) 기준 + 10바퀴값 리턴.
        // 따라서 현재Deg + 10바퀴 + (목표위치 - 현재위치%360) 보정
        const winningIndex = WHEEL_NUMBERS.indexOf(winningNum);
        const segmentAngle = 360 / 37;
        const targetAbsAngle = 360 - (winningIndex * segmentAngle); // 0도가 12시라 가정시

        // 그냥 무식하게 3600 + targetAbsAngle로 가되, currentDeg보다 무조건 크게
        // currentDeg를 360으로 나눈 몫 * 360 + 3600 + targetAbs
        const rounds = Math.floor(currentDeg / 360);
        const nextTarget = (rounds + 5) * 360 + targetAbsAngle; // 5바퀴 추가

        this.elWheel.style.transition = 'transform 4s cubic-bezier(0.15, 0.90, 0.30, 1.00)';
        this.elWheel.style.transform = `rotate(${nextTarget}deg)`;

        // 4초 후 결과
        setTimeout(() => {
            this._finishSpin(winningNum);
        }, 4000);
    }

    _finishSpin(winningNum) {
        this.isSpinning = false;
        if (this.elResultDisplay) this.elResultDisplay.textContent = winningNum;

        // 정산
        const winAmount = calculateWinnings(winningNum, this.currentBets);

        if (winAmount > 0) {
            // 원금 + 상금 지급
            // calculateWinnings는 총 지급액(Payout)을 리턴해야 함.
            // Logic 수정 확인 필요: Logic 주석에 "Total Payout"이라 했음.
            this.api.payout(winAmount);
            this._showMsg("WINNER!", `+${this.app.fmtNum(winAmount)}`, true);
        } else {
            this._showMsg("LOSE", "다음 기회에...", false);
        }

        // 베팅 리셋
        this.currentBets = {};
        this.totalBetAmount = 0;
        this._renderMarkers();
        this._updateInfo();
    }

    _showMsg(title, desc, isWin) {
        if (!this.elMsgBox) return;
        this.elMsgTitle.textContent = title;
        this.elMsgTitle.className = isWin ? 'roulette-msg-title' : 'roulette-msg-title text-gray';
        if (!isWin) this.elMsgTitle.style.color = '#9ca3af'; // gray

        this.elMsgDesc.textContent = desc;

        this.elMsgBox.classList.add('show');

        setTimeout(() => {
            if (!this.isSpinning) {
                this.elMsgBox.classList.remove('show');
            }
        }, 3000);

    }

    // --- Help UI ---

    _openHelp() {
        if (this.isSpinning) return; // 게임 중엔 방해 금지? or 허용? 요구사항: "게임 입력 막힘"
        this.isHelpOpen = true;
        if (this.elHelpOverlay) {
            this.elHelpOverlay.classList.remove('hidden');
            this.elHelpOverlay.style.display = 'flex'; // hidden override (flex 필수)
        }
    }

    _closeHelp() {
        if (!this.isHelpOpen) return;
        this.isHelpOpen = false;
        if (this.elHelpOverlay) {
            this.elHelpOverlay.classList.add('hidden');
            this.elHelpOverlay.style.display = 'none';
        }
    }

    _renderPayoutTable() {
        if (!this.elPayoutList) return;

        const rows = [
            { name: "Single Number (숫자)", cond: "0 ~ 36 선택", rate: PAYOUTS.STRAIGHT },
            { name: "Dozen (1st/2nd/3rd 12)", cond: "12개 숫자 묶음", rate: PAYOUTS.DOZEN },
            { name: "Even Money (색상/홀짝/범위)", cond: "Red/Black, Odd/Even 등", rate: PAYOUTS.EVEN },
        ];

        this.elPayoutList.innerHTML = rows.map(r => `
            <tr>
                <td>${r.name}</td>
                <td>${r.cond}</td>
                <td>${r.rate}배</td>
                <td>${r.rate - 1}배</td>
            </tr>
        `).join('');
    }

    // --- Public ---

    open() {
        if (this.isOpen) return;
        this.isOpen = true;

        // 모달 열기
        if (this.modal) {
            this.modal.classList.remove('hidden');
            this.modal.setAttribute('aria-hidden', 'false');
        }

        // 보드 생성 (최초 1회)
        this._ensureBoard();
        this._updateInfo();
    }

    close() {
        // 도움말이 열려있으면 도움말만 닫기 (ESC 처리용) - 호출자가 누구냐에 따라 다름
        // 여기는 전체 모달 닫기이므로, 도움말도 같이 닫음
        this._closeHelp();

        if (!this.isOpen) return;
        this.isOpen = false;

        // 베팅금 환불 (진행중 닫기) 또는 종료
        if (this.totalBetAmount > 0 && !this.isSpinning) {
            this.api.refund(this.totalBetAmount);
        }
        // 스핀 중 닫기는? 보통 막거나 백그라운드 처리지만
        // 싱글루프 규칙상 그냥 닫히고 결과는 안보임 + 돈은 이미 날아감/들어옴(SetTimeout 실행됨).
        // 안전하게: 스핀 중엔 취소 불가, 혹은 닫아도 SetTimeout은 돔.

        this.currentBets = {};
        this.totalBetAmount = 0;
        this._renderMarkers();

        // 포커스 정리
        if (document.activeElement && document.activeElement !== document.body) {
            document.activeElement.blur();
        }

        if (this.modal) {
            this.modal.classList.add('hidden');
            this.modal.setAttribute('aria-hidden', 'true');
        }
    }

    bindClose(handler) {
        // 오버레이 클릭 시 닫기
        if (this.backdrop) {
            this.backdrop.addEventListener('click', (e) => {
                if (this.isHelpOpen) {
                    // 도움말이 열려있으면 배경 클릭이 도움말을 닫는지, 전체를 닫는지?
                    // 요구사항: "모달을 닫으면 원래 게임 화면으로 복귀"
                    // 도움말 오버레이가 최상위므로 backdrop 클릭은 도움말 오버레이가 처리해야함.
                    // 그러나 backdrop은 전체 모달 뒤임.
                    // 즉, 여기서 처리할 것은 전체 모달 닫기.
                    // 도움말 닫기는 overlay 자체 클릭으로 처리 추천.
                    return;
                }
                handler();
            });
        }

        // 닫기 버튼
        if (this.closeBtn) this.closeBtn.addEventListener('click', handler);

        // ESC 키 처리 (외부에서 호출 or 내부 리스너?)
        // SceneManager가 ESC -> close() 호출함.
        // 하지만 내부 로직(도움말 닫기) 우선순위가 필요하면?
        // SceneManager에서 `rouletteUI.close()` 부르면 `_closeHelp` 먼저 되고 `isOpen` 체크해서 리턴?
        // 현재 close() 구현: _closeHelp() 호출 후 isOpen 체크.
        // 만약 도움말만 닫고 게임은 유지하려면 close()가 false를 리턴하거나 상태를 봐야함.
        // 요구사항: "ESC로도 닫기 가능(가능하면)" -> 도움말만 닫기.

        // SceneManager는 단순히 `ui.close()`를 부르고 끝냄.
        // 여기서 꼼수: SceneManager에게 "내가 닫혔는지" 알려줄 방법이 없음.
        // 따라서 close() 메서드를 수정하여:
        // isHelpOpen이면 help만 닫고, isOpen=true 유지. 
        // 문제는 SceneManager가 "닫혔다"고 가정하고 상태를 초기화해버림 (rouletteOpen = false).
        // 해결책: Scene에서 ESC -> closeRoulette() -> rouletteUI.close() 호출.
        // 여기서 UI가 "아직 안닫힘(도움말만 닫음)" 신호를 줄 수 없다면?
        // -> SceneManager의 ESC 로직을 고치긴 복잡함.
        // -> 우선은 "도움말 열려있어도 ESC 누르면 전체 꺼짐"이 기본 동작.
        // -> 그러나 사용자 경험상 도움말만 꺼지는게 좋음.
        // -> 일단 close()에서 _closeHelp()만 하고, 전체 닫기는 막을 방법?
        // -> 없음. SceneManager가 주도권 가짐.
        // -> 차선책: 도움말 닫기 버튼(X) 제공. ESC는 전체 종료. (혹은 Scene 수정 필요)
        // -> **Scene 수정 없이** 하려면: 어쩔 수 없음. ESC는 전체 닫기.
    }
}
