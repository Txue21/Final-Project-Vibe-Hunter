<?php
/**
 * GET /api/test/games/{id}/board/{player_id}
 * Reveal board state for a player (test mode only)
 */

require_once __DIR__ . '/../../common.php';

setCorsHeaders();
requireTestMode();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    badRequest('Method not allowed');
}

// Parse game ID and player ID from URL
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$parts = explode('/', trim($path, '/'));
// Expected: api/test/games/{id}/board/{player_id}
$gameId   = isset($parts[count($parts) - 3]) ? (int)$parts[count($parts) - 3] : 0;
// Cast player_id to int from URL
$playerId = isset($parts[count($parts) - 1]) ? (int)$parts[count($parts) - 1] : 0;

if ($gameId <= 0) {
    badRequest('Invalid game ID');
}

if ($playerId <= 0) {
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
    $stmt = $pdo->prepare("
        SELECT ship_id, row, col, is_sunk
        FROM Ships
        WHERE game_id = ? AND player_id = ?
        ORDER BY ship_id ASC
    ");
    $stmt->execute([$gameId, $playerId]);
    $ships = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $formattedShips = array_map(function($ship) {
        return [
            'row'     => (int)$ship['row'],
            'col'     => (int)$ship['col'],
            'is_sunk' => (bool)$ship['is_sunk']
        ];
    }, $ships);
    
    jsonResponse([
        'player_id' => $playerId,
        'ships'     => $formattedShips
    ], 200);
    
} catch (Exception $e) {
    error_log("Failed to get board state: " . $e->getMessage());
    serverError('Failed to retrieve board state');
}