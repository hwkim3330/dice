// casinoScene.js - 移댁?????(?쒖? ?명꽣?섏씠??
// Scenes 紐⑤뱢

import { ACTIONS, CONFIG, SCENES, clamp } from '../../core/constants.js';
import { Player } from '../../core/player.js';
import { getNickname } from '../../core/profile.js';
import { UIManager, ModalController } from '../../core/ui.js';
import { SlotMachineUI } from '../../features/slotMachine/slotMachineUI.js';
import { ExchangeUI } from '../../features/exchange/exchangeUI.js';
import { BlackjackUI } from '../../features/blackjack/blackjackUI.js';
import { RouletteUI } from '../../features/roulette/rouletteUI.js';
import { generateCasinoObjects, getLocationInfo, MAP_W, MAP_H } from './casinoData.js';


export class CasinoScene {
    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {import('../../core/appState.js').App} app
     * @param {import('../../core/input.js').InputManager} input
     */
    constructor(ctx, app, input) {
        this.ctx = ctx;
        this.canvas = ctx.canvas;
        this.app = app;
        this.input = input;

        // ?Œë ˆ?´ì–´
        this.player = new Player({ x: 600, y: 700 });

        this._netRoom = 'casino';

        // ì¹´ë©”??
        this.camera = { x: 0, y: 0 };

        // ?¤ë¸Œ?íŠ¸
        this.objects = [];

        // UI ?íƒœ
        this.ui = new UIManager();
        this.slotOpen = false;
        this.exchangeOpen = false;
        this.blackjackOpen = false;
        this.rouletteOpen = false;
        this.nearest = null;
        this.exitLock = 0;

        // ëª¨ë‹¬
        this.slotModal = new ModalController('slot-modal', 'slot-backdrop', 'slot-close-btn');
        this.blackjackModal = new ModalController('blackjack-modal', 'blackjack-backdrop', 'blackjack-close-btn');
        this.exchangeModal = null;

        // Features
        this.slotGame = null;
        this.exchangeUI = null;
        this.blackjackUI = null;
        this.rouletteUI = null;

        // ?°ì¹˜ ?íƒœ
        this._touchStartX = 0;
        this._touchStartY = 0;

        // ë°”ì¸?©ëœ ?¸ë“¤??
        this._handleTouchStart = this._handleTouchStart.bind(this);
        this._handleTouchMove = this._handleTouchMove.bind(this);
        this._handleTouchEnd = this._handleTouchEnd.bind(this);
        this._handleMobileAction = this._handleMobileAction.bind(this);
    }

    /**
     * ??ì§„ìž…
     */
    enter(spawnX, spawnY) {
        if (spawnX !== undefined && spawnY !== undefined) {
            this.player.x = spawnX;
            this.player.y = spawnY;
        }
        this.player.name = getNickname();
        this._netRoom = 'casino';
        // ?¤ë¸Œ?íŠ¸ ?ì„±
        this.objects = generateCasinoObjects();

        // Features ì´ˆê¸°??
        this._ensureFeatures();

        // ëª¨ë‹¬ ?«ê¸° ë°”ì¸??
        this.slotModal.bindClose(() => this._closeSlot());
        this.blackjackModal.bindClose(() => this._closeBlackjack());
        if (this.exchangeUI) {
            this.exchangeUI.bindClose(() => this._closeExchange());
        }
        if (this.blackjackUI) {
            this.blackjackUI.bindClose(() => this._closeBlackjack());
        }
        if (this.rouletteUI) {
            this.rouletteUI.bindClose(() => this._closeRoulette());
        }

        // ?°ì¹˜ ?´ë²¤??ë°”ì¸??
        this._bindTouchControls();

        // ëª¨ë°”???¡ì…˜ ë²„íŠ¼
        this.ui.setMobileActionHandler(this._handleMobileAction);

        // ?…ë ¥ ?¡ì…˜ ?¸ë“¤??
        this.input.onAction = (action) => this.handleAction(action);

        // ìº”ë²„??ë¦¬ì‚¬?´ì¦ˆ
        this._resize();

        this.exitLock = 0.8;

        this._sendImmediateState();
    }

