# CPSC 3750 Final Project - Phase 1
## Distributed Multiplayer Battleship System

**Tian Xue** - Lead Systems Architect & DevOps

---

## 🎯 System Overview

Complete Phase 1 backend implementation with:
- ✅ **12 API Endpoints** (9 production + 3 test mode)
- ✅ **UUID-based player system** using MySQL UUID()
- ✅ **Transactional persistence** with ACID compliance
- ✅ **Database constraint enforcement** (foreign keys, CHECK, UNIQUE)
- ✅ **Hostinger deployment ready** (vibe-hunter.com)

---

## 📋 API Endpoints

### Production API (9 endpoints)
```
POST   /api/reset
POST   /api/players
GET    /api/players/{id}/stats
POST   /api/games
POST   /api/games/{id}/join
GET    /api/games/{id}
POST   /api/games/{id}/place
POST   /api/games/{id}/fire
GET    /api/games/{id}/moves
```

### Test Mode API (3 endpoints)
**Requires:** `X-Test-Password: clemson-test-2026`
```
POST   /api/test/games/{id}/restart
POST   /api/test/games/{id}/ships
GET    /api/test/games/{id}/board/{player_id}
```

---

## 🗄️ Database Schema

**5 Tables with full constraint enforcement:**

1. **Players** - UUID primary key, username (unique), statistics
2. **Games** - Game instances with grid_size, max_players, status
3. **GamePlayers** - Join table (many-to-many) with turn_order
4. **Ships** - Ship positions (3 per player) with is_sunk flag
5. **Moves** - Complete move history with timestamps

**Foreign keys:** CASCADE and SET NULL rules  
**CHECK constraints:** grid_size (5-15), max_players (≥1)  
**Engine:** InnoDB for transaction support

---

## 🏗️ Architecture

### Core Features
- **UUID System:** MySQL UUID() for RFC 4122 compliance
- **Multiplayer:** 1-N players with GamePlayers join table
- **Turn Rotation:** Round-robin among active players
- **Transactions:** Fire endpoint fully transactional
- **Test Mode:** Secure authentication for autograder

### File Structure
```
public_html/
├── api/
│   ├── common.php        # Shared utilities
│   ├── reset.php         # System reset
│   ├── players.php       # Player management
│   ├── games.php         # Game management
│   ├── games/
│   │   ├── join.php      # Join game
│   │   ├── place.php     # Place ships
│   │   ├── fire.php      # Fire move (transactional)
│   │   └── moves.php     # Move history
│   └── test/
│       └── games/
│           ├── restart.php   # Test: restart
│           ├── ships.php     # Test: ship placement
│           └── board.php     # Test: board reveal
├── .htaccess             # URL routing
├── config.php            # TEST_MODE toggle
├── db.php                # Database connection
├── schema.sql            # Database schema
├── index.html            # API documentation
└── README.md             # This file
```

---

## 🎯 Evaluation Criteria

### ✅ API Contract Stability
- All 12 endpoints with consistent JSON format
- Proper HTTP status codes (200, 201, 400, 403, 404)
- RESTful design principles
- Backward compatible for Phase 2/3

### ✅ Database Constraint Enforcement
- Foreign key constraints (CASCADE, SET NULL)
- CHECK constraints on grid_size (5-15) and max_players (≥1)
- UNIQUE constraints on usernames and ship positions
- InnoDB engine with full ACID compliance
- Indexes on high-frequency queries

### ✅ Successful System Deployment
- UUID-based player system operational
- Transactional logic implemented (fire endpoint)
- Hostinger deployment configured (vibe-hunter.com)
- Database initialization automated
- TEST_MODE enabled for autograder compatibility

---
---

## 👤 Team Member

**Tian Xue** - Lead Systems Architect & DevOps


**Responsibilities:**
- Backend API architecture design
- UUID-based player system implementation
- Database schema with constraint enforcement
- Transactional logic for data persistence
- Hostinger/Domain deployment (vibe-hunter.com)
- API contract stability

---
**Production URL:** https://vibe-hunter.com  
**API Base:** https://vibe-hunter.com/api/
