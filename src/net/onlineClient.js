// onlineClient.js - multiplayer minimal WebSocket client
// - chat + presence + roster + state sync (very small MVP)

function uid() {
  try {
    const a = new Uint32Array(4);
    crypto.getRandomValues(a);
    return Array.from(a).map((n) => n.toString(16).padStart(8, '0')).join('');
  } catch {
    return String(Date.now()) + '_' + Math.random().toString(16).slice(2);
  }
}

export class OnlineClient extends EventTarget {
  constructor() {
    super();
    this.clientId = uid();
    this.connected = false;
    this.playerId = null;
    this.online = 0;
    this.socket = null;
    this.connectUrl = null;
    this.nickname = null;
    this._reconnectDelay = 2000;
    this._reconnectTimer = null;
    this._manualClose = false;
    this._reconnectAttempts = 0;
    this._maxReconnectAttempts = 4;
    this._loggedReconnectError = false;
    this._loggedLocalOffline = false;
    this.staleTimeoutMs = 15000;
    this._cleanupTimer = null;

    // remote players snapshot (id -> { id, nickname, x, y, room, ts })
    this.players = new Map();

    this.maxPlayers = 50;

    this._startCleanupLoop();
  }

  getPlayerCount() {
    return this.online || 0;
  }

  getMaxPlayers() {
    return this.maxPlayers;
  }

  isConnected() {
    return this.connected;
  }

  getOnline() {
    return this.online || 0;
  }

  async connect({ url, nickname } = {}) {
    if (!url) return;
    this.connectUrl = url;
    this.nickname = nickname || this.nickname || 'Guest';
    this._manualClose = false;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.socket = new WebSocket(url);
    let closed = false;

    this.socket.addEventListener('open', () => {
      this.connected = true;
      this._reconnectDelay = 2000;
      this._reconnectAttempts = 0;
      this._loggedReconnectError = false;
      if (this._reconnectTimer) {
        clearTimeout(this._reconnectTimer);
        this._reconnectTimer = null;
      }
      this.dispatchEvent(new CustomEvent('connected', { detail: { clientId: this.clientId } }));
      this.socket.send(JSON.stringify({ type: 'hello', nickname: this.nickname || 'Guest' }));
    });

    this.socket.addEventListener('message', (ev) => {
      let data;
      try {
        data = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (!data || typeof data.type !== 'string') return;

      if (data.type === 'hello') {
        this.playerId = data.playerId || this.playerId || null;
        return;
      }

      if (data.type === 'presence') {
        this.online = Number(data.online) || 0;
        this.dispatchEvent(new CustomEvent('presence', { detail: { online: this.online } }));
        return;
      }

      if (data.type === 'roster') {
        const list = Array.isArray(data.players) ? data.players : [];
        for (const p of list) {
          if (!p || !p.id) continue;
          if (this.playerId && String(p.id) === String(this.playerId)) continue;
          this.upsertRemotePlayer({
            id: String(p.id),
            nickname: p.nickname || 'Guest',
            x: typeof p.x === 'number' ? p.x : undefined,
            y: typeof p.y === 'number' ? p.y : undefined,
            room: p.room || 'lobby',
            cash: typeof p.cash === 'number' ? p.cash : undefined,
          });
        }
        this.online = Number(data.online) || this.online || list.length;
        this.dispatchEvent(new CustomEvent('roster', { detail: { players: this.listPlayers() } }));
        return;
      }

      if (data.type === 'player_join' || data.type === 'player_update') {
        const p = data.player || null;
        if (!p || !p.id) return;
        if (this.playerId && String(p.id) === String(this.playerId)) return;
        this.upsertRemotePlayer({
          id: String(p.id),
          nickname: p.nickname || 'Guest',
          x: typeof p.x === 'number' ? p.x : undefined,
          y: typeof p.y === 'number' ? p.y : undefined,
          room: p.room || 'lobby',
          cash: typeof p.cash === 'number' ? p.cash : undefined,
        });
        return;
      }

      if (data.type === 'player_leave') {
        const id = data.playerId;
        if (!id) return;
        this._markRemoteStale(String(id));
        return;
      }

      if (data.type === 'state') {
        const id = data.playerId;
        if (!id) return;
        if (this.playerId && String(id) === String(this.playerId)) return;
        this.upsertRemotePlayer({
          id: String(id),
          nickname: data.nickname || 'Guest',
          x: typeof data.x === 'number' ? data.x : undefined,
          y: typeof data.y === 'number' ? data.y : undefined,
          room: data.room || 'lobby',
          cash: typeof data.cash === 'number' ? data.cash : undefined,
        });
        return;
      }

      if (data.type === 'chat') {
        const msg = {
          room: data.room || 'lobby',
          playerId: data.playerId || 'unknown',
          nickname: data.nickname || 'Guest',
          text: data.text || '',
          ts: data.ts || Date.now(),
        };
        if (msg.playerId && this.playerId && String(msg.playerId) !== String(this.playerId)) {
          this.upsertRemotePlayer({
            id: String(msg.playerId),
            nickname: msg.nickname,
            chatMessage: msg.text,
            chatUntil: Date.now() + 3000,
          });
        }
        this.dispatchEvent(new CustomEvent('chat', { detail: msg }));
        return;
      }

      if (data.type === 'sys') {
        const msg = {
          text: data.text || '',
          ts: data.ts || Date.now(),
        };
        this.dispatchEvent(new CustomEvent('sys', { detail: msg }));
      }
    });

    const handleClose = () => {
      if (closed) return;
      closed = true;
      this.connected = false;
      this.socket = null;
      this._markAllStale();
      this.dispatchEvent(new CustomEvent('disconnected'));
      this._scheduleReconnect();
    };

    this.socket.addEventListener('close', handleClose);
    this.socket.addEventListener('error', handleClose);
  }

  disconnect() {
    this._manualClose = true;
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    this.connected = false;
    if (this.socket) {
      try {
        this.socket.close();
      } catch {}
    }
    this.socket = null;
    this._markAllStale();
    this.dispatchEvent(new CustomEvent('disconnected'));
  }

  sendChat(text, room = 'lobby', nickname) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    const trimmed = String(text || '').trim();
    if (!trimmed) return;
    const payload = { type: 'chat', room, text: trimmed };
    if (nickname) payload.nickname = nickname;
    this.socket.send(JSON.stringify(payload));
  }

