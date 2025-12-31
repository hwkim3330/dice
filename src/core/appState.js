// appState.js
import { loadState, saveState, clearState } from './storage.js';
import { CONFIG } from './constants.js';

const RATE_WON_PER_CHIP = CONFIG.RATE_WON_PER_CHIP;

function clampMoney(v) {
    if (!Number.isFinite(v)) return 0;
    return Math.max(0, Math.floor(v));
}

function clampChips(v) {
    if (!Number.isFinite(v)) return 0;
    return Math.max(0, Math.floor(v));
}

const formatWon = (n) => `${clampMoney(n).toLocaleString('ko-KR')}원`;
const formatNum = (n) => clampChips(n).toLocaleString('ko-KR');

export const App = {
    RATE_WON_PER_CHIP,
    _moneyEl: null,
    _chipEl: null,

    _state: {
        cash: 500000,
        chips: 0,
        resetUsed: false,
    },
    _subs: new Set(),

    init({ moneyEl, chipEl }) {
        this._moneyEl = moneyEl || null;
        this._chipEl = chipEl || null;

        const saved = loadState();
        if (saved) {
            this._state = { ...this._state, ...saved };
        }
        this._render();
        this._notify();
    },

    subscribe(fn) {
        if (typeof fn !== 'function') return () => {};
        this._subs.add(fn);
        return () => this._subs.delete(fn);
    },

    getState() {
        return { ...this._state };
    },

    commit(patch) {
        const next = { ...this._state, ...patch };

        next.cash = clampMoney(next.cash);
        next.chips = clampChips(next.chips);
        next.resetUsed = !!next.resetUsed;

        this._state = next;
        saveState(this._state);
        this._render();
        this._notify();
    },

    reset() {
        if (this._state.resetUsed) return false;

        this.commit({
            cash: 100000,
            chips: 0,
            resetUsed: true
        });

        return true;
    },

    resetForNewRun() {
        this.commit({
            cash: 100000,
            chips: 0,
            resetUsed: false
        });
    },

    zeroOutWallet() {
        this.commit({
            cash: 0,
            chips: 0,
            resetUsed: false
        });
    },

    clearAll() {
        clearState();
        this._state = {
            cash: 500000,
            chips: 0,
            resetUsed: false
        };
        this._render();
        this._notify();
    },

    addCash(amount) {
        const a = clampMoney(amount);
        if (a <= 0) return;
        this.commit({ cash: this._state.cash + a });
    },

    addChips(amount) {
        const a = clampChips(amount);
        if (a <= 0) return;
        this.commit({ chips: this._state.chips + a });
    },

    spendCash(amount) {
        const a = clampMoney(amount);
        if (a <= 0) return true;
        if (this._state.cash < a) return false;
        this.commit({ cash: this._state.cash - a });
        return true;
    },

    spendChips(amount) {
        const a = clampChips(amount);
        if (a <= 0) return true;
        if (this._state.chips < a) return false;
        this.commit({ chips: this._state.chips - a });
        return true;
    },

    exchangeCashToChips(chips) {
        const c = clampChips(chips);
        const cost = c * RATE_WON_PER_CHIP;
        if (c <= 0) return false;
        if (this._state.cash < cost) return false;

        this.commit({ cash: this._state.cash - cost, chips: this._state.chips + c });
        return true;
    },

    exchangeChipsToCash(chips) {
        const c = clampChips(chips);
        const gain = c * RATE_WON_PER_CHIP;
        if (c <= 0) return false;
        if (this._state.chips < c) return false;

        this.commit({ chips: this._state.chips - c, cash: this._state.cash + gain });
        return true;
    },

    _render() {
        if (this._moneyEl) {
            this._moneyEl.textContent = formatWon(this._state.cash);
        }
        if (this._chipEl) {
            this._chipEl.textContent = formatNum(this._state.chips);
        }
    },

    _notify() {
        const snap = this.getState();
        for (const fn of this._subs) {
            try {
                fn(snap);
            } catch {
                /* ignore */
            }
        }
    },

    fmtWon: formatWon,
    fmtNum: formatNum,
};
