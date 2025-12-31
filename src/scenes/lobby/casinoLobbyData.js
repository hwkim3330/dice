
import { SCENES } from '../../core/constants.js';

export const TILE_SIZE = 40;
export const MAP_WIDTH = 32;
export const MAP_HEIGHT = 18;

export const LOBBY_W = MAP_WIDTH * TILE_SIZE; // 1280
export const LOBBY_H = MAP_HEIGHT * TILE_SIZE; // 720

export const CX = MAP_WIDTH / 2; // 16
export const CY = MAP_HEIGHT / 2; // 9

export const CORRIDOR_START_Y = 13;

export const COLORS = {
    floorDark: '#2D1B2E',
    floorLight: '#3D243E',
    wall: '#151515',
    wallTop: '#2a2a2a',
    gold: '#FFD700',
    metal: '#708090',
    desk: '#4A3121',
    carpet: '#960018',
    plantGreen: '#228B22',
    water: '#4682B4',
};

/**
 * @returns {Array<object>}
 */
export function generateLobbyObjects() {
    const objects = [];

    objects.push({
        type: 'portal',
        x: CX * TILE_SIZE,
        y: 2 * TILE_SIZE,
        w: 80,
        h: 40,
        target: SCENES.CASINO,
        spawnX: 1000,
        spawnY: 1300,
    });

    objects.push({
        type: 'metal_detector',
        x: CX * TILE_SIZE,
        y: CORRIDOR_START_Y * TILE_SIZE,
        w: 160,
        h: 60,
    });

    objects.push({
        type: 'statue',
        x: CX * TILE_SIZE,
        y: CY * TILE_SIZE,
        w: 80,
        h: 80,
    });

    objects.push({
        type: 'fountain',
        x: 6 * TILE_SIZE,
        y: CY * TILE_SIZE,
        r: 70,
    });

    objects.push({
        type: 'gunman_table',
        x: 6 * TILE_SIZE + 150,
        y: CY * TILE_SIZE,
        hitW: 150,
        hitH: 70,
        hitOffsetX: -12,
        hitOffsetY: 20,
        scale: 0.75,
        rotation: Math.PI / 2,
    });

    objects.push({
        type: 'desk',
        x: (MAP_WIDTH - 2.5) * TILE_SIZE,
        y: CY * TILE_SIZE,
        w: TILE_SIZE,
        h: 4 * TILE_SIZE,
    });

    const plantPositions = [
        { x: 2, y: 2 },
        { x: MAP_WIDTH - 3, y: 2 },
        { x: 8, y: 4 },
        { x: 24, y: 4 },
        { x: 4, y: CY },
        { x: CX - 3.5, y: CORRIDOR_START_Y + 0.5 },
        { x: CX + 3.5, y: CORRIDOR_START_Y + 0.5 },
    ];

    plantPositions.forEach((pos, i) => {
        objects.push({
            type: 'plant',
            x: pos.x * TILE_SIZE,
            y: pos.y * TILE_SIZE,
            r: 16,
        });
    });

    const corridorWidth = 2;
    
    objects.push({
        type: 'wall',
        x: 0,
        y: CORRIDOR_START_Y * TILE_SIZE,
        w: (CX - corridorWidth) * TILE_SIZE,
        h: (MAP_HEIGHT - CORRIDOR_START_Y) * TILE_SIZE,
    });

    objects.push({
        type: 'wall',
        x: (CX + corridorWidth) * TILE_SIZE,
        y: CORRIDOR_START_Y * TILE_SIZE,
        w: (MAP_WIDTH - (CX + corridorWidth)) * TILE_SIZE,
        h: (MAP_HEIGHT - CORRIDOR_START_Y) * TILE_SIZE,
    });

    objects.push({ type: 'wall', x: 0, y: 0, w: MAP_WIDTH * TILE_SIZE, h: TILE_SIZE });

    objects.push({ type: 'wall', x: 0, y: 0, w: TILE_SIZE, h: CORRIDOR_START_Y * TILE_SIZE });

    objects.push({ type: 'wall', x: (MAP_WIDTH - 1) * TILE_SIZE, y: 0, w: TILE_SIZE, h: MAP_HEIGHT * TILE_SIZE });

    return objects;
}

/**
 */
export const SPAWN_POSITION = {
    x: CX * TILE_SIZE,
    y: (MAP_HEIGHT - 1.5) * TILE_SIZE,
};