    /**
     * ???´ìž¥
     */
    exit() {
        // ëª¨ë‹¬ ?«ê¸°
        this._closeSlot();
        this._closeExchange();
        this._closeBlackjack();

        // ?°ì¹˜ ?´ë²¤???´ì œ
        this._unbindTouchControls();

        // ?…ë ¥ ì´ˆê¸°??
        this.input.clear();
        this.input.onAction = null;
        this.ui.setMobileActionHandler(null);
    }

    /**
     * ?¡ì…˜ ì²˜ë¦¬
     * @param {string} action
     */
    handleAction(action) {
        if (action === ACTIONS.CLOSE) {
            this._closeSlot();
            this._closeExchange();
            this._closeBlackjack();
            this._closeRoulette();
            this.input.clear();
            return;
        }

        if (action === ACTIONS.INTERACT) {
            if (this.nearest) { // Simplified condition
                if (this.nearest.type === 'slot') {
                    this._openSlot();
                } else if (this.nearest.type === 'exchange') {
                    this._openExchange();
                } else if (this.nearest.type === 'blackjack') {
                    this._openBlackjack();
                } else if (this.nearest.type === 'roulette') {
                    this._openRoulette();
                }
            }
            return;
        }
    }

    /**
     * ?„ë ˆ???…ë°?´íŠ¸
     * @param {number} dt - ?¸í? ?œê°„ (ì´?
     */
    update(dt) {
        this.exitLock = Math.max(0, this.exitLock - dt);
        if (!this.slotOpen && !this.exchangeOpen && !this.blackjackOpen && !this.rouletteOpen) {
            // ?Œë ˆ?´ì–´ ?´ë™
            // ?Œë ˆ?´ì–´ ?´ë™ (ì¶©ëŒ ì²´í¬ ?¬í•¨)
            const direction = this.input.getMoveDirection();
            this.player.move(direction, MAP_W, MAP_H, (x, y) => {
                // ? íš¨???„ì¹˜?¸ì? ê²€??(ì¶©ëŒ?˜ë©´ false)
                for (const o of this.objects) {
                    if (this._checkCollision(o, x, y)) {
                        return false; // ì¶©ëŒ ë°œìƒ -> ?´ë™ ë¶ˆê?
                    }
                }
                return true; // ?ˆì „
            });

            // ?í˜¸?‘ìš© ì²´í¬
            this._updateInteraction();
            const exit = this.nearest;
            if (exit?.type === 'exit' && this.exitLock <= 0) {
                const nearDoor = Math.abs(this.player.x - (exit.x + exit.w / 2)) < 20
                    && Math.abs(this.player.y - exit.y) < 22;
                const fromAbove = this.player.y < exit.y - 6;
                if (nearDoor && fromAbove) {
                    this.exitLock = 999;
                    if (this.sceneManager) {
                        this.sceneManager.goto(SCENES.LOBBY, 640, 180);
                    } else if (window.__GAME__?.sceneManager) {
                        window.__GAME__.sceneManager.goto('lobby', 640, 180);
                    }
                }
            }
        } else {
            this.ui.hidePrompt();
        }

        // ì¹´ë©”???…ë°?´íŠ¸
        this._updateCamera();

        // ?„ì¹˜ ?ìŠ¤???…ë°?´íŠ¸
        const loc = getLocationInfo(this.player.x, this.player.y, this.objects);
        this.ui.setLocation(loc.text, loc.color);

        // ?¬ë¡¯ ë¬¼ë¦¬ ?…ë°?´íŠ¸ (?œì„± ?œì—ë§?
        if (this.slotOpen && this.slotGame) {
            this.slotGame.updatePhysics();
        }
    }

