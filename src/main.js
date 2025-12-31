// main.js - single entry (index.html)

import { App } from './core/appState.js';
import { SceneManager } from './core/sceneManager.js';
import { InputManager } from './core/input.js';
import { SCENES } from './core/constants.js';
import { CasinoScene } from './scenes/casino/casinoScene.js';
import { CasinoLobbyScene } from './scenes/lobby/casinoLobbyScene.js';
import { MainMenuScene } from './scenes/main/mainMenuScene.js';
import { RankingSystem } from './features/ranking/rankingSystem.js';
import { ChatSystem } from './features/chat/chatSystem.js';
import { initServerPresence } from './core/serverPresence.js';
import { initMenuSystem } from './features/menu/menuSystem.js';
import { OnlineClient } from './net/onlineClient.js';
import { initPlayerListOverlay } from './features/players/playerListOverlay.js';
import { makeDraggable, resetPanelPositions } from './core/draggablePanels.js';

class GameApp {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        App.init({
            moneyEl: document.getElementById('money-display'),
            chipEl: document.getElementById('chip-display'),
        });

        this.onlineClient = new OnlineClient();
        initServerPresence({ onlineClient: this.onlineClient });

        this.ranking = new RankingSystem();
        this.ranking.init({ onlineClient: this.onlineClient });

        this.input = new InputManager();
        this.input.bind();

        this.sceneManager = new SceneManager();

        this.chatSystem = new ChatSystem();
        this.chatSystem.init({
            sceneManager: this.sceneManager,
            input: this.input,
            app: App,
            onlineClient: this.onlineClient,
        });

        this._registerScenes();

        this.sceneManager.goto(SCENES.MAIN);

        this.lastTime = 0;
        this.running = true;

        this._bindCanvasResize();
        this._bindVisibilityReset();

        // ??硫?고뵆?덉씠???곹깭 ?꾩넚 (?덈Т ??? ?딄쾶 5Hz)
        this._stateSendAcc = 0;
        this._stateSendInterval = 0.2;
    }

    _registerScenes() {
        const main = new MainMenuScene(this.ctx);
        this.sceneManager.register(SCENES.MAIN, main);

        const casino = new CasinoScene(this.ctx, App, this.input);
        casino.sceneManager = this.sceneManager;
        this.sceneManager.register(SCENES.CASINO, casino);

        const lobby = new CasinoLobbyScene(this.ctx, App, this.input);
        lobby.sceneManager = this.sceneManager;
        this.sceneManager.register(SCENES.LOBBY, lobby);
    }

    start() {
        requestAnimationFrame((time) => this._loop(time));
    }

    _bindCanvasResize() {
        const resize = () => {
            const vw = window.visualViewport?.width ?? window.innerWidth;
            const vh = window.visualViewport?.height ?? window.innerHeight;
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            this.canvas.style.width = `${vw}px`;
            this.canvas.style.height = `${vh}px`;
            this.canvas.width = Math.floor(vw * dpr);
            this.canvas.height = Math.floor(vh * dpr);
            this.canvas._logicalWidth = vw;
            this.canvas._logicalHeight = vh;
            this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        window.__RESIZE_CANVAS__ = resize;
        resize();
        window.addEventListener('resize', resize);
        window.addEventListener('orientationchange', resize);
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', resize);
        }
    }

    _loop(time) {
        if (!this.running) return;

        let dt = 0;
        if (this.lastTime) {
            dt = (time - this.lastTime) / 1000;
            dt = Math.min(dt, 1 / 20);
        }
        this.lastTime = time;

        this.sceneManager.update(dt);
        this.sceneManager.render(this.ctx);

        // ??硫?고뵆?덉씠: ???꾩튂/???곹깭瑜??쒕쾭濡??꾩넚 (濡쒕퉬?먯꽌 ?쒕줈 '蹂댁씠寃? ?섎젮硫??꾩슂)
        this._stateSendAcc += dt;
        if (this._stateSendAcc >= this._stateSendInterval) {
            this._stateSendAcc = 0;

            const oc = this.onlineClient;
            if (oc?.isConnected?.()) {
                const scene = this.sceneManager.currentScene;
                const room = this.sceneManager.currentSceneId || 'lobby';
                const p = scene?.player;
                if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) {
                    const cash = Number(App.getState?.().cash) || 0;
                    oc.sendState({ room, x: p.x, y: p.y, cash });
                }
            }
        }

        requestAnimationFrame((t) => this._loop(t));
    }

    stop() {
        this.running = false;
        this.input.unbind();
    }

    _bindVisibilityReset() {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.lastTime = 0;
            }
        });
    }
}

const game = new GameApp();
game.start();

// ??濡쒖뺄(媛쒕컻) / 諛고룷(GitHub Pages) ?먮룞 遺꾧린
const wsOverride = localStorage.getItem('DICELAND_WS_URL');
const isLocalhost = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
const localFlag = localStorage.getItem('DICELAND_LOCAL_WS') === '1';
if (!isLocalhost && localFlag) {
    localStorage.setItem('DICELAND_LOCAL_WS', '0');
}
const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
const CONNECT_URL = wsOverride
    ? wsOverride
    : (isLocalhost ? 'ws://localhost:8080' : `${wsProtocol}://diceland.onrender.com`);

initMenuSystem({
    sceneManager: game.sceneManager,
    app: App,
    onlineClient: game.onlineClient,
    connectUrl: CONNECT_URL,
});
initPlayerListOverlay({ app: App, onlineClient: game.onlineClient });

makeDraggable({
    panelEl: document.getElementById('ranking-panel'),
    handleEl: document.querySelector('#ranking-panel .ranking-title'),
});
makeDraggable({
    panelEl: document.getElementById('chat-panel'),
    handleEl: document.querySelector('#chat-panel .chat-header'),
});

window.__RESET_PANEL_POSITIONS__ = resetPanelPositions;

const btnCtl = document.getElementById('controls-toggle');
btnCtl?.addEventListener('click', () => {
    document.body.classList.toggle('mobile-controls-hidden');
    const hidden = document.body.classList.contains('mobile-controls-hidden');
    btnCtl.setAttribute('aria-pressed', String(hidden));
});

window.__GAME__ = game;
window.__APP__ = App;
window.__ONLINE__ = game.onlineClient;

