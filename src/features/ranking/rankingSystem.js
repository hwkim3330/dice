// rankingSystem.js - 랭킹 시스템 (플레이어 단독)
import { App } from '../../core/appState.js';
import { CONFIG } from '../../core/constants.js';
import { getNickname } from '../../core/profile.js';

const formatRankWon = (n) => {
    const value = Math.max(0, Math.floor(Number(n) || 0));

    if (value < 10000) {
        return `${value.toLocaleString('ko-KR')}원`;
    }

    if (value < 100000000) {
        const man = Math.floor(value / 10000);
        return `${man.toLocaleString('ko-KR')}만원`;
    }

    if (value < 1000000000000) {
        const eok = Math.floor(value / 100000000);
        const rem = value % 100000000;
        if (rem < 10000) return `${eok}억`;
        const remMan = Math.floor(rem / 10000);
        return `${eok}억 ${remMan.toLocaleString('ko-KR')}만원`;
    }

    const jo = Math.floor(value / 1000000000000);
    const remEok = Math.floor((value % 1000000000000) / 100000000);
    if (remEok > 0) return `${jo}조 ${remEok}억`;
    return `${jo}조`;
};

export class RankingSystem {
    constructor() {
        this.el = document.getElementById('ranking-list');
        this.container = document.getElementById('ranking-panel');
        this.toggleBtn = document.getElementById('rank-toggle');
        // 더미 데이터 제거
        this.dummyData = [];
        this.unsub = null;
        this.onlineClient = null;
        this._boundUpdate = () => this.render();
    }

    init({ onlineClient } = {}) {
        this.onlineClient = onlineClient || null;
        // App 상태 구독
        this.unsub = App.subscribe(() => this.render());
        if (this.toggleBtn) {
            this.toggleBtn.addEventListener('click', () => {
                if (!this.container) return;
                const nextCollapsed = !this.container.classList.contains('collapsed');
                this.container.classList.toggle('collapsed', nextCollapsed);
                this.toggleBtn.textContent = nextCollapsed ? '열기' : '닫기';
            });
        }
        if (this.onlineClient?.addEventListener) {
            this.onlineClient.addEventListener('roster', this._boundUpdate);
            this.onlineClient.addEventListener('player_update', this._boundUpdate);
            this.onlineClient.addEventListener('player_remove', this._boundUpdate);
            this.onlineClient.addEventListener('connected', this._boundUpdate);
            this.onlineClient.addEventListener('disconnected', this._boundUpdate);
        }
        // 초기 렌더링
        this.render();
    }

    render() {
        if (!this.el) return;

        const playerCash = App.getState().cash;
        const playerChips = App.getState().chips;
        const totalWon = playerCash + (playerChips * CONFIG.RATE_WON_PER_CHIP);

        const all = [];
        const myId = this.onlineClient?.playerId || null;
        all.push({
            id: myId || 'local',
            name: `${getNickname()} (Player)`,
            totalWon,
            isMe: true,
        });

        const remotes = this.onlineClient?.listPlayers?.() || [];
        for (const rp of remotes) {
            if (!rp || !rp.id) continue;
            if (myId && String(rp.id) === String(myId)) continue;
            const cash = Number(rp.cash) || 0;
            all.push({
                id: rp.id,
                name: rp.nickname || 'Guest',
                totalWon: cash,
                isMe: false,
            });
        }

        const sorted = all.sort((a, b) => b.totalWon - a.totalWon);
        const maxItems = 10;
        let trimmed = sorted.slice(0, maxItems);

        const meIndex = sorted.findIndex((item) => item.isMe);
        if (meIndex >= maxItems) {
            trimmed = trimmed.slice(0, maxItems - 1);
            trimmed.push(sorted[meIndex]);
        }

        // 2. 렌더링
        let html = '';
        trimmed.forEach((item, idx) => {
            html += this._createItemHTML(idx + 1, item);
        });

        this.el.innerHTML = html;
    }

    _createItemHTML(rank, item) {
        const isTop = rank <= 3 ? `top${rank}` : '';
        const highlight = item.isMe ? 'highlight' : '';
        const money = formatRankWon(item.totalWon);

        return `
            <li class="ranking-item ${highlight}">
                <span class="rank-idx ${isTop}">${rank}</span>
                <span class="rank-name">${item.name}</span>
                <span class="rank-val">${money}</span>
            </li>
        `;
    }
}
