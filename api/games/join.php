<?php
/**
 * POST /api/games/{id}/join
 * Join an existing game
 */

require_once __DIR__ . '/../common.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    badRequest('Method not allowed');
}

// Parse game ID from URL
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$parts = explode('/', trim($path, '/'));
$gameId = isset($parts[count($parts) - 2]) ? (int)$parts[count($parts) - 2] : 0;

if ($gameId <= 0) {
    badRequest('Invalid game ID');
}

$data = getJsonBody();
requireFields($data, ['player_id']);

// Cast player_id to int
$playerId = (int)$data['player_id'];

// Validate game exists
$game = getGame($pdo, $gameId);
if (!$game) {
    notFound('Game not found');
}

// Validate player exists
$player = getPlayer($pdo, $playerId);
if (!$player) {
    forbidden('Invalid player ID');
}

// Check game status
if ($game['status'] !== 'waiting') {
    badRequest('Game is not accepting new players');
}

// Check if player already in game
$existingGamePlayer = getGamePlayer($pdo, $gameId, $playerId);
if ($existingGamePlayer) {
    badRequest('Player already in this game');
}

// Check max players
$stmt = $pdo->prepare("SELECT COUNT(*) as count FROM GamePlayers WHERE game_id = ?");
$stmt->execute([$gameId]);
$currentPlayers = $stmt->fetch()['count'];

if ($currentPlayers >= $game['max_players']) {
    badRequest('Game is full');
}

try {
    $turnOrder = withTransaction($pdo, function($pdo) use ($gameId, $playerId, $currentPlayers) {
        $turnOrder = $currentPlayers;
        
        $stmt = $pdo->prepare("
            INSERT INTO GamePlayers (game_id, player_id, turn_order, ships_placed, is_eliminated)
            VALUES (?, ?, ?, FALSE, FALSE)
        ");
        $stmt->execute([$gameId, $playerId, $turnOrder]);
        
        $stmt = $pdo->prepare("UPDATE Games SET active_players = active_players + 1 WHERE game_id = ?");
        $stmt->execute([$gameId]);
        
        return $turnOrder;
    });
    
    jsonResponse([
        'status'     => 'joined',
        'turn_order' => (int)$turnOrder
    ], 200);
    
} catch (Exception $e) {
    error_log("Failed to join game: " . $e->getMessage());
    serverError('Failed to join game');
}