  sendSys(text) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    const trimmed = String(text || '').trim();
    if (!trimmed) return;
    this.socket.send(JSON.stringify({ type: 'sys', text: trimmed }));
  }

  // ✅ position sync
  sendState({ room = 'lobby', x, y, cash } = {}) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    if (typeof x !== 'number' || typeof y !== 'number') return;
    const payload = { type: 'state', room, x, y };
    if (typeof cash === 'number') payload.cash = cash;
    this.socket.send(JSON.stringify(payload));
  }

  upsertRemotePlayer(patch) {
    if (!patch || !patch.id) return;
    const prev = this.players.get(patch.id) || { id: patch.id };
    const next = { ...prev, ...patch, ts: Date.now(), stale: false };
    this.players.set(patch.id, next);
    this.dispatchEvent(new CustomEvent('player_update', { detail: next }));
  }

  removeRemotePlayer(id) {
    if (!this.players.has(id)) return;
    this.players.delete(id);
    this.dispatchEvent(new CustomEvent('player_remove', { detail: { id } }));
  }

  listPlayers() {
    return Array.from(this.players.values());
  }

  _markAllStale() {
    const now = Date.now();
    for (const [id, player] of this.players.entries()) {
      this.players.set(id, { ...player, stale: true, ts: now });
    }
  }

  _markRemoteStale(id) {
    const player = this.players.get(id);
    if (!player) return;
    this.players.set(id, { ...player, stale: true, ts: Date.now() });
    this.dispatchEvent(new CustomEvent('player_update', { detail: this.players.get(id) }));
  }

  _startCleanupLoop() {
    if (this._cleanupTimer) return;
    this._cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [id, player] of this.players.entries()) {
        if (!player?.stale) continue;
        if (now - (player.ts || 0) > this.staleTimeoutMs) {
          this.players.delete(id);
          this.dispatchEvent(new CustomEvent('player_remove', { detail: { id } }));
        }
      }
    }, 2000);
  }

  _scheduleReconnect() {
    if (this._manualClose) return;
    if (this._reconnectTimer || !this.connectUrl) return;
    const limit = this._getReconnectLimit();
    if (this._reconnectAttempts >= limit) {
      if (limit <= 1) {
        if (!this._loggedLocalOffline) {
          this._loggedLocalOffline = true;
          console.warn('[OnlineClient] 서버 미가동(offline).');
        }
      } else if (!this._loggedReconnectError) {
        this._loggedReconnectError = true;
        console.warn('[OnlineClient] Reconnect limit reached.');
      }
      return;
    }
    const delay = this._reconnectDelay;
    this._reconnectDelay = Math.min(this._reconnectDelay * 2, 8000);
    this._reconnectAttempts += 1;
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      this.connect({ url: this.connectUrl, nickname: this.nickname });
    }, delay);
  }

  _getReconnectLimit() {
    if (this._isLocalPage() && this._isLocalWsUrl(this.connectUrl)) {
      return 1;
    }
    return this._maxReconnectAttempts;
  }

  _isLocalPage() {
    return ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
  }

  _isLocalWsUrl(url) {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      return ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
    } catch {
      return false;
    }
  }
}
