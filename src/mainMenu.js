// mainMenu.js - main menu entry page controller

const PRESENCE_KEY = 'dl_server_presence_v1';
const BOOT_RESET_KEY = 'dl_boot_reset_v1';

function getOrCreatePresence() {
  try {
    const raw = sessionStorage.getItem(PRESENCE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && typeof p === 'object') {
        return {
          maxPlayers: Number.isFinite(p.maxPlayers) ? p.maxPlayers : 50,
          players: Number.isFinite(p.players) ? p.players : 0,
          status: typeof p.status === 'string' ? p.status : 'ONLINE',
        };
      }
    }
  } catch {
    // ignore
  }
  const fresh = { maxPlayers: 50, players: 0, status: 'ONLINE' };
  try {
    sessionStorage.setItem(PRESENCE_KEY, JSON.stringify(fresh));
  } catch {
    // ignore
  }
  return fresh;
}

function setBootResetOnce() {
  try {
    sessionStorage.setItem(BOOT_RESET_KEY, '1');
  } catch {
    // ignore
  }
}

function updateServerCount(el) {
  const p = getOrCreatePresence();
  el.textContent = `${p.players}/${p.maxPlayers}`;
}

function bind() {
  const startBtn = document.getElementById('mm-start');
  const startSub = document.getElementById('mm-start-sub');
  const countEl = document.getElementById('mm-server-count');

  if (countEl) updateServerCount(countEl);

  const go = () => {
    if (!startBtn || startBtn.disabled) return;
    startBtn.disabled = true;
    if (startSub) startSub.textContent = '서버 접속중…';
    setBootResetOnce();

    setTimeout(() => {
      window.location.href = './index.html';
    }, 220);
  };

  if (startBtn) startBtn.addEventListener('click', go);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      go();
    }
    if (e.key === 'Escape') {
      if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
      }
    }
  });
}

bind();
