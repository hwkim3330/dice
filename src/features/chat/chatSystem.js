// chatSystem.js - global chat panel (left-bottom), persistent across scenes

import { getNickname } from '../profile/profileStore.js';
import { bubbleSay } from '../../core/bubbles.js';

export class ChatSystem {
    constructor() {
        this.sceneManager = null;
        this.input = null;
        this.app = null;
        this.onlineClient = null;

        this.panel = null;
        this.logEl = null;
        this.inputEl = null;
        this.sendBtn = null;
        this.clearBtn = null;
        this.toggleBtn = null;
        this.inputRow = null;
        this.rankLayer = null;
        this.rankList = null;
        this.rankToggle = null;

        this.messages = [];
        this.maxMessages = 80;

        this._boundSend = () => this._handleSend();
        this._boundKey = (e) => this._handleKey(e);
        this._boundGlobalKey = (e) => this._handleGlobalKey(e);
    }

    init({ sceneManager, input, app, onlineClient } = {}) {
        this.sceneManager = sceneManager;
        this.input = input;
        this.app = app;
        this.onlineClient = onlineClient;

        const findById = (primary, fallback) =>
            document.getElementById(primary) || document.getElementById(fallback);

        this.panel = findById('chat-panel', 'global-chat');
        this.logEl = findById('chat-log', 'global-chat-log');
        this.inputEl = findById('chat-input', 'global-chat-input');
        this.sendBtn = findById('chat-send', 'global-chat-send');
        this.clearBtn = findById('chat-clear', 'global-chat-clear');
        this.toggleBtn = findById('chat-toggle', 'global-chat-toggle');
        this.inputRow = this.inputEl?.closest('.chat-input-row') || null;
        this.rankLayer = document.getElementById('ranking-layer');
        this.rankList = document.getElementById('ranking-list');
        this.rankToggle = document.getElementById('rank-toggle');

        this._bindEvents();

        // incoming chat from server
        if (this.onlineClient) {
            this.onlineClient.addEventListener('chat', (ev) => {
                const msg = ev?.detail;
                if (!msg) return;
                const currentRoom = this._getRoom();
                if (msg.room && msg.room !== currentRoom) return;

                // ???닿? 蹂대궦 硫붿떆吏媛 ?쒕쾭?먯꽌 ?ㅼ떆 釉뚮줈?쒖틦?ㅽ듃?섎㈃ 以묐났 ?쒖떆?섎?濡?臾댁떆
                if (this.onlineClient?.playerId && msg.playerId === this.onlineClient.playerId) return;

                this.receiveMessage({
                    sender: msg.nickname,
                    senderId: msg.playerId,
                    text: msg.text,
                    room: msg.room || 'lobby',
                    ts: msg.ts || Date.now(),
                });
            });

            this.onlineClient.addEventListener('sys', (ev) => {
                const msg = ev?.detail;
                if (!msg || !msg.text) return;
                this.receiveMessage({
                    sender: 'SYSTEM',
                    senderId: null,
                    text: msg.text,
                    room: 'lobby',
                    ts: msg.ts || Date.now(),
                });
            });
        }

        return this;
    }

    _bindEvents() {
        this.sendBtn?.addEventListener('click', this._boundSend);
        this.clearBtn?.addEventListener('click', () => this._clear());
        this.inputEl?.addEventListener('keydown', this._boundKey);
        this.toggleBtn?.addEventListener('click', () => this._togglePanel());
        window.addEventListener('keydown', this._boundGlobalKey);
    }

    _handleKey(e) {
        if (!e) return;
        if (e.key === 'Enter') {
            e.preventDefault();
            this._handleSend();
        }
    }

    _handleGlobalKey(e) {
        if (!e || !this.inputEl) return;
        const tag = e.target?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        if (e.code === 'KeyT') {
            e.preventDefault();
            this.inputEl.focus();
            return;
        }
        if (e.code === 'KeyC') {
            e.preventDefault();
            this._togglePanel();
            return;
        }
        if (e.code === 'KeyR') {
            e.preventDefault();
            this._toggleRank();
        }
    }

    _handleSend() {
        if (!this.inputEl) return;
        const trimmed = String(this.inputEl.value || '').trim();
        if (!trimmed) return;

        // ??濡쒖뺄 UI?먮뒗 利됱떆 異쒕젰?섍퀬, (?곌껐?섏뼱 ?덉쑝硫? sendLocal ?대??먯꽌 ?쒕쾭濡쒕룄 ?꾩넚
        this.sendLocal(trimmed);

        this.inputEl.value = '';
        this.inputEl.focus();
    }

    _clear() {
        this.messages = [];
        this._render();
    }

    receiveMessage({ sender, senderId, text, room = 'lobby', ts = Date.now() } = {}) {
        const senderLabel = sender || 'Guest';
        const msg = {
            sender: sender || 'Guest',
            senderId: senderId || null,
            senderLabel,
            text: String(text || ''),
            room,
            ts,
        };
        this._pushMessage(msg);
        this._render();
    }

    sendLocal(text) {
        const trimmed = String(text || '').trim();
        if (!trimmed) return;

        const message = {
            sender: getNickname() || 'Guest',
            senderId: this.onlineClient?.playerId || null,
            senderLabel: this.onlineClient?.playerId
                ? `${getNickname() || 'Guest'}`
                : (getNickname() || 'Guest'),
            text: trimmed,
            room: this._getRoom(),
            ts: Date.now(),
        };

        // commands
        if (trimmed === '@help') {
            this._pushMessage({
                ...message,
                text: '[Chat] No commands available.',
            });
            this._render();
            return;
        }

        this._pushMessage(message);
        this._render();

        // bubble say (current player)
        this._sayCurrentPlayer(trimmed);

        // ???澕???瓣舶?橃柎 ?堨溂氅??滊矂搿滊弰 ?勳啞 (?るジ ?犾??愱矊 ?滌嫓)
        try {
            this.onlineClient?.sendChat?.(trimmed, message.room, getNickname());
        } catch {
            /* ignore */
        }
    }

    _togglePanel() {
        if (!this.panel) return;
        const nextCollapsed = !this.panel.classList.contains('collapsed');
        this.panel.classList.toggle('collapsed', nextCollapsed);
        if (this.toggleBtn) {
            this.toggleBtn.textContent = nextCollapsed ? '열기' : '닫기';
        }
    }

    _toggleRank() {
        if (!this.rankList) return;
        const nextHidden = !this.rankList.classList.contains('hidden');
        this.rankList.classList.toggle('hidden', nextHidden);
        if (this.rankToggle) {
            this.rankToggle.textContent = nextHidden ? '열기' : '닫기';
        }
    }
    _getRoom() {
        return this.sceneManager?.currentSceneId || 'lobby';
    }

    _sayCurrentPlayer(text) {
        const scene = this.sceneManager?.currentScene;
        const player = scene?.player;
        if (!player) return;
        bubbleSay(player, text);
    }

    _pushMessage(msg) {
        this.messages.push(msg);
        if (this.messages.length > this.maxMessages) {
            this.messages.splice(0, this.messages.length - this.maxMessages);
        }
    }

    _render() {
        if (!this.logEl) return;
        this.logEl.innerHTML = '';

        for (const m of this.messages) {
            const row = document.createElement('div');
            row.className = 'chat-row';
            const label = m.senderLabel || 'Guest';
            row.textContent = `${label}: ${m.text}`;
            this.logEl.appendChild(row);
        }

        // auto scroll
        this.logEl.scrollTop = this.logEl.scrollHeight;
    }
}





