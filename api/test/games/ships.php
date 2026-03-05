<?php
/**
 * POST /api/test/games/{id}/ships
 * Deterministic ship placement (test mode only)
 * Bypasses normal validation for autograder control
 */

require_once __DIR__ . '/../../common.php';

setCorsHeaders();

// Require test mode authentication
requireTestMode();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    badRequest('Method not allowed');
}

// Parse game ID from URL
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$parts = explode('/', trim($path, '/'));
// Expected: api/test/games/{id}/ships
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

// Validate player is in game
$gamePlayer = getGamePlayer($pdo, $gameId, $playerId);
if (!$gamePlayer) {
    badRequest('Player is not in this game');
}

// Validate ships structure
list($valid, $error) = validateShips($ships, $game['grid_size']);
if (!$valid) {
    badRequest($error);
}

try {
    withTransaction($pdo, function($pdo) use ($gameId, $playerId, $ships, $gamePlayer) {
        // Delete any existing ships for this player (in case of re-placement)
        $stmt = $pdo->prepare("DELETE FROM Ships WHERE game_id = ? AND player_id = ?");
        $stmt->execute([$gameId, $playerId]);
        
        // Insert all ships
        $stmt = $pdo->prepare("
            INSERT INTO Ships (game_id, player_id, row, col, is_sunk)
            VALUES (?, ?, ?, ?, FALSE)
        ");
        
        foreach ($ships as $ship) {
            $stmt->execute([$gameId, $playerId, $ship['row'], $ship['col']]);
        }
        
        // Mark ships as placed
        $stmt = $pdo->prepare("
            UPDATE GamePlayers 
            SET ships_placed = TRUE 
            WHERE game_id = ? AND player_id = ?
        ");
        $stmt->execute([$gameId, $playerId]);
    });
    
    jsonResponse(['status' => 'ships_placed'], 200);
    
} catch (Exception $e) {
    error_log("Failed to place test ships: " . $e->getMessage());
    serverError('Failed to place ships');
}
