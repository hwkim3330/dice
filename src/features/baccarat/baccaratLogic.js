// baccaratLogic.js - Baccarat game logic

export const CARD_SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
export const CARD_VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const BET_TYPES = {
    PLAYER: 'player',
    BANKER: 'banker',
    TIE: 'tie',
};

export const PAYOUTS = {
    [BET_TYPES.PLAYER]: 2.0,
    [BET_TYPES.BANKER]: 1.95,
    [BET_TYPES.TIE]: 9.0,
};

export function createDeck() {
    const deck = [];
    for (const suit of CARD_SUITS) {
        for (const value of CARD_VALUES) {
            deck.push({ suit, value });
        }
    }
    return deck;
}

export function shuffleDeck(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export function getCardValue(card) {
    if (['10', 'J', 'Q', 'K'].includes(card.value)) {
        return 0;
    }
    if (card.value === 'A') {
        return 1;
    }
    return parseInt(card.value, 10);
}

export function calculateHandTotal(cards) {
    const total = cards.reduce((sum, card) => sum + getCardValue(card), 0);
    return total % 10;
}

export function shouldPlayerDrawThird(playerTotal) {
    return playerTotal <= 5;
}

export function shouldBankerDrawThird(bankerTotal, playerThirdCard) {
    if (bankerTotal <= 2) return true;
    if (bankerTotal === 3) return playerThirdCard !== 8;
    if (bankerTotal === 4) return [2, 3, 4, 5, 6, 7].includes(playerThirdCard);
    if (bankerTotal === 5) return [4, 5, 6, 7].includes(playerThirdCard);
    if (bankerTotal === 6) return [6, 7].includes(playerThirdCard);
    return false;
}

export function playRound(deck) {
    let index = 0;
    const playerHand = [deck[index++], deck[index++]];
    const bankerHand = [deck[index++], deck[index++]];

    let playerTotal = calculateHandTotal(playerHand);
    let bankerTotal = calculateHandTotal(bankerHand);

    const isNatural = playerTotal >= 8 || bankerTotal >= 8;

    if (!isNatural) {
        let playerThirdCardValue = null;

        if (shouldPlayerDrawThird(playerTotal)) {
            const thirdCard = deck[index++];
            playerHand.push(thirdCard);
            playerTotal = calculateHandTotal(playerHand);
            playerThirdCardValue = getCardValue(thirdCard);
        }

        if (playerThirdCardValue === null) {
            if (bankerTotal <= 5) {
                bankerHand.push(deck[index++]);
                bankerTotal = calculateHandTotal(bankerHand);
            }
        } else {
            if (shouldBankerDrawThird(bankerTotal, playerThirdCardValue)) {
                bankerHand.push(deck[index++]);
                bankerTotal = calculateHandTotal(bankerHand);
            }
        }
    }

    let winner;
    if (playerTotal > bankerTotal) {
        winner = BET_TYPES.PLAYER;
    } else if (bankerTotal > playerTotal) {
        winner = BET_TYPES.BANKER;
    } else {
        winner = BET_TYPES.TIE;
    }

    return {
        playerHand,
        bankerHand,
        playerTotal,
        bankerTotal,
        winner,
        isNatural,
        remainingDeck: deck.slice(index),
    };
}

export function calculateWinnings(betType, betAmount, winner) {
    if (winner === BET_TYPES.TIE && betType !== BET_TYPES.TIE) {
        return betAmount;
    }

    if (betType === winner) {
        return Math.floor(betAmount * PAYOUTS[betType]);
    }

    return 0;
}

export function getResultMessage(winner, betType, winnings, betAmount) {
    const betNames = {
        [BET_TYPES.PLAYER]: '플레이어',
        [BET_TYPES.BANKER]: '뱅커',
        [BET_TYPES.TIE]: '타이',
    };

    if (winner === BET_TYPES.TIE && betType !== BET_TYPES.TIE) {
        return { title: 'TIE', desc: '무승부! 베팅금 반환', color: '#fbbf24' };
    }

    if (betType === winner) {
        const profit = winnings - betAmount;
        return { title: 'WIN!', desc: `${betNames[winner]} 승리! +${profit}칩`, color: '#4ade80' };
    }

    return { title: 'LOSE', desc: `${betNames[winner]} 승리`, color: '#ef4444' };
}