    /**
     * ?Œë”ë§?
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        const viewW = this.canvas._logicalWidth || this.canvas.width;
        const viewH = this.canvas._logicalHeight || this.canvas.height;
        // ë°°ê²½
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, viewW, viewH);

        ctx.save();
        ctx.translate(-this.camera.x, -this.camera.y);

        this._drawFloor(ctx);
        this._drawObjects(ctx);
        this.player.draw(ctx, 0, 0);
        this._drawRemotePlayers(ctx);

        ctx.restore();

        // ?¬ë¡¯ ?Œë” (?œì„± ?œì—ë§?
        if (this.slotOpen && this.slotGame) {
            this.slotGame.draw();
        }
    }

    // ---- Private Methods ----

    /**
     * Features ì´ˆê¸°??
     */
    _ensureFeatures() {
        if (!this.slotGame) {
            this.slotGame = new SlotMachineUI({ canvasId: 'slotCanvas', app: this.app });
            this.slotGame.setActive(false);
        }

        if (!this.exchangeUI) {
            this.exchangeUI = new ExchangeUI({
                app: this.app,
                modalId: 'exchange-modal',
                backdropId: 'exchange-backdrop',
                closeBtnId: 'exchange-close-btn',
                cashElId: 'exchangeCash',
                chipsElId: 'exchangeChips',
                msgElId: 'exchangeMsg',
            });
        }

        if (!this.blackjackUI) {
            this.blackjackUI = new BlackjackUI({
                app: this.app,
                modalId: 'blackjack-modal',
                backdropId: 'blackjack-backdrop',
                closeBtnId: 'blackjack-close-btn',
            });
            window.blackjackUI = this.blackjackUI; // ?”ë²„ê·¸ìš© ?¸ì¶œ
        }

        if (!this.rouletteUI) {
            this.rouletteUI = new RouletteUI({
                app: this.app,
                modalId: 'roulette-modal',
                backdropId: 'roulette-backdrop',
                closeBtnId: 'roulette-close-btn',
            });
        }
    }

    /**
     * ?¬ë¡¯ ?´ê¸°
     */
    _openSlot() {
        if (this.slotOpen) return;
        this._closeExchange();
        this._closeBlackjack();
        this._closeRoulette();

        this.slotOpen = true;
        this.slotModal.open();

        if (this.slotGame) {
            this.slotGame.setActive(true);
            this.slotGame.refreshCredit();
            this.slotGame.setMessage('배팅 금액을 선택하세요.');
        }
    }

    /**
     * ?¬ë¡¯ ?«ê¸°
     */
    _closeSlot() {
        if (!this.slotOpen) return;
        this.slotOpen = false;

        this.slotModal.close();
        this.nearest = null;

        if (this.slotGame) {
            this.slotGame.setActive(false);
            this.slotGame._hardReset?.();
        }
    }

    /**
     * ?˜ì „???´ê¸°
     */
    _openExchange() {
        if (!this.exchangeUI) return;
        if (this.exchangeOpen) return;
        this._closeSlot();
        this._closeBlackjack();
        this._closeRoulette();

        this.exchangeOpen = true;
        this.input.clear();
        this.input.setJoystick(null);
        this.nearest = null;
        this.exchangeUI.open();
    }

    /**
     * ?˜ì „???«ê¸°
     */
    _closeExchange() {
        if (!this.exchangeOpen) return;
        this.exchangeOpen = false;

        if (this.exchangeUI) this.exchangeUI.close();
        this.input.clear();
        this.input.setJoystick(null);
        this.nearest = null;
        this.ui.hidePrompt();
    }

    /**
     * ë¸”ëž™???´ê¸°
     */
    _openBlackjack() {
        if (!this.blackjackUI) return;
        if (this.blackjackOpen) return;
        this._closeSlot();
        this._closeExchange();
        this._closeRoulette();

        this.blackjackOpen = true;
        this.input.clear();
        this.input.setJoystick(null);
        this.nearest = null;
        this.blackjackUI.open();
    }

    /**
     * ë¸”ëž™???«ê¸°
     */
    _closeBlackjack() {
        if (!this.blackjackOpen) return;
        this.blackjackOpen = false;

        if (this.blackjackUI) this.blackjackUI.close();
        this.input.clear();
        this.input.setJoystick(null);
        this.nearest = null;
        this.ui.hidePrompt();
    }

    /**
     * ë£°ë › ?´ê¸°
     */
    _openRoulette() {
        if (!this.rouletteUI) return;
        if (this.rouletteOpen) return;
        this._closeSlot();
        this._closeExchange();
        this._closeBlackjack();

        this.rouletteOpen = true;
        this.input.clear();
        this.input.setJoystick(null);
        this.nearest = null;
        this.rouletteUI.open();
    }

    /**
     * ë£°ë › ?«ê¸°
     */
    _closeRoulette() {
        if (!this.rouletteOpen) return;
        this.rouletteOpen = false;

        if (this.rouletteUI) this.rouletteUI.close();
        this.input.clear();
        this.input.setJoystick(null);
        this.nearest = null;
        this.ui.hidePrompt();
    }

