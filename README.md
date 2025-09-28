Quantum Tic Tac Toe

A multiplayer web-based twist on the classic Tic Tac Toe, built with Node.js, Express, and Socket.IO.
Players face off in real-time with “quantum” moves that can create entangled states and collapse when cycles are formed.

Rules differ slightly from Allan Goff's original rule. This version aligns more with how quantum mechanics works in real life but Goff's system is on the roadmap!

This project demonstrates:
Real-time multiplayer game logic with persistent rooms.
Frontend ↔ backend communication over WebSockets.
Session persistence across page refreshes (resume games).
Clean modular code structure (Views, State, Event Bus).

🎮 Features

Quick Match & Join Match – Automatically pairs players or lets them join specific rooms.
Quantum moves – Each move exists in superposition until cycles force a collapse.
Room persistence – Refresh the page and rejoin your active game.
Profanity filter – Player names are auto-cleaned with leo-profanity

🛠️ Tech Stack
Backend: Node.js, Express, Socket.IO
Frontend: Vanilla JS, Canvas API, modular View system


🚀 Getting Started
Clone & Install
git clone https://github.com/YOUR-USERNAME/quantum-tic-tac-toe.git
cd quantum-tic-tac-toe
npm install

Run Locally
npm start


Default server runs at:
👉 http://localhost:3000

Project Structure
/public         # Frontend HTML, CSS, JS
/server.js      # Express + Socket.IO backend
/View.js        # View management system
/gameUI.js      # UI helpers for board rendering
/store.js       # Local/session storage helpers

🖥️ Demo

Homepage → Enter your name and start a Quick Match.

Multiplayer Mode → Generates a shareable room URL /multiplayer/room/:id.

Game View → Live board with turn indicators, collapse mechanics, and win detection.

🌐 Deployment

This app is small and should be cheap to host. I was hosting a single-player only version on Heroku for a while but they charge for that now :(.

📌 Roadmap
 Add rematch flow (swap X/O roles).
 Add animations for quantum collapse.
 Enhance mobile responsiveness.
 Optional database for long-term persistence.
 Add "Goff" mode

📄 License

MIT – free to use, modify, and share.
