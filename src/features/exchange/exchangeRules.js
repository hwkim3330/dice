// exchangeRules.js - 환전 순수 로직
// Features 모듈 (UI 의존 금지)

import { CONFIG } from '../../core/constants.js';

/**
 * 환율 (원 / 칩)
 */
export const RATE = CONFIG.RATE_WON_PER_CHIP;

/**
 * 환전 옵션 (칩 단위)
 */
export const EXCHANGE_OPTIONS = [10, 50, 100];

/**
 * 현금 → 칩 환전 검증
 * @param {number} chips - 환전할 칩 수
 * @param {number} currentCash - 현재 현금
 * @returns {{ valid: boolean, cost: number }}
 */
export function validateCashToChips(chips, currentCash) {
    const cost = chips * RATE;
    return {
        valid: chips > 0 && currentCash >= cost,
        cost,
    };
}

/**
 * 칩 → 현금 환전 검증
 * @param {number} chips - 환전할 칩 수
 * @param {number} currentChips - 현재 칩
 * @returns {{ valid: boolean, gain: number }}
 */
export function validateChipsToCash(chips, currentChips) {
    const gain = chips * RATE;
    return {
        valid: chips > 0 && currentChips >= chips,
        gain,
    };
}

/**
 * 칩을 현금으로 변환
 * @param {number} chips
 * @returns {number}
 */
export function chipsToWon(chips) {
    return chips * RATE;
}

/**
 * 현금을 칩으로 변환
 * @param {number} won
 * @returns {number}
 */
export function wonToChips(won) {
    return Math.floor(won / RATE);
}
