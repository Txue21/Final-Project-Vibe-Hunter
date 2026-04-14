# Vibe Hunter Battleship - Client Application

A React-based web client for the multiplayer Battleship game, built for CPSC 3750 Phase 2.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Backend API running at https://vibe-hunter.com/api

### Installation

1. Navigate to the client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to: `http://localhost:5173`

## 🎮 How to Play

### 1. Register/Login
- Enter a username (minimum 3 characters)
- Your player data is saved to localStorage
- Click "Logout" anytime to switch accounts

### 2. Lobby
- **Create Game**: Set grid size (5-15) and max players (2-4)
- **Join Game**: Click "Join" on any "waiting" game
- **View Stats**: See your total games, wins, losses, and accuracy

### 3. Ship Placement
- Click 3 cells on the grid to place your ships
- Ships are single-cell (not multi-cell like classic Battleship)
- Green cells = your ships
- Wait for all players to place their ships

### 4. Battle Phase
- **Your Turn**: Select row (A-O) and column (1-15), then click "Fire"
- **Waiting**: Watch the turn indicator showing whose turn it is
- **Boards Display**:
  - Left: Your board (ships visible) + opponent boards (ships hidden)
  - Right: Move history with real-time updates
- **Cell States**:
  - 🚢 Blue = Your ship (intact)
  - 💥 Red = Hit
  - ✕ White = Miss
  - 💀 Dark red = Sunk ship

### 5. Game Over
- Victory/defeat screen with animated stats
- View your updated win/loss record
- Return to lobby to play again

## 📁 Project Structure

```
client/
├── src/
│   ├── components/
│   │   ├── RegisterPlayer.jsx    # Player registration
│   │   ├── Lobby.jsx             # Game lobby
│   │   ├── ShipPlacement.jsx     # Ship placement UI
│   │   ├── GameBoard.jsx         # Main gameplay screen
│   │   ├── GridCell.jsx          # Reusable grid cell
│   │   ├── MoveHistory.jsx       # Live move feed
│   │   ├── GameOver.jsx          # Victory/defeat screen
│   │   └── ErrorBoundary.jsx     # Error handling
│   ├── services/
│   │   └── api.js                # Backend API client
│   ├── utils/
│   │   ├── gridHelpers.js        # Coordinate conversion
│   │   ├── gameHelpers.js        # Game state logic
│   │   └── localstorage.js       # Local storage utilities
│   ├── App.jsx                   # Root component
│   └── main.jsx                  # App entry point
├── package.json
└── vite.config.js
```

## 🔧 Configuration

### API Proxy
The Vite dev server proxies `/api` requests to `https://vibe-hunter.com/api`. See `vite.config.js`:

```js
proxy: {
  '/api': {
    target: 'https://vibe-hunter.com',
    changeOrigin: true,
    secure: true,
  }
}
```

### Polling Intervals
- **Lobby**: Polls every 3 seconds for game list updates
- **Ship Placement**: Polls every 2 seconds waiting for game to start
- **Game Board**: Polls every 2 seconds for game state updates
- **Move History**: Polls every 3 seconds for new moves

## 🧪 Testing the Complete Flow

### Solo Test (Requires 2 Browser Tabs)

1. **Tab 1 - Player 1**:
   - Register as "Player1"
   - Create game (5x5 grid, 2 players)
   - Place 3 ships

2. **Tab 2 - Player 2**:
   - Register as "Player2"
   - Join the game Player1 created
   - Place 3 ships

3. **Both tabs** will automatically transition to the game board

4. **Play the game**:
   - Take turns firing at coordinates
   - First player to hit all 3 enemy ships wins
   - Watch the move history update in real-time

### Multiplayer Test (3-4 Players)

1. Repeat the above with 3-4 browser tabs/incognito windows
2. Create game with `max_players: 3` or `4`
3. All players join and place ships
4. Turn-based gameplay rotates through all players

## 🎨 UI Features

- **Gradient Backgrounds**: Purple (#667eea → #764ba2)
- **Real-time Updates**: Polling-based state synchronization
- **Responsive Grid**: Dynamic grid sizing (5-15)
- **Turn Indicators**: Green (your turn) / Yellow (waiting)
- **Animations**: Slide-in effects, bouncing emojis, hover transforms
- **Error Handling**: Friendly error messages + ErrorBoundary

## 🐛 Troubleshooting

### Game not starting after ship placement
- Check that ALL players have placed exactly 3 ships
- Backend sets `game_status = 'active'` when all players ready
- Frontend polls every 2 seconds to detect status change

### Polling not working
- Open browser DevTools > Network tab
- Look for `/api/games/{id}` requests every 2-3 seconds
- Check console for error messages

### "Cannot fire outside your turn"
- Only the player whose `turn_order` matches `current_turn_index` can fire
- Wait for the turn indicator to show "YOUR TURN"

### Opponent boards show ships
- This is a feature for debugging/demo purposes
- Production should only show hits/misses on opponent boards
- Edit `GameBoard.jsx` line ~150 to hide opponent ships

### 401 Unauthorized errors
- Backend requires `player_id` in request body
- Check localStorage has `player_id` saved
- Re-register if needed

## 📊 API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/players.php` | POST | Register player |
| `/api/players.php` | GET | Get player stats |
| `/api/games.php` | GET | List all games |
| `/api/games.php` | POST | Create game |
| `/api/games/{id}` | GET | Get game details |
| `/api/games/join.php` | POST | Join game |
| `/api/games/place.php` | POST | Place ships |
| `/api/games/fire.php` | POST | Fire missile |
| `/api/games/moves.php` | GET | Get move history |

## 🚧 Known Limitations

- **Single-cell ships**: Phase 1 backend only supports 3 single-cell ships (not multi-cell like Carrier, Battleship, etc.)
- **No WebSockets**: Uses polling instead of real-time WebSocket connections
- **No authentication**: Uses localStorage player IDs (insecure, for demo only)
- **No game abandonment handling**: If a player closes the browser, game gets stuck
- **No move validation history**: Backend doesn't prevent duplicate fire coordinates (should return error)

## 🎯 Phase 2 Requirements Checklist

✅ Player registration with username  
✅ Create game with configurable grid size and max players  
✅ Join existing games  
✅ Ship placement UI with validation  
✅ Turn-based gameplay  
✅ Fire at specific coordinates  
✅ Display all player boards simultaneously  
✅ Current player/turn indicator  
✅ Move history with timestamps  
✅ Winner detection and game over screen  
✅ Player statistics (games/wins/losses/accuracy)  
✅ Error boundaries and graceful error handling  
✅ Responsive design  

## 📝 Development Notes

- Built with React 19.2.4 + Vite 8.0.4
- No external UI libraries (pure React + inline styles)
- All API calls return `{data, error}` objects for consistent error handling
- Grid coordinates use 0-indexed internally, display as A-O (rows) and 1-15 (cols)
- Game state managed with `useState` + `useEffect` hooks
- No React Router - uses simple view state management in App.jsx

## 🔗 Links

- Backend API: https://vibe-hunter.com/api
- Frontend Dev Server: http://localhost:5173
- Hostinger Dashboard: https://www.hostinger.com/cpanel-login

---

**Created by**: [Your Team]  
**Course**: CPSC 3750 - Software Engineering  
**Demo Date**: April 17, 2026
