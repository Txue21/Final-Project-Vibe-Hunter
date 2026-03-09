<?php
/**
 * Player Endpoints
 * POST /api/players - Create new player
 * GET /api/players/{id}/stats - Get player statistics
 */

require_once __DIR__ . '/common.php';

setCorsHeaders();

// ============================================
// POST /api/players - Create Player
// ============================================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = getJsonBody();
    requireFields($data, ['username']);
    
    // PHASE 1 ADDENDUM: Client may NOT supply player_id
    if (isset($data['player_id'])) {
        badRequest('player_id cannot be supplied by client - server generates it');
    }
    
    $username = trim($data['username']);
    
    if (empty($username)) {
        badRequest('Username cannot be empty');
    }
    
    try {
        // Generate UUID (server-side only)
        $playerId = generateUUID($pdo);
        
        // Insert player with initialized stats
        $stmt = $pdo->prepare("
            INSERT INTO Players (player_id, username, games_played, wins, losses, total_shots, total_hits)
            VALUES (?, ?, 0, 0, 0, 0, 0)
        ");
        $stmt->execute([$playerId, $username]);
        
        jsonResponse(['player_id' => $playerId], 201);
        
    } catch (PDOException $e) {
        // Check for duplicate username
        if ($e->getCode() == 23000) {
            badRequest('Username already exists');
        }
        error_log("Failed to create player: " . $e->getMessage());
        serverError('Failed to create player');
    }
}

// ============================================
// GET /api/players/{id}/stats - Get Player Stats
// ============================================
else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Parse player ID from URL: /api/players/{id}/stats
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $parts = explode('/', trim($path, '/'));
    
    // Expected: api/players/{id}/stats
    if (count($parts) >= 3 && $parts[count($parts) - 1] === 'stats') {
        $playerId = $parts[count($parts) - 2];
        
        $player = getPlayer($pdo, $playerId);
        
        if (!$player) {
            notFound('Player not found');
        }
        
        // Calculate accuracy (handle division by zero)
        $accuracy = $player['total_shots'] > 0 
            ? round($player['total_hits'] / $player['total_shots'], 3)
            : 0.0;
        
        jsonResponse([
            'games_played' => (int)$player['games_played'],
            'wins' => (int)$player['wins'],
            'losses' => (int)$player['losses'],
            'total_shots' => (int)$player['total_shots'],
            'total_hits' => (int)$player['total_hits'],
            'accuracy' => $accuracy
        ], 200);
    } else {
        badRequest('Invalid endpoint');
    }
}

else {
    badRequest('Method not allowed');
}
