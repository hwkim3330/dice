# DiceLand

**Play:** https://hwkim3330.github.io/dice/

A browser mini-game world with a casino theme. You set a nickname, walk around a lobby and a "Grand Casino" scene (WASD / arrow keys, `F` to interact) and play table and machine games with in-game chips. All currency is play money.

브라우저에서 즐기는 카지노 테마 미니게임 월드입니다 (게임 내 가상 칩만 사용).

## Games (`src/features/`)

Slot machine, blackjack, roulette, baccarat, Russian roulette, plus chip exchange, ranking, player list, profile and chat.

## Online lobby (optional)

`server/` is a small WebSocket server (Node.js + `ws`) for lobby chat and online count — see `ONLINE_README.md`.

```bash
cd server && npm install && npm start   # listens on PORT (default 8080)
```

## Run the client locally

```bash
python3 -m http.server 8000   # open http://localhost:8000
```

**Tech:** vanilla JavaScript ES modules (`src/main.js` entry, scene manager), HTML/CSS, WebSocket.

**Status:** hobby project; online mode is lobby-only.
