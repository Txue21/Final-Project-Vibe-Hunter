# CPSC 3750 Final Project - Phase 1
## Distributed Multiplayer Battleship System

**Production URL:** https://vibe-hunter.com
**API Base:** https://vibe-hunter.com/api/

---

## 👥 Team Members

| Name | Role |
|------|------|
| **Tian Xue** | Lead Systems Architect & DevOps |
| **Pascual Sebastian** | Full Stack Developer & Testing Lead |

### Tian Xue — Lead Systems Architect & DevOps
- Designed and implemented all 12 API endpoints
- Built the relational database schema with full constraint enforcement
- Configured Hostinger deployment and domain setup (vibe-hunter.com)
- Implemented transactional logic for the fire endpoint
- Managed .htaccess URL routing and server configuration

### Pascual Sebastian — Full Stack Developer & Testing Lead
- Identified and fixed PHP closure scope bugs in games.php and join.php
- Led testing strategy using Postman collections with automated assertions
- Diagnosed and resolved player_id schema migration (UUID → INT AUTO_INCREMENT)
- Updated all endpoint files to correctly cast player_id as integer throughout
- Maintained AI Collaboration Log and project documentation

---

## 🤖 AI Tools Used

| Tool | Purpose |
|------|---------|
| **Claude (Anthropic)** | Architecture review, bug diagnosis, code fixes, Postman test generation, documentation |
| **ChatGPT (OpenAI)** | Supplementary code suggestions and brainstorming |

### How AI Was Used
AI was used as an engineering assistant — not as the decision maker. Humans retained control over all architectural decisions, schema design, and what code was actually deployed. AI suggestions were critically evaluated and tested before acceptance. At least one AI suggestion was rejected per phase (documented in the AI Collaboration Log).

---

## 🎯 System Overview

A persistent, multiplayer, server-side Battleship system built in PHP with a MySQL relational database. The system supports 1–N players, configurable grid sizes, turn-based gameplay, player elimination, and lifetime statistics tracking.

### Phase Structure
- **Phase 1 (current):** Server + Database — REST API with full game lifecycle
- **Phase 2 (upcoming):** Human Client — interactive front-end
- **Phase 3 (upcoming):** Computer Player — autonomous AI opponent

---

## 🏗️ Architecture

### System Design
All game state is persisted in a MySQL relational database. There are no in-memory sessions — every state change is committed as a database transaction. The API layer is stateless PHP with PDO prepared statements throughout.

### Technology Stack
- **Server:** PHP 8.x on Hostinger shared hosting
- **Database:** MySQL with InnoDB engine (ACID compliant)
- **Routing:** Apache .htaccess RewriteRules
- **Deployment:** Hostinger File Manager + phpMyAdmin

### Multiplayer Model
Players join games through a `GamePlayers` join table that creates a many-to-many relationship between Players and Games. Each player is assigned a `turn_order` when they join. Turn rotation is handled by querying active (non-eliminated) players ordered by `turn_order` and advancing circularly using `(currentIndex + 1) % activePlayers`.

### Turn Logic
- `current_turn_index` in the Games table tracks whose turn it is
- After each fire move, the system queries non-eliminated players and computes the next turn
- Eliminated players are automatically skipped since they are excluded from the active players query
- A player is eliminated when all their ships have `is_sunk = TRUE`

### Transaction Strategy
The fire endpoint is fully transactional — hit detection, ship sinking, player elimination, stat updates, and turn advancement are all wrapped in a single atomic transaction with `FOR UPDATE` row locking to prevent race conditions.

### File Structure
```
public_html/
├── api/
│   ├── common.php          # Shared utilities, validation helpers, DB query helpers
│   ├── reset.php           # POST /api/reset
│   ├── players.php         # POST /api/players, GET /api/players/{id}/stats
│   ├── games.php           # POST /api/games, GET /api/games/{id}
│   ├── games/
│   │   ├── join.php        # POST /api/games/{id}/join
│   │   ├── place.php       # POST /api/games/{id}/place
│   │   ├── fire.php        # POST /api/games/{id}/fire (transactional)
│   │   └── moves.php       # GET /api/games/{id}/moves
│   └── test/
│       └── games/
│           ├── restart.php # POST /api/test/games/{id}/restart
│           ├── ships.php   # POST /api/test/games/{id}/ships
│           └── board.php   # GET /api/test/games/{id}/board/{player_id}
├── .htaccess               # URL routing rules
├── config.php              # TEST_MODE toggle and helpers
├── db.php                  # PDO database connection
├── schema.sql              # Database schema
├── index.html              # API documentation page
└── README.md               # This file
```

