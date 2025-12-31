// menuSystem.js - Main menu + settings (single entry via index.html)

import { SCENES } from '../../core/constants.js';
import { getNickname, setNickname } from '../../core/profile.js';

function qs(id) {
    return document.getElementById(id);
}

function focusGameCanvas() {
    const c = document.getElementById('gameCanvas');
    try {
        document.activeElement?.blur?.();
        c?.setAttribute('tabindex', '-1');
        c?.focus?.();
    } catch {
        /* noop */
    }
}

function setInert(el, v) {
    if (!el) return;
    try {
        el.inert = !!v;
    } catch {
        /* ignore */
    }
}

export function initMenuSystem({ sceneManager, app, onlineClient, connectUrl } = {}) {
    const menuRoot = qs('main-menu');
    const nickInput = qs('menu-nickname');
    const startBtn = qs('menu-start');
    const settingsBtn = qs('settings-btn');
    const settingsModal = qs('settings-modal');
    const settingsBackdrop = qs('settings-backdrop');
    const settingsClose = qs('settings-close');
    const settingsToMain = qs('settings-to-main');
    const deathOverlay = qs('death-overlay');
    const playerList = qs('playerlist-overlay');
    let deathTimer = null;

    if (!menuRoot || !nickInput || !startBtn) return;

    function openMain() {
        document.body.classList.add('menu-open');
        setInert(menuRoot, false);
        menuRoot.classList.remove('hidden');
        menuRoot.setAttribute('aria-hidden', 'false');
        if (deathOverlay) {
            deathOverlay.classList.add('hidden');
            deathOverlay.setAttribute('aria-hidden', 'true');
        }
        if (playerList) {
            playerList.classList.add('hidden');
            playerList.setAttribute('aria-hidden', 'true');
        }
        nickInput.value = getNickname();
        try {
            nickInput.focus();
            nickInput.select();
        } catch {
            /* ignore */
        }
        sceneManager.goto(SCENES.MAIN);
    }

    function closeMain() {
        focusGameCanvas();
        setInert(menuRoot, true);
        document.body.classList.remove('menu-open');
        menuRoot.classList.add('hidden');
        menuRoot.setAttribute('aria-hidden', 'true');
    }

    function openSettings() {
        if (!settingsModal) return;
        setInert(settingsModal, false);
        settingsModal.classList.remove('hidden');
        settingsModal.setAttribute('aria-hidden', 'false');
    }

    function closeSettings() {
        if (!settingsModal) return;
        focusGameCanvas();
        setInert(settingsModal, true);
        settingsModal.classList.add('hidden');
        settingsModal.setAttribute('aria-hidden', 'true');
    }

    function startGame() {
        const nick = (nickInput.value || '').trim();
        if (nick) setNickname(nick);
        if (onlineClient && !onlineClient.isConnected?.()) {
            onlineClient.connect({ url: connectUrl, nickname: nick || getNickname() });
        }
        if (typeof app.resetForNewRun === 'function') app.resetForNewRun();
        closeMain();
        sceneManager.goto(SCENES.LOBBY);
    }

    startBtn.addEventListener('click', startGame);
    nickInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            startGame();
        }
    });

    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            if (document.body.classList.contains('menu-open')) return;
            openSettings();
        });
    }

    if (settingsBackdrop) settingsBackdrop.addEventListener('click', closeSettings);
    if (settingsClose) settingsClose.addEventListener('click', closeSettings);
    if (settingsToMain) {
        settingsToMain.addEventListener('click', () => {
            closeSettings();
            openMain();
        });
    }

    window.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (settingsModal && !settingsModal.classList.contains('hidden')) {
            e.preventDefault();
            closeSettings();
        }
    });

    window.addEventListener('message', (ev) => {
        const d = ev?.data;
        if (!d || d.__RR__ !== true) return;
        if (d.type === 'RR_RESULT' && d.result === 'DEATH') {
            onlineClient?.sendSys?.(`${getNickname()}님이 (총)에 맞아 사망하셨습니다.`);
            if (deathTimer) {
                clearTimeout(deathTimer);
                deathTimer = null;
            }
            if (deathOverlay) {
                deathOverlay.classList.remove('hidden');
                deathOverlay.setAttribute('aria-hidden', 'false');
            }
            deathTimer = setTimeout(() => {
                if (typeof app.zeroOutWallet === 'function') app.zeroOutWallet();
                if (deathOverlay) {
                    deathOverlay.classList.add('hidden');
                    deathOverlay.setAttribute('aria-hidden', 'true');
                }
                openMain();
            }, 2800);
        }
    });

    window.__MENU__ = { openMain, closeMain, openSettings, closeSettings };

    openMain();
}
