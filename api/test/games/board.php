<?php
/**
 * GET /api/test/games/{id}/board/{player_id}
 * Reveal board state for a player (test mode only)
 * Used by autograder to verify ship placement
 */

require_once __DIR__ . '/../../common.php';

setCorsHeaders();

// Require test mode authentication
requireTestMode();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    badRequest('Method not allowed');
}

// Parse game ID and player ID from URL
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$parts = explode('/', trim($path, '/'));
// Expected: api/test/games/{id}/board/{player_id}
$gameId = isset($parts[count($parts) - 3]) ? (int)$parts[count($parts) - 3] : 0;
$playerId = isset($parts[count($parts) - 1]) ? $parts[count($parts) - 1] : '';

if ($gameId <= 0) {
    badRequest('Invalid game ID');
}

if (empty($playerId)) {
    badRequest('Invalid player ID');
}

// Validate game exists
$game = getGame($pdo, $gameId);
if (!$game) {
    notFound('Game not found');
}

// Validate player exists in game
$gamePlayer = getGamePlayer($pdo, $gameId, $playerId);
if (!$gamePlayer) {
    notFound('Player not in this game');
}

try {
    // Get all ships for this player
    $stmt = $pdo->prepare("
        SELECT ship_id, row, col, is_sunk
        FROM Ships
        WHERE game_id = ? AND player_id = ?
        ORDER BY ship_id ASC
    ");
    $stmt->execute([$gameId, $playerId]);
    $ships = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format response
    $formattedShips = array_map(function($ship) {
        return [
            'row' => (int)$ship['row'],
            'col' => (int)$ship['col'],
            'is_sunk' => (bool)$ship['is_sunk']
        ];
    }, $ships);
    
    jsonResponse([
        'player_id' => $playerId,
        'ships' => $formattedShips
    ], 200);
    
} catch (Exception $e) {
    error_log("Failed to get board state: " . $e->getMessage());
    serverError('Failed to retrieve board state');
}
