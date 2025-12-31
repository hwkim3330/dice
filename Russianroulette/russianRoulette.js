(() => {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');

  const vnBar = document.getElementById('vn-overlay');
  const vnSpeakerEl = document.getElementById('vn-speaker');
  const vnTextEl = document.getElementById('vn-text');
  const vnActions = document.getElementById('vn-actions');
  const vnTopActions = document.getElementById('vn-top-actions');

  const resultOverlay = document.getElementById('result-overlay');
  const resultTitle = document.getElementById('result-title');
  const resultDesc = document.getElementById('result-desc');
  const btnRestart = document.getElementById('result-restart');

  const revolverArt = document.getElementById('revolver-art');
  const gun = document.getElementById('gun');
  const cssCylinder = document.getElementById('css-cylinder');
  const cylDots = document.getElementById('cyl-dots');

  // ===== 설정 =====
  const CHAMBERS = 6;
  const STEP = (Math.PI * 2) / CHAMBERS;
  const REWARD = 500000;

  function rrPost(type, payload = {}) {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ __RR__: true, type, ...payload }, '*');
      }
    } catch (_) { /* noop */ }
  }

  const VIEW_NONE = 'NONE';
  const VIEW_CYLINDER = 'CYLINDER';
  const VIEW_REVOLVER = 'REVOLVER';

  const FLOW_INTRO = 'INTRO';
  const FLOW_RPS = 'RPS';
  const FLOW_LOAD = 'LOAD';
  const FLOW_SPIN = 'SPIN';
  const FLOW_TURNS = 'TURNS';
  const FLOW_END = 'END';

  const TURN_NPC = 'NPC';
  const TURN_PLAYER = 'PLAYER';

  // ===== 상태 =====
  let view = VIEW_NONE;
  let flow = FLOW_INTRO;

  // 0 empty, 1 live, 2 spent
  let cylinder = Array(CHAMBERS).fill(0);

  let rotation = 0;
  let omega = 0;
  let spinningToStop = false;
  let spinSoundPlayed = false;

  let dragging = false;
  let dragTarget = null; // 'bullet' | 'cylinder'
  let lastPos = { x: 0, y: 0 };

  // 총알(1발) - 세워진 상태(실린더 왼쪽)
  let bullet = null;

  let firstShooter = TURN_NPC;
  let currentTurn = TURN_NPC;
  let playerCanFire = false;
  let pendingTimer = null;

  // VN
  const INTRO = [
    { s: '권총남', t: '선생님… 운명을 건 대결을 하시겠습니까?' },
    { s: '권총남', t: '선생님과 저는 인생 밑바닥에 있습니다..' },
    { s: '권총남', t: '50만원에 저랑 목숨내기를 하시죠.' },
    { s: '권총남', t: '제가 죽으면 선생님은 50만원을 가져가는거고,' },
    { s: '권총남', t: '제가 이기면 저는 선생님의 모든걸 가져가는겁니다.' },
    { s: '권총남', t: '…수락하시겠습니까?', choice: 'ACCEPT' },
  ];
  let introIdx = 0;

  // ===== 오디오(효과음 mp3) =====
  const sfxLoad = new Audio('../revolvercocking.mp3');
  const sfxSpin = new Audio('../revolver1.mp3');
  const sfxShot = new Audio('../gunshotsound.mp3');

  function playSfx(audio) {
    if (!audio) return;
    try {
      audio.currentTime = 0;
      const p = audio.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (_) {}
  }

  // ===== UI =====
  function vnShow(speaker, text, actions = null, topActions = null) {
    vnSpeakerEl.textContent = speaker ?? '';
    vnTextEl.textContent = text ?? '';
    vnActions.innerHTML = '';
    if (actions) actions();
    vnBar.classList.add('show');
    vnBar.setAttribute('aria-hidden', 'false');
    vnTopActions.innerHTML = '';
    if (topActions) topActions();
    if (vnTopActions.children.length > 0) {
      vnTopActions.classList.add('show');
      vnTopActions.setAttribute('aria-hidden', 'false');
    } else {
      vnTopActions.classList.remove('show');
      vnTopActions.setAttribute('aria-hidden', 'true');
    }
  }

  function vnHide() {
    vnBar.classList.remove('show');
    vnBar.setAttribute('aria-hidden', 'true');
    vnActions.innerHTML = '';
    vnTopActions.innerHTML = '';
    vnTopActions.classList.remove('show');
    vnTopActions.setAttribute('aria-hidden', 'true');
  }

  function showResult(title, desc) {
    resultTitle.textContent = title ?? '';
    resultDesc.textContent = desc ?? '';
    resultOverlay.classList.add('show');
    resultOverlay.setAttribute('aria-hidden', 'false');
  }

  function hideResult() {
    resultOverlay.classList.remove('show');
    resultOverlay.setAttribute('aria-hidden', 'true');
  }

  function clearPending() {
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      pendingTimer = null;
    }
  }

  function setView(v) {
    view = v;

    // 캔버스는 실린더 씬에서만 노출
    const showCanvas = view === VIEW_CYLINDER;
    canvas.style.opacity = showCanvas ? '1' : '0';
    canvas.style.pointerEvents = showCanvas ? 'auto' : 'none';

    // CSS 리볼버는 리볼버 씬에서만 노출
    const showRevolver = view === VIEW_REVOLVER;
    revolverArt.classList.toggle('hidden', !showRevolver);
    revolverArt.setAttribute('aria-hidden', showRevolver ? 'false' : 'true');
    updateRevolverFacing();
  }

  function updateRevolverFacing() {
    if (!revolverArt) return;
    const npcTurn = view === VIEW_REVOLVER && currentTurn === TURN_NPC;
    revolverArt.classList.toggle('npc-turn', npcTurn);
  }

  // ===== CSS 리볼버 업데이트 =====
  function updateCssCylinder() {
    if (!cssCylinder) return;
    const deg = (rotation * 180) / Math.PI;
    cssCylinder.style.setProperty('--cyl-rot', `${deg}deg`);
    document.documentElement.style.setProperty('--cyl-rot', `${deg}deg`);

    // dot 표시 재구성
    if (!cylDots) return;
    cylDots.innerHTML = '';
    const cx = 42.5;
    const cy = 35;
    const r = 24;

    for (let i = 0; i < CHAMBERS; i++) {
      const a = rotation + i * STEP - Math.PI / 2;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;

      const d = document.createElement('div');
      d.className = 'cyl-dot' + (cylinder[i] === 1 ? ' live' : cylinder[i] === 2 ? ' spent' : '');
      d.style.left = `${x - 5}px`;
      d.style.top = `${y - 5}px`;
      cylDots.appendChild(d);
    }
  }

  function cssGunAnimate(isBang) {
    if (!gun) return;
    gun.classList.remove('cocking', 'firing', 'recoil');

    // cocking
    gun.classList.add('cocking');
    setTimeout(() => {
      gun.classList.remove('cocking');
      gun.classList.add('firing');

      setTimeout(() => {
        gun.classList.remove('firing');
        if (isBang) gun.classList.add('recoil');
      }, 50);
    }, 80);

    setTimeout(() => {
      gun.classList.remove('recoil');
    }, 300);
  }

  // ===== 게임 리셋 =====
  function resetAll() {
    clearPending();

    setView(VIEW_NONE);
    flow = FLOW_INTRO;

    cylinder = Array(CHAMBERS).fill(0);
    rotation = 0;
    omega = 0;
    spinningToStop = false;
    spinSoundPlayed = false;

    dragging = false;
    dragTarget = null;
    lastPos = { x: 0, y: 0 };

    bullet = null;

    firstShooter = TURN_NPC;
    currentTurn = TURN_NPC;
    playerCanFire = false;

    introIdx = 0;

    hideResult();
    showIntro();
  }

  // ===== VN(인트로) =====
  function showIntro() {
    const line = INTRO[introIdx];
    if (!line) return;

    if (line.choice === 'ACCEPT') {
      vnShow(line.s, line.t, null, () => {
        const reject = document.createElement('button');
        reject.className = 'danger';
        reject.textContent = '거절';
        reject.onclick = () => {
          rrPost('RR_EXIT');
        };

        const accept = document.createElement('button');
        accept.className = 'primary';
        accept.textContent = '수락';
        accept.onclick = () => {
          clearPending();
          flow = FLOW_RPS;
          startRPS();
        };

        vnTopActions.appendChild(reject);
        vnTopActions.appendChild(accept);
      });
      return;
    }

    vnShow(line.s, line.t);
  }

  function onVNTap() {
    if (flow !== FLOW_INTRO) return;
    const last = INTRO[introIdx];
    if (last && last.choice) return;

    introIdx = Math.min(introIdx + 1, INTRO.length - 1);
    showIntro();
  }

  // ===== RPS =====
  function startRPS() {
    vnShow('권총남', '선공을 정하겠습니다.\n가위/바위/보 중 선택하세요.', null, () => {
      const opts = [
        { k: '가위', v: 'SCISSORS', icon: '✌' },
        { k: '바위', v: 'ROCK', icon: '✊' },
        { k: '보', v: 'PAPER', icon: '✋' },
      ];

      opts.forEach((o) => {
        const b = document.createElement('button');
        b.className = 'rps-btn';
        b.innerHTML = `
          <div class="rps-icon">${o.icon}</div>
          <div class="rps-label">${o.k}</div>
        `;
        b.onclick = () => resolveRPS(o.v);
        vnTopActions.appendChild(b);
      });
    });
  }

  function resolveRPS(playerPick) {
    const picks = ['ROCK', 'PAPER', 'SCISSORS'];
    const npcPick = picks[Math.floor(Math.random() * 3)];

    function win(a, b) {
      return (
        (a === 'ROCK' && b === 'SCISSORS') ||
        (a === 'SCISSORS' && b === 'PAPER') ||
        (a === 'PAPER' && b === 'ROCK')
      );
    }

    if (playerPick === npcPick) {
      vnShow('권총남', '비김.\n다시 고르세요.');
      pendingTimer = setTimeout(startRPS, 700);
      return;
    }

    const playerWins = win(playerPick, npcPick);
    firstShooter = playerWins ? TURN_PLAYER : TURN_NPC;
    currentTurn = firstShooter;

    const pK = playerPick === 'ROCK' ? '바위' : playerPick === 'PAPER' ? '보' : '가위';
    const nK = npcPick === 'ROCK' ? '바위' : npcPick === 'PAPER' ? '보' : '가위';

    vnShow('권총남', `당신: ${pK} / 권총남: ${nK}\n${playerWins ? '당신이' : '권총남이'} 선공입니다.`);

    // 가위바위보 후에만 장전 씬 등장
    pendingTimer = setTimeout(() => {
      flow = FLOW_LOAD;
      setView(VIEW_CYLINDER);
      spawnBulletStandingLeft();
      vnShow('권총남', '자… 장전하시죠.');
    }, 1100);
  }

  // ===== 총알/장전 =====
  function spawnBulletStandingLeft() {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    bullet = {
      // 실린더(중앙) 왼쪽에 세워둠
      x: cx - 180,
      y: cy + 120,
      w: 22,     // 폭(세로 총알이므로 좁게)
      h: 96,     // 길이(세로)
      used: false,
    };
  }

  function nearestHole(x, y) {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const holeDist = 90;

    let best = null;
    for (let i = 0; i < CHAMBERS; i++) {
      const a = rotation + i * STEP;
      const hx = cx + Math.cos(a) * holeDist;
      const hy = cy + Math.sin(a) * holeDist;
      const d = Math.hypot(x - hx, y - hy);
      if (!best || d < best.d) best = { i, hx, hy, d };
    }
    return best;
  }

  function tryInsertBullet() {
    if (!bullet || bullet.used) return false;
    const n = nearestHole(bullet.x, bullet.y);
    if (!n || n.d > 28) return false;
    if (cylinder[n.i] !== 0) return false;

    cylinder[n.i] = 1;
    bullet.used = true;
    playSfx(sfxLoad);

    flow = FLOW_SPIN;
    spinSoundPlayed = false;
    vnShow('권총남', '좋습니다. 돌리시죠.');
    return true;
  }

  // ===== 스핀/전환 =====
  function startAutoStop() {
    if (flow !== FLOW_SPIN) return;
    spinningToStop = true;
    if (Math.abs(omega) < 0.08) omega = (Math.random() > 0.5 ? 1 : -1) * (0.35 + Math.random() * 0.25);
  }

  function finalizeSpin() {
    spinningToStop = false;
    omega = 0;

    setView(VIEW_REVOLVER);
    updateCssCylinder();

    vnShow('권총남', '…좋아. 이제 시작하지.');

    pendingTimer = setTimeout(() => {
      flow = FLOW_TURNS;
      startTurn();
    }, 900);
  }

  // ===== 턴/격발 =====
  function chamberIndexForFire() {
    const idx = Math.round((-rotation) / STEP);
    return ((idx % CHAMBERS) + CHAMBERS) % CHAMBERS;
  }

  function advanceChamber() {
    rotation -= STEP;
  }

  function startTurn() {
    if (flow !== FLOW_TURNS) return;

    playerCanFire = currentTurn === TURN_PLAYER;

    if (currentTurn === TURN_NPC) {
      vnShow('권총남', '내 차례군요.');
      updateRevolverFacing();
      pendingTimer = setTimeout(() => npcFire(), 2400);
    } else {
      vnShow('권총남', '당신 차례에요 생각이 많아지셨나요?.');
      updateRevolverFacing();
    }
  }

  function fire(shooter) {
    clearPending();

    const idx = chamberIndexForFire();
    const live = cylinder[idx] === 1;

    // 애니메이션(콕킹+반동)
    cssGunAnimate(live);
    playSfx(live ? sfxShot : sfxLoad);

    if (live) {
      cylinder[idx] = 2;

      flow = FLOW_END;
      vnHide();

      setView(VIEW_REVOLVER);
      updateCssCylinder();

      pendingTimer = setTimeout(() => {
        if (shooter === TURN_PLAYER) {
          rrPost('RR_RESULT', { result: 'DEATH' });
          showResult('사망', '당신은 사망했습니다.');
        } else {
          rrPost('RR_RESULT', { result: 'WIN', reward: REWARD });
          showResult('승리', `권총남 사망.\n당신은 ${REWARD.toLocaleString('ko-KR')}원을 획득합니다.`);
        }
      }, 650);
      return;
    }

    advanceChamber();
    updateCssCylinder();

    currentTurn = shooter === TURN_PLAYER ? TURN_NPC : TURN_PLAYER;
    playerCanFire = false;
    updateRevolverFacing();

    vnShow('권총남', shooter === TURN_NPC ? '…운이 좋으시군요.' : '딸깍.');

    pendingTimer = setTimeout(() => startTurn(), 1000);
  }

  function npcFire() {
    if (flow !== FLOW_TURNS) return;
    fire(TURN_NPC);
  }

  function playerFire() {
    if (flow !== FLOW_TURNS) return;
    if (currentTurn !== TURN_PLAYER) return;
    if (!playerCanFire) return;
    playerCanFire = false;
    fire(TURN_PLAYER);
  }

  // ===== 입력 =====
  function clientToCanvas(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    const sx = canvas.width / r.width;
    const sy = canvas.height / r.height;
    return { x: (clientX - r.left) * sx, y: (clientY - r.top) * sy };
  }

  function isPointOnBullet(px, py) {
    if (!bullet || bullet.used) return false;

    const near = nearestHole(bullet.x, bullet.y);
    const snap = near && near.d < 28;

    if (snap) return Math.hypot(px - bullet.x, py - bullet.y) <= 22;

    // 세워진 총알 hitbox(넉넉하게)
    const w = bullet.w;
    const h = bullet.h;
    return (
      px >= bullet.x - w / 2 - 16 &&
      px <= bullet.x + w / 2 + 16 &&
      py >= bullet.y - h / 2 - 16 &&
      py <= bullet.y + h / 2 + 16
    );
  }

  function onDown(x, y) {
    dragging = true;
    lastPos = { x, y };

    if (view === VIEW_CYLINDER && isPointOnBullet(x, y)) {
      dragTarget = 'bullet';
      return;
    }

    if (view === VIEW_CYLINDER) {
      dragTarget = 'cylinder';
    }
  }

  function onMove(x, y) {
    if (!dragging) return;
    const dx = x - lastPos.x;
    const dy = y - lastPos.y;
    lastPos = { x, y };

    if (dragTarget === 'bullet' && bullet && !bullet.used) {
      bullet.x += dx;
      bullet.y += dy;
      return;
    }

    if (dragTarget === 'cylinder' && view === VIEW_CYLINDER) {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const a1 = Math.atan2(lastPos.y - cy, lastPos.x - cx);
      const a0 = Math.atan2((lastPos.y - dy) - cy, (lastPos.x - dx) - cx);
      let da = a1 - a0;
      if (da > Math.PI) da -= Math.PI * 2;
      if (da < -Math.PI) da += Math.PI * 2;

      rotation += da;
      omega = da * 1.4;
      if (flow === FLOW_SPIN && !spinSoundPlayed) {
        spinSoundPlayed = true;
        playSfx(sfxSpin);
      }
    }
  }

  function onUp() {
    if (!dragging) return;
    dragging = false;

    if (dragTarget === 'bullet') tryInsertBullet();
    if (dragTarget === 'cylinder' && flow === FLOW_SPIN) startAutoStop();

    dragTarget = null;
  }

  // ===== 그리기(실린더/총알 씬) =====
  function clear() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function roundRect(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawCylinder() {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);

    ctx.beginPath();
    ctx.arc(0, 0, 140, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(0, 0, 40, 0, 0, 140);
    grad.addColorStop(0, '#4b4f5a');
    grad.addColorStop(0.85, '#1a1d24');
    grad.addColorStop(1, '#0c0e13');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 3;
    ctx.stroke();

    const holeDist = 90;
    for (let i = 0; i < CHAMBERS; i++) {
      const a = i * STEP;
      const hx = Math.cos(a) * holeDist;
      const hy = Math.sin(a) * holeDist;

      ctx.beginPath();
      ctx.arc(hx, hy, 30, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fill();

      if (cylinder[i] === 1) {
        ctx.beginPath();
        ctx.arc(hx, hy, 28, 0, Math.PI * 2);
        ctx.fillStyle = '#d6b24a';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(hx, hy, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#cfd3da';
        ctx.fill();
      } else if (cylinder[i] === 2) {
        ctx.beginPath();
        ctx.arc(hx, hy, 28, 0, Math.PI * 2);
        ctx.fillStyle = '#8b7355';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(hx, hy, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#3c404a';
        ctx.fill();
      }
    }

    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fillStyle = '#8c93a2';
    ctx.fill();

    ctx.restore();
  }

  function drawBullet() {
    if (!bullet || bullet.used) return;

    const near = nearestHole(bullet.x, bullet.y);
    const snap = near && near.d < 28;

    if (snap) {
      // 넣을 때는 원형(상면)
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 16, 0, Math.PI * 2);
      ctx.fillStyle = '#d6b24a';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#cfd3da';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
      return;
    }

    // 세워진 총알(정면/측면 느낌)
    const x = bullet.x;
    const y = bullet.y;
    const w = bullet.w;
    const h = bullet.h;

    ctx.save();
    ctx.translate(x, y);

    // 그림자
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#000';
    roundRect(-w / 2 + 3, -h / 2 + 4, w, h, w / 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    const headH = h * 0.28;
    const bodyH = h - headH;

    // 탄피(브라스)
    const brass = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    brass.addColorStop(0, '#6b4f13');
    brass.addColorStop(0.2, '#e6c15e');
    brass.addColorStop(0.55, '#caa24a');
    brass.addColorStop(1, '#7a5b18');

    ctx.fillStyle = brass;
    roundRect(-w / 2, -h / 2 + headH, w, bodyH, w / 2);
    ctx.fill();

    // 탄두(구리)
    const copper = ctx.createLinearGradient(0, -h / 2, 0, -h / 2 + headH);
    copper.addColorStop(0, '#6e3a14');
    copper.addColorStop(0.55, '#d08a4b');
    copper.addColorStop(1, '#8c521d');

    ctx.fillStyle = copper;
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2 + headH);
    ctx.quadraticCurveTo(0, -h / 2 - 8, w / 2, -h / 2 + headH);
    ctx.closePath();
    ctx.fill();

    // 림(바닥)
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    roundRect(-w / 2, h / 2 - 12, w, 10, w / 2);
    ctx.fill();

    // 하이라이트
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#fff';
    roundRect(-w / 2 + 4, -h / 2 + headH + 10, 6, bodyH - 24, 4);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  // ===== 루프 =====
  function tick() {
    if (view === VIEW_CYLINDER && flow === FLOW_SPIN && spinningToStop && !dragging) {
      rotation += omega;
      omega *= 0.985;

      if (Math.abs(omega) < 0.003) finalizeSpin();
    }

    clear();
    if (view === VIEW_CYLINDER) {
      drawCylinder();
      drawBullet();
    }

    if (view === VIEW_REVOLVER) {
      updateCssCylinder();
    }

    requestAnimationFrame(tick);
  }

  // ===== 이벤트 =====
  vnBar.addEventListener('click', (e) => {
    if (e.target && e.target.tagName === 'BUTTON') return;
    onVNTap();
  });

  btnRestart.addEventListener('click', () => {
    hideResult();
    resetAll();
  });

  // 캔버스(실린더) 입력
  canvas.addEventListener('mousedown', (e) => {
    const p = clientToCanvas(e.clientX, e.clientY);
    onDown(p.x, p.y);
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const p = clientToCanvas(e.clientX, e.clientY);
    onMove(p.x, p.y);
  });
  window.addEventListener('mouseup', () => onUp());

  canvas.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    if (!t) return;
    const p = clientToCanvas(t.clientX, t.clientY);
    onDown(p.x, p.y);
  });

  window.addEventListener(
    'touchmove',
    (e) => {
      if (dragging) e.preventDefault();
      const t = e.touches[0];
      if (!t) return;
      const p = clientToCanvas(t.clientX, t.clientY);
      onMove(p.x, p.y);
    },
    { passive: false }
  );

  window.addEventListener('touchend', () => onUp());

  // 리볼버(내 턴 클릭 격발)
  gun.addEventListener('mousedown', (e) => {
    e.preventDefault();
    if (view === VIEW_REVOLVER && flow === FLOW_TURNS && currentTurn === TURN_PLAYER) playerFire();
  });
  gun.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (view === VIEW_REVOLVER && flow === FLOW_TURNS && currentTurn === TURN_PLAYER) playerFire();
  }, { passive: false });

  // ===== 시작 =====
  resetAll();
  requestAnimationFrame(tick);
})();
