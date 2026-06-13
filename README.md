src/
├── pages/
│   ├── Home.jsx
│   ├── Match.jsx         ← main game screen
│   ├── Result.jsx
│   └── Leaderboard.jsx
│
├── components/
│   ├── editor/
│   │   ├── CodeEditor.jsx       ← Monaco wrapper
│   │   └── LanguageSelect.jsx
│   ├── match/
│   │   ├── OpponentPanel.jsx    ← silhouette + progress
│   │   ├── Silhouette.jsx       ← tokenizer + render
│   │   ├── TCBar.jsx            ← TC1✅ TC2❌ dots
│   │   ├── Timer.jsx            ← countdown
│   │   └── EmoteBar.jsx
│   ├── verdict/
│   │   ├── VerdictPanel.jsx     ← AC/WA/TLE display
│   │   └── VerdictBadge.jsx
│   └── ui/
│       ├── Button.jsx
│       └── Badge.jsx
│
├── hooks/
│   ├── useSocket.js       ← Socket.io connection
│   ├── useMatch.js        ← match state logic
│   ├── useTimer.js        ← countdown logic
│   └── useSilhouette.js   ← tokenizer logic
│
├── socket/
│   └── socket.js          ← single socket instance
│
├── utils/
│   └── tokenizer.js       ← silhouette generator
│
├── store/
│   └── matchStore.js      ← Zustand global state
│
└── api/
    └── submit.js          ← axios calls to backend
    

