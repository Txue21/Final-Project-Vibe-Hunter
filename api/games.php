<?php
/**
 * Game Endpoints
 * POST /api/games - Create new game
 * GET /api/games/{id} - Get game state
 */

require_once __DIR__ . '/common.php';

setCorsHeaders();

// ============================================
// POST /api/games - Create Game
// ============================================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = getJsonBody();
    requireFields($data, ['creator_id', 'grid_size', 'max_players']);
    
    $creatorId = $data['creator_id'];
    $gridSize = (int)$data['grid_size'];
    $maxPlayers = (int)$data['max_players'];
    
    // Validate inputs
    if (!isValidGridSize($gridSize)) {
        badRequest('Grid size must be between 5 and 15');
    }
    
    if (!isValidMaxPlayers($maxPlayers)) {
        badRequest('Max players must be at least 1');
    }
    
    // Check if creator exists
    $creator = getPlayer($pdo, $creatorId);
    if (!$creator) {
        badRequest('Creator player does not exist');
    }
    
    try {
        $gameId = withTransaction($pdo, function($pdo) use ($creatorId, $gridSize, $maxPlayers) {
            // Create game
            $stmt = $pdo->prepare("
                INSERT INTO Games (creator_id, grid_size, max_players, status, current_turn_index, active_players)
                VALUES (?, ?, ?, 'waiting', 0, 1)
            ");
            $stmt->execute([$creatorId, $gridSize, $maxPlayers]);
            $gameId = $pdo->lastInsertId();
            
            // Auto-add creator to GamePlayers with turn_order = 0
            $stmt = $pdo->prepare("
                INSERT INTO GamePlayers (game_id, player_id, turn_order, ships_placed, is_eliminated)
                VALUES (?, ?, 0, FALSE, FALSE)
            ");
            $stmt->execute([$gameId, $creatorId]);
            
            return $gameId;
        });
        
        jsonResponse(['game_id' => (int)$gameId], 201);
        
    } catch (Exception $e) {
        error_log("Failed to create game: " . $e->getMessage());
        serverError('Failed to create game');
    }
}

// ============================================
// GET /api/games - List All Games
// GET /api/games/{id} - Get Game State
// ============================================
else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $parts = explode('/', trim($path, '/'));
    
    // GET /api/games - List all games
    if (count($parts) === 2 && $parts[1] === 'games') {
        try {
            $stmt = $pdo->query("
                SELECT 
                    game_id,
                    grid_size,
                    max_players,
                    status,
                    active_players,
                    current_turn_index,
                    created_at
                FROM Games
                ORDER BY game_id DESC
            ");
            $games = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Convert numeric fields to integers
            foreach ($games as &$game) {
                $game['game_id'] = (int)$game['game_id'];
                $game['grid_size'] = (int)$game['grid_size'];
                $game['max_players'] = (int)$game['max_players'];
                $game['active_players'] = (int)$game['active_players'];
                $game['current_turn_index'] = (int)$game['current_turn_index'];
            }
            
            jsonResponse($games, 200);
        } catch (PDOException $e) {
            error_log("Failed to fetch games: " . $e->getMessage());
            serverError('Failed to fetch games');
        }
    }
    // GET /api/games/{id} - Get specific game state with players
    else if (count($parts) >= 3) {
        $gameId = (int)$parts[2];
        
        $game = getGame($pdo, $gameId);
        
        if (!$game) {
            notFound('Game not found');
        }
        
        // Get all players in this game with their details
        $stmt = $pdo->prepare("
            SELECT 
                gp.player_id,
                gp.turn_order,
                gp.ships_placed,
                gp.is_eliminated,
                p.username
            FROM GamePlayers gp
            JOIN Players p ON gp.player_id = p.player_id
            WHERE gp.game_id = ?
            ORDER BY gp.turn_order
        ");
        $stmt->execute([$gameId]);
        $players = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get ships for each player
        foreach ($players as &$player) {
            $player['player_id'] = (int)$player['player_id'];
            $player['turn_order'] = (int)$player['turn_order'];
            $player['ships_placed'] = (bool)$player['ships_placed'];
            $player['is_eliminated'] = (bool)$player['is_eliminated'];
            
            // Get ships for this player
            $stmt = $pdo->prepare("
                SELECT row, col, is_sunk 
                FROM Ships 
                WHERE game_id = ? AND player_id = ?
            ");
            $stmt->execute([$gameId, $player['player_id']]);
            $ships = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($ships as &$ship) {
                $ship['row'] = (int)$ship['row'];
                $ship['col'] = (int)$ship['col'];
                $ship['is_sunk'] = (bool)$ship['is_sunk'];
            }
            
            $player['ships'] = $ships;
        }
        
        jsonResponse([
            'game_id' => (int)$game['game_id'],
            'grid_size' => (int)$game['grid_size'],
            'status' => $game['status'],
            'current_turn_index' => (int)$game['current_turn_index'],
            'active_players' => (int)$game['active_players'],
            'winner_id' => $game['winner_id'] ? (int)$game['winner_id'] : null,
            'players' => $players
        ], 200);
    } else {
        badRequest('Invalid endpoint');
    }
}

else {
    badRequest('Method not allowed');
}
