# CPSC 3750 Final Project - Phase 1 & 2
## Distributed Multiplayer Battleship System

**Production URL:** https://vibe-hunter.com
**Gameplay URL** https://vibe-hunter.com/battleship/
**API Base:** https://vibe-hunter.com/api/

---

## 👥 Team Members

| Name | Role |
|------|------|
| **Tian Xue** | Lead Systems Architect & DevOps |
| **Pascual Sebastian** | Full Stack Developer & Testing Lead |

### Tian Xue — Lead Systems Architect & DevOps
- Designed and implemented the initial API endpoint structure
- Built the relational database schema with full constraint enforcement
- Configured Hostinger deployment and domain setup (vibe-hunter.com)
- Implemented transactional logic for the fire endpoint with row-level locking
- Managed .htaccess URL routing and server configuration
- Led Phase 2 frontend development and deployment

### Pascual Sebastian — Full Stack Developer & Testing Lead
- Diagnosed and resolved the cascade setup failure blocking all place/fire autograder tests (restart endpoint not clearing GamePlayers)
- Migrated Games.status ENUM from `'waiting'` to `'waiting_setup'` per spec v2.3
- Fixed all HTTP status code mismatches: 201 for player creation, 409 for duplicates, 404 for missing resources
- Added comprehensive username validation (alphanumeric + underscore, 1–30 chars)
- Fixed restart.php password authentication and response body
- Resolved game_status response mapping (`'active'` DB value → `'playing'` in API responses)
- Added GET /api/games and GET /api/players list endpoints per spec REF0074/REF0075
- Added game_id field to moves response and game_id/player_id to join response
- Fixed place.php to return 409 for second ship placement (checked before game status)
- Added .htaccess routing for health endpoint
- Maintained AI Collaboration Log and project documentation

---

## 🤖 AI Tools Used

| Tool | Purpose |
|------|---------|
| **Claude (Anthropic)** | Architecture review, root cause diagnosis, code fixes, test analysis, documentation |
| **ChatGPT (OpenAI)** | Supplementary code suggestions and brainstorming |

### How AI Was Used
AI was used as an engineering assistant — not as the decision maker. Humans retained control over all architectural decisions, schema design, and what code was actually deployed. AI suggestions were critically evaluated and tested before acceptance. At least one AI suggestion was rejected per phase (documented in the AI Collaboration Log).

---

## 🎯 System Overview

A persistent, multiplayer, server-side Battleship system built in PHP with a MySQL relational database. The system supports 2–N players, configurable grid sizes (5–15), turn-based gameplay, player elimination, and lifetime statistics tracking.

### Phase Structure
- **Phase 1 (complete):** Server + Database — REST API with full game lifecycle
- **Phase 2 (complete):** Human Client — interactive front-end connecting to any team's server

---

## 🏗️ Architecture

### System Design
All game state is persisted in a MySQL relational database. There are no in-memory sessions — every state change is committed as a database transaction. The API layer is stateless PHP with PDO prepared statements throughout.

### Technology Stack
- **Server:** PHP 8.3 on Hostinger shared hosting (LiteSpeed)
- **Database:** MySQL with InnoDB engine (ACID compliant)
- **Routing:** LiteSpeed/Apache .htaccess RewriteRules
- **Deployment:** Hostinger File Manager + phpMyAdmin

### Key Architecture Notes
- **Status mapping:** Internal DB stores `'active'` for in-progress games; all API responses map this to `'playing'` per spec v2.3. DB stores `'waiting_setup'` (spec term) directly.
- **Restart semantics:** `/api/test/games/{id}/restart` deletes all GamePlayers, Ships, and Moves rows — it does NOT preserve player roster. This is intentional: the autograder creates the game (auto-adding creator to GamePlayers), calls restart, then re-joins all players fresh. Not deleting GamePlayers caused 33 cascading setup failures.
- **Identity model:** Player creation always returns 201 for new users and 409 for duplicates. The previous identity-reuse pattern (returning 200 for existing usernames) was replaced per spec v2.3.

### Multiplayer Model
Players join games through a `GamePlayers` join table that creates a many-to-many relationship between Players and Games. Each player is assigned a `turn_order` when they join. Turn rotation is handled by querying active (non-eliminated) players ordered by `turn_order` and advancing circularly using `(currentIndex + 1) % activePlayers`.

### Turn Logic
- `current_turn_index` in the Games table tracks whose turn it is
- After each fire move, the system queries non-eliminated players and computes the next turn
- Eliminated players are automatically skipped since they are excluded from the active players query
- A player is eliminated when all their ships have `is_sunk = TRUE`

### Transaction Strategy
The fire endpoint is fully transactional — hit detection, ship sinking, player elimination, stat updates, and turn advancement are all wrapped in a single atomic transaction with `FOR UPDATE` row locking to prevent race conditions.

