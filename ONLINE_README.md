# DiceLand Online MVP (Lobby Only)

## What this does
- Real-time lobby chat (WebSocket)
- Online count display

## What this does NOT do
- No Firebase
- No save/load
- No rooms
- No player position sync
- No money/chip sync
- No UI redesign

## Server setup
1) Open a terminal in `server`
2) Install deps:
   - `npm install`
3) Start server:
   - `npm start`

Server listens on `ws://localhost:8080`.

## Client setup
1) Run the game as usual
2) On "시작하기", the client connects to `ws://localhost:8080`

## Test
1) Open two browser windows
2) Start game in both
3) Confirm:
   - Online count shows `2/50`
   - Chat messages appear in both windows
