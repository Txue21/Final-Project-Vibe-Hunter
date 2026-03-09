<?php
/**
 * GET /api/games/{id}/moves
 * Get chronological move history for a game
 */

require_once __DIR__ . '/../common.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    badRequest('Method not allowed');
}

// Parse game ID from URL
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$parts = explode('/', trim($path, '/'));
$gameId = isset($parts[count($parts) - 2]) ? (int)$parts[count($parts) - 2] : 0;

if ($gameId <= 0) {
    badRequest('Invalid game ID');
}

// Validate game exists
$game = getGame($pdo, $gameId);
if (!$game) {
    notFound('Game not found');
}

try {
    $stmt = $pdo->prepare("
        SELECT 
            move_id,
            game_id,
            player_id,
            target_player_id,
            row,
            col,
            result,
            timestamp
        FROM Moves
        WHERE game_id = ?
        ORDER BY timestamp ASC, move_id ASC
    ");
    $stmt->execute([$gameId]);
    $moves = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // FIX: Cast player_id and target_player_id to int in response
    $formattedMoves = array_map(function($move) {
        return [
            'move_id'          => (int)$move['move_id'],
            'player_id'        => (int)$move['player_id'],
            'target_player_id' => (int)$move['target_player_id'],
            'row'              => (int)$move['row'],
            'col'              => (int)$move['col'],
            'result'           => $move['result'],
            'timestamp'        => $move['timestamp']
        ];
    }, $moves);
    
    jsonResponse($formattedMoves, 200);
    
} catch (Exception $e) {
    error_log("Failed to get moves: " . $e->getMessage());
    serverError('Failed to retrieve move history');
}