    /**
     * ?í˜¸?‘ìš© ?…ë°?´íŠ¸ (?£ì? ê±°ë¦¬ ê¸°ë°˜)
     */
    _updateInteraction() {
        const px = this.player.x;
        const py = this.player.y;

        let best = null;
        let bestDist = Infinity;
        const range = CONFIG.INTERACTION_RANGE || 60;

        for (const o of this.objects) {
            if (o.type !== 'slot' && o.type !== 'exchange' && o.type !== 'blackjack' && o.type !== 'roulette' && o.type !== 'exit') continue;

            let dist = Infinity;

            if (o.type === 'roulette') {
                // ?í˜• (ì¤‘ì‹¬ ê±°ë¦¬ - ë°˜ì?ë¦?
                const dx = px - o.x;
                const dy = py - o.y;
                const centerDist = Math.sqrt(dx * dx + dy * dy);
                dist = Math.max(0, centerDist - o.r);
            } else {
                // ?¬ê°??(AABB ê±°ë¦¬)
                // pxê°€ ?¬ê°???´ë??´ë©´ dist = 0
                // ?¸ë??´ë©´ ê°€??ê°€ê¹Œìš´ ?£ì?ê¹Œì???ê±°ë¦¬
                const dx = Math.max(o.x - px, 0, px - (o.x + o.w));
                const dy = Math.max(o.y - py, 0, py - (o.y + o.h));
                dist = Math.sqrt(dx * dx + dy * dy);
            }

            if (dist <= range && dist < bestDist) {
                bestDist = dist;
                best = o;
            }
        }

        if (best) {
            this.nearest = best;
            if (best.type === 'exit') {
                this.ui.hidePrompt();
                return;
            }
            const text = 'F 키로 상호작용';
            this.ui.showPrompt(text);
        } else {
            this.nearest = null;
            this.ui.hidePrompt();
        }
    }

    /**
     * ì¹´ë©”???…ë°?´íŠ¸
     */
    _updateCamera() {
        const viewW = this.canvas._logicalWidth || this.canvas.width;
        const viewH = this.canvas._logicalHeight || this.canvas.height;
        this.camera.x = clamp(
            this.player.x - viewW / 2,
            0,
            Math.max(0, MAP_W - viewW)
        );
        this.camera.y = clamp(
            this.player.y - viewH / 2,
            0,
            Math.max(0, MAP_H - viewH)
        );
    }

    _sendImmediateState() {
        const oc = window.__ONLINE__;
        if (!oc?.isConnected?.()) return;
        const cash = Number(this.app?.getState?.().cash) || 0;
        oc.sendState({ room: this._netRoom, x: this.player.x, y: this.player.y, cash });
    }

    _drawRemotePlayers(ctx) {
        const oc = window.__ONLINE__;
        if (!oc?.isConnected?.()) return;

        const me = oc.playerId;
        const list = oc.listPlayers?.() || [];
        for (const rp of list) {
            if (!rp || !rp.id) continue;
            if (me && rp.id === me) continue;
            if (rp.room && rp.room !== this._netRoom) continue;
            if (!Number.isFinite(rp.x) || !Number.isFinite(rp.y)) continue;

            const x = rp.x;
            const y = rp.y;

            ctx.save();
            ctx.globalAlpha = rp.stale ? 0.45 : 0.95;
            ctx.fillStyle = '#4af';
            ctx.beginPath();
            ctx.arc(x, y, 10, 0, Math.PI * 2);
            ctx.fill();

            const name = String(rp.nickname || 'Guest');
            ctx.font = '12px sans-serif';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.fillText(name, x, y - 16);
            if (rp.chatMessage && Date.now() < rp.chatUntil) {
                this._drawRemoteBubble(ctx, x, y - 40, rp.chatMessage);
            }
            ctx.restore();
        }
    }

