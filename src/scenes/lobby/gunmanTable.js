// gunmanTable.js - Lobby fountain-front "gunman + table" fixed prop (Canvas draw)
// Based on pasted.txt design (colors/shapes/ratio)

function roundRectPath(ctx, x, y, w, h, r) {
    const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
    if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, rr);
        return;
    }
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.arcTo(x + w, y, x + w, y + rr, rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
    ctx.lineTo(x + rr, y + h);
    ctx.arcTo(x, y + h, x, y + h - rr, rr);
    ctx.lineTo(x, y + rr);
    ctx.arcTo(x, y, x + rr, y, rr);
    ctx.closePath();
}

function drawTable(ctx, x, y) {
    const width = 150;
    const height = 70;

    ctx.save();
    ctx.translate(x, y);

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(-width / 2 + 8, -height / 2 + 8, width, height);

    // Table top
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(-width / 2, -height / 2, width, height);

    // Grain
    ctx.strokeStyle = '#5D2906';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-width / 2 + 15, -height / 2);
    ctx.lineTo(-width / 2 + 15, height / 2);
    ctx.moveTo(width / 2 - 15, -height / 2);
    ctx.lineTo(width / 2 - 15, height / 2);
    ctx.stroke();

    ctx.restore();
}

function drawGun(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 6);

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    roundRectPath(ctx, -15 + 2, -10 + 2, 40, 8, 2);
    ctx.fill();
    roundRectPath(ctx, -20 + 2, -12 + 2, 15, 20, 3);
    ctx.fill();

    // Barrel
    ctx.fillStyle = '#2c3e50';
    roundRectPath(ctx, -15, -10, 40, 8, 2);
    ctx.fill();

    // Grip
    ctx.fillStyle = '#3E2723';
    roundRectPath(ctx, -20, -12, 18, 22, 3);
    ctx.fill();

    // Detail
    ctx.fillStyle = '#261612';
    ctx.fillRect(-18, -2, 4, 10);

    ctx.restore();
}

function drawCharacter(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(5, 5, 45, 25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Suit
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.ellipse(0, 0, 42, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Shirt
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-12, -5);
    ctx.lineTo(12, -5);
    ctx.lineTo(0, 15);
    ctx.fill();

    // Tie
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.moveTo(-3, -5);
    ctx.lineTo(3, -5);
    ctx.lineTo(2, 0);
    ctx.lineTo(-2, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-2, 0);
    ctx.lineTo(2, 0);
    ctx.lineTo(0, 14);
    ctx.fill();

    // Face
    ctx.fillStyle = '#f1c27d';
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();

    // Hair (cover lower face so head faces upward)
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI);
    ctx.fill();

    ctx.restore();
}

/**
 * Lobby gunman + table prop.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - World position (center)
 * @param {number} y - World position (center)
 * @param {number} scale
 * @param {number} rotation
 */
export function drawGunmanTableProp(ctx, x, y, scale = 1, rotation = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.scale(scale, scale);

    // Table (top) + gun (on table) + gunman (below)
    drawTable(ctx, -12, 20);
    drawGun(ctx, 3, 20);
    drawCharacter(ctx, 0, 70);

    ctx.restore();
}
