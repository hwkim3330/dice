// worldScene.js - 월드 맵 (예시)
import { ACTIONS } from '../core/constants.js';
import { Player } from '../core/player.js';

export class WorldScene {
    constructor(ctx, app, input) {
        this.ctx = ctx;
        this.app = app;
        this.input = input;
        this.player = new Player({ x: 100, y: 100, color: '#eab308' }); // Gold color for world
    }

    enter() {
        // 입력 액션 핸들러
        this.input.onAction = (action) => this.handleAction(action);

        // 간단한 안내
        console.log("Entered World Scene");
    }

    exit() {
        this.input.clear();
        this.input.onAction = null;
    }

    handleAction(action) {
        // ...
    }

    update(dt) {
        const direction = this.input.getMoveDirection();
        this.player.move(direction, 800, 600);
    }

    render(ctx) {
        // 배경
        ctx.fillStyle = '#1e293b'; // Slate-800
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // 텍스트
        ctx.fillStyle = '#fff';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('WORLD MAP (Under Construction)', ctx.canvas.width / 2, ctx.canvas.height / 2);

        this.player.draw(ctx);
    }
}
