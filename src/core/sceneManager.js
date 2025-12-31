// sceneManager.js - 씬 전환 관리자
// Core 모듈

/**
 * 씬 인터페이스
 * @typedef {object} Scene
 * @property {() => void} enter - 씬 진입 시 호출
 * @property {() => void} exit - 씬 퇴장 시 호출 (리스너 정리)
 * @property {(action: string) => void} handleAction - 액션 처리
 * @property {(dt: number) => void} update - 매 프레임 업데이트
 * @property {(ctx: CanvasRenderingContext2D) => void} [render] - 렌더링 (선택)
 */

/**
 * 씬 매니저
 * - 씬 등록/전환 관리
 * - 표준 인터페이스로 씬 호출
 */
export class SceneManager {
    constructor() {
        /** @type {Map<string, Scene>} */
        this.scenes = new Map();

        /** @type {Scene | null} */
        this.currentScene = null;

        /** @type {string | null} */
        this.currentSceneId = null;
    }

    /**
     * 씬 등록
     * @param {string} id - 씬 ID (SCENES enum 사용)
     * @param {Scene} scene - 씬 객체
     */
    register(id, scene) {
        this.scenes.set(id, scene);
    }

    /**
     * 씬 전환
     * @param {string} id - 전환할 씬 ID
     */
    goto(id, ...enterArgs) {
        const nextScene = this.scenes.get(id);
        if (!nextScene) {
            console.warn(`SceneManager: Scene "${id}" not found`);
            return;
        }

        // 현재 씬 퇴장
        if (this.currentScene) {
            this.currentScene.exit();
        }

        // 새 씬 진입
        this.currentScene = nextScene;
        this.currentSceneId = id;
        this.currentScene.enter(...enterArgs);
    }

    /**
     * 액션 처리 (현재 씬에 전달)
     * @param {string} action
     */
    handleAction(action) {
        if (this.currentScene && this.currentScene.handleAction) {
            this.currentScene.handleAction(action);
        }
    }

    /**
     * 프레임 업데이트 (현재 씬에 전달)
     * @param {number} dt - 델타 시간 (초)
     */
    update(dt) {
        if (this.currentScene && this.currentScene.update) {
            this.currentScene.update(dt);
        }
    }

    /**
     * 렌더링 (현재 씬에 전달)
     * @param {CanvasRenderingContext2D} ctx
     */
    render(ctx) {
        if (this.currentScene && this.currentScene.render) {
            this.currentScene.render(ctx);
        }
    }

    /**
     * 현재 씬 ID 반환
     * @returns {string | null}
     */
    getCurrentSceneId() {
        return this.currentSceneId;
    }

    /**
     * 현재 Scene 반환
     * @returns {Scene | null}
     */
    getCurrentScene() {
        return this.currentScene;
    }
}
