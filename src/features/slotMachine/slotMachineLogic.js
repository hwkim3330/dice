// slotMachineLogic.js - 슬롯 머신 계산 로직
// Features 모듈 (UI 공통 계산)

/** 심볼 정의 */
export const SYMBOLS = [
    { id: 'dice', char: '🎲', payout: 50 },
    { id: 'dia', char: '💎', payout: 30 },
    { id: 'bell', char: '🔔', payout: 15 },
    { id: 'grape', char: '🍇', payout: 10 },
    { id: 'cherry', char: '🍒', payout: 2 },
];

/**
 * 랜덤 심볼 반환
 * @returns {typeof SYMBOLS[0]}
 */
export function getRandomSymbol() {
    return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

/**
 * 스핀 결과 생성
 * @param {number} reelCount - 릴 개수
 * @returns {Array<typeof SYMBOLS[0]>}
 */
export function generateSpinResult(reelCount = 3) {
    const result = [];
    for (let i = 0; i < reelCount; i++) {
        result.push(getRandomSymbol());
    }
    return result;
}

/**
 * 승리 계산
 * @param {Array<typeof SYMBOLS[0]>} results - 스핀 결과
 * @param {number} bet - 배팅 금액
 * @returns {{ winChips: number, message: string, color: string }}
 */
export function calculateWin(results, bet) {
    if (results.length < 3) {
        return { winChips: 0, message: '다음 기회에..', color: '#9cf59c' };
    }

    const [s1, s2, s3] = results;

    // 잭팟: 3개 동일
    if (s1.id === s2.id && s2.id === s3.id) {
        return {
            winChips: bet * s1.payout,
            message: `잭팟! [${s1.char}] x${s1.payout}!`,
            color: '#ffff00',
        };
    }

    // 체리 보너스
    let cherryCount = 0;
    if (s1.id === 'cherry') cherryCount++;
    if (s2.id === 'cherry') cherryCount++;
    if (s3.id === 'cherry') cherryCount++;

    if (cherryCount >= 2) {
        return {
            winChips: bet * 2,
            message: '체리 보너스 (2배)',
            color: '#ffaad4',
        };
    }

    if (cherryCount === 1) {
        return {
            winChips: Math.floor(bet * 0.5),
            message: '체리 보상 (50%)',
            color: '#9cf59c',
        };
    }

    // 꽝
    return { winChips: 0, message: '다음 기회에..', color: '#9cf59c' };
}

/**
 * 배팅 옵션
 */
export const BET_OPTIONS = [10, 50, 100];

/**
 * 기본 배팅 금액
 */
export const DEFAULT_BET = 100;