### Header Handling (LiteSpeed)
Hostinger's LiteSpeed server does not reliably pass custom headers through `getallheaders()`. All endpoints that require `X-Test-Password` check both `$_SERVER['HTTP_X_TEST_PASSWORD']` and `getallheaders()` as a fallback, in that order.

### File Structure
```
public_html/
├── api/
│   ├── common.php          # Shared utilities, validation helpers, DB query helpers
│   ├── health.php          # GET /api/health
│   ├── reset.php           # POST /api/reset
│   ├── players.php         # POST /api/players, GET /api/players, GET /api/players/{id}/stats
│   ├── games.php           # POST /api/games, GET /api/games, GET /api/games/{id}
│   └── games/
│       ├── join.php        # POST /api/games/{id}/join
│       ├── place.php       # POST /api/games/{id}/place
│       ├── fire.php        # POST /api/games/{id}/fire (transactional)
│       └── moves.php       # GET /api/games/{id}/moves
│   └── test/
│       └── games/
│           ├── restart.php # POST /api/test/games/{id}/restart
│           ├── ships.php   # POST /api/test/games/{id}/ships
│           └── board.php   # GET /api/test/games/{id}/board/{player_id}
├── .htaccess               # URL routing rules (LiteSpeed compatible)
├── config.php              # TEST_MODE toggle, password, JSON options
├── db.php                  # PDO database connection
├── schema.sql              # Database schema (current live version)
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
- `(game_id, player_id)` composite primary key in GamePlayers enforces uniqueness at the DB level
- `Games.status` ENUM is `('waiting_setup', 'active', 'finished')` — `'waiting_setup'` is the spec v2.3 term; `'active'` is the internal DB term for a game in progress (mapped to `'playing'` in API responses)
- CHECK constraints enforce `grid_size` between 5–15
- `max_players` enforced at minimum 2 in application layer (spec v2.3 requirement)
- All foreign keys use CASCADE or SET NULL to maintain referential integrity
- InnoDB engine enables row-level locking and full transaction support

---

## 📋 API Endpoints

### Production API

| Method | Endpoint | Status Codes | Description |
|--------|----------|-------------|-------------|
| GET | /api/health | 200 | Health check |
| POST | /api/reset | 200 | Truncate all tables |
| POST | /api/players | 201, 400, 409 | Create player — returns integer player_id |
| GET | /api/players | 200 | List all players |
| GET | /api/players/{id}/stats | 200, 404 | Lifetime stats: games, wins, losses, accuracy |
| POST | /api/games | 201, 400 | Create game — creator auto-joins at turn_order=0 |
| GET | /api/games | 200 | List all games |
| GET | /api/games/{id} | 200, 404 | Full game state including players array and total_moves |
| POST | /api/games/{id}/join | 200, 400, 404 | Join a waiting_setup game |
| POST | /api/games/{id}/place | 200, 400, 409 | Place exactly 3 ships |
| POST | /api/games/{id}/fire | 200, 400, 403, 409 | Fire move (fully transactional) |
| GET | /api/games/{id}/moves | 200, 404 | Chronological move history |

### Test Mode API
**Requires header:** `X-Test-Password: clemson-test-2026`

| Method | Endpoint | Status Codes | Description |
|--------|----------|-------------|-------------|
| POST | /api/test/games/{id}/restart | 200, 403, 404 | Wipe GamePlayers/Ships/Moves, reset status to waiting_setup |
| POST | /api/test/games/{id}/ships | 200, 403 | Deterministic ship placement for autograder |
| GET | /api/test/games/{id}/board/{player_id} | 200, 403, 404 | Reveal board state for verification |

### HTTP Status Codes Used
| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | GET requests, fire, join |
| 201 | Created | POST /api/players, POST /api/games |
| 400 | Bad request | Missing fields, invalid values, game full, already in game |
| 403 | Forbidden | Wrong password, out of turn, player eliminated |
| 404 | Not found | Game or player does not exist |
| 409 | Conflict | Duplicate username, ships already placed, cell already fired |
| 500 | Server error | Unhandled DB exception |

### Important Response Field Notes
- `status` in fire response: `"playing"` during game, `"finished"` when done
- `status` in game state GET: `"waiting_setup"` → `"playing"` → `"finished"`
- `current_turn_player_id` is `null` before game starts, integer when playing
- `players[]` array in game state includes `player_id`, `ships_placed`, `is_eliminated`
- `accuracy` in player stats is a float (0.0 when no shots taken)

---

## 🧪 Testing Strategy & Results

### Autograder Results (Phase 1 Final)
| Test Pool | Score | Notes |
|-----------|-------|-------|
| Team Tests (Gradescope) | 43.81/100 | Limited by DB state pollution from prior runs and broken team tests |
| Instructor Tests (Gradescope) | 70.88/100 | Limited by autograder URL substitution masking 404 tests |
| Instructor Tests (Local runner) | 94.51/100 | Accurate score — local runner resets DB state before each test |

### Why Scores Differ
- **Gradescope team tests:** Many tests use hardcoded usernames ("testplayer", "mirpatel") that already exist in the DB after prior runs — always returns 409 instead of 201, not a code bug
- **Gradescope vs local instructor:** Gradescope's autograder substitutes all numeric IDs in test URLs with real game_id values — "non-existent game" tests always point to a real game, making 404 responses structurally impossible
- **Local instructor runner:** Pre-seeds by calling `/api/reset` first, creating a clean state — this is the most accurate measure of server correctness

### Known Impossible Tests (Autograder Design Limitations)
| Test | Issue |
|------|-------|
| T0050, T0101 | Autograder always injects X-Test-Password for restart endpoints — cannot test "no password" behavior |
| T0005, T0032, T0133 | "Non-existent game" — autograder substitutes real game_id, game always exists |
| T0013, T0034, T0063 | "Non-existent game join" — same substitution problem |
| T0026, T0102, T0142 | "Non-existent player stats" — autograder created the player, so it exists |
| T0004, T0011, T0043 | "Duplicate fire" — no prior fire in setup, first fire cannot be a duplicate |

### Postman Collections
Two Postman collections were maintained throughout development:
1. **Phase 1 Core Collection** — full game lifecycle from player creation through game completion
2. **Edge Case Collection** — validation, error codes, boundary conditions, and auth tests

---

## 🔧 Key Bugs Fixed During Development

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| 33 cascading setup failures | restart.php updated GamePlayers rows instead of deleting them — creator was always "already in game" when autograder tried to re-join | Changed to `DELETE FROM GamePlayers WHERE game_id = ?` |
| Join returning 400 for valid join | Games created before schema migration still had `status='waiting'`; join.php only accepted `'waiting_setup'` | Made join accept both values |
| Health endpoint 404 | .htaccess had no routing rule for `/api/health` | Added `RewriteRule ^api/health/?$ api/health.php [L]` |
| Player creation returning 200 | Old identity-reuse pattern returned 200 for existing usernames | Changed to 409 for duplicates, 201 for new players |
| game_status returning `'active'` | DB stores `'active'`; spec v2.3 uses `'playing'` in responses | Added status mapping layer in fire.php and games.php |
| Non-existent resources returning 200 | Missing null checks after DB queries | Added explicit 404 responses |
| Second ship placement returning 400 | place.php checked game status before ships_placed flag | Moved ships_placed check before status check → returns 409 |
| GET /api/games returning 404 | .htaccess and games.php only handled POST and GET /{id} | Added list handler for GET without ID |
| X-Test-Password not detected | LiteSpeed doesn't pass headers via getallheaders() | Added `$_SERVER['HTTP_X_TEST_PASSWORD']` fallback |

---

## 📊 Evaluation Criteria Status

| Criteria | Status | Notes |
|----------|--------|-------|
| All 12 API endpoints functional | ✅ Complete | Including health, list endpoints |
| Correct HTTP status codes | ✅ Complete | 200/201/400/403/404/409 all correct |
| Database constraint enforcement | ✅ Complete | UNIQUE, FK, CHECK at DB level |
| Integer player_id (server-generated) | ✅ Complete | Rejects client-supplied player_id |
| Username validation | ✅ Complete | `^[A-Za-z0-9_]{1,30}$` enforced |
| Turn rotation logic | ✅ Complete | Circular rotation skipping eliminated players |
| Player elimination logic | ✅ Complete | All ships sunk → eliminated |
| Move logging with timestamps | ✅ Complete | Full history with game_id in response |
| Lifetime statistics (transactional) | ✅ Complete | games_played, wins, losses, accuracy |
| Test mode secured with password | ✅ Complete | LiteSpeed dual-header detection |
| Hostinger deployment live | ✅ Live | vibe-hunter.com |
| Phase 2 client deployed | ✅ Live | Connects to any team's server |

---

## 🚀 Deployment Notes

### Hostinger Configuration
- Server: LiteSpeed (not standard Apache — affects header behavior)
- PHP: 8.3.x
- MySQL: 5.7+ with InnoDB
- Domain: vibe-hunter.com (DNS via Hostinger nameservers)

### Deployment Workflow
1. Edit files locally or on GitHub
2. Upload changed files to Hostinger File Manager manually
3. GitHub does NOT auto-deploy — files must be uploaded separately
4. Database changes applied via phpMyAdmin SQL console
