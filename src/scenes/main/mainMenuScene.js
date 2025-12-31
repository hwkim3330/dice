// mainMenuScene.js - Main title scene before game start

export class MainMenuScene {
    /**
     * @param {CanvasRenderingContext2D} ctx
     */
    constructor(ctx) {
        this.ctx = ctx;
        this.canvas = ctx.canvas;
    }

    enter() {}

    exit() {}

    update() {}

    render(ctx) {
        const viewW = this.canvas._logicalWidth || this.canvas.width;
        const viewH = this.canvas._logicalHeight || this.canvas.height;
        ctx.fillStyle = '#070707';
        ctx.fillRect(0, 0, viewW, viewH);

        const g = ctx.createRadialGradient(
            viewW * 0.5,
            viewH * 0.45,
            10,
            viewW * 0.5,
            viewH * 0.5,
            Math.max(viewW, viewH) * 0.7
        );
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, 'rgba(0,0,0,0.65)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, viewW, viewH);
    }
}
