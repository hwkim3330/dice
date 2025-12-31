// blackjackAPI.js - 블랙잭 AppState 연결
// Features 모듈

/**
 * AppState와 연결된 블랙잭 API
 */
export class BlackjackAPI {
    /**
     * @param {import('../../core/appState.js').App} app 
     */
    constructor(app) {
        this.app = app;
    }

    getChips() {
        return this.app.getState().chips;
    }

    /**
     * 베팅 (칩 소비)
     * @param {number} amount
     * @returns {boolean} 성공 여부
     */
    bet(amount) {
        return this.app.spendChips(amount);
    }

    /**
     * 승리금 지급
     * @param {number} amount
     */
    payout(amount) {
        this.app.addChips(amount);
    }

    /**
     * 푸시/취소 시 칩 환급
     * @param {number} amount
     */
    refund(amount) {
        this.app.addChips(amount);
    }
}
