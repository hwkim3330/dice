// casinoData.js - 카지노 오브젝트 배치 데이터
// Scenes 모듈

import { CONFIG } from '../../core/constants.js';

/** 맵 크기 */
export const MAP_W = CONFIG.MAP_WIDTH;
export const MAP_H = CONFIG.MAP_HEIGHT;

/** 에셋 크기 */
export const ASSETS = {
    slot: { w: 60, h: 40 },
    card: { w: 120, h: 70 },
    roulette: { r: 40 },
    exchange: { w: 360, h: 220 },
};

/**
 * 카지노 오브젝트 생성
 * @returns {Array<object>}
 */
export function generateCasinoObjects() {
    const objects = [];

    // 슬롯 구역 (좌상)
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 10; c++) {
            objects.push({
                type: 'slot',
                x: 180 + c * 90,
                y: 220 + r * 110,
                w: ASSETS.slot.w,
                h: ASSETS.slot.h,
            });
        }
    }

    // 블랙잭 테이블 (좌하, 기존 카드 구역 재활용)
    for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 3; c++) {
            objects.push({
                type: 'blackjack',
                x: 260 + c * 260,
                y: 900 + r * 200,
                w: ASSETS.card.w,
                h: ASSETS.card.h,
            });
        }
    }

    // 룰렛 (중앙)
    for (let i = 0; i < 3; i++) {
        objects.push({
            type: 'roulette',
            x: 1250,
            y: 360 + i * 240,
            r: ASSETS.roulette.r,
        });
    }

    // 환전소 (우하 쪽)
    objects.push({
        type: 'exchange',
        x: 1500,
        y: 1020,
        w: ASSETS.exchange.w,
        w: ASSETS.exchange.w,
        h: ASSETS.exchange.h,
    });

    // 빨간 카페트 (맵 맨 오른쪽 중간)
    objects.push({
        type: 'carpet',
        x: MAP_W - 200,
        y: MAP_H / 2 - 80,
        w: 200,
        h: 160,
    });

    // 출입구 (맵 맨아래 중간, 납작하게)
    objects.push({
        type: 'exit',
        x: MAP_W / 2 - 150, // 중앙 정렬 (너비 300)
        y: MAP_H - 70,      // 바닥에 붙게 (높이 50 + 여백 20)
        w: 300,
        h: 50,
    });

    // 벽(장식)
    objects.push({ type: 'wall', x: 0, y: 0, w: MAP_W, h: 20 });
    objects.push({ type: 'wall', x: 0, y: MAP_H - 20, w: MAP_W, h: 20 });
    objects.push({ type: 'wall', x: 0, y: 0, w: 20, h: MAP_H });
    objects.push({ type: 'wall', x: MAP_W - 20, y: 0, w: 20, h: MAP_H });

    return objects;
}

/**
 * 위치별 구역 이름 반환
 * @param {number} x
 * @param {number} y
 * @param {Array<object>} objects
 * @returns {{ text: string, color: string }}
 */
export function getLocationInfo(x, y, objects) {
    // 환전소 근처 우선 체크
    const booth = objects.find(o => o.type === 'exchange');
    if (booth) {
        const cx = booth.x + booth.w / 2;
        const cy = booth.y + booth.h / 2;
        const dx = cx - x;
        const dy = cy - y;
        if ((dx * dx + dy * dy) <= 140 * 140) {
            return { text: '환전소', color: '#fbbf24' };
        }
    }

    // 블랙잭 테이블 구역 (좌하단)
    // 기존 단일 체크 대신 구역 체크로 변경하거나, 가장 가까운 테이블 체크
    // 여기서 간단히 구역으로 처리
    if (x < 1100 && y >= 750) {
        return { text: '블랙잭 테이블', color: '#60a5fa' };
    }

    if (x < 1100 && y < 750) {
        return { text: '슬롯 머신 구역', color: '#fbbf24' };
    } else {
        return { text: '카지노 로비', color: '#ffffff' };
    }
}
