<?php
/**
 * POST /api/test/games/{id}/ships
 * Deterministic ship placement (test mode only)
 */

require_once __DIR__ . '/../../common.php';

setCorsHeaders();
requireTestMode();

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

// Support both camelCase (playerId) and snake_case (player_id) per spec
$playerId = null;
if (isset($data['playerId'])) {
    $playerId = (int)$data['playerId'];
} elseif (isset($data['player_id'])) {
    $playerId = (int)$data['player_id'];
} else {
    badRequest('Missing required field: playerId');
}

// Validate player ID is positive
if ($playerId <= 0) {
    badRequest('Invalid player ID');
}

if (!isset($data['ships'])) {
    badRequest('Missing required field: ships');
}

$ships = $data['ships'];

// Validate game exists
$game = getGame($pdo, $gameId);
if (!$game) {
    notFound('Game not found');
}

// SPEC REQUIREMENT: "Only allowed before game starts"
// In test mode, allow placement in 'waiting' status only
if ($game['status'] !== 'waiting') {
    badRequest('Ships can only be placed before game starts (status must be waiting)');
}

// Validate player is in game
$gamePlayer = getGamePlayer($pdo, $gameId, $playerId);
if (!$gamePlayer) {
    badRequest('Player is not in this game');
}

// Flatten ships to individual cells BEFORE validation
$cells = [];
foreach ($ships as $ship) {
    if (isset($ship['coordinates'])) {
        // New format: { "type": "destroyer", "coordinates": [[0,0],[0,1]] }
        if (!is_array($ship['coordinates'])) {
            badRequest('coordinates must be an array');
        }
        foreach ($ship['coordinates'] as $coord) {
            if (!is_array($coord) || count($coord) !== 2) {
                badRequest('Each coordinate must be [row, col]');
            }
            $cells[] = ['row' => (int)$coord[0], 'col' => (int)$coord[1]];
        }
    } else {
        // Old format: { "row": 0, "col": 1 }
        if (!isset($ship['row']) || !isset($ship['col'])) {
            badRequest('Each ship must have row and col or coordinates');
        }
        $cells[] = ['row' => (int)$ship['row'], 'col' => (int)$ship['col']];
    }
}

// Validate the flattened cells
list($valid, $error) = validateShips($cells, $game['grid_size']);
if (!$valid) {
    badRequest($error);
}

try {
    $gameStatus = withTransaction($pdo, function($pdo) use ($gameId, $playerId, $cells) {
        // Delete any existing ships for this player (re-placement allowed in test mode)
        $stmt = $pdo->prepare("DELETE FROM Ships WHERE game_id = ? AND player_id = ?");
        $stmt->execute([$gameId, $playerId]);
        
        // Insert all ship cells
        $stmt = $pdo->prepare("
            INSERT INTO Ships (game_id, player_id, row, col, is_sunk)
            VALUES (?, ?, ?, ?, FALSE)
        ");
        foreach ($cells as $cell) {
            $stmt->execute([$gameId, $playerId, $cell['row'], $cell['col']]);
        }
        
        // Mark ships as placed
        $stmt = $pdo->prepare("
            UPDATE GamePlayers 
            SET ships_placed = TRUE 
            WHERE game_id = ? AND player_id = ?
        ");
        $stmt->execute([$gameId, $playerId]);

        // Check if ALL players have placed ships
        $stmt = $pdo->prepare("
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN ships_placed = TRUE THEN 1 ELSE 0 END) as placed
            FROM GamePlayers
            WHERE game_id = ?
        ");
        $stmt->execute([$gameId]);
        $counts = $stmt->fetch();

        $total = (int)$counts['total'];
        $placed = (int)$counts['placed'];

        if ($total > 0 && $total === $placed) {
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
    
} catch (Exception $e) {
    error_log("Failed to place test ships: " . $e->getMessage());
    serverError('Failed to place ships');
}