    _drawRemoteBubble(ctx, x, y, text) {
        ctx.save();
        ctx.font = '14px sans-serif';
        const metrics = ctx.measureText(text);
        const w = metrics.width + 20;
        const h = 30;
        const r = 10;

        ctx.fillStyle = 'white';
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.roundRect(x - w / 2, y - h, w, h, r);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x - 5, y);
        ctx.lineTo(x, y + 6);
        ctx.lineTo(x + 5, y);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, y - h / 2);
        ctx.restore();
    }
    
        _checkCollision(o, nextX, nextY) {
            // 移댄럹?몃뒗 異⑸룎 ?놁쓬 (吏?섍컝 ???덉쓬)
            if (o.type === 'carpet') return false;
    
            if (o.type === 'roulette') {
                // ?먰삎 異⑸룎
                // 猷곕젢? 以묒븰(x,y)媛 ?꾨땲??top-left(x,y) 湲곗??????덉쓬. casinoData ?뺤씤 ?꾩슂.
                // casinoData: x, y, r. (以묒떖 醫뚰몴?몄? ?뺤씤)
                // _drawRoulette: arc(o.x, o.y, ...) -> 以묒떖 醫뚰몴??
                const distSq = (o.x - nextX) ** 2 + (o.y - nextY) ** 2;
                const minDist = o.r + CONFIG.PLAYER_RADIUS;
                if (distSq < minDist ** 2) {
                    return true;
                }
            } else {
                // ?ш컖 異⑸룎 (湲곕낯)
                // AABB Check
                if (
                    nextX + CONFIG.PLAYER_RADIUS > o.x &&
                    nextX - CONFIG.PLAYER_RADIUS < o.x + o.w &&
                    nextY + CONFIG.PLAYER_RADIUS > o.y &&
                    nextY - CONFIG.PLAYER_RADIUS < o.y + o.h
                ) {
                    return true;
                }
            }
            return false;
        }
    
        /**
         * ?곗튂 而⑦듃濡?諛붿씤??
         */
        _bindTouchControls() {
            const zone = document.getElementById('joystick-zone');
            const knob = document.getElementById('joystick-knob');
            if (!zone || !knob) return;
    
            if (this.input.isMobile) {
                zone.style.display = 'block';
                zone.addEventListener('touchstart', this._handleTouchStart, { passive: false });
                zone.addEventListener('touchmove', this._handleTouchMove, { passive: false });
                zone.addEventListener('touchend', this._handleTouchEnd);
            } else {
                document.addEventListener('touchstart', this._handleTouchStart, { passive: false });
                document.addEventListener('touchmove', this._handleTouchMove, { passive: false });
                document.addEventListener('touchend', this._handleTouchEnd);
            }
        }
    
        /**
         * ?곗튂 而⑦듃濡??댁젣
         */
        _unbindTouchControls() {
            const zone = document.getElementById('joystick-zone');
            if (zone) {
                zone.removeEventListener('touchstart', this._handleTouchStart);
                zone.removeEventListener('touchmove', this._handleTouchMove);
                zone.removeEventListener('touchend', this._handleTouchEnd);
            }
            document.removeEventListener('touchstart', this._handleTouchStart);
            document.removeEventListener('touchmove', this._handleTouchMove);
            document.removeEventListener('touchend', this._handleTouchEnd);
        }
    
        /**
         * ?곗튂 ?쒖옉
         */
        _handleTouchStart(e) {
            if (this.slotOpen || this.exchangeOpen || this.blackjackOpen || this.rouletteOpen) return;
    
            const zone = document.getElementById('joystick-zone');
            if (!this.input.isMobile && e.target !== this.canvas) return;
    
            e.preventDefault();
            const t = e.touches[0];
            this._touchStartX = t.clientX;
            this._touchStartY = t.clientY;
            this.input.setJoystick({ x: 0, y: 0 });
    
            if (!this.input.isMobile && zone) {
                this.ui.showJoystickZone(true, t.clientX, t.clientY);
            }
        }
    
        /**
         * ?곗튂 ?대룞
         */
        _handleTouchMove(e) {
            if (this.slotOpen || this.exchangeOpen || this.blackjackOpen || this.rouletteOpen) return;
            if (!this.input.getJoystickVector()) return;
    
            e.preventDefault();
            const t = e.touches[0];
            const dx = t.clientX - this._touchStartX;
            const dy = t.clientY - this._touchStartY;
            const dist = Math.min(50, Math.sqrt(dx * dx + dy * dy));
            const ang = Math.atan2(dy, dx);
    
            const mx = Math.cos(ang) * dist;
            const my = Math.sin(ang) * dist;
    
            this.ui.updateJoystickKnob(mx, my);
            this.input.setJoystick({ x: mx / 50, y: my / 50 });
        }
    
        /**
         * ?곗튂 醫낅즺
         */
        _handleTouchEnd() {
            this.input.setJoystick(null);
            this.ui.resetJoystickKnob();
    
            if (!this.input.isMobile) {
                this.ui.showJoystickZone(false);
            }
        }
    
        /**
         * 紐⑤컮???≪뀡 踰꾪듉
         */
        _handleMobileAction() {
            if (this.slotOpen || this.exchangeOpen || this.blackjackOpen || this.rouletteOpen) return;
            if (!this.nearest) return;
    
            if (this.nearest.type === 'slot') {
                this._openSlot();
            } else if (this.nearest.type === 'exchange') {
                this._openExchange();
            } else if (this.nearest.type === 'blackjack') {
                this._openBlackjack();
            } else if (this.nearest.type === 'roulette') {
                this._openRoulette();
            }
        }
    
        /**
         * 由ъ궗?댁쫰
         */
    _resize() {
        if (window.__RESIZE_CANVAS__) {
            window.__RESIZE_CANVAS__();
            return;
        }
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    
        // ---- Draw Methods ----
    
        /**
         * 諛붾떏 洹몃━湲?
         */
        _drawFloor(ctx) {
            // 移댄렖
            ctx.fillStyle = '#24101b';
            ctx.fillRect(0, 0, MAP_W, MAP_H);
    
            // ?⑦꽩
            const size = 110;
            ctx.strokeStyle = '#331524';
            ctx.lineWidth = 2;
            for (let x = 0; x <= MAP_W; x += size) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, MAP_H);
                ctx.stroke();
            }
            for (let y = 0; y <= MAP_H; y += size) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(MAP_W, y);
                ctx.stroke();
            }
        }
    
        /**
         * ?ㅻ툕?앺듃 洹몃━湲?
         */
        _drawObjects(ctx) {
            for (const o of this.objects) {
                if (o.type === 'slot') {
                    this._drawSlot(ctx, o);
                } else if (o.type === 'exchange') {
                    this._drawExchange(ctx, o);
                } else if (o.type === 'blackjack') {
                    this._drawBlackjack(ctx, o);
                } else if (o.type === 'card') {
                    this._drawCard(ctx, o);
                } else if (o.type === 'roulette') {
                    this._drawRoulette(ctx, o);
                } else if (o.type === 'carpet') {
                    this._drawCarpet(ctx, o);
                } else if (o.type === 'exit') {
                    this._drawExit(ctx, o);
                } else if (o.type === 'wall') {
                    ctx.fillStyle = '#0b0b0b';
                    ctx.fillRect(o.x, o.y, o.w, o.h);
                }
            }
        }
    
        /**
         * ?덈뱶 移댄럹??洹몃━湲?
         */
        _drawCarpet(ctx, o) {
            ctx.fillStyle = '#a83232'; // Red
            ctx.fillRect(o.x, o.y, o.w, o.h);
    
            ctx.strokeStyle = '#f59e0b'; // Gold trim
            ctx.lineWidth = 4;
            ctx.strokeRect(o.x, o.y, o.w, o.h);
        }
    
        /**
         * 異쒖엯援?洹몃━湲?
         */
        _drawExit(ctx, o) {
            // 臾??
            ctx.fillStyle = '#1c1917';
            ctx.fillRect(o.x, o.y, o.w, o.h);
    
            // 臾??덉そ (鍮?
            const g = ctx.createLinearGradient(o.x, o.y, o.x + o.w, o.y);
            g.addColorStop(0, '#000');
            g.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
            g.addColorStop(1, '#000');
            ctx.fillStyle = g;
            ctx.fillRect(o.x + 5, o.y + 5, o.w - 10, o.h - 5);
    
            // ?쒖떆
            const labelY = o.y - 10;
            const boxW = 90;
            const boxH = 26;
            const boxX = (o.x + o.w / 2) - boxW / 2;
            const boxY = labelY - boxH + 8;
            ctx.fillStyle = '#00c853';
            ctx.fillRect(boxX, boxY, boxW, boxH);
            ctx.strokeStyle = '#0b5f2a';
            ctx.lineWidth = 2;
            ctx.strokeRect(boxX, boxY, boxW, boxH);
    
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('EXIT', o.x + o.w / 2, labelY);
        }
    
        /**
         * ?щ’ 癒몄떊 洹몃━湲?
         */
        _drawSlot(ctx, o) {
            ctx.fillStyle = '#4a0404';
            ctx.fillRect(o.x, o.y, o.w, o.h);
    
            ctx.fillStyle = '#0b0b0b';
            ctx.fillRect(o.x + 10, o.y + 10, o.w - 20, 15);
    
            ctx.strokeStyle = '#b8912f';
            ctx.lineWidth = 2;
            ctx.strokeRect(o.x, o.y, o.w, o.h);
        }
    
        /**
         * ?섏쟾??洹몃━湲?
         */
        _drawExchange(ctx, o) {
            const colors = {
                exchangeFloor: '#3e2723',
                counterTop: '#5d4037',
                counterTrim: '#d4af37',
                glass: 'rgba(173,216,230,0.28)',
                safe: '#7f8c8d',
                money: '#85bb65',
                chipRed: '#c0392b',
                chipBlue: '#2980b9',
                chipBlack: '#2c3e50',
            };
    
            const bx = o.x, by = o.y, bw = o.w, bh = o.h;
    
            // 1) Booth floor
            ctx.fillStyle = colors.exchangeFloor;
            ctx.fillRect(bx, by, bw, bh);
    
            // 2) Gold trim inset
            ctx.strokeStyle = colors.counterTrim;
            ctx.lineWidth = 4;
            ctx.strokeRect(bx + 10, by + 10, bw - 20, bh - 20);
    
            // 3) Back wall + safes
            ctx.fillStyle = '#111';
            ctx.fillRect(bx, by, bw, 36);
            this._drawSafe(ctx, bx + 24, by + 6, colors.safe);
            this._drawSafe(ctx, bx + bw - 84, by + 6, colors.safe);
    
            // 4) Counter (bottom)
            const counterDepth = 56;
            const cy = by + bh - counterDepth;
            ctx.fillStyle = colors.counterTop;
            ctx.fillRect(bx - 10, cy, bw + 20, counterDepth);
    
            ctx.strokeStyle = colors.counterTrim;
            ctx.lineWidth = 5;
            ctx.strokeRect(bx - 10, cy, bw + 20, counterDepth);
    
            // 5) Security glass
            ctx.fillStyle = colors.glass;
            ctx.fillRect(bx - 10, cy - 10, bw + 20, 10);
    
            // 6) Glass frame + service trays
            for (let i = 0; i <= 4; i++) {
                const xPos = (bx - 10) + (i * ((bw + 20) / 4));
                ctx.fillStyle = '#95a5a6';
                ctx.fillRect(xPos - 4, cy - 14, 8, 18);
    
                if (i < 4) {
                    ctx.fillStyle = 'rgba(0,0,0,0.25)';
                    ctx.fillRect(xPos + 40, cy + 18, 44, 10);
                }
            }
    
            // 7) Interior details
            this._drawMoneyStack(ctx, bx + 120, by + 70, colors.money);
            this._drawMoneyStack(ctx, bx + 150, by + 86, colors.money);
            this._drawMoneyStack(ctx, bx + 132, by + 58, colors.money);
            this._drawChipTray(ctx, bx + bw - 150, by + 64, colors);
            this._drawStaff(ctx, bx + 90, by + 118);
            this._drawStaff(ctx, bx + bw - 90, by + 118);
    
            // 8) Booth sign
            ctx.save();
            ctx.fillStyle = colors.counterTrim;
            ctx.font = 'bold 14px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0,0,0,0.6)';
            ctx.shadowBlur = 6;
            ctx.fillText('EXCHANGE', bx + bw / 2, by + bh / 2);
            ctx.restore();
    
            // 9) Subtle spotlight
            const g = ctx.createRadialGradient(
                bx + bw / 2, by + bh, 40,
                bx + bw / 2, by + bh, 260
            );
            g.addColorStop(0, 'rgba(255,215,0,0.10)');
            g.addColorStop(1, 'rgba(0,0,0,0.00)');
            ctx.fillStyle = g;
            ctx.fillRect(bx, by, bw, bh);
        }
    
    
    
        /**
         * 猷곕젢 洹몃━湲?
         */
        _drawRoulette(ctx, o) {
            ctx.fillStyle = '#2e2e2e';
            ctx.beginPath();
            ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
            ctx.fill();
    
            ctx.fillStyle = '#5c1919';
            ctx.beginPath();
            ctx.arc(o.x, o.y, o.r * 0.72, 0, Math.PI * 2);
            ctx.fill();
    
            ctx.save();
            ctx.translate(o.x, o.y);
            ctx.rotate(Date.now() / 1600);
            ctx.fillStyle = '#caa23a';
            ctx.fillRect(-2, -14, 4, 28);
            ctx.fillRect(-14, -2, 28, 4);
            ctx.restore();
        }
    
        /**
         * 釉붾옓???뚯씠釉?洹몃━湲?
         */
        _drawBlackjack(ctx, o) {
            // ?뚯씠釉???
            ctx.fillStyle = '#1e3c2e';
            this._roundRect(ctx, o.x, o.y, o.w, o.h, 20);
            ctx.fill();
    
            // ?뚮몢由?
            ctx.strokeStyle = '#2d1810';
            ctx.lineWidth = 6;
            this._roundRect(ctx, o.x, o.y, o.w, o.h, 20);
            ctx.stroke();
    
            // ?띿뒪??(BLACKJACK)
            ctx.fillStyle = '#4ade80'; // green-400
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('BLACKJACK', o.x + o.w / 2, o.y + o.h / 2);
    
            // ?μ떇
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(o.x + o.w / 2, o.y + o.h, 50, Math.PI, 0);
            ctx.stroke();
        }
    
        // ---- Helper Draw Methods ----
    
        _drawSafe(ctx, x, y, fill) {
            ctx.fillStyle = fill;
            ctx.fillRect(x, y, 60, 26);
            ctx.strokeStyle = '#2c3e50';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, 60, 26);
    
            ctx.beginPath();
            ctx.arc(x + 48, y + 13, 7, 0, Math.PI * 2);
            ctx.fillStyle = '#bdc3c7';
            ctx.fill();
            ctx.stroke();
        }
    
        _drawMoneyStack(ctx, x, y, fill) {
            ctx.fillStyle = fill;
            ctx.fillRect(x, y, 32, 16);
            ctx.strokeStyle = '#27ae60';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, 32, 16);
    
            ctx.fillStyle = '#fff';
            ctx.fillRect(x + 11, y, 10, 16);
        }
    
        _drawChipTray(ctx, x, y, colors) {
            ctx.fillStyle = '#222';
            ctx.fillRect(x, y, 92, 56);
    
            const chipSize = 10;
            for (let row = 0; row < 4; row++) {
                for (let col = 0; col < 7; col++) {
                    ctx.beginPath();
                    ctx.arc(x + 10 + (col * 12), y + 10 + (row * 11), chipSize / 2, 0, Math.PI * 2);
    
                    if (row === 0) ctx.fillStyle = colors.chipRed;
                    else if (row === 1) ctx.fillStyle = colors.chipBlue;
                    else ctx.fillStyle = colors.chipBlack;
    
                    ctx.fill();
                }
            }
        }
    
        _drawStaff(ctx, x, y) {
            ctx.fillStyle = 'black';
            ctx.beginPath();
            ctx.ellipse(x, y + 10, 24, 14, 0, 0, Math.PI * 2);
            ctx.fill();
    
            ctx.fillStyle = '#f1c27d';
            ctx.beginPath();
            ctx.arc(x, y, 12, 0, Math.PI * 2);
            ctx.fill();
        }
    
        _roundRect(ctx, x, y, w, h, r) {
            const rr = Math.min(r, w / 2, h / 2);
            ctx.beginPath();
            ctx.moveTo(x + rr, y);
            ctx.arcTo(x + w, y, x + w, y + h, rr);
            ctx.arcTo(x + w, y + h, x, y + h, rr);
            ctx.arcTo(x, y + h, x, y, rr);
            ctx.arcTo(x, y, x + w, y, rr);
            ctx.closePath();
        }
}














