
import { ACTIONS, CONFIG, clamp } from '../../core/constants.js';
import { Player } from '../../core/player.js';
import { getNickname } from '../../core/profile.js';
import { UIManager } from '../../core/ui.js';
import {
    generateLobbyObjects,
    LOBBY_W,
    LOBBY_H,
    TILE_SIZE,
    MAP_WIDTH,
    MAP_HEIGHT,
    CX,
    CY,
    CORRIDOR_START_Y,
    COLORS,
    SPAWN_POSITION,
} from './casinoLobbyData.js';
import { drawGunmanTableProp } from './gunmanTable.js';
import { RussianRouletteUI } from '../../features/russianRoulette/russianRouletteUI.js';

/**
 */
export class CasinoLobbyScene {
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

        
        // online sync (MVP)
        this._netAcc = 0;
        this._netRoom = 'lobby';
this.player = new Player(SPAWN_POSITION.x, SPAWN_POSITION.y);
        this.objects = generateLobbyObjects();

        this.camera = { x: 0, y: 0 };
        this.nearPortal = null;
        this._rrMessageHandler = null;
        this.nearest = null;
        this.ui = new UIManager();
        this.rrUI = null;

        this._touchStartX = 0;
        this._touchStartY = 0;

        this._handleTouchStart = this._handleTouchStart.bind(this);
        this._handleTouchMove = this._handleTouchMove.bind(this);
        this._handleTouchEnd = this._handleTouchEnd.bind(this);
        this._handleMobileAction = this._handleMobileAction.bind(this);

        this.waterParticles = [];
        for (let i = 0; i < 30; i++) {
            this.waterParticles.push({
                x: 0,
                y: 0,
                vx: 0,
                vy: 0,
                life: Math.random() * 20,
            });
        }

        this.lightCanvas = document.createElement('canvas');
        this.lightCanvas.width = LOBBY_W;
        this.lightCanvas.height = LOBBY_H;
        this.lightCtx = this.lightCanvas.getContext('2d');

        this.sceneManager = null;

