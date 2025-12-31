// baccaratAPI.js - Baccarat API

export class BaccaratAPI {
    constructor(app) {
        this.app = app;
        this._listeners = [];
    }

    subscribe(fn) {
        this._listeners.push(fn);
        return () => {
            const idx = this._listeners.indexOf(fn);
            if (idx >= 0) this._listeners.splice(idx, 1);
        };
    }

    _emit() {
        this._listeners.forEach((fn) => fn());
    }

    getChips() {
        return this.app?.getState?.().chips || 0;
    }

    placeBet(amount) {
        const chips = this.getChips();
        if (chips < amount) return false;
        this.app?.deductChips?.(amount);
        this._emit();
        return true;
    }

    payout(amount) {
        this.app?.addChips?.(amount);
        this._emit();
    }

    formatNum(n) {
        return Number(n || 0).toLocaleString();
    }
}
