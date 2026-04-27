-- ============================================
-- CPSC 3750 Final Project - Phase 1
-- Distributed Multiplayer Battleship System
-- Database Schema
-- ============================================
-- Drop existing tables in correct order (child tables first)
DROP TABLE IF EXISTS Moves;
DROP TABLE IF EXISTS Ships;
DROP TABLE IF EXISTS GamePlayers;
DROP TABLE IF EXISTS Games;
DROP TABLE IF EXISTS Players;

-- ============================================
-- Players Table (INT AUTO_INCREMENT)
-- ============================================
CREATE TABLE Players (
    player_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    games_played INT DEFAULT 0,
    wins INT DEFAULT 0,
    losses INT DEFAULT 0,
    total_shots INT DEFAULT 0,
    total_hits INT DEFAULT 0,
    hide_username TINYINT(1) NOT NULL DEFAULT 0,
    -- Run on existing DB: ALTER TABLE Players ADD COLUMN hide_username TINYINT(1) NOT NULL DEFAULT 0;
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- Games Table
-- ============================================
CREATE TABLE Games (
    game_id INT AUTO_INCREMENT PRIMARY KEY,
    creator_id INT NOT NULL,
    grid_size INT NOT NULL CHECK (grid_size >= 5 AND grid_size <= 15),
    max_players INT NOT NULL CHECK (max_players >= 1),
    status ENUM('waiting_setup', 'active', 'finished') DEFAULT 'waiting_setup',
    current_turn_index INT DEFAULT 0,
    active_players INT DEFAULT 1,
    winner_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES Players(player_id) ON DELETE CASCADE,
    FOREIGN KEY (winner_id) REFERENCES Players(player_id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_creator (creator_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- GamePlayers Join Table (many-to-many)
-- ============================================
CREATE TABLE GamePlayers (
    game_id INT NOT NULL,
    player_id INT NOT NULL,
    turn_order INT NOT NULL,
    ships_placed BOOLEAN DEFAULT FALSE,
    is_eliminated BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (game_id, player_id),
    FOREIGN KEY (game_id) REFERENCES Games(game_id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES Players(player_id) ON DELETE CASCADE,
    INDEX idx_turn_order (game_id, turn_order),
    INDEX idx_player (player_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- Ships Table (3 ships per player: sizes 3, 4, 5 cells)
-- Each cell is one row; group_id groups cells of the same ship (1, 2, or 3)
-- ============================================
CREATE TABLE Ships (
    ship_id INT AUTO_INCREMENT PRIMARY KEY,
    game_id INT NOT NULL,
    player_id INT NOT NULL,
    row INT NOT NULL,
    col INT NOT NULL,
    group_id TINYINT NOT NULL DEFAULT 0,
    is_sunk BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (game_id) REFERENCES Games(game_id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES Players(player_id) ON DELETE CASCADE,
    UNIQUE KEY unique_position (game_id, player_id, row, col),
    INDEX idx_game_player (game_id, player_id),
    INDEX idx_position (game_id, row, col)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- Moves Table (complete move history)
-- ============================================
CREATE TABLE Moves (
    move_id INT AUTO_INCREMENT PRIMARY KEY,
    game_id INT NOT NULL,
    player_id INT NOT NULL,
    target_player_id INT NOT NULL,
    row INT NOT NULL,
    col INT NOT NULL,
    result ENUM('hit', 'miss') NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES Games(game_id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES Players(player_id) ON DELETE CASCADE,
    FOREIGN KEY (target_player_id) REFERENCES Players(player_id) ON DELETE CASCADE,
    INDEX idx_game (game_id),
    INDEX idx_timestamp (game_id, timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Show all tables
SHOW TABLES;