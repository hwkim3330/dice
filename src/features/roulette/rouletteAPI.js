// rouletteAPI.js - 룰렛 AppState 연결
// Features 모듈

export class RouletteAPI {
    /**
     * @param {import('../../core/appState.js').App} app 
     */
    constructor(app) {
        this.app = app;
    }

    getMoney() {
        return this.app.getState().chips; // 칩 사용 규칙
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
     * 칩 환급 (취소 등)
     * @param {number} amount
     */
    refund(amount) {
        this.app.addChips(amount);
    }
}
