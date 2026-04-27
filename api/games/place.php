<?php
/**
 * POST /api/games/{id}/place
 * Place ships for a player
 */
require_once __DIR__ . '/../common.php';
setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    badRequest('Method not allowed');
}

$path  = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$parts = explode('/', trim($path, '/'));
$gameId = isset($parts[count($parts) - 2]) ? (int)$parts[count($parts) - 2] : 0;

if ($gameId <= 0) {
    badRequest('Invalid game ID');
}

$data = getJsonBody();
requireFields($data, ['player_id', 'ships']);

$playerId = (int)$data['player_id'];
$ships    = $data['ships'];

// Validate game exists
$game = getGame($pdo, $gameId);
if (!$game) {
    notFound('Game not found');
}

// Validate player is in game
$gamePlayer = getGamePlayer($pdo, $gameId, $playerId);
if (!$gamePlayer) {
    badRequest('Player is not in this game');
}

// Check if ships already placed → 409 BEFORE checking game status
// This way second placement always returns 409, even after game is active
if ($gamePlayer['ships_placed']) {
    jsonResponse(['error' => 'Ships already placed for this player'], 409);
}

// Now check game status (only reject if not waiting)
if ($game['status'] !== 'waiting_setup' && $game['status'] !== 'waiting') {
    badRequest('Cannot place ships after game has started');
}

// Validate ships array
if (!is_array($ships)) {
    badRequest('ships must be an array');
}

// Validate ships — returns [valid, error, expandedCells]
list($valid, $error, $expandedCells) = validateShips($ships, $game['grid_size']);
if (!$valid) {
    badRequest($error);
}

try {
    $gameStatus = withTransaction($pdo, function($pdo) use ($gameId, $playerId, $expandedCells) {
        // Insert all ship cells (each cell is one row; group_id links cells of the same ship)
        $stmt = $pdo->prepare("
            INSERT INTO Ships (game_id, player_id, row, col, group_id, is_sunk)
            VALUES (?, ?, ?, ?, ?, FALSE)
        ");

        foreach ($expandedCells as $cell) {
            $stmt->execute([$gameId, $playerId, $cell['row'], $cell['col'], $cell['group_id']]);
        }
        
        $stmt = $pdo->prepare("
            UPDATE GamePlayers SET ships_placed = TRUE
            WHERE game_id = ? AND player_id = ?
        ");
        $stmt->execute([$gameId, $playerId]);
        
        // Check if ALL players placed
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN ships_placed = TRUE THEN 1 ELSE 0 END) as placed
            FROM GamePlayers WHERE game_id = ?
        ");
        $stmt->execute([$gameId]);
        $counts = $stmt->fetch();
        
        $total  = (int)$counts['total'];
        $placed = (int)$counts['placed'];

        if ($total >= 2 && $total === $placed) {
            // All players have placed - activate the game
            $stmt = $pdo->prepare("UPDATE Games SET status = 'active' WHERE game_id = ?");
            $stmt->execute([$gameId]);
            return 'active';
        }
        
        return 'waiting_setup';
    });
    
    jsonResponse(['status' => 'placed'], 200);
    
} catch (PDOException $e) {
    if ($e->getCode() == 23000) {
        badRequest('Ship position already occupied');
    }
    error_log("Failed to place ships: " . $e->getMessage());
    serverError('Failed to place ships');
}
