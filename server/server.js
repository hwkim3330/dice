// server.js - DiceLand minimal WebSocket server (Render-ready)
// Features:
// - presence count
// - chat relay
// - roster (who is online)
// - state sync (x,y,room) so players can "see" each other

const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = Number(process.env.PORT || 8080);

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('DiceLand WS OK');
});

const wss = new WebSocketServer({ server });

let nextId = 1;

// ws -> player
const clients = new Map();
const HEARTBEAT_INTERVAL = 30000;

function safeNickname(n) {
  const s = String(n || '').trim();
  if (!s) return 'Guest';
  return s.slice(0, 16);
}

function send(ws, obj) {
  if (!ws || ws.readyState !== ws.OPEN) return;
  ws.send(JSON.stringify(obj));
}

function broadcast(obj, exceptWs = null) {
  const msg = JSON.stringify(obj);
  for (const ws of clients.keys()) {
    if (exceptWs && ws === exceptWs) continue;
    if (ws.readyState === ws.OPEN) ws.send(msg);
  }
}

function presence() {
  broadcast({ type: 'presence', online: clients.size });
}

function roster() {
  return Array.from(clients.values()).map((p) => ({
    id: p.id,
    nickname: p.nickname,
    room: p.room,
    x: p.x,
    y: p.y,
    cash: p.cash || 0,
  }));
}

wss.on('connection', (ws) => {
  const player = {
    id: String(nextId++),
    nickname: 'Guest',
    room: 'lobby',
    x: 0,
    y: 0,
    cash: 0,
    joinedAt: Date.now(),
  };

  clients.set(ws, player);
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // tell self id + initial roster
  send(ws, { type: 'hello', playerId: player.id });
  send(ws, { type: 'roster', players: roster(), online: clients.size });

  // tell others someone joined
  broadcast({ type: 'player_join', player }, ws);
  broadcast({ type: 'sys', text: `${player.nickname}님이 입장하셨습니다.`, ts: Date.now() });
  presence();

  ws.on('message', (buf) => {
    let data;
    try {
      data = JSON.parse(buf.toString());
    } catch {
      return;
    }
    if (!data || typeof data.type !== 'string') return;

    if (data.type === 'hello') {
      player.nickname = safeNickname(data.nickname);
      send(ws, { type: 'hello', playerId: player.id });
      broadcast({ type: 'player_update', player }, ws);
      return;
    }

    if (data.type === 'state') {
      if (typeof data.x === 'number') player.x = data.x;
      if (typeof data.y === 'number') player.y = data.y;
      if (typeof data.room === 'string' && data.room.trim()) player.room = data.room.trim();
      if (typeof data.cash === 'number') player.cash = data.cash;

      broadcast({
        type: 'state',
        playerId: player.id,
        nickname: player.nickname,
        room: player.room,
        x: player.x,
        y: player.y,
        cash: player.cash,
        ts: Date.now(),
      });
      return;
    }

    if (data.type === 'chat') {
      const text = String(data.text || '').trim();
      if (!text) return;
      const room = typeof data.room === 'string' && data.room.trim() ? data.room.trim() : 'lobby';

      broadcast({
        type: 'chat',
        room,
        playerId: player.id,
        nickname: player.nickname,
        text: text.slice(0, 280),
        ts: Date.now(),
      });
      return;
    }

    if (data.type === 'sys') {
      const text = String(data.text || '').trim();
      if (!text) return;
      broadcast({ type: 'sys', text: text.slice(0, 280), ts: Date.now() });
      return;
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    broadcast({ type: 'player_leave', playerId: player.id });
    broadcast({ type: 'sys', text: `${player.nickname}님이 퇴장하셨습니다.`, ts: Date.now() });
    presence();
  });

  ws.on('error', () => {
    try { ws.close(); } catch {}
  });
});

server.listen(PORT, () => {
  console.log(`[DiceLand] WebSocket server listening on ws://localhost:${PORT}`);
});

setInterval(() => {
  for (const ws of clients.keys()) {
    if (ws.isAlive === false) {
      try { ws.terminate(); } catch {}
      clients.delete(ws);
      continue;
    }
    ws.isAlive = false;
    try { ws.ping(); } catch {}
  }
  presence();
}, HEARTBEAT_INTERVAL);
