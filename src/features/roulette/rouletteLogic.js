// rouletteLogic.js - 룰렛 순수 게임 로직
// Features 모듈

// 룰렛 휠 순서 (유럽식 0 하나)
export const WHEEL_NUMBERS = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23,
    10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

// 숫자별 색상 (Red)
export const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

// 배당률상수 (원금 포함 지급 배수)
export const PAYOUTS = {
    STRAIGHT: 36, // 단일 숫자 (35+1)
    DOZEN: 3,     // 더즌/컬럼 (2+1)
    EVEN: 2       // 홀짝/색상/범위 (1+1)
};

/**
 * 당첨 숫자 결정
 * @returns {number} 0~36
 */
export function spinWheel() {
    return WHEEL_NUMBERS[Math.floor(Math.random() * WHEEL_NUMBERS.length)];
}

/**
 * 승리 금액 계산
 * @param {number} winningNum 
 * @param {object} currentBets { 'betType': amount }
 * @returns {number} 총 승리금 (원금 포함 아님, 순수 상금 + 원금 처리 여부는 상위 로직에 따름)
 * 참고: 보통 카지노 룰렛 계산은 (배당률 * 베팅금) + 베팅금 돌려받기
 * 여기서는 지급해야 할 총액(Total Payout)을 리턴한다.
 */
export function calculateWinnings(winningNum, currentBets) {
    let winnings = 0;
    const numStr = winningNum.toString();

    // 1. 숫자 배팅 (35배 + 원금1 = 36배)
    if (currentBets[numStr]) winnings += currentBets[numStr] * PAYOUTS.STRAIGHT;

    const isRed = RED_NUMBERS.includes(winningNum);

    if (winningNum !== 0) {
        // 2. 색상 배팅 (1배 + 원금1 = 2배)
        if (isRed && currentBets['red']) winnings += currentBets['red'] * PAYOUTS.EVEN;
        if (!isRed && currentBets['black']) winnings += currentBets['black'] * PAYOUTS.EVEN;

        // 3. 홀짝 배팅 (1배 + 원금1 = 2배)
        const isEven = winningNum % 2 === 0;
        if (isEven && currentBets['even']) winnings += currentBets['even'] * PAYOUTS.EVEN;
        if (!isEven && currentBets['odd']) winnings += currentBets['odd'] * PAYOUTS.EVEN;

        // 4. 범위 배팅 (1배 + 원금1 = 2배)
        if (winningNum <= 18 && currentBets['1to18']) winnings += currentBets['1to18'] * PAYOUTS.EVEN;
        if (winningNum >= 19 && currentBets['19to36']) winnings += currentBets['19to36'] * PAYOUTS.EVEN;

        // 5. Dozen 배팅 (2배 + 원금1 = 3배)
        if (winningNum <= 12 && currentBets['1st12']) winnings += currentBets['1st12'] * PAYOUTS.DOZEN;
        else if (winningNum > 12 && winningNum <= 24 && currentBets['2nd12']) winnings += currentBets['2nd12'] * PAYOUTS.DOZEN;
        else if (winningNum > 24 && currentBets['3rd12']) winnings += currentBets['3rd12'] * PAYOUTS.DOZEN;
    }

    return winnings;
}

/**
 * 휠 회전 각도 계산
 * @param {number} winningNum 
 * @param {string} currentRotationCSS 현재 transform 문자열
 * @returns {number} 목표 회전 각도 (deg)
 */
export function getTargetRotation(winningNum) {
    const winningIndex = WHEEL_NUMBERS.indexOf(winningNum);
    const segmentAngle = 360 / 37;
    const currentAngleOfNumber = winningIndex * segmentAngle;
    const randomOffset = (Math.random() - 0.5) * (segmentAngle * 0.8);

    // 기본 10바퀴 (3600) + 보정
    // 숫자가 12시에 오려면 (360 - 숫자각도)
    return 3600 + (360 - currentAngleOfNumber) + randomOffset;
}
