// player.js - 플레이어 공용 로직
// Core 모듈

import { clamp, CONFIG } from './constants.js';

/**
 * 플레이어 상태
 */
export class Player {
    /**
     * @param {object} opts
     * @param {number} [opts.x]
     * @param {number} [opts.y]
     * @param {number} [opts.speed]
     * @param {number} [opts.radius]
     * @param {string} [opts.color]
     */
    constructor(opts = {}) {
        this.x = opts.x ?? 360;
        this.y = opts.y ?? 360;
        this.speed = opts.speed ?? CONFIG.PLAYER_SPEED;
        this.radius = opts.radius ?? CONFIG.PLAYER_RADIUS;
        this.color = opts.color ?? '#3b82f6';
        this.name = opts.name ?? '나';
        this.chatMessage = null;
        this.chatTimer = null;
    }

    /**
     * 채팅 메시지 설정
     * @param {string} msg 
     */
    say(msg) {
        this.chatMessage = msg;
        if (this.chatTimer) clearTimeout(this.chatTimer);
        this.chatTimer = setTimeout(() => {
            this.chatMessage = null;
        }, 3000); // 3초 후 사라짐
    }

    /**
     * 이동 업데이트
     * @param {{ dx: number, dy: number }} direction - 정규화된 방향 벡터
     * @param {number} mapWidth
     * @param {number} mapHeight
     */
    move(direction, mapWidth, mapHeight, isPosValid = null) {
        let { dx, dy } = direction;

        if (dx === 0 && dy === 0) return;

        // 정규화
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
            dx /= len;
            dy /= len;
        }

        const nextX = this.x + dx * this.speed;
        const nextY = this.y + dy * this.speed;

        // X축 이동 시도
        let canMoveX = true;
        let testX = clamp(nextX, this.radius, mapWidth - this.radius);
        if (isPosValid && !isPosValid(testX, this.y)) {
            canMoveX = false;
        }

        if (canMoveX) {
            this.x = testX;
        }

        // Y축 이동 시도
        let canMoveY = true;
        let testY = clamp(nextY, this.radius, mapHeight - this.radius);
        // X축 이동이 성공했으면 변경된 X 기준, 실패했으면 기존 X 기준으로 Y 체크
        if (isPosValid && !isPosValid(this.x, testY)) {
            canMoveY = false;
        }

        if (canMoveY) {
            this.y = testY;
        }
    }

    /**
     * 플레이어 그리기
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} offsetX - 카메라 오프셋
     * @param {number} offsetY - 카메라 오프셋
     */
    draw(ctx, offsetX = 0, offsetY = 0) {
        const drawX = this.x - offsetX;
        const drawY = this.y - offsetY;

        // 그림자
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.arc(drawX, drawY + 5, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // 플레이어
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(drawX, drawY, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // 레이블
        ctx.fillStyle = '#fff';
        ctx.font = '12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, drawX, drawY - 22);

        // 채팅 말풍선
        if (this.chatMessage) {
            this._drawChatBubble(ctx, drawX, drawY - 40, this.chatMessage);
        }
    }

    _drawChatBubble(ctx, x, y, text) {
        ctx.save();
        ctx.font = '14px sans-serif';
        const metrics = ctx.measureText(text);
        const w = metrics.width + 20;
        const h = 30;
        const r = 10;

        // 배경 (말풍선)
        ctx.fillStyle = 'white';
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.roundRect(x - w / 2, y - h, w, h, r);
        ctx.fill();
        ctx.stroke();

        // 꼬리
        ctx.beginPath();
        ctx.moveTo(x - 5, y);
        ctx.lineTo(x, y + 6);
        ctx.lineTo(x + 5, y);
        ctx.fill();
        ctx.stroke();

        // 텍스트
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, y - h / 2);
        ctx.restore();
    }

    /**
     * 위치 설정
     * @param {number} x
     * @param {number} y
     */
    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }
}
