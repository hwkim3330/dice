// playerListOverlay.js - TAB player list overlay (stub for future online)

import { getNickname } from '../../core/profile.js';
import { getClientIpLike, getIpLikeFromId } from '../../net/netIdentity.js';

function isModalOpen() {
    return !!document.querySelector('.modal:not(.hidden)');
}

export function initPlayerListOverlay({ app, onlineClient }) {
    const overlay = document.getElementById('playerlist-overlay');
    const bodyEl = document.getElementById('playerlist-body');
    const subEl = document.getElementById('playerlist-sub');

    if (!overlay || !bodyEl) return;

    function formatCash(v) {
        const n = Number.isFinite(v) ? v : 0;
        return `${n.toLocaleString('ko-KR')}원`;
    }

    function render() {
        const state = app?.getState?.() || { cash: 0 };
        const local = {
            ip: getClientIpLike(),
            name: getNickname() || 'Player',
            cash: state.cash,
            status: 'LOCAL',
        };

        const remotes = onlineClient?.listPlayers?.() || [];
        const rows = [local, ...remotes.map((p) => ({
            ip: p.ip || (p.id ? getIpLikeFromId(p.id) : 'unknown'),
            name: p.nickname || 'Guest',
            cash: Number.isFinite(p.cash) ? p.cash : 0,
            status: onlineClient?.isConnected?.() ? 'ONLINE' : 'OFFLINE',
        }))];

        bodyEl.textContent = '';
        rows.forEach((row) => {
            const el = document.createElement('div');
            el.className = 'playerlist-row';

            const ip = document.createElement('div');
            ip.className = 'playerlist-col ip';
            ip.textContent = row.ip;

            const name = document.createElement('div');
            name.className = 'playerlist-col name';
            name.textContent = row.name;

            const cash = document.createElement('div');
            cash.className = 'playerlist-col cash';
            cash.textContent = formatCash(row.cash);

            const status = document.createElement('div');
            status.className = `playerlist-col status ${String(row.status).toLowerCase()}`;
            status.textContent = row.status;

            el.appendChild(ip);
            el.appendChild(name);
            el.appendChild(cash);
            el.appendChild(status);
            bodyEl.appendChild(el);
        });

        const total = onlineClient?.getPlayerCount?.() ?? 0;
        const max = onlineClient?.getMaxPlayers?.() ?? 50;
        if (subEl) subEl.textContent = `${total}/${max}명`;
    }

    function open() {
        overlay.classList.remove('hidden');
        overlay.setAttribute('aria-hidden', 'false');
        render();
    }

    function close() {
        overlay.classList.add('hidden');
        overlay.setAttribute('aria-hidden', 'true');
    }

    function toggle() {
        if (overlay.classList.contains('hidden')) {
            open();
        } else {
            close();
        }
    }

    function handleKeydown(e) {
        if (e.code !== 'Tab') return;
        if (document.body.classList.contains('menu-open')) return;
        if (isModalOpen()) return;
        const active = document.activeElement;
        const tag = active?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        e.stopPropagation();
        toggle();
    }

    window.addEventListener('keydown', handleKeydown, true);

    if (onlineClient?.addEventListener) {
        onlineClient.addEventListener('player_update', render);
        onlineClient.addEventListener('player_remove', render);
        onlineClient.addEventListener('connected', render);
        onlineClient.addEventListener('disconnected', render);
    }

    window.__PLAYERLIST__ = { open, close, toggle, render };
}