        this.portalLock = 0;
    }

    /**
     */
    enter(spawnX, spawnY) {
        if (spawnX !== undefined && spawnY !== undefined) {
            this.player.x = spawnX;
            this.player.y = spawnY;
        } else {
            this.player.x = SPAWN_POSITION.x;
            this.player.y = SPAWN_POSITION.y;
        }
        this.player.name = getNickname();
        this._netRoom = 'lobby';

        if (spawnX !== undefined && spawnY !== undefined) {
            this.portalLock = 0.8;
        } else {
            this.portalLock = 0;
        }

        this.ui.setLocation('Casino Lobby');

        this.rrUI = new RussianRouletteUI({
            input: this.input,
            modalId: 'rr-modal',
            closeBtnId: 'rr-close',
            iframeId: 'rr-iframe',
        });

        if (this._rrMessageHandler) {
            window.removeEventListener('message', this._rrMessageHandler);
            this._rrMessageHandler = null;
        }

        this._rrMessageHandler = (ev) => {
            const data = ev && ev.data;
            if (!data || data.__RR__ !== true) return;

            if (data.type === 'RR_EXIT') {
                this.rrUI?.close();
                this.input.clear();
                this.nearest = null;
                this.ui.hidePrompt();
                return;
            }

            if (data.type !== 'RR_RESULT') return;

            if (data.result === 'WIN') {
                const reward = Number(data.reward) || 500000;
                this.app.addCash(reward);

                setTimeout(() => {
                    this.rrUI?.close();
                }, 900);
                return;
            }

            if (data.result === 'DEATH') {
                setTimeout(() => {
                    this.rrUI?.close();
                    this.nearest = null;
                    this.ui.hidePrompt();
                }, 900);
            }
        };
        window.addEventListener('message', this._rrMessageHandler);

        this.input.onAction = (action) => this.handleAction(action);

        this._bindTouchControls();
        this.ui.setMobileActionHandler(this._handleMobileAction);

        this._resize();

        this._sendImmediateState();
    }

    /**
     */
    exit() {
        if (this.rrUI) {
            this.rrUI.close();
            this.rrUI.destroy();
            this.rrUI = null;
        }
        if (this._rrMessageHandler) {
            window.removeEventListener('message', this._rrMessageHandler);
            this._rrMessageHandler = null;
        }
        this.nearest = null;
        this.ui.hidePrompt();
        this.input.onAction = null;
        this._unbindTouchControls();
        this.ui.setMobileActionHandler(null);
    }

    /**
     * @param {string} action
     */
    handleAction(action) {
        if (action === ACTIONS.CLOSE) {
            if (this.rrUI && this.rrUI.isOpen) return;
            return;
        }

        if (action !== ACTIONS.INTERACT) return;

        if (this.nearest && this.nearest.type === 'gunman_table') {
            this.rrUI?.open();
            this.input.clear();
            this.nearest = null;
            this.ui.hidePrompt();
            return;
        }
    }

    /**
     * @param {number} dt
     */
    update(dt) {
        const direction = this.input.getMoveDirection();
        this.player.move(direction, LOBBY_W, LOBBY_H, (x, y) => {
            for (const obj of this.objects) {
                if (this._checkCollision(obj, x, y)) return false;
            }
            return true;
        });
        this.portalLock = Math.max(0, this.portalLock - dt);
        this._updateInteraction();

        this._updateCamera();

        this._updateWaterParticles();

        this._pushNetState(dt);
    }

    /**
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        ctx.save();
        ctx.translate(-this.camera.x, -this.camera.y);

        this._drawFloor(ctx);

        this._drawWallsWithHallway(ctx);

        this._drawCarpetPath(ctx);

        this._drawObjects(ctx);

        this.player.draw(ctx);
        this._drawRemotePlayers(ctx);

        this._drawLighting(ctx);

        ctx.restore();
    }

    /**
     */
    _checkCollision(obj, nextX, nextY) {
        if (obj.type === 'portal') return false;

        const pr = CONFIG.PLAYER_RADIUS;

        if (obj.type === 'wall') {
            return !(
                nextX - pr > obj.x + obj.w ||
                nextX + pr < obj.x ||
                nextY - pr > obj.y + obj.h ||
                nextY + pr < obj.y
            );
        }

        if (obj.type === 'metal_detector') {
            const width = 4 * TILE_SIZE;
            const postW = 20;
            const postH = TILE_SIZE + 10;
            const topY = obj.y - 10;
            const cy = topY + postH / 2;
            const leftX = obj.x - width / 2 + 10;
            const rightX = obj.x + width / 2 - 10;
            const hw = postW / 2;
            const hh = postH / 2;
            const hitPost = (cx) => !(
                nextX - pr > cx + hw ||
                nextX + pr < cx - hw ||
                nextY - pr > cy + hh ||
                nextY + pr < cy - hh
            );
            return hitPost(leftX) || hitPost(rightX);
        }

        if (obj.type === 'gunman_table') {
            const angle = obj.rotation ?? 0;
            const s = obj.scale ?? 1;

            const hitW = (obj.hitW ?? obj.w ?? 0) * s;
            const hitH = (obj.hitH ?? obj.h ?? 0) * s;
            const hx = (obj.hitOffsetX ?? obj.offsetX ?? 0) * s;
            const hy = (obj.hitOffsetY ?? obj.offsetY ?? 0) * s;

            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const rcx = obj.x + cos * hx - sin * hy;
            const rcy = obj.y + sin * hx + cos * hy;

            const dx = nextX - rcx;
            const dy = nextY - rcy;
            const localX = cos * dx + sin * dy;
            const localY = -sin * dx + cos * dy;

            const halfW = hitW / 2;
            const halfH = hitH / 2;

            const clampedX = Math.max(-halfW, Math.min(halfW, localX));
            const clampedY = Math.max(-halfH, Math.min(halfH, localY));

            const ddx = localX - clampedX;
            const ddy = localY - clampedY;
            return ddx * ddx + ddy * ddy <= pr * pr;
        }

        if (obj.type === 'statue' || obj.type === 'desk') {
            const hw = obj.w / 2;
            const hh = obj.h / 2;
            const ox = obj.offsetX ?? 0;
            const oy = obj.offsetY ?? 0;
            return !(
                nextX - pr > obj.x + ox + hw ||
                nextX + pr < obj.x + ox - hw ||
                nextY - pr > obj.y + oy + hh ||
                nextY + pr < obj.y + oy - hh
            );
        }

        if (obj.type === 'fountain' || obj.type === 'plant') {
            const dx = nextX - obj.x;
            const dy = nextY - obj.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            return dist < pr + obj.r;
        }

        return false;
    }

    /**
     */
    _updateInteraction() {
        const portal = this.objects.find((o) => o.type === 'portal');
        if (!portal) {
            this.nearPortal = null;
        } else {
            const dx = this.player.x - portal.x;
            const dy = this.player.y - portal.y;
            const nearDoor = Math.abs(dx) < 48 && Math.abs(dy) < 24;
            const fromBelow = this.player.y > portal.y + 10;

            if (nearDoor && fromBelow) {
                this.nearPortal = portal;
                if (this.portalLock <= 0 && this.sceneManager) {
                    this.portalLock = 999;
                    this.sceneManager.goto(portal.target, portal.spawnX, portal.spawnY);
                    return;
                }
            } else {
                this.nearPortal = null;
            }
        }

        const table = this.objects.find((o) => o.type === 'gunman_table');
        if (table) {
            const dx = this.player.x - table.x;
            const dy = this.player.y - table.y;
            const near = Math.hypot(dx, dy) <= (CONFIG.INTERACTION_RANGE || 60);
            if (near) {
                this.nearest = table;
                this.ui.showPrompt('F 키로 상호작용');
                return;
            }
        }

        this.nearest = null;
        this.ui.hidePrompt();
    }

    /**
     */
    _updateCamera() {
        const viewW = this.canvas._logicalWidth || this.canvas.width;
        const viewH = this.canvas._logicalHeight || this.canvas.height;
        const targetX = this.player.x - viewW / 2;
        const targetY = this.player.y - viewH / 2;

        this.camera.x = clamp(targetX, 0, LOBBY_W - viewW);
        this.camera.y = clamp(targetY, 0, LOBBY_H - viewH);
    }

    /**
     */
    _updateWaterParticles() {
        this.waterParticles.forEach((p) => {
            p.life -= 0.5;
            if (p.life <= 0) {
                p.x = 0;
                p.y = 0;
                p.life = 10 + Math.random() * 10;
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 2;
                p.vx = Math.cos(angle) * speed;
                p.vy = Math.sin(angle) * speed;
            }
            p.x += p.vx;
            p.y += p.vy;
        });
    }

    _pushNetState() {
        // State sync is handled in GameApp to avoid duplicate sends.
    }

    _sendImmediateState() {
        const oc = window.__ONLINE__;
        if (!oc?.isConnected?.()) return;
        const cash = Number(this.app?.getState?.().cash) || 0;
        oc.sendState({ room: this._netRoom, x: this.player.x, y: this.player.y, cash });
    }

    _drawGunmanTable(ctx, obj) {
        drawGunmanTableProp(ctx, obj.x, obj.y, obj.scale ?? 1, obj.rotation ?? 0);
    }

    // ??硫?고뵆?덉씠: ?ㅻⅨ ?좎?瑜?媛꾨떒???쒖떆(??+ ?됰꽕??
    _drawRemotePlayers(ctx) {
        const oc = window.__ONLINE__;
        if (!oc?.isConnected?.()) return;

        const me = oc.playerId;
        const list = oc.listPlayers?.() || [];
        for (const rp of list) {
            if (!rp || !rp.id) continue;
            if (me && rp.id === me) continue;

            // 媛숈? 諛⑸쭔 ?쒖떆 (scene id 湲곗?)
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

    _handleTouchStart(e) {
        if (this.rrUI?.isOpen) return;
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

    _handleTouchMove(e) {
        if (this.rrUI?.isOpen) return;
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

    _handleTouchEnd() {
        this.input.setJoystick(null);
        this.ui.resetJoystickKnob();

        if (!this.input.isMobile) {
            this.ui.showJoystickZone(false);
        }
    }

    _handleMobileAction() {
        if (this.rrUI?.isOpen) return;
        this.handleAction(ACTIONS.INTERACT);
    }

    /**
     */
    _resize() {
        if (window.__RESIZE_CANVAS__) {
            window.__RESIZE_CANVAS__();
            return;
        }
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    /**
     */
    _drawFloor(ctx) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            for (let y = 0; y < MAP_HEIGHT; y++) {
                ctx.fillStyle = (x + y) % 2 === 0 ? COLORS.floorDark : COLORS.floorLight;
                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }

    /**
     */
    _drawWallsWithHallway(ctx) {
        const corridorWidth = 2;

        ctx.fillStyle = COLORS.wall;

        ctx.fillRect(0, 0, MAP_WIDTH * TILE_SIZE, TILE_SIZE);

        ctx.fillRect(0, 0, TILE_SIZE, CORRIDOR_START_Y * TILE_SIZE);

        ctx.fillRect((MAP_WIDTH - 1) * TILE_SIZE, 0, TILE_SIZE, MAP_HEIGHT * TILE_SIZE);

        ctx.fillRect(
            0,
            CORRIDOR_START_Y * TILE_SIZE,
            (CX - corridorWidth) * TILE_SIZE,
            (MAP_HEIGHT - CORRIDOR_START_Y) * TILE_SIZE
        );

        ctx.fillRect(
            (CX + corridorWidth) * TILE_SIZE,
            CORRIDOR_START_Y * TILE_SIZE,
            (MAP_WIDTH - (CX + corridorWidth)) * TILE_SIZE,
            (MAP_HEIGHT - CORRIDOR_START_Y) * TILE_SIZE
        );

        ctx.fillStyle = COLORS.wallTop;
        ctx.fillRect(0, 0, MAP_WIDTH * TILE_SIZE, 15);
        ctx.fillRect(0, CORRIDOR_START_Y * TILE_SIZE, (CX - corridorWidth) * TILE_SIZE, 15);
        ctx.fillRect(
            (CX + corridorWidth) * TILE_SIZE,
            CORRIDOR_START_Y * TILE_SIZE,
            (MAP_WIDTH - (CX + corridorWidth)) * TILE_SIZE,
            15
        );
    }

    /**
     */
    _drawCarpetPath(ctx) {
        ctx.fillStyle = COLORS.carpet;

        const pathWidth = 2;
        const startX = (CX - pathWidth / 2) * TILE_SIZE;

        ctx.fillRect(startX, 0, pathWidth * TILE_SIZE, MAP_HEIGHT * TILE_SIZE);

        const hPathY = (CY - 1) * TILE_SIZE;
        ctx.fillRect(startX, hPathY, (MAP_WIDTH / 2 + 2) * TILE_SIZE, 2 * TILE_SIZE);

        ctx.beginPath();
        ctx.arc(CX * TILE_SIZE, CY * TILE_SIZE, 4.5 * TILE_SIZE, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#F0E68C';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    /**
     */
    _drawObjects(ctx) {
        for (const obj of this.objects) {
            switch (obj.type) {
                case 'metal_detector':
                    this._drawMetalDetector(ctx, obj);
                    break;
                case 'statue':
                    this._drawDiceStatue(ctx, obj);
                    break;
                case 'fountain':
                    this._drawFountain(ctx, obj);
                    break;
                case 'desk':
                    this._drawDesk(ctx, obj);
                    break;
                case 'gunman_table':
                    this._drawGunmanTable(ctx, obj);
                    break;
                case 'plant':
                    this._drawPlant(ctx, obj);
                    break;
                case 'portal':
                    this._drawPortal(ctx, obj);
                    break;
            }
        }

        this._drawHallwayBarriers(ctx);

        this._drawSignBoards(ctx);
    }

    /**
     */
    _drawMetalDetector(ctx, obj) {
        const x = obj.x;
        const y = obj.y;
        const width = 4 * TILE_SIZE;
        const height = 1.2 * TILE_SIZE;

        ctx.fillStyle = '#111';
        ctx.fillRect(x - width / 2 - 10, y + TILE_SIZE - 5, width + 20, 10);

        this._drawDetectorPost(ctx, x - width / 2 + 10, y);
        this._drawDetectorPost(ctx, x + width / 2 - 10, y);

        const headerH = 20;
        const grad = ctx.createLinearGradient(x - width / 2, y, x + width / 2, y);
        grad.addColorStop(0, '#444');
        grad.addColorStop(0.5, '#666');
        grad.addColorStop(1, '#444');
        ctx.fillStyle = grad;
        ctx.fillRect(x - width / 2, y - headerH, width, headerH);

        // LED
        const time = Date.now();
        const isActive = Math.sin(time / 300) > 0;
        ctx.fillStyle = '#000';
        ctx.fillRect(x - 20, y - headerH + 2, 40, 16);

        ctx.fillStyle = isActive ? '#00FF00' : '#004400';
        ctx.shadowBlur = isActive ? 10 : 0;
        ctx.shadowColor = '#00FF00';
        ctx.beginPath();
        ctx.arc(x, y - headerH + 10, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    _drawDetectorPost(ctx, px, py) {
        const w = 20;
        const h = TILE_SIZE + 10;

        ctx.fillStyle = '#555';
        ctx.fillRect(px - w / 2, py - 10, w, h);

        ctx.fillStyle = '#888';
        ctx.fillRect(px - w / 4, py - 10, 2, h);
    }

    /**
     */
    _drawDiceStatue(ctx, obj) {
        const px = obj.x;
        const py = obj.y;

        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.ellipse(px, py + 20, 40, 15, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#111';
        ctx.fillRect(px - 25, py + 15, 50, 15);
        ctx.fillStyle = '#333';
        ctx.fillRect(px - 25, py + 15, 50, 5);

        const size = 35;
        ctx.save();
        ctx.translate(px, py - 10);
        ctx.rotate(Math.PI / 4 + Date.now() / 2000);

        const grad = ctx.createLinearGradient(-size, -size, size, size);
        grad.addColorStop(0, '#FFFACD');
        grad.addColorStop(0.5, '#FFD700');
        grad.addColorStop(1, '#DAA520');
        ctx.fillStyle = grad;

        this._roundRect(ctx, -size, -size, size * 2, size * 2, 10);
        ctx.fill();

        ctx.strokeStyle = '#B8860B';
        ctx.lineWidth = 2;
        ctx.stroke();

        // ??
        ctx.fillStyle = '#4B3621';
        const dotR = 5;
        const offset = 18;
        [
            [0, 0],
            [-offset, -offset],
            [offset, -offset],
            [-offset, offset],
            [offset, offset],
        ].forEach(([dx, dy]) => {
            ctx.beginPath();
            ctx.arc(dx, dy, dotR, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();
    }

    /**
     */
    _drawFountain(ctx, obj) {
        const px = obj.x;
        const py = obj.y;

        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(px, py, TILE_SIZE * 1.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#CCC';
        ctx.beginPath();
        ctx.arc(px, py, TILE_SIZE * 1.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = COLORS.water;
        ctx.beginPath();
        ctx.arc(px, py, TILE_SIZE * 1.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#E0FFFF';
        this.waterParticles.forEach((p) => {
            ctx.beginPath();
            ctx.arc(px + p.x, py + p.y, 2.5, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    /**
     */
    _drawDesk(ctx, obj) {
        const x = obj.x;
        const y = obj.y;
        const w = obj.w;
        const h = obj.h;

        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(x - w + 5, y - h / 2 + 5, w, h);

        ctx.fillStyle = COLORS.desk;
        ctx.fillRect(x - w, y - h / 2, w, h);

        ctx.fillStyle = '#6D4C41';
        ctx.fillRect(x - w - 5, y - h / 2 - 5, w + 10, h + 10);

        // NPC
        this._drawNPC(ctx, x - w / 2, y - TILE_SIZE);
        this._drawNPC(ctx, x - w / 2, y + TILE_SIZE);
    }

    _drawNPC(ctx, px, py) {
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(px, py + 10, 13, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFCCAA';
        ctx.beginPath();
        ctx.arc(px, py + 10, 9, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     */
    _drawPlant(ctx, obj) {
        const px = obj.x;
        const py = obj.y;

        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.arc(px + 2, py + 2, 16, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.arc(px, py, 14, 0, Math.PI * 2);
        ctx.fill();

        // ??
        ctx.fillStyle = COLORS.plantGreen;
        for (let i = 0; i < 7; i++) {
            const angle = (Math.PI * 2 / 7) * i;
            ctx.beginPath();
            ctx.arc(px + Math.cos(angle) * 12, py + Math.sin(angle) * 12, 8, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = '#32CD32';
        ctx.beginPath();
        ctx.arc(px, py, 10, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     */
    _drawPortal(ctx, obj) {
        const time = Date.now();
        const pulse = 0.5 + 0.5 * Math.sin(time / 500);

        const grad = ctx.createRadialGradient(obj.x, obj.y, 0, obj.x, obj.y, 50);
        grad.addColorStop(0, `rgba(255, 215, 0, ${pulse * 0.6})`);
        grad.addColorStop(1, 'rgba(255, 215, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(obj.x, obj.y, 50, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     */
    _drawHallwayBarriers(ctx) {
        const leftX = (CX - 2.2) * TILE_SIZE;
        const rightX = (CX + 2.2) * TILE_SIZE;
        const y1 = 14 * TILE_SIZE;
        const y2 = 17.5 * TILE_SIZE;

        this._drawBarrierLine(ctx, leftX, y1, leftX, y2);
        this._drawBarrierLine(ctx, rightX, y1, rightX, y2);
    }

    _drawBarrierLine(ctx, x1, y1, x2, y2) {
        ctx.strokeStyle = '#D00000';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x1, y1 - 25);
        ctx.lineTo(x2, y2 - 25);
        ctx.stroke();

        const steps = 3;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const px = x1 + (x2 - x1) * t;
            const py = y1 + (y2 - y1) * t;

            ctx.fillStyle = '#C0C0C0';
            ctx.fillRect(px - 3, py - 30, 6, 30);

            ctx.beginPath();
            ctx.arc(px, py, 6, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = COLORS.gold;
            ctx.beginPath();
            ctx.arc(px, py - 30, 6, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /**
     */
    _drawSignBoards(ctx) {
        this._drawSingleSign(ctx, CX * TILE_SIZE, 0.5 * TILE_SIZE, 'CASINO HALL', 'up');
        this._drawSingleSign(ctx, 1.5 * TILE_SIZE, CY * TILE_SIZE, 'RESTROOM', 'left');
    }

    _drawSingleSign(ctx, px, py, text, dir) {
        const w = 120;
        const h = 26;

        ctx.save();
        ctx.translate(px, py);
        if (dir === 'left') ctx.rotate(-Math.PI / 2);
        if (dir === 'right') ctx.rotate(Math.PI / 2);

        ctx.fillStyle = '#000';
        ctx.strokeStyle = COLORS.gold;
        ctx.lineWidth = 2;
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.strokeRect(-w / 2, -h / 2, w, h);

        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 0, 1);
        ctx.restore();
    }

    /**
     */
    _drawLighting(ctx) {
        const lightCtx = this.lightCtx;
        lightCtx.clearRect(0, 0, this.lightCanvas.width, this.lightCanvas.height);
        lightCtx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        lightCtx.fillRect(0, 0, this.lightCanvas.width, this.lightCanvas.height);

        lightCtx.globalCompositeOperation = 'destination-out';

        const lights = [
            { x: CX * TILE_SIZE, y: CY * TILE_SIZE, r: 160 },
            { x: (MAP_WIDTH - 2) * TILE_SIZE, y: CY * TILE_SIZE, r: 100 },
            { x: 6 * TILE_SIZE, y: CY * TILE_SIZE, r: 80 },
            { x: CX * TILE_SIZE, y: CORRIDOR_START_Y * TILE_SIZE, r: 110 },
            { x: CX * TILE_SIZE, y: 17 * TILE_SIZE, r: 90 },
            { x: CX * TILE_SIZE, y: 2 * TILE_SIZE, r: 100 },
        ];

        lights.forEach((light) => {
            const g = lightCtx.createRadialGradient(light.x, light.y, 0, light.x, light.y, light.r);
            g.addColorStop(0, 'rgba(0,0,0,1)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            lightCtx.fillStyle = g;
            lightCtx.beginPath();
            lightCtx.arc(light.x, light.y, light.r, 0, Math.PI * 2);
            lightCtx.fill();
        });

        lightCtx.globalCompositeOperation = 'source-over';
        ctx.drawImage(this.lightCanvas, 0, 0);
    }

    /**
     */
    _roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r);
        ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h);
        ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
    }
}



