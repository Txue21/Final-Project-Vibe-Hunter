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
// GET /api/games/{id} - Get Game State
// ============================================
else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Parse game ID from URL: /api/games/{id}
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $parts = explode('/', trim($path, '/'));
    
    // Expected: api/games/{id}
    if (count($parts) >= 2) {
        $gameId = (int)$parts[count($parts) - 1];
        
        $game = getGame($pdo, $gameId);
        
        if (!$game) {
            notFound('Game not found');
        }
        
        jsonResponse([
            'game_id' => (int)$game['game_id'],
            'grid_size' => (int)$game['grid_size'],
            'status' => $game['status'],
            'current_turn_index' => (int)$game['current_turn_index'],
            'active_players' => (int)$game['active_players']
        ], 200);
    } else {
        badRequest('Invalid endpoint');
    }
}

else {
    badRequest('Method not allowed');
}
