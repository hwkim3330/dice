// serverPresence.js - online indicator

export function initServerPresence({ onlineClient } = {}) {
    const root = document.getElementById('server-status');
    if (!root) return;

    const countEl = root.querySelector('[data-server-count]');
    const stateEl = root.querySelector('[data-server-state]');

    const setCount = (online, max = 50) => {
        if (countEl) countEl.textContent = `${online}/${max}명`;
    };

    const setState = (state) => {
        if (stateEl) stateEl.textContent = state;
    };

    if (!onlineClient) {
        setCount(0, 50);
        setState('ONLINE');
        return;
    }

    const sync = () => {
        const online = onlineClient.getOnline?.() ?? 0;
        const max = onlineClient.getMaxPlayers?.() ?? 50;
        setCount(online, max);
    };

    sync();
    setState(onlineClient.isConnected?.() ? 'ONLINE' : 'OFFLINE');

    onlineClient.addEventListener?.('presence', (ev) => {
        const online = Number(ev?.detail?.online) || 0;
        const max = onlineClient.getMaxPlayers?.() ?? 50;
        setCount(online, max);
        setState('ONLINE');
    });

    onlineClient.addEventListener?.('connected', () => {
        setState('ONLINE');
        sync();
    });

    onlineClient.addEventListener?.('disconnected', () => {
        setState('OFFLINE');
        setCount(0, onlineClient.getMaxPlayers?.() ?? 50);
    });
}