---

## 🗄️ Database Design

### Schema Summary
5 tables with full relational integrity enforced at the database level. Application-layer checks are backed by mandatory database constraints.

| Table | Primary Key | Key Constraints | Purpose |
|-------|-------------|-----------------|---------|
| Players | INT AUTO_INCREMENT | UNIQUE(username) | Player identity & lifetime stats |
| Games | INT AUTO_INCREMENT | FK: creator_id, winner_id | Game instances & status |
| GamePlayers | (game_id, player_id) composite | FK to Games & Players | Many-to-many join, turn order |
| Ships | INT AUTO_INCREMENT | UNIQUE(game_id, player_id, row, col) | Ship positions per player |
| Moves | INT AUTO_INCREMENT | FK: game_id, player_id, target_player_id | Full move history with timestamps |

### Key Design Decisions
- `player_id` is `INT AUTO_INCREMENT` — server-generated, client must never supply it (returns 400 if attempted)
- `(gameId, playerId)` composite primary key in GamePlayers enforces uniqueness at the DB level
- CHECK constraints enforce `grid_size` between 5–15 and `max_players` ≥ 1
- All foreign keys use CASCADE or SET NULL to maintain referential integrity
- InnoDB engine enables row-level locking and full transaction support

---

## 📋 API Endpoints

### Production API (9 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/reset | Truncate all tables |
| POST | /api/players | Create player, returns integer player_id |
| GET | /api/players/{id}/stats | Lifetime stats: games, wins, losses, accuracy |
| POST | /api/games | Create game, creator auto-joins at turn_order=0 |
| POST | /api/games/{id}/join | Join a waiting game |
| GET | /api/games/{id} | Get current game state |
| POST | /api/games/{id}/place | Place exactly 3 ships |
| POST | /api/games/{id}/fire | Fire move (fully transactional) |
| GET | /api/games/{id}/moves | Chronological move history |

### Test Mode API (3 endpoints)
**Requires header:** `X-Test-Password: clemson-test-2026`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/test/games/{id}/restart | Reset ships/moves, preserve stats |
| POST | /api/test/games/{id}/ships | Deterministic ship placement for autograder |
| GET | /api/test/games/{id}/board/{player_id} | Reveal board state for verification |

### HTTP Status Codes
- `200` — Success (GET requests, fire, join)
- `201` — Created (POST /api/players, POST /api/games)
- `400` — Bad request (missing fields, invalid values, duplicate username)
- `403` — Forbidden (invalid player_id, wrong game, out of turn, eliminated)
- `404` — Not found (game or player does not exist)

---

## 🧪 Testing Strategy

### Postman Collections
Two Postman collections cover all Checkpoint A requirements:
1. **Checkpoint A Collection** — 26 tests covering all endpoints, validation, and status codes
2. **Fix Verification Collection** — targeted tests for player_id integer type and ship placement activation

### Testing Approach
- All code changes are tested in Postman against the live server before committing to GitHub
- Edge cases tested: duplicate usernames, client-supplied player_id, invalid grid sizes, joining full games, placing ships twice, firing out of turn
- Gradescope autograder serves as the final benchmark (Phase 1 Checkpoint A: 16/18 public tests passing)

### Regression Discipline
- Phase 1 endpoints will not be modified in Phases 2 or 3
- Full Postman suite is re-run before every Gradescope submission
- GitHub branch strategy: feature branches merged to main via Pull Requests

---

## 📊 Evaluation Criteria Status

| Criteria | Status |
|----------|--------|
| 12 API endpoints functional | ✅ Complete |
| Correct HTTP status codes | ✅ Complete |
| Database constraint enforcement | ✅ Complete |
| Integer player_id (server-generated) | ✅ Complete |
| Turn rotation logic | ✅ Complete |
| Player elimination logic | ✅ Complete |
| Move logging with timestamps | ✅ Complete |
| Lifetime statistics (transactional) | ✅ Complete |
| Test mode secured with password | ✅ Complete |
| Hostinger deployment live | ✅ vibe-hunter.com |
