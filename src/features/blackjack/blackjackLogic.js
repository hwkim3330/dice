// blackjackLogic.js - 블랙잭 순수 게임 로직
// Features 모듈

const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

/**
 * 덱 생성
 * @returns {Array<{suit: string, value: string}>}
 */
export function createDeck(numDecks = 6) {
    let deck = [];
    for (let i = 0; i < numDecks; i++) {
        for (const suit of SUITS) {
            for (const value of VALUES) {
                deck.push({ suit, value });
            }
        }
    }
    return deck;
}

/**
 * 덱 셔플 (Fisher-Yates)
 * @param {Array} deck
 * @returns {Array}
 */
export function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

/**
 * 카드 점수 계산
 * @param {Array} hand
 * @param {boolean} isPlayer
 * @param {number} playerAcePref (1 or 11)
 * @returns {number}
 */
export function calculateScore(hand, isPlayer, playerAcePref) {
    let score = 0;
    let aces = 0;

    for (const card of hand) {
        let val = card.value;
        if (['J', 'Q', 'K'].includes(val)) {
            score += 10;
        } else if (val === 'A') {
            aces++;
            score += 1; // 기본 1
        } else {
            score += parseInt(val);
        }
    }

    if (aces > 0) {
        // 플레이어: 선호도 반영 (단, 버스트가 아니어야 함)
        // 딜러: 무조건 유리하게 (Soft 17 등 룰에 따르지만 여기선 단순화)

        if (isPlayer) {
            // 플레이어는 Ace 하나를 11로 만들 수 있음
            if (playerAcePref === 11) {
                if (score + 10 <= 21) {
                    score += 10;
                }
            }
        } else {
            // 딜러 로직 (Ace를 11로 써도 21 안 넘으면 11로)
            if (score + 10 <= 21) {
                score += 10;
            }
        }
    }

    return score;
}

/**
 * 승패 결정
 * @param {number} pScore
 * @param {number} dScore
 * @returns {'player' | 'dealer' | 'push'}
 */
export function determineWinner(pScore, dScore) {
    if (dScore > 21) return 'player';
    if (pScore > dScore) return 'player';
    if (dScore > pScore) return 'dealer';
    return 'push';
}
