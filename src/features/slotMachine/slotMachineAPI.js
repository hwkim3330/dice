// slotMachineAPI.js - AppState 연결층
// Features 모듈 (칩 spend/add만, 직접 상태변경 금지)

/**
 * 슬롯 머신 API
 * App 상태와 슬롯 머신 로직을 연결
 */
export class SlotMachineAPI {
    /**
     * @param {import('../../core/appState.js').App} app
     */
    constructor(app) {
        this.app = app;
    }

    /**
     * 크레딧(칩) 조회
     * @returns {number}
     */
    getCredit() {
        return this.app.getState().chips;
    }

    /**
     * 배팅 차감
     * @param {number} bet
     * @returns {boolean} 성공 여부
     */
    placeBet(bet) {
        return this.app.spendChips(bet);
    }

    /**
     * 승리금 지급
     * @param {number} chips
     */
    payout(chips) {
        if (chips > 0) {
            this.app.addChips(chips);
        }
    }

    /**
     * 상태 변경 구독
     * @param {(state: { cash: number, chips: number }) => void} fn
     * @returns {() => void} unsubscribe 함수
     */
    subscribe(fn) {
        return this.app.subscribe(fn);
    }

    /**
     * 숫자 포맷팅
     * @param {number} n
     * @returns {string}
     */
    formatNum(n) {
        return this.app.fmtNum(n);
    }
}
