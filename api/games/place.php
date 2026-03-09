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

// Parse game ID from URL
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$parts = explode('/', trim($path, '/'));
// Expected: api/games/{id}/place
$gameId = isset($parts[count($parts) - 2]) ? (int)$parts[count($parts) - 2] : 0;

if ($gameId <= 0) {
    badRequest('Invalid game ID');
}

$data = getJsonBody();
requireFields($data, ['player_id', 'ships']);

$playerId = $data['player_id'];
$ships = $data['ships'];

// Validate game exists
$game = getGame($pdo, $gameId);
if (!$game) {
    notFound('Game not found');
}

// Validate game status - can only place during waiting
if ($game['status'] !== 'waiting') {
    badRequest('Cannot place ships after game has started');
}

// Validate player is in game
$gamePlayer = getGamePlayer($pdo, $gameId, $playerId);
if (!$gamePlayer) {
    forbidden('Player is not in this game');
}

// Check if ships already placed
if ($gamePlayer['ships_placed']) {
    badRequest('Ships already placed');
}

// Validate ships
list($valid, $error) = validateShips($ships, $game['grid_size']);
if (!$valid) {
    badRequest($error);
}

try {
    $gameStatus = withTransaction($pdo, function($pdo) use ($gameId, $playerId, $ships) {
        // Insert all ships
        $stmt = $pdo->prepare("
            INSERT INTO Ships (game_id, player_id, row, col, is_sunk)
            VALUES (?, ?, ?, ?, FALSE)
        ");

        foreach ($ships as $ship) {
            $stmt->execute([$gameId, $playerId, $ship['row'], $ship['col']]);
        }

        // Mark ships as placed for this player
        $stmt = $pdo->prepare("
            UPDATE GamePlayers
            SET ships_placed = TRUE
            WHERE game_id = ? AND player_id = ?
        ");
        $stmt->execute([$gameId, $playerId]);

        // Check if ALL players in this game have placed ships
        $stmt = $pdo->prepare("
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN ships_placed = TRUE THEN 1 ELSE 0 END) as placed
            FROM GamePlayers
            WHERE game_id = ?
        ");
        $stmt->execute([$gameId]);
        $counts = $stmt->fetch();

        // FIX: Explicitly cast to int to avoid string comparison issues
        // This ensures 1-player games activate correctly
        $total = (int)$counts['total'];
        $placed = (int)$counts['placed'];

        if ($total > 0 && $total === $placed) {
            // All players have placed - activate the game
            $stmt = $pdo->prepare("UPDATE Games SET status = 'active' WHERE game_id = ?");
            $stmt->execute([$gameId]);
            return 'active';
        }

        return 'waiting';
    });

    jsonResponse([
        'status' => 'ships_placed',
        'game_status' => $gameStatus
    ], 200);

} catch (PDOException $e) {
    if ($e->getCode() == 23000) {
        badRequest('Ship position already occupied');
    }
    error_log("Failed to place ships: " . $e->getMessage());
    serverError('Failed to place ships');
}